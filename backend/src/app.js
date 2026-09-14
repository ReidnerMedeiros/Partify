const express = require("express");
const cors = require("cors");
const { routes } = require("./http/routes");
const { errorHandler } = require("./http/middlewares/errorHandler");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
  })
);
app.use(express.json());

app.use(routes);

// Deve ser o último middleware registrado.
app.use(errorHandler);

module.exports = { app };
