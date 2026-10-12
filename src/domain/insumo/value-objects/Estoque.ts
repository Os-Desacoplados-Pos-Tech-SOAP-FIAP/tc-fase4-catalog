import { DomainError } from '../../shared/DomainError';
import { ValueObject } from '../../shared/ValueObject';

interface EstoqueProps {
  quantidade: number;
  quantidadeReservada: number;
}

export class Estoque extends ValueObject<EstoqueProps> {
  private constructor(props: EstoqueProps) {
    super(props);
  }

  public static create(quantidade: number, quantidadeReservada = 0): Estoque {
    if (!Number.isInteger(quantidade) || quantidade < 0) {
      throw new DomainError('Quantidade de estoque inválida', 'ESTOQUE_INVALIDO');
    }
    if (!Number.isInteger(quantidadeReservada) || quantidadeReservada < 0) {
      throw new DomainError('Quantidade reservada inválida', 'ESTOQUE_INVALIDO');
    }
    if (quantidadeReservada > quantidade) {
      throw new DomainError(
        'Quantidade reservada não pode exceder quantidade em estoque',
        'ESTOQUE_INVALIDO',
      );
    }
    return new Estoque({ quantidade, quantidadeReservada });
  }

  public get quantidade(): number {
    return this.props.quantidade;
  }

  public get quantidadeReservada(): number {
    return this.props.quantidadeReservada;
  }

  public get disponivel(): number {
    return this.props.quantidade - this.props.quantidadeReservada;
  }

  public baixar(qtd: number): Estoque {
    if (!Number.isInteger(qtd) || qtd <= 0) {
      throw new DomainError('Quantidade a baixar inválida', 'BAIXA_INVALIDA');
    }
    if (qtd > this.disponivel) {
      throw new DomainError('Estoque insuficiente para baixa', 'ESTOQUE_INSUFICIENTE');
    }
    return Estoque.create(this.props.quantidade - qtd, this.props.quantidadeReservada);
  }

  public repor(qtd: number): Estoque {
    if (!Number.isInteger(qtd) || qtd <= 0) {
      throw new DomainError('Quantidade a repor inválida', 'REPOSICAO_INVALIDA');
    }
    return Estoque.create(this.props.quantidade + qtd, this.props.quantidadeReservada);
  }

  public reservar(qtd: number): Estoque {
    if (!Number.isInteger(qtd) || qtd <= 0) {
      throw new DomainError('Quantidade a reservar inválida', 'RESERVA_INVALIDA');
    }
    if (qtd > this.disponivel) {
      throw new DomainError(
        'Estoque disponível insuficiente para reserva',
        'ESTOQUE_INSUFICIENTE',
      );
    }
    return Estoque.create(this.props.quantidade, this.props.quantidadeReservada + qtd);
  }

  public liberarReserva(qtd: number): Estoque {
    if (!Number.isInteger(qtd) || qtd <= 0) {
      throw new DomainError('Quantidade a liberar inválida', 'LIBERACAO_INVALIDA');
    }
    if (qtd > this.props.quantidadeReservada) {
      throw new DomainError(
        'Tentativa de liberar mais do que está reservado',
        'RESERVA_INCONSISTENTE',
      );
    }
    return Estoque.create(this.props.quantidade, this.props.quantidadeReservada - qtd);
  }

  public consumirReserva(qtd: number): Estoque {
    if (!Number.isInteger(qtd) || qtd <= 0) {
      throw new DomainError('Quantidade a consumir inválida', 'CONSUMO_INVALIDO');
    }
    if (qtd > this.props.quantidadeReservada) {
      throw new DomainError(
        'Tentativa de consumir mais do que está reservado',
        'RESERVA_INCONSISTENTE',
      );
    }
    return Estoque.create(
      this.props.quantidade - qtd,
      this.props.quantidadeReservada - qtd,
    );
  }
}
