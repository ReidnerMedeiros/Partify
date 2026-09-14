const { Router } = require("express");
const { asyncHandler } = require("../middlewares/asyncHandler");
const { upload } = require("../middlewares/uploadMiddleware");
const { catalogoController, authMiddleware } = require("../../main/factories");

const router = Router();

// RF06/RF07/RF08 — pré-condição 4.2 do DERS exige apenas que o ator tenha perfil
// Técnico, Vendedor ou Administrador; como esses são todos os perfis existentes no
// sistema, isso equivale hoje a "qualquer usuário autenticado" (authMiddleware).
router.post("/catalogos", authMiddleware, upload.single("arquivo"), asyncHandler(catalogoController.importar));
router.post("/catalogos/:id/extrair", authMiddleware, asyncHandler(catalogoController.reextrair));
router.put("/catalogos/:id/validar", authMiddleware, asyncHandler(catalogoController.validar));

// RF10 — Manter Documentos Pendentes (fila IRRESOLUVEL, A2 reenvio via
// POST /catalogos/:id/extrair já existente acima, A3 exclusão). Registradas
// ANTES de "GET/DELETE /catalogos/:id..." (RF09) de propósito: em Express,
// rotas literais como "/catalogos/pendentes" precisam vir antes de rotas
// dinâmicas como "/catalogos/:id", senão "pendentes" seria capturado como
// valor de :id e a rota do RF09 responderia primeiro.
router.get("/catalogos/pendentes", authMiddleware, asyncHandler(catalogoController.listarPendentes));
router.get("/catalogos/pendentes/:id", authMiddleware, asyncHandler(catalogoController.detalharPendente));
router.delete("/catalogos/pendentes/:id", authMiddleware, asyncHandler(catalogoController.excluirPendente));

// RF09 — Manter Catálogo (A2 consulta, A3 edição, A4 exclusão). Mesma
// pré-condição do RF06/07/08: qualquer perfil autenticado.
router.get("/catalogos", authMiddleware, asyncHandler(catalogoController.listar));
router.delete("/catalogos/pecas/:pecaId", authMiddleware, asyncHandler(catalogoController.excluirPeca));
router.get("/catalogos/:id/arquivo", authMiddleware, asyncHandler(catalogoController.baixarArquivo));
router.get("/catalogos/:id", authMiddleware, asyncHandler(catalogoController.detalhar));
router.put("/catalogos/:id", authMiddleware, asyncHandler(catalogoController.atualizar));

module.exports = { catalogoRoutes: router };
