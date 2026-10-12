-- DropIndex
DROP INDEX "Outbox_publicadoEm_criadoEm_idx";

-- AlterTable
ALTER TABLE "Outbox" ADD COLUMN     "seq" BIGSERIAL NOT NULL,
ADD COLUMN     "tentativas" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ultimoErro" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Outbox_seq_key" ON "Outbox"("seq");

-- CreateIndex
CREATE INDEX "Outbox_publicadoEm_seq_idx" ON "Outbox"("publicadoEm", "seq");

