import { Logger } from '@nestjs/common';
import { propagation } from '@opentelemetry/api';

import { criarEnvelope, MessageEnvelope } from '../../src/application/ports/message-envelope';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { PrismaTransactionManager } from '../../src/infrastructure/database/prisma-transaction.manager';
import { lerMessagingConfig } from '../../src/infrastructure/messaging/messaging.config';
import { OutboxPublisher } from '../../src/infrastructure/messaging/outbox.publisher';
import { SnsSqsTransport } from '../../src/infrastructure/messaging/sns-sqs.transport';
import { PrismaOutbox } from '../../src/infrastructure/repositories/PrismaOutbox';
import { conectar, limparBanco } from '../helpers/database';

describe('OutboxPublisher (integração)', () => {
  let prisma: PrismaService;
  let outbox: PrismaOutbox;
  let enviados: { destino: string; envelope: MessageEnvelope; traceparent?: string | null }[];
  let enviar: jest.Mock;
  let publisher: OutboxPublisher;

  const novoPublisher = () =>
    new OutboxPublisher(prisma, { enviar } as unknown as SnsSqsTransport, lerMessagingConfig({}));
  const registrar = async (tipo: string, os: string) => {
    const envelope = criarEnvelope(tipo, os, {});
    await outbox.publicar(envelope);
    return envelope;
  };
  const linha = (envelope: MessageEnvelope) =>
    prisma.outbox.findUniqueOrThrow({ where: { messageId: envelope.messageId } });
  const idsEnviados = () => enviados.map((e) => e.envelope.messageId);

  beforeAll(async () => {
    prisma = await conectar();
    outbox = new PrismaOutbox(
      new PrismaTransactionManager(prisma),
      lerMessagingConfig({ CATALOG_EVENTS_TOPIC_ARN: 'arn:aws:sns:us-east-1:1:t.fifo' }),
    );
  });
  beforeEach(async () => {
    await limparBanco(prisma);
    enviados = [];
    enviar = jest.fn(async (destino: string, envelope: MessageEnvelope, traceparent?: string | null) => {
      enviados.push({ destino, envelope, traceparent });
    });
    publisher = novoPublisher();
  });
  afterAll(() => prisma.$disconnect());

  it('publica pendentes em ordem de seq e marca como publicados', async () => {
    const a = await registrar('t.a', 'os-1');
    const b = await registrar('t.b', 'os-1');
    // criadoEm invertido: a ordem tem que vir de seq, não do relógio.
    await prisma.outbox.update({
      where: { messageId: a.messageId },
      data: { criadoEm: new Date(Date.now() + 60_000) },
    });

    expect(await publisher.publicarPendentes()).toBe(2);
    expect(idsEnviados()).toEqual([a.messageId, b.messageId]);
    expect(enviados[0].destino).toBe('arn:aws:sns:us-east-1:1:t.fifo');
    expect(await prisma.outbox.count({ where: { publicadoEm: null } })).toBe(0);
    expect(await publisher.publicarPendentes()).toBe(0);
  });

  it('falha numa OS não bloqueia as outras e preserva a ordem da OS com falha', async () => {
    const a1 = await registrar('t.a1', 'os-1');
    const b1 = await registrar('t.b1', 'os-2');
    const a2 = await registrar('t.a2', 'os-1');
    enviar.mockImplementationOnce(async () => {
      throw new Error('sns fora');
    });
    const logErro = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    expect(await publisher.publicarPendentes()).toBe(1);
    expect(idsEnviados()).toEqual([b1.messageId]);
    const log = String(logErro.mock.calls[0][0]);
    logErro.mockRestore();
    expect(log).toContain(`id=${(await linha(a1)).id}`);
    expect(log).toContain('groupId=os-1');
    expect(log).toContain('type=t.a1');
    expect(log).toContain('sns fora');
    expect(await linha(a1)).toMatchObject({ publicadoEm: null, tentativas: 1, ultimoErro: 'sns fora' });
    expect(await linha(a2)).toMatchObject({ publicadoEm: null, tentativas: 0, ultimoErro: null });
    expect((await linha(b1)).publicadoEm).not.toBeNull();

    enviados = [];
    expect(await publisher.publicarPendentes()).toBe(2);
    expect(idsEnviados()).toEqual([a1.messageId, a2.messageId]);
    expect(await prisma.outbox.count({ where: { publicadoEm: null } })).toBe(0);
  });

  it('trunca ultimoErro em 500 caracteres', async () => {
    const a = await registrar('t.a', 'os-1');
    enviar.mockRejectedValueOnce(new Error('x'.repeat(800)));

    expect(await publisher.publicarPendentes()).toBe(0);
    expect((await linha(a)).ultimoErro).toHaveLength(500);
  });

  it('só um publicador por vez: o segundo retorna 0 enquanto o primeiro segura o lock', async () => {
    const a = await registrar('t.a', 'os-1');
    const b = await registrar('t.b', 'os-2');
    let liberar!: () => void;
    const portao = new Promise<void>((resolve) => (liberar = resolve));
    enviar.mockImplementationOnce(async (destino: string, envelope: MessageEnvelope) => {
      await portao;
      enviados.push({ destino, envelope });
    });

    const primeiro = publisher.publicarPendentes();
    for (let i = 0; i < 200 && enviar.mock.calls.length === 0; i++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(enviar).toHaveBeenCalledTimes(1);

    // Mensagem nova da mesma OS chega fora do lote travado; publicá-la agora furaria a ordem.
    const c = await registrar('t.c', 'os-1');
    expect(await novoPublisher().publicarPendentes()).toBe(0);

    liberar();
    // O dono do lock publica `c` numa rodada seguinte do mesmo ciclo, depois de `a`.
    expect(await primeiro).toBe(3);
    expect(await publisher.publicarPendentes()).toBe(0);
    expect(idsEnviados()).toEqual([a.messageId, b.messageId, c.messageId]);
  });

  it('repassa ao transporte o traceparent gravado na outbox', async () => {
    const traceparent = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
    const inject = jest.spyOn(propagation, 'inject').mockImplementation((_ctx, carrier) => {
      (carrier as Record<string, string>).traceparent = traceparent;
    });
    try {
      await registrar('t.com-trace', 'os-1');
    } finally {
      inject.mockRestore();
    }
    await registrar('t.sem-trace', 'os-2');

    expect(await publisher.publicarPendentes()).toBe(2);
    expect(enviados.map((e) => e.traceparent)).toEqual([traceparent, null]);
  });

  describe('sem inanição: OS com falha não ocupa o lote das demais', () => {
    const falhaNasOsQuebradas = async (destino: string, envelope: MessageEnvelope) => {
      if (envelope.correlationId.startsWith('os-quebrada')) throw new Error('destino fora');
      enviados.push({ destino, envelope });
    };
    let logErro: jest.SpyInstance;
    beforeEach(() => {
      enviar.mockImplementation(falhaNasOsQuebradas);
      logErro = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    });
    afterEach(() => logErro.mockRestore());

    it('10 OS falhando à frente na fila não impedem a OS saudável no mesmo ciclo', async () => {
      const quebradas: MessageEnvelope[] = [];
      for (let i = 0; i < 10; i++) quebradas.push(await registrar(`t.q${i}`, `os-quebrada-${i}`));
      const ok1 = await registrar('t.ok1', 'os-saudavel');
      const ok2 = await registrar('t.ok2', 'os-saudavel');

      expect(await publisher.publicarPendentes()).toBe(2);
      expect(idsEnviados()).toEqual([ok1.messageId, ok2.messageId]);
      // Cada OS quebrada é tentada uma única vez por ciclo.
      for (const q of quebradas) expect((await linha(q)).tentativas).toBe(1);
    });

    it('backlog de uma OS com falha não consome o lote', async () => {
      const backlog: MessageEnvelope[] = [];
      for (let i = 0; i < 10; i++) backlog.push(await registrar(`t.b${i}`, 'os-quebrada'));
      const ok = await registrar('t.ok', 'os-saudavel');

      expect(await publisher.publicarPendentes()).toBe(1);
      expect(idsEnviados()).toEqual([ok.messageId]);
      expect(enviar).toHaveBeenCalledTimes(2);
      expect((await linha(backlog[0])).tentativas).toBe(1);
      expect((await linha(backlog[1])).tentativas).toBe(0);
    });
  });
});
