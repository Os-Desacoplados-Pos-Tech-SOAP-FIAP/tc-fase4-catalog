import { NotFoundException } from '@nestjs/common';

import { Insumo, TipoInsumo } from '../../../domain/insumo/entities/Insumo';
import { IInsumoRepository } from '../../../domain/insumo/repositories/IInsumoRepository';
import { UniqueID } from '../../../domain/shared/UniqueID';
import { AtualizarEstoqueUseCase } from './AtualizarEstoqueUseCase';

class InMemoryInsumoRepository implements IInsumoRepository {
  public insumos: Insumo[] = [];
  async salvar(p: Insumo) { const i = this.insumos.findIndex(x => x.id.equals(p.id)); if (i >= 0) this.insumos[i] = p; else this.insumos.push(p); }
  async buscarPorId(id: UniqueID) { return this.insumos.find(p => p.id.equals(id)) ?? null; }
  async buscarPorCodigo(codigo: string) { return this.insumos.find(p => p.codigo.value === codigo) ?? null; }
  async listar() { return this.insumos; }
  async remover(id: UniqueID) { this.insumos = this.insumos.filter(p => !p.id.equals(id)); }
}

describe('AtualizarEstoqueUseCase', () => {
  let repo: InMemoryInsumoRepository;
  let useCase: AtualizarEstoqueUseCase;
  let insumo: Insumo;

  beforeEach(() => {
    repo = new InMemoryInsumoRepository();
    useCase = new AtualizarEstoqueUseCase(repo);
    insumo = Insumo.criar({ codigo: 'FIL-001', nome: 'Filtro de Óleo', tipo: TipoInsumo.PECA, valorUnitario: 45, quantidadeEstoque: 10 });
    repo.insumos.push(insumo);
  });

  it('atualiza quantidade do estoque', async () => {
    const result = await useCase.execute({ id: insumo.id.toValue(), quantidade: 20 });
    expect(result.estoque.quantidade).toBe(20);
  });

  it('lança NotFoundException para insumo inexistente', async () => {
    await expect(useCase.execute({ id: new UniqueID().toValue(), quantidade: 10 })).rejects.toBeInstanceOf(NotFoundException);
  });
});
