/**
 * RF07/RF08 — domínio de valores do campo Tensão (Quadro 21/23 do DERS).
 * Espelha o enum EnumTensao do Prisma.
 */
const EnumTensao = Object.freeze({
  V127: "V127",
  V220: "V220",
  BIVOLT: "BIVOLT",
  NAO_INFORMADO: "NAO_INFORMADO",
});

module.exports = { EnumTensao };
