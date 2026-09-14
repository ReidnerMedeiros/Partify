/*
  Warnings:

  - A unique constraint covering the columns `[empresaId,nome]` on the table `marcas` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `empresaId` to the `catalogos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresaId` to the `ferramentas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresaId` to the `marcas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresaId` to the `pecas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresaId` to the `validacoes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresaId` to the `versoes_tensao` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "marcas_nome_key";

-- AlterTable
ALTER TABLE "catalogos" ADD COLUMN     "empresaId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ferramentas" ADD COLUMN     "empresaId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "marcas" ADD COLUMN     "empresaId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "pecas" ADD COLUMN     "empresaId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "validacoes" ADD COLUMN     "empresaId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "versoes_tensao" ADD COLUMN     "empresaId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "catalogos_empresaId_idx" ON "catalogos"("empresaId");

-- CreateIndex
CREATE INDEX "ferramentas_empresaId_idx" ON "ferramentas"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "marcas_empresaId_nome_key" ON "marcas"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "pecas_empresaId_idx" ON "pecas"("empresaId");

-- CreateIndex
CREATE INDEX "validacoes_empresaId_idx" ON "validacoes"("empresaId");

-- CreateIndex
CREATE INDEX "versoes_tensao_empresaId_idx" ON "versoes_tensao"("empresaId");

-- AddForeignKey
ALTER TABLE "marcas" ADD CONSTRAINT "marcas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ferramentas" ADD CONSTRAINT "ferramentas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versoes_tensao" ADD CONSTRAINT "versoes_tensao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalogos" ADD CONSTRAINT "catalogos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pecas" ADD CONSTRAINT "pecas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validacoes" ADD CONSTRAINT "validacoes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
