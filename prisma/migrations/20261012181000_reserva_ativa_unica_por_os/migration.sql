-- Índice único parcial: no máximo uma reserva ATIVA por OS. O schema Prisma não expressa
-- índice parcial, por isso ele vive só nesta migração (ver comentário em model Reserva).
CREATE UNIQUE INDEX "Reserva_osId_ativa_key" ON "Reserva"("osId") WHERE "status" = 'ATIVA';
