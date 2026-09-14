const { Router } = require("express");
const { empresaRoutes } = require("./empresaRoutes");
const { authRoutes } = require("./authRoutes");
const { usuarioRoutes } = require("./usuarioRoutes");
const { catalogoRoutes } = require("./catalogoRoutes");
const { consultaRoutes } = require("./consultaRoutes");
const { logAuditoriaRoutes } = require("./logAuditoriaRoutes");

const router = Router();

router.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

router.use(empresaRoutes);
router.use(authRoutes);
router.use(usuarioRoutes);
router.use(catalogoRoutes);
router.use(consultaRoutes);
router.use(logAuditoriaRoutes);

module.exports = { routes: router };
