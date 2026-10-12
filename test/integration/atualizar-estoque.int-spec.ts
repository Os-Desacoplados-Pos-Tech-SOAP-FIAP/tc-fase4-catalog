import { AtualizarEstoqueUseCase } from '../../src/application/insumo/atualizar-estoque/AtualizarEstoqueUseCase';
import { Insumo, TipoInsumo } from '../../src/domain/insumo/entities/Insumo';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { PrismaTransactionManager } from '../../src/infrastructure/database/prisma-transaction.manager';
import { PrismaInsumoRepository } from '../../src/infrastructure/repositories/PrismaInsumoRepository';
import { conectar, limparBanco } from '../helpers/database';

describe('AtualizarEstoque com Postgres (integração)', () => {
  let prisma: PrismaService;
  let insumos: PrismaInsumoRepository;
  let useCase: AtualizarEstoqueUseCase;

  beforeAll(async () => {
    prisma = await conectar();
    const tm = new PrismaTransactionManager(prisma);
    insumos = new PrismaInsumoRepository(tm);
    useCase = new AtualizarEstoqueUseCase(tm, insumos);
  });
  beforeEach(() => limparBanco(prisma));
  afterAll(() => prisma.$disconnect());

  const criarInsumoComReserva = async (reservada: number) => {
    const insumo = Insumo.criar({ codigo: 'EST-1', nome: 'EST-1', tipo: TipoInsumo.PECA, valorUnitario: 10, quantidadeEstoque: 5 });
    insumo.reservar(reservada);
    await insumos.salvar(insumo);
    return insumo;
  };

  it('preserva a quantidade reservada já confirmada ao atualizar o estoque', async () => {
    const insumo = await criarInsumoComReserva(2);

    await useCase.execute({ id: insumo.id.toValue(), quantidade: 10 });

    const salvo = (await insumos.buscarPorId(insumo.id))!;
    expect(salvo.estoque.quantidade).toBe(10);
    expect(salvo.estoque.quantidadeReservada).toBe(2);
  });

  it('rejeita quantidade menor que a reservada e mantém o estoque', async () => {
    const insumo = await criarInsumoComReserva(2);

    await expect(useCase.execute({ id: insumo.id.toValue(), quantidade: 1 })).rejects.toThrow();

    expect((await insumos.buscarPorId(insumo.id))!.estoque.quantidade).toBe(5);
  });
});
