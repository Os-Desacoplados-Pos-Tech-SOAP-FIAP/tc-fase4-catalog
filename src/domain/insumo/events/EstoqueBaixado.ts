import { BaseDomainEvent } from '../../shared/DomainEvent';
import { EVENTS } from '../../shared/events/EventNames';
import { UniqueID } from '../../shared/UniqueID';

export class EstoqueBaixado extends BaseDomainEvent {
  constructor(
    aggregateId: UniqueID,
    public readonly quantidade: number,
  ) {
    super(aggregateId, EVENTS.ESTOQUE_BAIXADO, 'EstoqueBaixado');
  }
}
