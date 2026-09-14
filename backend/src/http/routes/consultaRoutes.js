const { Router } = require("express");
const { asyncHandler } = require("../middlewares/asyncHandler");
const { consultaController, authMiddleware } = require("../../main/factories");

const router = Router();

// RF11 — pré-condição 4.1 do DERS exige só que o ator esteja autenticado
// (Técnico, Vendedor ou Administrador) — mesma pré-condição do RF06/07/08/09/10.
router.get("/componentes", authMiddleware, asyncHandler(consultaController.buscar));

// RF12 — pré-condição 4.1 (mesma: ator autenticado). O corpo vai só {pergunta}.
router.post("/consulta-tecnica", authMiddleware, asyncHandler(consultaController.perguntar));

module.exports = { consultaRoutes: router };
