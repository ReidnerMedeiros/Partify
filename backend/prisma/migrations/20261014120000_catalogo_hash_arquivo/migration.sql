-- AlterTable
ALTER TABLE "catalogos" ADD COLUMN "hashArquivo" TEXT;

-- CreateIndex
CREATE INDEX "catalogos_empresaId_hashArquivo_idx" ON "catalogos"("empresaId", "hashArquivo");
