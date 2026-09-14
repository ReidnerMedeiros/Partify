/**
 * RF06/RF07 — status do ciclo de vida de um Catalogo (documento importado).
 * Espelha o enum StatusCatalogo do Prisma, mas vive na camada de domínio para que
 * as entidades e use cases não dependam do Prisma Client.
 */
const StatusCatalogo = Object.freeze({
  PENDENTE_EXTRACAO: "PENDENTE_EXTRACAO",
  PENDENTE_VALIDACAO: "PENDENTE_VALIDACAO",
  VALIDADO: "VALIDADO",
  IRRESOLUVEL: "IRRESOLUVEL",
});

module.exports = { StatusCatalogo };
