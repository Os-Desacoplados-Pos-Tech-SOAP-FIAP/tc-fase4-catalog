import { AggregateRoot } from '../../shared/AggregateRoot';
import { DomainError } from '../../shared/DomainError';
import { EntityProps } from '../../shared/Entity';
import { UniqueID } from '../../shared/UniqueID';
import { EstoqueBaixado } from '../events/EstoqueBaixado';
import { CodigoPeca } from '../value-objects/CodigoPeca';
import { Estoque } from '../value-objects/Estoque';
import { ValorUnitario } from '../value-objects/ValorUnitario';

export enum TipoInsumo {
  PECA = 'PECA',
  INSUMO = 'INSUMO',
}

export interface InsumoProps extends EntityProps {
  codigo: CodigoPeca;
  nome: string;
  tipo: TipoInsumo;
  valorUnitario: ValorUnitario;
  estoque: Estoque;
}

export interface NovoInsumoInput {
  codigo: string;
  nome: string;
  tipo: TipoInsumo;
  valorUnitario: number;
  quantidadeEstoque: number;
  quantidadeReservada?: number;
}

export class Insumo extends AggregateRoot<InsumoProps> {
  private constructor(props: InsumoProps, id?: UniqueID) {
    super(props, id);
  }

  public static criar(input: NovoInsumoInput): Insumo {
    if (!input.nome || input.nome.trim().length < 2) {
      throw new DomainError('Nome do insumo inválido', 'INSUMO_NOME_INVALIDO');
    }
    return new Insumo({
      codigo: CodigoPeca.create(input.codigo),
      nome: input.nome.trim(),
      tipo: input.tipo,
      valorUnitario: ValorUnitario.create(input.valorUnitario),
      estoque: Estoque.create(input.quantidadeEstoque, input.quantidadeReservada ?? 0),
    });
  }

  public static restaurar(props: InsumoProps, id: UniqueID): Insumo {
    return new Insumo(props, id);
  }

  public get codigo(): CodigoPeca {
    return this.props.codigo;
  }
  public get nome(): string {
    return this.props.nome;
  }
  public get tipo(): TipoInsumo {
    return this.props.tipo;
  }
  public get valorUnitario(): ValorUnitario {
    return this.props.valorUnitario;
  }
  public get estoque(): Estoque {
    return this.props.estoque;
  }

  public atualizarValor(valor: number): void {
    this.props.valorUnitario = ValorUnitario.create(valor);
    this.touch();
  }

  public atualizarEstoque(quantidade: number): void {
    this.props.estoque = Estoque.create(
      quantidade,
      this.props.estoque.quantidadeReservada,
    );
    this.touch();
  }

  public baixarEstoque(qtd: number): void {
    this.props.estoque = this.props.estoque.baixar(qtd);
    this.touch();
    this.addDomainEvent(new EstoqueBaixado(this.id, qtd));
  }

  public reporEstoque(qtd: number): void {
    this.props.estoque = this.props.estoque.repor(qtd);
    this.touch();
  }

  public reservar(qtd: number): void {
    this.props.estoque = this.props.estoque.reservar(qtd);
    this.touch();
  }

  public liberarReserva(qtd: number): void {
    this.props.estoque = this.props.estoque.liberarReserva(qtd);
    this.touch();
  }

  public consumirReserva(qtd: number): void {
    this.props.estoque = this.props.estoque.consumirReserva(qtd);
    this.touch();
  }
}
