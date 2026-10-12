import { SNSClient } from '@aws-sdk/client-sns';
import { SQSClient } from '@aws-sdk/client-sqs';
import { Global, Module } from '@nestjs/common';
import { NodeHttpHandler } from '@smithy/node-http-handler';

import { MessageHandlerRegistry } from './message-handler.registry';
import { lerMessagingConfig, MESSAGING_CONFIG, MessagingConfig } from './messaging.config';
import { OutboxPublisher } from './outbox.publisher';
import { SnsSqsTransport } from './sns-sqs.transport';
import { SqsInboxConsumer } from './sqs-inbox.consumer';

@Global()
@Module({
  providers: [
    { provide: MESSAGING_CONFIG, useFactory: () => lerMessagingConfig(process.env) },
    // Sem timeout, o SDK espera a rede indefinidamente. O SNS só publica (de dentro da
    // transação da outbox), então o timeout é curto. O SQS também faz o long-poll de
    // 20s do consumidor: o timeout precisa ficar acima disso para não cortar o Receive.
    {
      provide: SQSClient,
      inject: [MESSAGING_CONFIG],
      useFactory: (config: MessagingConfig) =>
        new SQSClient({
          region: config.region,
          endpoint: config.endpoint,
          requestHandler: new NodeHttpHandler({ requestTimeout: 25_000, connectionTimeout: 2000 }),
        }),
    },
    {
      provide: SNSClient,
      inject: [MESSAGING_CONFIG],
      useFactory: (config: MessagingConfig) =>
        new SNSClient({
          region: config.region,
          endpoint: config.endpoint,
          requestHandler: new NodeHttpHandler({ requestTimeout: 3000, connectionTimeout: 2000 }),
        }),
    },
    SnsSqsTransport,
    MessageHandlerRegistry,
    SqsInboxConsumer,
    OutboxPublisher,
  ],
  exports: [MESSAGING_CONFIG, MessageHandlerRegistry],
})
export class MessagingModule {}
