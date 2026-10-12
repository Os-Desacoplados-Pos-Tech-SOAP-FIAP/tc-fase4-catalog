import { RecursoNaoEncontradoError } from '../../errors';
import { Insumo, TipoInsumo } from '../../../domain/insumo/entities/Insumo';
import { UniqueID } from '../../../domain/shared/UniqueID';
import { InMemoryInsumoRepository } from '../../../../test/fakes/in-memory-insumo.repository';
import { FakeTransactionManager } from '../../../../test/fakes/fake-transaction.manager';
import { AtualizarEstoqueUseCase } from './AtualizarEstoqueUseCase';

describe('AtualizarEstoqueUseCase', () => {
  let transacao: FakeTransactionManager;
  let repo: InMemoryInsumoRepository;
  let useCase: AtualizarEstoqueUseCase;
  let insumo: Insumo;

  beforeEach(() => {
    repo = new InMemoryInsumoRepository();
    transacao = new FakeTransactionManager().participar(repo);
    useCase = new AtualizarEstoqueUseCase(transacao, repo);
    insumo = Insumo.criar({ codigo: 'FIL-001', nome: 'Filtro de Óleo', tipo: TipoInsumo.PECA, valorUnitario: 45, quantidadeEstoque: 10 });
    repo.insumos.push(insumo);
  });

  it('atualiza quantidade do estoque dentro de uma transação', async () => {
    const result = await useCase.execute({ id: insumo.id.toValue(), quantidade: 20 });
    expect(result.estoque.quantidade).toBe(20);
    expect(transacao.execucoes).toBe(1);
  });

  it('mantém a quantidade reservada ao atualizar o estoque', async () => {
    insumo.reservar(3);
    const result = await useCase.execute({ id: insumo.id.toValue(), quantidade: 20 });
    expect(result.estoque.quantidadeReservada).toBe(3);
  });

  it('lança RecursoNaoEncontradoError para insumo inexistente', async () => {
    await expect(useCase.execute({ id: new UniqueID().toValue(), quantidade: 10 })).rejects.toBeInstanceOf(RecursoNaoEncontradoError);
  });

  it('rejeita quantidade menor que a reservada', async () => {
    insumo.reservar(5);
    await expect(useCase.execute({ id: insumo.id.toValue(), quantidade: 2 })).rejects.toThrow();
    expect(repo.insumos[0].estoque.quantidade).toBe(10);
  });
});
