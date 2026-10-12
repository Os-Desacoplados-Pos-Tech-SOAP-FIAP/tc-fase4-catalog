import { RecursoNaoEncontradoError } from '../../errors';
import { Insumo, TipoInsumo } from '../../../domain/insumo/entities/Insumo';
import { InMemoryInsumoRepository } from '../../../../test/fakes/in-memory-insumo.repository';
import { BuscarInsumoUseCase } from './BuscarInsumoUseCase';

describe('BuscarInsumoUseCase', () => {
  it('retorna o insumo pelo id', async () => {
    const repo = new InMemoryInsumoRepository();
    const insumo = Insumo.criar({ codigo: 'FIL-001', nome: 'Filtro', tipo: TipoInsumo.PECA, valorUnitario: 45, quantidadeEstoque: 3 });
    await repo.salvar(insumo);
    const resultado = await new BuscarInsumoUseCase(repo).execute(insumo.id.toValue());
    expect(resultado.codigo.value).toBe('FIL-001');
  });

  it('lança 404 quando não existe', async () => {
    const useCase = new BuscarInsumoUseCase(new InMemoryInsumoRepository());
    await expect(useCase.execute('11111111-1111-4111-8111-111111111111')).rejects.toBeInstanceOf(
      RecursoNaoEncontradoError,
    );
  });
});
