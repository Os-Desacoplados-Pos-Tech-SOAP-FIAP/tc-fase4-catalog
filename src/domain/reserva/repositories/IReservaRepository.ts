import { Reserva } from '../entities/Reserva';

export interface IReservaRepository {
  salvar(reserva: Reserva): Promise<void>;
  buscarAtivaPorOs(osId: string): Promise<Reserva | null>;
  listarPorOs(osId: string): Promise<Reserva[]>;
}
