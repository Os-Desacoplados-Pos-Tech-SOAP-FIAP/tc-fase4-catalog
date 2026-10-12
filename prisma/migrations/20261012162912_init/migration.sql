-- CreateEnum
CREATE TYPE "TipoInsumo" AS ENUM ('PECA', 'INSUMO');

-- CreateEnum
CREATE TYPE "StatusReserva" AS ENUM ('ATIVA', 'LIBERADA', 'BAIXADA');

-- CreateTable
CREATE TABLE "Servico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valorPadrao" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insumo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoInsumo" NOT NULL,
    "valorUnitario" DECIMAL(10,2) NOT NULL,
    "quantidadeEstoque" INTEGER NOT NULL,
    "quantidadeReservada" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insumo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" TEXT NOT NULL,
    "osId" TEXT NOT NULL,
    "status" "StatusReserva" NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservaItem" (
    "id" TEXT NOT NULL,
    "reservaId" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "ReservaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outbox" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publicadoEm" TIMESTAMP(3),

    CONSTRAINT "Outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedMessage" (
    "messageId" TEXT NOT NULL,
    "processadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedMessage_pkey" PRIMARY KEY ("messageId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Insumo_codigo_key" ON "Insumo"("codigo");

-- CreateIndex
CREATE INDEX "Reserva_osId_status_idx" ON "Reserva"("osId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Outbox_messageId_key" ON "Outbox"("messageId");

-- CreateIndex
CREATE INDEX "Outbox_publicadoEm_criadoEm_idx" ON "Outbox"("publicadoEm", "criadoEm");

-- AddForeignKey
ALTER TABLE "ReservaItem" ADD CONSTRAINT "ReservaItem_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva"("id") ON DELETE CASCADE ON UPDATE CASCADE;
