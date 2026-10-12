import { Insumo, TipoInsumo } from '../../../domain/insumo/entities/Insumo';
import { IInsumoRepository } from '../../../domain/insumo/repositories/IInsumoRepository';
import { UniqueID } from '../../../domain/shared/UniqueID';
import { ListarInsumosUseCase } from './ListarInsumosUseCase';

class InMemoryInsumoRepository implements IInsumoRepository {
  public insumos: Insumo[] = [];
  async salvar(p: Insumo) { this.insumos.push(p); }
  async buscarPorId(id: UniqueID) { return this.insumos.find(p => p.id.equals(id)) ?? null; }
  async buscarPorCodigo(codigo: string) { return this.insumos.find(p => p.codigo.value === codigo) ?? null; }
  async listar() { return this.insumos; }
  async remover(id: UniqueID) { this.insumos = this.insumos.filter(p => !p.id.equals(id)); }
}

describe('ListarInsumosUseCase', () => {
  it('retorna lista vazia', async () => {
    const useCase = new ListarInsumosUseCase(new InMemoryInsumoRepository());
    expect(await useCase.execute()).toHaveLength(0);
  });

  it('retorna insumos cadastrados', async () => {
    const repo = new InMemoryInsumoRepository();
    repo.insumos.push(Insumo.criar({ codigo: 'FIL-001', nome: 'Filtro de Óleo', tipo: TipoInsumo.PECA, valorUnitario: 45, quantidadeEstoque: 10 }));
    repo.insumos.push(Insumo.criar({ codigo: 'OL-001', nome: 'Óleo', tipo: TipoInsumo.INSUMO, valorUnitario: 30, quantidadeEstoque: 20 }));
    const useCase = new ListarInsumosUseCase(repo);
    expect(await useCase.execute()).toHaveLength(2);
  });
});
