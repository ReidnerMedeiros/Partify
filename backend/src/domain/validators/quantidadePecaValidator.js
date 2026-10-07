/**
 * Valida e normaliza a quantidade de uma peça (coluna "Un", "Qtd", "Qty" etc. dos
 * catálogos). O campo é opcional: vazio, nulo ou indefinido significa "não
 * informada" e é válido. Quando informado, precisa ser um número inteiro maior
 * ou igual a 1.
 *
 * Retorna `{ valida, valor }`, onde `valor` é um inteiro ou null.
 */
function normalizarQuantidade(entrada) {
  if (entrada === null || entrada === undefined) return { valida: true, valor: null };

  const texto = String(entrada).trim();
  if (texto === "") return { valida: true, valor: null };

  if (!/^\d+$/.test(texto)) return { valida: false, valor: null };

  const numero = Number(texto);
  if (!Number.isSafeInteger(numero) || numero < 1) return { valida: false, valor: null };

  return { valida: true, valor: numero };
}

module.exports = { normalizarQuantidade };
