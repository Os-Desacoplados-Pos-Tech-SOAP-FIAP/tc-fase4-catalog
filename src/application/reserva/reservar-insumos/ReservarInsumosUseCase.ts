import { Inject, Injectable } from '@nestjs/common';

import { INJECTION_TOKENS } from '../../../common/constants/injection-tokens';
import { IInsumoLockingRepository } from '../../../domain/insumo/repositories/IInsumoLockingRepository';
import { Reserva } from '../../../domain/reserva/entities/Reserva';
import { IReservaRepository } from '../../../domain/reserva/repositories/IReservaRepository';
import { DomainError } from '../../../domain/shared/DomainError';
import { UniqueID } from '../../../domain/shared/UniqueID';
import { ContextoMensagem, criarEnvelope } from '../../ports/message-envelope';
import { IOutbox } from '../../ports/outbox';
import { IProcessedMessageRepository } from '../../ports/processed-message.repository';
import { ITransactionManager } from '../../ports/transaction-manager';
import {
  CATALOG_EVENTS,
  InsumosReservadosPayload,
  ItemReservaPayload,
  ReservaInsumosFalhouPayload,
} from '../catalog-messages';
import { localizarInsumo } from '../localizar-insumo';

export interface ReservarInsumosInput extends ContextoMensagem {
  itens: ItemReservaPayload[];
}

/**
 * Passo compensável da saga: reserva tudo ou nada. Falha de negócio vira o evento
 * reserva-insumos-falhou (a saga compensa); falha de infraestrutura é propagada para
 * a mensagem voltar à fila e ser retentada.
 */
@Injectable()
export class ReservarInsumosUseCase {
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

  async execute(input: ReservarInsumosInput): Promise<void> {
    try {
      await this.transacao.run(() => this.reservar(input));
    } catch (erro) {
      if (!(erro instanceof DomainError)) throw erro;
      await this.transacao.run(() => this.registrarFalha(input, erro));
    }
  }

  private async reservar(input: ReservarInsumosInput): Promise<void> {
    if (!(await this.mensagensProcessadas.registrar(input.messageId))) return;

    const reserva =
      (await this.reservas.buscarAtivaPorOs(input.correlationId)) ??
      (await this.criarReserva(input));

    await this.outbox.publicar(
      criarEnvelope<InsumosReservadosPayload>(
        CATALOG_EVENTS.INSUMOS_RESERVADOS,
        input.correlationId,
        { osId: input.correlationId, reservaId: reserva.id.toValue(), itens: reserva.itens },
        input.messageId,
      ),
    );
  }

  private async criarReserva(input: ReservarInsumosInput): Promise<Reserva> {
    const reserva = Reserva.criar(input.correlationId, input.itens);
    const insumos = await this.insumos.buscarParaAtualizacao(
      reserva.itens.map((item) => new UniqueID(item.insumoId)),
    );
    for (const item of reserva.itens) {
      const insumo = localizarInsumo(insumos, item.insumoId);
      insumo.reservar(item.quantidade);
      await this.insumos.salvar(insumo);
    }
    await this.reservas.salvar(reserva);
    return reserva;
  }

  private async registrarFalha(input: ReservarInsumosInput, erro: DomainError): Promise<void> {
    if (!(await this.mensagensProcessadas.registrar(input.messageId))) return;
    await this.outbox.publicar(
      criarEnvelope<ReservaInsumosFalhouPayload>(
        CATALOG_EVENTS.RESERVA_INSUMOS_FALHOU,
        input.correlationId,
        { osId: input.correlationId, motivo: erro.code, mensagem: erro.message },
        input.messageId,
      ),
    );
  }
}
