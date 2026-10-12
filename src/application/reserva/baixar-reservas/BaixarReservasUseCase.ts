import { Inject, Injectable } from '@nestjs/common';

import { INJECTION_TOKENS } from '../../../common/constants/injection-tokens';
import { IInsumoLockingRepository } from '../../../domain/insumo/repositories/IInsumoLockingRepository';
import { IReservaRepository } from '../../../domain/reserva/repositories/IReservaRepository';
import { UniqueID } from '../../../domain/shared/UniqueID';
import { ContextoMensagem, criarEnvelope } from '../../ports/message-envelope';
import { IOutbox } from '../../ports/outbox';
import { IProcessedMessageRepository } from '../../ports/processed-message.repository';
import { ITransactionManager } from '../../ports/transaction-manager';
import { CATALOG_EVENTS, EstoqueBaixadoPayload } from '../catalog-messages';
import { localizarInsumo } from '../localizar-insumo';

/** Passo repetível pós-pivô: consome do estoque o que estava reservado para a OS. */
@Injectable()
export class BaixarReservasUseCase {
  constructor(
    @Inject(INJECTION_TOKENS.TRANSACTION_MANAGER)
    private readonly transacao: ITransactionManager,
    @Inject(INJECTION_TOKENS.PROCESSED_MESSAGE_REPOSITORY)
    private readonly mensagensProcessadas: IProcessedMessageRepository,
    @Inject(INJECTION_TOKENS.INSUMO_REPOSITORY)
    private readonly insumos: IInsumoLockingRepository,
    @Inject(INJECTION_TOKENS.RESERVA_REPOSITORY)
    private readonly reservas: IReservaRepository,
    @Inject(INJECTION_TOKENS.OUTBOX)
    private readonly outbox: IOutbox,
  ) {}

  async execute(input: ContextoMensagem): Promise<void> {
    await this.transacao.run(async () => {
      if (!(await this.mensagensProcessadas.registrar(input.messageId))) return;

      const reserva = await this.reservas.buscarAtivaPorOs(input.correlationId);
      if (reserva) {
        const insumos = await this.insumos.buscarParaAtualizacao(
          reserva.itens.map((item) => new UniqueID(item.insumoId)),
        );
        for (const item of reserva.itens) {
          const insumo = localizarInsumo(insumos, item.insumoId);
          insumo.consumirReserva(item.quantidade);
          await this.insumos.salvar(insumo);
        }
        reserva.baixar();
        await this.reservas.salvar(reserva);
      }

      await this.outbox.publicar(
        criarEnvelope<EstoqueBaixadoPayload>(
          CATALOG_EVENTS.ESTOQUE_BAIXADO,
          input.correlationId,
          { osId: input.correlationId, itens: reserva?.itens ?? [] },
          input.messageId,
        ),
      );
    });
  }
}
