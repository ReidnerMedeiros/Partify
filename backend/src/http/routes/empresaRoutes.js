const { Router } = require("express");
const { asyncHandler } = require("../middlewares/asyncHandler");
const { empresaController, authMiddleware, exigirAdministrador } = require("../../main/factories");

const router = Router();

// Público — primeiro contato do usuário com o sistema (RF01, fluxo básico)
router.post("/empresas", asyncHandler(empresaController.cadastrar));

// Autenticado — fluxo alternativo A1 (consulta e atualização)
router.get("/empresas/me", authMiddleware, asyncHandler(empresaController.consultarMinhaEmpresa));
router.put("/empresas/me", authMiddleware, asyncHandler(empresaController.atualizarMinhaEmpresa));

// Autenticado + administrador — fluxo alternativo A2 (desativação)
router.patch(
  "/empresas/me/desativar",
  authMiddleware,
  exigirAdministrador,
  asyncHandler(empresaController.desativarMinhaEmpresa)
);

module.exports = { empresaRoutes: router };
