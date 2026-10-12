import {
  DeleteMessageCommand,
  Message,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';

import { lerEnvelope } from './message-envelope.parser';
import { MessageHandlerRegistry } from './message-handler.registry';
import { MESSAGING_CONFIG, MessagingConfig } from './messaging.config';

const PAUSA_APOS_ERRO_MS = 1000;

/**
 * Long-polling na fila FIFO de entrada. Mensagem processada é apagada; com falha,
 * fica na fila (volta após o visibility timeout e vai para a DLQ após 3 tentativas).
 * Depois de uma falha, as mensagens seguintes do mesmo grupo (OS) no lote são puladas
 * para não quebrar a ordem da saga.
 */
@Injectable()
export class SqsInboxConsumer implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(SqsInboxConsumer.name);
  private ativo = false;

  constructor(
    private readonly sqs: SQSClient,
    @Inject(MESSAGING_CONFIG) private readonly config: MessagingConfig,
    private readonly registry: MessageHandlerRegistry,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.enabled) return;
    this.ativo = true;
    void this.loop();
  }

  onApplicationShutdown(): void {
    this.ativo = false;
  }

  private async loop(): Promise<void> {
    while (this.ativo) {
      try {
        await this.consumirLote();
      } catch (erro) {
        this.logger.error(`Falha ao ler a fila de entrada: ${(erro as Error).message}`);
        await new Promise((resolve) => setTimeout(resolve, PAUSA_APOS_ERRO_MS));
      }
    }
  }

  async consumirLote(): Promise<void> {
    const resposta = await this.sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: this.config.inboxQueueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
        MessageSystemAttributeNames: ['MessageGroupId'],
        MessageAttributeNames: ['All'],
      }),
    );

    const gruposComFalha = new Set<string>();
    for (const mensagem of resposta.Messages ?? []) {
      const grupo = mensagem.Attributes?.MessageGroupId ?? '';
      if (gruposComFalha.has(grupo)) continue;
      if (!(await this.processar(mensagem))) gruposComFalha.add(grupo);
    }
  }

  private async processar(mensagem: Message): Promise<boolean> {
    try {
      await this.registry.despachar(lerEnvelope(mensagem.Body));
      await this.sqs.send(
        new DeleteMessageCommand({
          QueueUrl: this.config.inboxQueueUrl,
          ReceiptHandle: mensagem.ReceiptHandle,
        }),
      );
      return true;
    } catch (erro) {
      this.logger.error(
        `Falha ao processar a mensagem ${mensagem.MessageId}: ${(erro as Error).message}`,
      );
      return false;
    }
  }
}
