/**
 * RF07/RF08 — domínio de valores do campo Tensão (Quadro 21/23 do DERS).
 * Espelha o enum EnumTensao do Prisma.
 *
 * Os valores representam GRUPOS de tensão nominal:
 *   V127 = grupo 110/127 V (110, 115, 120 ou 127 V);
 *   V220 = grupo 220/240 V (220, 230 ou 240 V);
 *   BIVOLT = atende aos dois grupos.
 */
const EnumTensao = Object.freeze({
  V127: "V127",
  V220: "V220",
  BIVOLT: "BIVOLT",
  NAO_INFORMADO: "NAO_INFORMADO",
});

/**
 * RF11 — tensões que satisfazem um filtro de consulta. Uma ferramenta bivolt
 * funciona nos dois grupos, então aparece tanto na busca por 110/127 V quanto
 * na busca por 220/240 V. Os demais filtros casam só com o próprio valor.
 */
function tensoesCompativeis(filtro) {
  if (filtro === EnumTensao.V127) return [EnumTensao.V127, EnumTensao.BIVOLT];
  if (filtro === EnumTensao.V220) return [EnumTensao.V220, EnumTensao.BIVOLT];
  return [filtro];
}

module.exports = { EnumTensao, tensoesCompativeis };
