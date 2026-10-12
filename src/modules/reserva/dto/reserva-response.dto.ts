import { ApiProperty } from '@nestjs/swagger';

import { Reserva, StatusReserva } from '../../../domain/reserva/entities/Reserva';

class ItemReservaResponseDto {
  @ApiProperty() insumoId!: string;
  @ApiProperty() quantidade!: number;
}

export class ReservaResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() osId!: string;
  @ApiProperty({ enum: StatusReserva }) status!: StatusReserva;
  @ApiProperty({ type: ItemReservaResponseDto, isArray: true }) itens!: ItemReservaResponseDto[];
  @ApiProperty() criadoEm!: Date;
  @ApiProperty() atualizadoEm!: Date;

  static fromDomain(reserva: Reserva): ReservaResponseDto {
    return {
      id: reserva.id.toValue(),
      osId: reserva.osId,
      status: reserva.status,
      itens: reserva.itens,
      criadoEm: reserva.criadoEm,
      atualizadoEm: reserva.atualizadoEm,
    };
  }
}
