-- AlterTable
-- empresaId é nullable propositalmente: cobre os raríssimos casos em que a empresa
-- genuinamente não é identificável no momento do log (ex.: ACESSO_NAO_AUTORIZADO com
-- token ausente/ilegível). Todos os demais pontos de registro do sistema já preenchem
-- este campo (ver retrofit em CONTEXTO.md, decisão #27).
ALTER TABLE "logs_auditoria" ADD COLUMN     "empresaId" TEXT;

-- CreateIndex
CREATE INDEX "logs_auditoria_empresaId_idx" ON "logs_auditoria"("empresaId");

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
