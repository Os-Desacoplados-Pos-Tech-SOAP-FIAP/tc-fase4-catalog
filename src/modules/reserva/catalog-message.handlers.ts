import { Injectable, OnModuleInit } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

import { BaixarReservasUseCase } from '../../application/reserva/baixar-reservas/BaixarReservasUseCase';
import { CATALOG_COMMANDS } from '../../application/reserva/catalog-messages';
import { LiberarReservasUseCase } from '../../application/reserva/liberar-reservas/LiberarReservasUseCase';
import { ReservarInsumosUseCase } from '../../application/reserva/reservar-insumos/ReservarInsumosUseCase';
import { MessageHandlerRegistry } from '../../infrastructure/messaging/message-handler.registry';
import { validarPayload } from '../../infrastructure/messaging/validar-payload';

class ItemReservaMensagem {
  @IsUUID() insumoId!: string;
  @IsInt() @Min(1) quantidade!: number;
}

class ReservarInsumosMensagem {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemReservaMensagem)
  itens!: ItemReservaMensagem[];
}

/** Liga os comandos recebidos na fila aos casos de uso de reserva. */
@Injectable()
export class CatalogMessageHandlers implements OnModuleInit {
  constructor(
    private readonly registry: MessageHandlerRegistry,
    private readonly reservar: ReservarInsumosUseCase,
    private readonly liberar: LiberarReservasUseCase,
    private readonly baixar: BaixarReservasUseCase,
  ) {}

  onModuleInit(): void {
    this.registry.registrar(CATALOG_COMMANDS.RESERVAR_INSUMOS, async (envelope) => {
      const payload = await validarPayload(ReservarInsumosMensagem, envelope.payload);
      await this.reservar.execute({
        messageId: envelope.messageId,
        correlationId: envelope.correlationId,
        itens: payload.itens,
      });
    });
    this.registry.registrar(CATALOG_COMMANDS.LIBERAR_RESERVAS, (envelope) =>
      this.liberar.execute({ messageId: envelope.messageId, correlationId: envelope.correlationId }),
    );
    this.registry.registrar(CATALOG_COMMANDS.BAIXAR_RESERVAS, (envelope) =>
      this.baixar.execute({ messageId: envelope.messageId, correlationId: envelope.correlationId }),
    );
  }
}
