import { SNSClient } from '@aws-sdk/client-sns';
import { SQSClient } from '@aws-sdk/client-sqs';
import { Global, Module } from '@nestjs/common';

import { MessageHandlerRegistry } from './message-handler.registry';
import { lerMessagingConfig, MESSAGING_CONFIG, MessagingConfig } from './messaging.config';
import { OutboxPublisher } from './outbox.publisher';
import { SnsSqsTransport } from './sns-sqs.transport';
import { SqsInboxConsumer } from './sqs-inbox.consumer';

@Global()
@Module({
  providers: [
    { provide: MESSAGING_CONFIG, useFactory: () => lerMessagingConfig(process.env) },
    {
      provide: SQSClient,
      inject: [MESSAGING_CONFIG],
      useFactory: (config: MessagingConfig) =>
        new SQSClient({ region: config.region, endpoint: config.endpoint }),
    },
    {
      provide: SNSClient,
      inject: [MESSAGING_CONFIG],
      useFactory: (config: MessagingConfig) =>
        new SNSClient({ region: config.region, endpoint: config.endpoint }),
    },
    SnsSqsTransport,
    MessageHandlerRegistry,
    SqsInboxConsumer,
    OutboxPublisher,
  ],
  exports: [MESSAGING_CONFIG, MessageHandlerRegistry],
})
export class MessagingModule {}
