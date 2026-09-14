-- DropForeignKey
ALTER TABLE "logs_auditoria" DROP CONSTRAINT "logs_auditoria_empresaId_fkey";

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
