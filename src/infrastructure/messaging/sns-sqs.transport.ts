import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { MessageAttributeValue, SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Injectable } from '@nestjs/common';

import { MessageEnvelope } from '../../application/ports/message-envelope';

/** Publica num tópico SNS (ARN) ou fila SQS (URL), sempre FIFO e agrupado pela OS. */
@Injectable()
export class SnsSqsTransport {
  constructor(
    private readonly sns: SNSClient,
    private readonly sqs: SQSClient,
  ) {}

  async enviar(destino: string, envelope: MessageEnvelope, traceparent?: string | null): Promise<void> {
    const corpo = JSON.stringify(envelope);
    const atributos: Record<string, MessageAttributeValue> = {
      type: { DataType: 'String', StringValue: envelope.type },
    };
    if (traceparent) atributos.traceparent = { DataType: 'String', StringValue: traceparent };
    const comum = {
      MessageGroupId: envelope.correlationId,
      MessageDeduplicationId: envelope.messageId,
      MessageAttributes: atributos,
    };

    if (destino.startsWith('arn:aws:sns:')) {
      await this.sns.send(new PublishCommand({ TopicArn: destino, Message: corpo, ...comum }));
      return;
    }
    await this.sqs.send(new SendMessageCommand({ QueueUrl: destino, MessageBody: corpo, ...comum }));
  }
}
