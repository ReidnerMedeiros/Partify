const { Router } = require("express");
const { asyncHandler } = require("../middlewares/asyncHandler");
const { logAuditoriaController, authMiddleware, exigirAdministrador } = require("../../main/factories");

const router = Router();

// RF13 — Manter Log Sistema. Pré-condição 4.1 do DERS: exclusivo do
// Administrador (RNF06) — exigirAdministrador já cobre a exceção E2 (perfil
// sem permissão tentando acessar diretamente é bloqueado e logado como
// ACESSO_NAO_AUTORIZADO, RNF07).
router.get("/log-auditoria", authMiddleware, exigirAdministrador, asyncHandler(logAuditoriaController.consultar));

module.exports = { logAuditoriaRoutes: router };
