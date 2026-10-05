/**
 * Gerador de CNPJ válido (mesmo algoritmo de check-digit usado em
 * backend/src/domain/validators/documentValidator.js e replicado em
 * backend/tests/api/helpers/cenarios.js), para as jornadas 1 e 2 do E2E
 * cadastrarem uma empresa nova a cada execução sem colidir com o
 * @unique(cnpjCpf) do schema.
 */
function calcularDigito(baseDigitos, pesos) {
  const soma = baseDigitos.reduce((acumulado, digito, indice) => acumulado + Number(digito) * pesos[indice], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function gerarCnpjValido() {
  const base = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  const primeiroDigito = calcularDigito(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const comPrimeiroDigito = [...base, primeiroDigito];
  const segundoDigito = calcularDigito(comPrimeiroDigito, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return [...comPrimeiroDigito, segundoDigito].join("");
}

module.exports = { gerarCnpjValido };
