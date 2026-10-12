import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { INJECTION_TOKENS } from '../common/constants/injection-tokens';
import { JwtStrategy } from './auth/jwt.strategy';
import { DatabaseModule } from './database/database.module';
import { PrismaTransactionManager } from './database/prisma-transaction.manager';
import { MessagingModule } from './messaging/messaging.module';
import { PrismaInsumoRepository } from './repositories/PrismaInsumoRepository';
import { PrismaOutbox } from './repositories/PrismaOutbox';
import { PrismaProcessedMessageRepository } from './repositories/PrismaProcessedMessageRepository';
import { PrismaReservaRepository } from './repositories/PrismaReservaRepository';
import { PrismaServicoRepository } from './repositories/PrismaServicoRepository';

const bindings = [
  { provide: INJECTION_TOKENS.SERVICO_REPOSITORY, useClass: PrismaServicoRepository },
  { provide: INJECTION_TOKENS.INSUMO_REPOSITORY, useClass: PrismaInsumoRepository },
  { provide: INJECTION_TOKENS.RESERVA_REPOSITORY, useClass: PrismaReservaRepository },
  {
    provide: INJECTION_TOKENS.PROCESSED_MESSAGE_REPOSITORY,
    useClass: PrismaProcessedMessageRepository,
  },
  { provide: INJECTION_TOKENS.OUTBOX, useClass: PrismaOutbox },
  { provide: INJECTION_TOKENS.TRANSACTION_MANAGER, useExisting: PrismaTransactionManager },
];

@Global()
@Module({
  imports: [DatabaseModule, MessagingModule, PassportModule],
  providers: [...bindings, JwtStrategy],
  exports: bindings.map((binding) => binding.provide),
})
export class InfrastructureModule {}
