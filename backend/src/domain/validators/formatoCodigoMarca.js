/**
 * Formatos de código de peça conhecidos por fabricante. Usados como SINAL, nunca como
 * regra rígida: os formatos vêm de listagens de lojas, distribuidores e manuais, não
 * de uma documentação oficial de numeração, então existem exceções (peças antigas,
 * linhas específicas, acessórios). Por isso:
 *
 *   - `avaliarCodigoPorMarca` só SINALIZA (a tela de validação destaca o código para o
 *     humano conferir); não rejeita nem reescreve nada;
 *   - `removerPrefixoPeloFormatoDaMarca` só remove o número colado na frente do código
 *     quando o código, como veio, NÃO bate com o formato da marca e, sem esse número,
 *     BATE. Código que já bate com o formato nunca é alterado.
 *
 * A comparação é feita sobre o código compacto (sem espaços, maiúsculas), já que os
 * catálogos escrevem os mesmos códigos com espaçamentos diferentes ("9 618 086 800",
 * "9618086800").
 *
 * Formatos:
 *   Bosch  - 10 caracteres entre dígitos e letras (1 614 011 072, 1619P09140, 0445110270).
 *   Makita - 6 dígitos, hífen e 1 dígito (211014-6); ou 3-3-3 dígitos com hífens
 *            (962-300-017, linha herdada da Dolmar).
 *   DeWalt - 6 dígitos, hífen e 2 dígitos (682211-00); ou N + 6 dígitos (N397466); ou
 *            código curto no estilo do modelo (DC9096).
 */

const FORMATOS_POR_MARCA = {
  bosch: [/^[0-9A-Z]{10}$/],
  // Hífen opcional: o mesmo código aparece escrito com e sem hífen conforme o catálogo.
  makita: [/^\d{6}-?\d$/, /^\d{3}-?\d{3}-?\d{3}$/],
  dewalt: [/^\d{6}-?\d{2}$/, /^N\d{6}$/, /^[A-Z]{1,4}\d{3,6}$/],
};

function semAcento(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** "Bosch", " BOSCH Power Tools " -> "bosch"; marca desconhecida -> null. */
function chaveDaMarca(marca) {
  const texto = semAcento(marca).toLowerCase();
  return Object.keys(FORMATOS_POR_MARCA).find((chave) => texto.includes(chave)) ?? null;
}

function compactar(codigo) {
  return String(codigo ?? "").replace(/\s+/g, "").toUpperCase();
}

/**
 * true/false se o código bate com algum formato da marca; null quando a marca não é
 * conhecida (sem opinião) ou o código está vazio.
 */
function codigoCombinaComMarca(codigo, marca) {
  const chave = chaveDaMarca(marca);
  const compacto = compactar(codigo);
  if (!chave || !compacto) return null;
  return FORMATOS_POR_MARCA[chave].some((formato) => formato.test(compacto));
}

/**
 * Sinaliza (sem alterar) um código que não bate com os formatos conhecidos da marca.
 */
function avaliarCodigoPorMarca(codigo, marca) {
  if (codigoCombinaComMarca(codigo, marca) === false) {
    return { suspeito: true, motivo: "código fora do formato conhecido desta marca (confira no documento)" };
  }
  return { suspeito: false, motivo: null };
}

/**
 * Se o código não bate com o formato da marca, mas bate depois de remover um número
 * pequeno (1 a 3 dígitos) colado na frente, devolve { codigo, prefixo }. Caso
 * contrário devolve null (inclusive quando a marca é desconhecida).
 */
function removerPrefixoPeloFormatoDaMarca(codigo, marca) {
  if (codigoCombinaComMarca(codigo, marca) !== false) return null;

  const trechos = String(codigo ?? "").trim().split(/\s+/);
  if (trechos.length < 2 || !/^\d{1,3}$/.test(trechos[0])) return null;

  const restante = trechos.slice(1).join(" ");
  if (codigoCombinaComMarca(restante, marca) !== true) return null;

  return { codigo: restante, prefixo: Number(trechos[0]) };
}

module.exports = {
  chaveDaMarca,
  codigoCombinaComMarca,
  avaliarCodigoPorMarca,
  removerPrefixoPeloFormatoDaMarca,
};
