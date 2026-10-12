import { DomainError } from '../../shared/DomainError';
import { Insumo } from '../entities/Insumo';

export interface ItemBaixa {
  insumo: Insumo;
  quantidade: number;
}

export class BaixaEstoqueService {
  public executar(itens: ItemBaixa[]): void {
    if (!itens.length) {
      throw new DomainError('Nenhum item informado para baixa de estoque', 'BAIXA_VAZIA');
    }
    for (const item of itens) {
      item.insumo.baixarEstoque(item.quantidade);
    }
  }
}
