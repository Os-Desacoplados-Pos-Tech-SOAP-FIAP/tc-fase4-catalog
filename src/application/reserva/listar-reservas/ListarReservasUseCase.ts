import { Inject, Injectable } from '@nestjs/common';

import { INJECTION_TOKENS } from '../../../common/constants/injection-tokens';
import { Reserva } from '../../../domain/reserva/entities/Reserva';
import { IReservaRepository } from '../../../domain/reserva/repositories/IReservaRepository';

@Injectable()
export class ListarReservasUseCase {
  constructor(
    @Inject(INJECTION_TOKENS.RESERVA_REPOSITORY)
    private readonly reservas: IReservaRepository,
  ) {}

  async execute(osId: string): Promise<Reserva[]> {
    return this.reservas.listarPorOs(osId);
  }
}
