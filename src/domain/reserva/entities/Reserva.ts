import { AggregateRoot } from '../../shared/AggregateRoot';
import { DomainError } from '../../shared/DomainError';
import { EntityProps } from '../../shared/Entity';
import { UniqueID } from '../../shared/UniqueID';

export enum StatusReserva {
  ATIVA = 'ATIVA',
  LIBERADA = 'LIBERADA',
  BAIXADA = 'BAIXADA',
}

export interface ItemReserva {
  insumoId: string;
  quantidade: number;
}

export interface ReservaProps extends EntityProps {
  osId: string;
  itens: ItemReserva[];
  status: StatusReserva;
}

/**
 * Reserva de insumos de uma OS. Nasce ATIVA na aprovação do orçamento e termina
 * LIBERADA (compensação da saga) ou BAIXADA (após a execução).
 */
export class Reserva extends AggregateRoot<ReservaProps> {
  private constructor(props: ReservaProps, id?: UniqueID) {
    super(props, id);
  }

  public static criar(osId: string, itens: ItemReserva[]): Reserva {
    if (!osId || osId.trim() === '') {
      throw new DomainError('OS da reserva é obrigatória', 'RESERVA_OS_OBRIGATORIA');
    }
    const agrupados = new Map<string, number>();
    for (const item of itens) {
      if (!Number.isInteger(item.quantidade) || item.quantidade <= 0) {
        throw new DomainError(
          `Quantidade inválida para o insumo ${item.insumoId}`,
          'RESERVA_QUANTIDADE_INVALIDA',
        );
      }
      agrupados.set(item.insumoId, (agrupados.get(item.insumoId) ?? 0) + item.quantidade);
    }
    return new Reserva({
      osId,
      status: StatusReserva.ATIVA,
      itens: [...agrupados].map(([insumoId, quantidade]) => ({ insumoId, quantidade })),
    });
  }

  public static restaurar(props: ReservaProps, id: UniqueID): Reserva {
    return new Reserva(props, id);
  }

  public get osId(): string {
    return this.props.osId;
  }

  public get status(): StatusReserva {
    return this.props.status;
  }

  public get itens(): ItemReserva[] {
    return this.props.itens.map((item) => ({ ...item }));
  }

  public liberar(): void {
    this.garantirAtiva();
    this.props.status = StatusReserva.LIBERADA;
    this.touch();
  }

  public baixar(): void {
    this.garantirAtiva();
    this.props.status = StatusReserva.BAIXADA;
    this.touch();
  }

  private garantirAtiva(): void {
    if (this.props.status !== StatusReserva.ATIVA) {
      throw new DomainError(
        `Reserva da OS ${this.props.osId} não está ativa`,
        'RESERVA_NAO_ATIVA',
      );
    }
  }
}
