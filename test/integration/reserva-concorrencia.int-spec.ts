import { CATALOG_EVENTS } from '../../src/application/reserva/catalog-messages';
import { ReservarInsumosUseCase } from '../../src/application/reserva/reservar-insumos/ReservarInsumosUseCase';
import { Insumo, TipoInsumo } from '../../src/domain/insumo/entities/Insumo';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { PrismaTransactionManager } from '../../src/infrastructure/database/prisma-transaction.manager';
import { lerMessagingConfig } from '../../src/infrastructure/messaging/messaging.config';
import { PrismaInsumoRepository } from '../../src/infrastructure/repositories/PrismaInsumoRepository';
import { PrismaOutbox } from '../../src/infrastructure/repositories/PrismaOutbox';
import { PrismaProcessedMessageRepository } from '../../src/infrastructure/repositories/PrismaProcessedMessageRepository';
import { PrismaReservaRepository } from '../../src/infrastructure/repositories/PrismaReservaRepository';
import { conectar, limparBanco } from '../helpers/database';

describe('ReservarInsumos com Postgres (integração)', () => {
  let prisma: PrismaService;
  let insumos: PrismaInsumoRepository;
  let useCase: ReservarInsumosUseCase;

  beforeAll(async () => {
    prisma = await conectar();
    const tm = new PrismaTransactionManager(prisma);
    insumos = new PrismaInsumoRepository(tm);
    useCase = new ReservarInsumosUseCase(
      tm,
      new PrismaProcessedMessageRepository(tm),
      insumos,
      new PrismaReservaRepository(tm),
      new PrismaOutbox(tm, lerMessagingConfig({ EVENTS_TOPIC_ARN: 'arn:topico' })),
    );
  });
  beforeEach(() => limparBanco(prisma));
  afterAll(() => prisma.$disconnect());

  const criarInsumo = async (codigo: string, estoque: number) => {
    const insumo = Insumo.criar({ codigo, nome: codigo, tipo: TipoInsumo.PECA, valorUnitario: 10, quantidadeEstoque: estoque });
    await insumos.salvar(insumo);
    return insumo;
  };

  it('falha de estoque desfaz a reserva parcial e grava só o evento de falha', async () => {
    const a = await criarInsumo('A-1', 5);
    const b = await criarInsumo('B-1', 0);

    await useCase.execute({
      messageId: 'cmd-1',
      correlationId: 'os-1',
      itens: [
        { insumoId: a.id.toValue(), quantidade: 2 },
        { insumoId: b.id.toValue(), quantidade: 1 },
      ],
    });

    expect((await insumos.buscarPorId(a.id))!.estoque.quantidadeReservada).toBe(0);
    expect(await prisma.reserva.count()).toBe(0);
    const eventos = await prisma.outbox.findMany();
    expect(eventos.map((e) => e.type)).toEqual([CATALOG_EVENTS.RESERVA_INSUMOS_FALHOU]);
    expect(await prisma.processedMessage.count()).toBe(1);
  });

  it('duas OS disputando a última unidade: só uma reserva', async () => {
    const ultima = await criarInsumo('ULT-1', 1);
    const item = [{ insumoId: ultima.id.toValue(), quantidade: 1 }];

    await Promise.all([
      useCase.execute({ messageId: 'cmd-a', correlationId: 'os-a', itens: item }),
      useCase.execute({ messageId: 'cmd-b', correlationId: 'os-b', itens: item }),
    ]);

    expect(await prisma.reserva.count()).toBe(1);
    expect((await insumos.buscarPorId(ultima.id))!.estoque.quantidadeReservada).toBe(1);
    const tipos = (await prisma.outbox.findMany()).map((e) => e.type).sort();
    expect(tipos).toEqual(
      [CATALOG_EVENTS.INSUMOS_RESERVADOS, CATALOG_EVENTS.RESERVA_INSUMOS_FALHOU].sort(),
    );
  });
});
