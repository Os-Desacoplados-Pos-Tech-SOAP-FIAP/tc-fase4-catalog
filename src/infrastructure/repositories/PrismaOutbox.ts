import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { MessageEnvelope } from '../../application/ports/message-envelope';
import { IOutbox } from '../../application/ports/outbox';
import { PrismaTransactionManager } from '../database/prisma-transaction.manager';
import { MESSAGING_CONFIG, MessagingConfig } from '../messaging/messaging.config';

@Injectable()
export class PrismaOutbox implements IOutbox {
  constructor(
    private readonly db: PrismaTransactionManager,
    @Inject(MESSAGING_CONFIG) private readonly config: MessagingConfig,
  ) {}

  async publicar(envelope: MessageEnvelope): Promise<void> {
    await this.db.client.outbox.create({
      data: {
        messageId: envelope.messageId,
        type: envelope.type,
        destination: this.config.eventsTopicArn,
        groupId: envelope.correlationId,
        body: envelope as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
