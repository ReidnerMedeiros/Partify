const { Router } = require("express");
const { prisma } = require("../../infra/database/prismaClient");
const { empresaRoutes } = require("./empresaRoutes");
const { authRoutes } = require("./authRoutes");
const { usuarioRoutes } = require("./usuarioRoutes");
const { catalogoRoutes } = require("./catalogoRoutes");
const { consultaRoutes } = require("./consultaRoutes");
const { logAuditoriaRoutes } = require("./logAuditoriaRoutes");

const router = Router();

/**
 * Health check. Além de servir pra monitoramento comum, faz uma consulta real
 * no banco (`SELECT 1`) de propósito — planos gratuitos do Supabase pausam o
 * projeto inteiro após 7 dias sem nenhuma consulta ao banco (não conta visita
 * ao dashboard nem só requisição HTTP à API, tem que ser query de verdade). Um
 * workflow agendado (`.github/workflows/keepalive.yml`) chama essa rota
 * periodicamente só pra manter essa atividade, evitando o pause automático.
 */
router.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok", database: "ok" });
  } catch (erro) {
    console.error("[health] falha ao consultar o banco:", erro.message); // eslint-disable-line no-console
    res.status(503).json({ status: "erro", database: "indisponivel" });
  }
});

router.use(empresaRoutes);
router.use(authRoutes);
router.use(usuarioRoutes);
router.use(catalogoRoutes);
router.use(consultaRoutes);
router.use(logAuditoriaRoutes);

module.exports = { routes: router };
