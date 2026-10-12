import { Reserva, StatusReserva } from '../../src/domain/reserva/entities/Reserva';
import { IReservaRepository } from '../../src/domain/reserva/repositories/IReservaRepository';
import { ParticipanteTransacao } from './fake-transaction.manager';

function clonar(reserva: Reserva): Reserva {
  return Reserva.restaurar(
    { osId: reserva.osId, itens: reserva.itens, status: reserva.status },
    reserva.id,
  );
}

export class InMemoryReservaRepository implements IReservaRepository, ParticipanteTransacao {
  public reservas: Reserva[] = [];

  async salvar(reserva: Reserva): Promise<void> {
    const i = this.reservas.findIndex((x) => x.id.equals(reserva.id));
    if (i >= 0) this.reservas[i] = reserva;
    else this.reservas.push(reserva);
  }
  async buscarAtivaPorOs(osId: string): Promise<Reserva | null> {
    return this.reservas.find((r) => r.osId === osId && r.status === StatusReserva.ATIVA) ?? null;
  }
  async listarPorOs(osId: string): Promise<Reserva[]> {
    return this.reservas.filter((r) => r.osId === osId);
  }
  snapshot(): unknown {
    return this.reservas.map(clonar);
  }
  restaurar(estado: unknown): void {
    this.reservas = estado as Reserva[];
  }
}
