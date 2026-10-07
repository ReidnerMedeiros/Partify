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

/**
 * RF10 — status que aparecem na fila de Documentos Pendentes: os que a extração
 * não conseguiu concluir (IRRESOLUVEL) e os extraídos que o usuário ainda não
 * validou nem descartou (PENDENTE_VALIDACAO).
 */
const STATUS_NA_FILA_DE_PENDENTES = Object.freeze([StatusCatalogo.IRRESOLUVEL, StatusCatalogo.PENDENTE_VALIDACAO]);

module.exports = { StatusCatalogo, STATUS_NA_FILA_DE_PENDENTES };
