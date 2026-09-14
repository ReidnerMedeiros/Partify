const { Router } = require("express");
const { asyncHandler } = require("../middlewares/asyncHandler");
const { usuarioController, authMiddleware, exigirAdministrador } = require("../../main/factories");

const router = Router();

// RF05 — Manter Usuário. Todas as rotas exigem administrador autenticado
// (RNF06 + pré-condição do RF05).
router.post("/usuarios", authMiddleware, exigirAdministrador, asyncHandler(usuarioController.criar));
router.get("/usuarios", authMiddleware, exigirAdministrador, asyncHandler(usuarioController.listar));
router.put("/usuarios/:id", authMiddleware, exigirAdministrador, asyncHandler(usuarioController.atualizar));
router.patch("/usuarios/:id/desativar", authMiddleware, exigirAdministrador, asyncHandler(usuarioController.desativar));
router.patch("/usuarios/:id/reativar", authMiddleware, exigirAdministrador, asyncHandler(usuarioController.reativar));

module.exports = { usuarioRoutes: router };
