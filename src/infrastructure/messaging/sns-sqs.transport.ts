import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Injectable } from '@nestjs/common';

import { MessageEnvelope } from '../../application/ports/message-envelope';

/** Publica num tópico SNS (ARN) ou fila SQS (URL), sempre FIFO e agrupado pela OS. */
@Injectable()
export class SnsSqsTransport {
  constructor(
    private readonly sns: SNSClient,
    private readonly sqs: SQSClient,
  ) {}

  async enviar(destino: string, envelope: MessageEnvelope): Promise<void> {
    const corpo = JSON.stringify(envelope);
    const comum = {
      MessageGroupId: envelope.correlationId,
      MessageDeduplicationId: envelope.messageId,
      MessageAttributes: { type: { DataType: 'String', StringValue: envelope.type } },
    };

    if (destino.startsWith('arn:aws:sns:')) {
      await this.sns.send(new PublishCommand({ TopicArn: destino, Message: corpo, ...comum }));
      return;
    }
    await this.sqs.send(new SendMessageCommand({ QueueUrl: destino, MessageBody: corpo, ...comum }));
  }
}
