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
  let enviados: { destino: string; envelope: MessageEnvelope }[];
  let enviar: jest.Mock;
  let publisher: OutboxPublisher;

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
    enviar = jest.fn(async (destino: string, envelope: MessageEnvelope) => {
      enviados.push({ destino, envelope });
    });
    publisher = new OutboxPublisher(
      prisma,
      { enviar } as unknown as SnsSqsTransport,
      lerMessagingConfig({}),
    );
  });
  afterAll(() => prisma.$disconnect());

  it('publica pendentes em ordem de criação e marca como publicados', async () => {
    const a = criarEnvelope('t.a', 'os-1', {});
    const b = criarEnvelope('t.b', 'os-1', {});
    await outbox.publicar(a);
    await outbox.publicar(b);

    expect(await publisher.publicarPendentes()).toBe(2);
    expect(enviados.map((e) => e.envelope.messageId)).toEqual([a.messageId, b.messageId]);
    expect(enviados[0].destino).toBe('arn:aws:sns:us-east-1:1:t.fifo');
    expect(await prisma.outbox.count({ where: { publicadoEm: null } })).toBe(0);
    expect(await publisher.publicarPendentes()).toBe(0);
  });

  it('se o envio falha, nada é marcado e tudo volta no próximo ciclo', async () => {
    await outbox.publicar(criarEnvelope('t.a', 'os-1', {}));
    enviar.mockRejectedValueOnce(new Error('sns fora'));

    await expect(publisher.publicarPendentes()).rejects.toThrow('sns fora');
    expect(await prisma.outbox.count({ where: { publicadoEm: null } })).toBe(1);
    expect(await publisher.publicarPendentes()).toBe(1);
  });
});
