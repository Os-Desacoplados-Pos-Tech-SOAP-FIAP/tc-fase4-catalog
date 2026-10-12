import { MessageEnvelope } from './message-envelope';

/** Grava um evento para publicação no tópico do serviço, na transação corrente. */
export interface IOutbox {
  publicar(envelope: MessageEnvelope): Promise<void>;
}
