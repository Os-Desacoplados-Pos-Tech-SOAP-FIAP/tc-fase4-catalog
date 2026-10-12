-- Índice parcial para a seleção de cabeças da outbox (DISTINCT ON "groupId" ORDER BY "groupId",
-- "seq" só entre pendentes). O schema Prisma não expressa índice com WHERE, por isso ele vive
-- só nesta migração (ver comentário em model Outbox).
CREATE INDEX "Outbox_pendentes_grupo_idx" ON "Outbox"("groupId", "seq") WHERE "publicadoEm" IS NULL;
