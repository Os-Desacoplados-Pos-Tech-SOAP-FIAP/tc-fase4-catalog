import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';

import { MessageEnvelope } from '../../application/ports/message-envelope';
import { PrismaService } from '../database/prisma.service';
import { MESSAGING_CONFIG, MessagingConfig } from './messaging.config';
import { SnsSqsTransport } from './sns-sqs.transport';

const INTERVALO_MS = 1000;
const LOTE = 50;

interface OutboxPendente {
  id: string;
  destination: string;
  body: MessageEnvelope;
}

/**
 * Publica a outbox. `FOR UPDATE SKIP LOCKED` deixa várias réplicas trabalharem sem
 * pegar a mesma linha. Se o envio falhar no meio do lote, a transação desfaz as marcações
 * e o lote volta no próximo ciclo (reenvio é absorvido pela deduplicação FIFO e pela
 * idempotência dos consumidores).
 */
@Injectable()
export class OutboxPublisher implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxPublisher.name);
  private timer?: NodeJS.Timeout;
  private executando = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly transporte: SnsSqsTransport,
    @Inject(MESSAGING_CONFIG) private readonly config: MessagingConfig,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.enabled) return;
    this.timer = setInterval(() => void this.ciclo(), INTERVALO_MS);
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async ciclo(): Promise<void> {
    if (this.executando) return;
    this.executando = true;
    try {
      await this.publicarPendentes();
    } catch (erro) {
      this.logger.error(`Falha ao publicar a outbox: ${(erro as Error).message}`);
    } finally {
      this.executando = false;
    }
  }

  async publicarPendentes(): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const pendentes = await tx.$queryRaw<OutboxPendente[]>`
        SELECT "id", "destination", "body" FROM "Outbox"
        WHERE "publicadoEm" IS NULL
        ORDER BY "criadoEm"
        LIMIT ${LOTE}
        FOR UPDATE SKIP LOCKED`;
      for (const pendente of pendentes) {
        await this.transporte.enviar(pendente.destination, pendente.body);
        await tx.outbox.update({ where: { id: pendente.id }, data: { publicadoEm: new Date() } });
      }
      return pendentes.length;
    });
  }
}
