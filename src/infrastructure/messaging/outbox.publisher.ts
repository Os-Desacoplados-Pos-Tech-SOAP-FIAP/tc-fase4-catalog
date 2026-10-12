import {
  BeforeApplicationShutdown,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';

import { MessageEnvelope } from '../../application/ports/message-envelope';
import { PrismaService } from '../database/prisma.service';
import { MESSAGING_CONFIG, MessagingConfig } from './messaging.config';
import { SnsSqsTransport } from './sns-sqs.transport';

const INTERVALO_MS = 1000;
const LOTE = 10;
const TAMANHO_MAXIMO_ERRO = 500;

/**
 * Chave do advisory lock que elege um único publicador por serviço. Só precisaria ser
 * diferente entre serviços se eles compartilhassem o mesmo banco (não compartilham).
 */
export const OUTBOX_LOCK_KEY = 4_271_001;

/** A transação segura o lock durante os envios de rede; o timeout padrão (5s) seria curto. */
const OPCOES_TRANSACAO = { timeout: 15_000, maxWait: 5_000 };

/**
 * Passado esse tempo no lote, não começa novos envios: o resto fica para o próximo ciclo.
 * Evita que um SNS lento estoure o timeout da transação e desfaça o lote inteiro a cada ciclo.
 */
const PRAZO_NOVOS_ENVIOS_MS = 5_000;

interface OutboxPendente {
  id: string;
  groupId: string;
  type: string;
  destination: string;
  body: MessageEnvelope;
}

/**
 * Publica a outbox em ordem de `seq` com um único publicador ativo (advisory lock): com
 * duas réplicas publicando, mensagens da mesma OS poderiam sair fora de ordem. Falha num
 * envio afeta só a OS da mensagem: as seguintes dela ficam para depois e as outras OS seguem.
 * Reenvio (ex.: transação desfeita após envio) é absorvido pela deduplicação FIFO e pela
 * idempotência dos consumidores.
 */
@Injectable()
export class OutboxPublisher implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly logger = new Logger(OutboxPublisher.name);
  private timer?: NodeJS.Timeout;
  private cicloAtual?: Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly transporte: SnsSqsTransport,
    @Inject(MESSAGING_CONFIG) private readonly config: MessagingConfig,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.config.enabled) return;
    this.timer = setInterval(() => void this.ciclo(), INTERVALO_MS);
  }

  /** Roda antes do Prisma desconectar: espera o ciclo em andamento terminar. */
  async beforeApplicationShutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.cicloAtual;
  }

  private ciclo(): Promise<void> {
    this.cicloAtual ??= this.publicarComLog().finally(() => (this.cicloAtual = undefined));
    return this.cicloAtual;
  }

  private async publicarComLog(): Promise<void> {
    try {
      await this.publicarPendentes();
    } catch (erro) {
      this.logger.error(`Falha ao publicar a outbox: ${(erro as Error).message}`);
    }
  }

  async publicarPendentes(): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const [{ obtido }] = await tx.$queryRaw<{ obtido: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(${OUTBOX_LOCK_KEY}::bigint) AS "obtido"`;
      if (!obtido) return 0; // outra réplica está publicando

      // Sem FOR UPDATE: o advisory lock já garante um só publicador, lock de linha seria redundante.
      const pendentes = await tx.$queryRaw<OutboxPendente[]>`
        SELECT "id", "groupId", "type", "destination", "body" FROM "Outbox"
        WHERE "publicadoEm" IS NULL
        ORDER BY "seq"
        LIMIT ${LOTE}`;

      const inicio = Date.now();
      const enviados: string[] = [];
      const gruposComFalha = new Set<string>();
      for (const pendente of pendentes) {
        if (Date.now() - inicio > PRAZO_NOVOS_ENVIOS_MS) break;
        if (gruposComFalha.has(pendente.groupId)) continue;
        try {
          await this.transporte.enviar(pendente.destination, pendente.body);
          enviados.push(pendente.id);
        } catch (erro) {
          gruposComFalha.add(pendente.groupId);
          const motivo = (erro as Error).message;
          this.logger.error(
            `Falha ao publicar outbox id=${pendente.id} groupId=${pendente.groupId} type=${pendente.type}: ${motivo}`,
          );
          await tx.outbox.update({
            where: { id: pendente.id },
            data: { tentativas: { increment: 1 }, ultimoErro: motivo.slice(0, TAMANHO_MAXIMO_ERRO) },
          });
        }
      }

      if (enviados.length > 0) {
        await tx.outbox.updateMany({
          where: { id: { in: enviados } },
          data: { publicadoEm: new Date() },
        });
      }
      return enviados.length;
    }, OPCOES_TRANSACAO);
  }
}
