-- AlterTable
ALTER TABLE "catalogos" ADD COLUMN     "confiancaCampos" JSONB,
ADD COLUMN     "confiancaGeral" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "pecas" ADD COLUMN     "confianca" DOUBLE PRECISION;
