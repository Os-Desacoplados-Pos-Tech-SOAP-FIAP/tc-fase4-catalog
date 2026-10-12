import { ConflictException } from '@nestjs/common';

import { Insumo, TipoInsumo } from '../../../domain/insumo/entities/Insumo';
import { IInsumoRepository } from '../../../domain/insumo/repositories/IInsumoRepository';
import { UniqueID } from '../../../domain/shared/UniqueID';
import { CadastrarInsumoUseCase } from './CadastrarInsumoUseCase';

class InMemoryInsumoRepository implements IInsumoRepository {
  public insumos: Insumo[] = [];
  async salvar(p: Insumo) { this.insumos.push(p); }
  async buscarPorId(id: UniqueID) { return this.insumos.find(p => p.id.equals(id)) ?? null; }
  async buscarPorCodigo(codigo: string) { return this.insumos.find(p => p.codigo.value === codigo) ?? null; }
  async listar() { return this.insumos; }
  async remover(id: UniqueID) { this.insumos = this.insumos.filter(p => !p.id.equals(id)); }
}

const base = { codigo: 'FIL-001', nome: 'Filtro de Óleo', tipo: TipoInsumo.PECA, valorUnitario: 45, quantidadeEstoque: 10 };

describe('CadastrarInsumoUseCase', () => {
  it('cadastra insumo válido', async () => {
    const repo = new InMemoryInsumoRepository();
    const useCase = new CadastrarInsumoUseCase(repo);
    const p = await useCase.execute(base);
    expect(p.nome).toBe('Filtro de Óleo');
    expect(repo.insumos).toHaveLength(1);
  });

  it('lança ConflictException para código duplicado', async () => {
    const repo = new InMemoryInsumoRepository();
    const useCase = new CadastrarInsumoUseCase(repo);
    await useCase.execute(base);
    await expect(useCase.execute({ ...base, nome: 'Outro Filtro' })).rejects.toBeInstanceOf(ConflictException);
  });
});
