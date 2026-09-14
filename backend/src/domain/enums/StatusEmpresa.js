/**
 * RF01 — status da instância da empresa.
 * Espelha o enum StatusEmpresa do Prisma, mas vive na camada de domínio para que
 * as entidades e use cases não dependam do Prisma Client.
 */
const StatusEmpresa = Object.freeze({
  ATIVA: "ATIVA",
  INATIVA: "INATIVA",
});

module.exports = { StatusEmpresa };
