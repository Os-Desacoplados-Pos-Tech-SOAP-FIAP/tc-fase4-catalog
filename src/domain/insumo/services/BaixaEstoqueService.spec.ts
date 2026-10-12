import { DomainError } from '../../shared/DomainError';
import { Insumo, TipoInsumo } from '../entities/Insumo';
import { BaixaEstoqueService } from './BaixaEstoqueService';

describe('BaixaEstoqueService', () => {
  const makeInsumo = (qtd: number) =>
    Insumo.criar({
      codigo: 'PEC-001',
      nome: 'Filtro',
      tipo: TipoInsumo.PECA,
      valorUnitario: 10,
      quantidadeEstoque: qtd,
    });

  it('baixa corretamente estoque de múltiplos insumos', () => {
    const service = new BaixaEstoqueService();
    const insumo1 = makeInsumo(10);
    const insumo2 = makeInsumo(5);
    service.executar([
      { insumo: insumo1, quantidade: 3 },
      { insumo: insumo2, quantidade: 2 },
    ]);
    expect(insumo1.estoque.quantidade).toBe(7);
    expect(insumo2.estoque.quantidade).toBe(3);
  });

  it('lança DomainError em baixa vazia', () => {
    const service = new BaixaEstoqueService();
    expect(() => service.executar([])).toThrow(DomainError);
  });

  it('lança DomainError em estoque insuficiente', () => {
    const service = new BaixaEstoqueService();
    const insumo = makeInsumo(1);
    expect(() => service.executar([{ insumo, quantidade: 5 }])).toThrow(DomainError);
  });
});
