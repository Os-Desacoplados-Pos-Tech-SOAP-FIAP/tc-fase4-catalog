import { Module } from '@nestjs/common';

import { BaixarReservasUseCase } from '../../application/reserva/baixar-reservas/BaixarReservasUseCase';
import { LiberarReservasUseCase } from '../../application/reserva/liberar-reservas/LiberarReservasUseCase';
import { ListarReservasUseCase } from '../../application/reserva/listar-reservas/ListarReservasUseCase';
import { ReservarInsumosUseCase } from '../../application/reserva/reservar-insumos/ReservarInsumosUseCase';
import { CatalogMessageHandlers } from './catalog-message.handlers';
import { ReservaController } from './reserva.controller';

@Module({
  controllers: [ReservaController],
  providers: [
    ReservarInsumosUseCase,
    LiberarReservasUseCase,
    BaixarReservasUseCase,
    ListarReservasUseCase,
    CatalogMessageHandlers,
  ],
})
export class ReservaModule {}
