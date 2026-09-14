-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "StatusEmpresa" AS ENUM ('ATIVA', 'INATIVA');

-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMINISTRADOR', 'TECNICO', 'VENDEDOR');

-- CreateEnum
CREATE TYPE "TipoAcao" AS ENUM ('LOGIN', 'LOGOUT', 'UPLOAD_VISTA_EXPLODIDA', 'EXTRACAO_IA', 'VALIDACAO_HITL', 'CRIACAO_USUARIO', 'EDICAO_USUARIO', 'ATIVAR_DESATIVAR_USUARIO', 'ALTERACAO_SENHA', 'EDICAO_REGISTRO', 'EXCLUSAO_REGISTRO', 'CRIACAO_EMPRESA', 'ATIVAR_DESATIVAR_EMPRESA', 'ACESSO_NAO_AUTORIZADO', 'ARQUIVAMENTO_DOCUMENTO');

-- CreateEnum
CREATE TYPE "EnumTensao" AS ENUM ('V127', 'V220', 'BIVOLT', 'NAO_INFORMADO');

-- CreateEnum
CREATE TYPE "StatusCatalogo" AS ENUM ('PENDENTE_EXTRACAO', 'PENDENTE_VALIDACAO', 'VALIDADO', 'IRRESOLUVEL');

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpjCpf" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "StatusEmpresa" NOT NULL DEFAULT 'ATIVA',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "empresaId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessoes_revogadas" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "revogadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessoes_revogadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_redefinicao_senha" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_redefinicao_senha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "tipoAcao" "TipoAcao" NOT NULL,
    "registroAfetado" TEXT,
    "detalhes" JSONB,
    "realizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marcas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "marcas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ferramentas" (
    "id" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "marcaId" TEXT NOT NULL,

    CONSTRAINT "ferramentas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versoes_tensao" (
    "id" TEXT NOT NULL,
    "tensao" "EnumTensao" NOT NULL,
    "ferramentaId" TEXT NOT NULL,

    CONSTRAINT "versoes_tensao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalogos" (
    "id" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "caminhoArquivo" TEXT NOT NULL,
    "status" "StatusCatalogo" NOT NULL DEFAULT 'PENDENTE_EXTRACAO',
    "motivoPendencia" TEXT,
    "camposAusentes" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pecas" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT,
    "posicaoVisual" TEXT,
    "versaoTensaoId" TEXT NOT NULL,
    "catalogoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "embedding" vector(768),

    CONSTRAINT "pecas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validacoes" (
    "id" TEXT NOT NULL,
    "catalogoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "validadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacoes" TEXT,

    CONSTRAINT "validacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_cnpjCpf_key" ON "empresas"("cnpjCpf");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_login_key" ON "usuarios"("login");

-- CreateIndex
CREATE UNIQUE INDEX "sessoes_revogadas_jti_key" ON "sessoes_revogadas"("jti");

-- CreateIndex
CREATE INDEX "sessoes_revogadas_expiraEm_idx" ON "sessoes_revogadas"("expiraEm");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_redefinicao_senha_tokenHash_key" ON "tokens_redefinicao_senha"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "marcas_nome_key" ON "marcas"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "ferramentas_marcaId_modelo_key" ON "ferramentas"("marcaId", "modelo");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessoes_revogadas" ADD CONSTRAINT "sessoes_revogadas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_redefinicao_senha" ADD CONSTRAINT "tokens_redefinicao_senha_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ferramentas" ADD CONSTRAINT "ferramentas_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "marcas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versoes_tensao" ADD CONSTRAINT "versoes_tensao_ferramentaId_fkey" FOREIGN KEY ("ferramentaId") REFERENCES "ferramentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pecas" ADD CONSTRAINT "pecas_versaoTensaoId_fkey" FOREIGN KEY ("versaoTensaoId") REFERENCES "versoes_tensao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pecas" ADD CONSTRAINT "pecas_catalogoId_fkey" FOREIGN KEY ("catalogoId") REFERENCES "catalogos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validacoes" ADD CONSTRAINT "validacoes_catalogoId_fkey" FOREIGN KEY ("catalogoId") REFERENCES "catalogos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validacoes" ADD CONSTRAINT "validacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
