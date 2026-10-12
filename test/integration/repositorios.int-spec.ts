import { propagation } from '@opentelemetry/api';

import { ConflitoError } from '../../src/application/errors';
import { Insumo, TipoInsumo } from '../../src/domain/insumo/entities/Insumo';
import { Reserva, StatusReserva } from '../../src/domain/reserva/entities/Reserva';
import { Servico } from '../../src/domain/servico/entities/Servico';
import { UniqueID } from '../../src/domain/shared/UniqueID';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { PrismaTransactionManager } from '../../src/infrastructure/database/prisma-transaction.manager';
import { lerMessagingConfig } from '../../src/infrastructure/messaging/messaging.config';
import { PrismaInsumoRepository } from '../../src/infrastructure/repositories/PrismaInsumoRepository';
import { PrismaOutbox } from '../../src/infrastructure/repositories/PrismaOutbox';
import { PrismaProcessedMessageRepository } from '../../src/infrastructure/repositories/PrismaProcessedMessageRepository';
import { PrismaReservaRepository } from '../../src/infrastructure/repositories/PrismaReservaRepository';
import { PrismaServicoRepository } from '../../src/infrastructure/repositories/PrismaServicoRepository';
import { criarEnvelope } from '../../src/application/ports/message-envelope';
import { conectar, limparBanco } from '../helpers/database';

describe('Repositórios Prisma (integração)', () => {
  let prisma: PrismaService;
  let tm: PrismaTransactionManager;

  beforeAll(async () => {
    prisma = await conectar();
    tm = new PrismaTransactionManager(prisma);
  });
  beforeEach(() => limparBanco(prisma));
  afterAll(() => prisma.$disconnect());

  const novoInsumo = (codigo = 'FIL-001', estoque = 5) =>
    Insumo.criar({ codigo, nome: 'Filtro', tipo: TipoInsumo.PECA, valorUnitario: 45.5, quantidadeEstoque: estoque });

  describe('PrismaServicoRepository', () => {
    it('salva, busca, atualiza e lista', async () => {
      const repo = new PrismaServicoRepository(tm);
      const servico = Servico.criar({ nome: 'Troca de óleo', descricao: 'Motor', valorPadrao: 120 });
      await repo.salvar(servico);
      servico.atualizar({ valorPadrao: 130 });
      await repo.salvar(servico);

      const encontrado = await repo.buscarPorId(servico.id);
      expect(encontrado!.valorPadrao.value).toBe(130);
      expect(await repo.listar()).toHaveLength(1);
      expect(await repo.buscarPorId(new UniqueID())).toBeNull();
    });
  });

  describe('PrismaInsumoRepository', () => {
    it('salva e busca por id e por código (case insensitive na entrada)', async () => {
      const repo = new PrismaInsumoRepository(tm);
      const insumo = novoInsumo();
      await repo.salvar(insumo);

      expect((await repo.buscarPorId(insumo.id))!.valorUnitario.value).toBe(45.5);
      expect((await repo.buscarPorCodigo('fil-001'))!.id.equals(insumo.id)).toBe(true);
      expect(await repo.buscarPorCodigo('NAO-EXISTE')).toBeNull();
      expect(await repo.buscarPorId(new UniqueID())).toBeNull();
    });

    it('lista em ordem alfabética e preserva o tipo', async () => {
      const repo = new PrismaInsumoRepository(tm);
      await repo.salvar(Insumo.criar({ codigo: 'OLE-1', nome: 'Óleo', tipo: TipoInsumo.INSUMO, valorUnitario: 60, quantidadeEstoque: 1 }));
      await repo.salvar(novoInsumo());
      const lista = await repo.listar();
      expect(lista.map((i) => i.nome)).toEqual(['Filtro', 'Óleo']);
      expect(lista[1].tipo).toBe(TipoInsumo.INSUMO);
    });

    it('código duplicado (corrida entre cadastros) vira ConflitoError INSUMO_CODIGO_DUPLICADO', async () => {
      const repo = new PrismaInsumoRepository(tm);
      await repo.salvar(novoInsumo('DUP-1'));
      await expect(repo.salvar(novoInsumo('DUP-1'))).rejects.toMatchObject({
        constructor: ConflitoError,
        code: 'INSUMO_CODIGO_DUPLICADO',
        message: 'Já existe peça/insumo com este código',
      });
    });

    it('buscarParaAtualizacao trava e devolve só os ids pedidos', async () => {
      const repo = new PrismaInsumoRepository(tm);
      const a = novoInsumo('A-1');
      const b = novoInsumo('B-1');
      await repo.salvar(a);
      await repo.salvar(b);

      const travados = await tm.run(() => repo.buscarParaAtualizacao([a.id]));
      expect(travados.map((i) => i.id.toValue())).toEqual([a.id.toValue()]);
      expect(await repo.buscarParaAtualizacao([])).toEqual([]);
    });
  });

  describe('PrismaReservaRepository', () => {
    it('salva com itens, busca a ativa, atualiza status e lista por OS', async () => {
      const insumos = new PrismaInsumoRepository(tm);
      const insumo = novoInsumo();
      await insumos.salvar(insumo);
      const repo = new PrismaReservaRepository(tm);
      const reserva = Reserva.criar('os-1', [{ insumoId: insumo.id.toValue(), quantidade: 2 }]);
      await repo.salvar(reserva);

      const ativa = await repo.buscarAtivaPorOs('os-1');
      expect(ativa!.itens).toEqual([{ insumoId: insumo.id.toValue(), quantidade: 2 }]);

      ativa!.liberar();
      await repo.salvar(ativa!);
      expect(await repo.buscarAtivaPorOs('os-1')).toBeNull();
      const todas = await repo.listarPorOs('os-1');
      expect(todas).toHaveLength(1);
      expect(todas[0].status).toBe(StatusReserva.LIBERADA);
      expect(todas[0].itens).toHaveLength(1);
    });

    it('banco garante no máximo uma reserva ATIVA por OS (índice único parcial)', async () => {
      const insumos = new PrismaInsumoRepository(tm);
      const insumo = novoInsumo();
      await insumos.salvar(insumo);
      const repo = new PrismaReservaRepository(tm);
      const itens = [{ insumoId: insumo.id.toValue(), quantidade: 1 }];
      const primeira = Reserva.criar('os-1', itens);
      await repo.salvar(primeira);

      // Corrida entre dois comandos de reserva da mesma OS: o segundo é barrado e reprocessado.
      await expect(repo.salvar(Reserva.criar('os-1', itens))).rejects.toMatchObject({ code: 'P2002' });

      primeira.liberar();
      await repo.salvar(primeira);
      await repo.salvar(Reserva.criar('os-1', itens)); // nova ATIVA após liberar é válida
      expect(await repo.listarPorOs('os-1')).toHaveLength(2);
    });
  });

  describe('PrismaProcessedMessageRepository', () => {
    it('registra uma vez e recusa a repetição', async () => {
      const repo = new PrismaProcessedMessageRepository(tm);
      expect(await repo.registrar('m1')).toBe(true);
      expect(await repo.registrar('m1')).toBe(false);
    });

    it('a repetição dentro de uma transação não aborta a transação', async () => {
      const repo = new PrismaProcessedMessageRepository(tm);
      await repo.registrar('m1');
      await tm.run(async () => {
        expect(await repo.registrar('m1')).toBe(false);
        await tm.client.processedMessage.create({ data: { messageId: 'm2' } });
      });
      expect(await prisma.processedMessage.count()).toBe(2);
    });
  });

  describe('PrismaOutbox', () => {
    it('grava o envelope com destino = tópico do serviço e grupo = OS', async () => {
      const config = lerMessagingConfig({ EVENTS_TOPIC_ARN: 'arn:aws:sns:us-east-1:1:topico.fifo' });
      const outbox = new PrismaOutbox(tm, config);
      const envelope = criarEnvelope('catalog.x.v1', 'os-1', { a: 1 });
      await outbox.publicar(envelope);

      const linha = await prisma.outbox.findUniqueOrThrow({ where: { messageId: envelope.messageId } });
      expect(linha).toMatchObject({
        type: 'catalog.x.v1',
        destination: 'arn:aws:sns:us-east-1:1:topico.fifo',
        groupId: 'os-1',
        publicadoEm: null,
      });
      expect(linha.body).toEqual(envelope);
      expect(linha.traceparent).toBeNull(); // sem SDK de tracing registrado não há contexto ativo
    });

    it('grava no destino informado (ex.: fila de comando de outro serviço)', async () => {
      const outbox = new PrismaOutbox(tm, lerMessagingConfig({}));
      const fila = 'http://localhost:4566/000000000000/oficina-billing-inbox.fifo';
      const envelope = criarEnvelope('billing.x.v1', 'os-1', {});
      await outbox.publicar(envelope, fila);

      const linha = await prisma.outbox.findUniqueOrThrow({ where: { messageId: envelope.messageId } });
      expect(linha.destination).toBe(fila);
    });

    it('captura o traceparent do contexto W3C ativo', async () => {
      const traceparent = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';
      const inject = jest.spyOn(propagation, 'inject').mockImplementation((_ctx, carrier) => {
        (carrier as Record<string, string>).traceparent = traceparent;
      });
      const envelope = criarEnvelope('catalog.x.v1', 'os-1', {});
      try {
        await new PrismaOutbox(tm, lerMessagingConfig({})).publicar(envelope);
      } finally {
        inject.mockRestore();
      }

      const linha = await prisma.outbox.findUniqueOrThrow({ where: { messageId: envelope.messageId } });
      expect(linha.traceparent).toBe(traceparent);
    });
  });
});
