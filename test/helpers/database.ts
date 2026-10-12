import { PrismaService } from '../../src/infrastructure/database/prisma.service';

export async function conectar(): Promise<PrismaService> {
  const prisma = new PrismaService();
  await prisma.$connect();
  return prisma;
}

export async function limparBanco(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "ReservaItem", "Reserva", "Insumo", "Servico", "Outbox", "ProcessedMessage" CASCADE',
  );
}
