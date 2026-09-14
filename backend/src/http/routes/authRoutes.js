const { Router } = require("express");
const { asyncHandler } = require("../middlewares/asyncHandler");
const { authController, authMiddleware } = require("../../main/factories");

const router = Router();

// RF02 — Realizar Login (fluxo básico)
router.post("/auth/login", asyncHandler(authController.login));

// RF02 — fluxo alternativo A1 (Logout), exige sessão autenticada
router.post("/auth/logout", authMiddleware, asyncHandler(authController.logout));

// RF03 — Recuperar Senha (fluxo básico + exceção E1, resolvidos dentro do use case)
router.post("/auth/recuperar-senha", asyncHandler(authController.recuperarSenha));

// RF04 — fluxo alternativo A1 (Redefinir Senha via link do RF03)
router.post("/auth/redefinir-senha", asyncHandler(authController.redefinirSenha));

// RF04 — fluxo básico (Alterar Senha), exige sessão autenticada (RNF06)
router.post("/auth/alterar-senha", authMiddleware, asyncHandler(authController.alterarSenha));

module.exports = { authRoutes: router };
