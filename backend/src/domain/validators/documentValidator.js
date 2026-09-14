/**
 * Validação de CPF e CNPJ por dígito verificador (RF01, fluxo de exceção E1 e RNF05).
 * Lógica pura de domínio — sem dependência de framework ou banco de dados.
 */

function apenasDigitos(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

function todosDigitosIguais(digitos) {
  return digitos.split("").every((d) => d === digitos[0]);
}

function calcularDigitoCpf(baseDigitos, pesoInicial) {
  let soma = 0;
  for (let i = 0; i < baseDigitos.length; i += 1) {
    soma += Number(baseDigitos[i]) * (pesoInicial - i);
  }
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

function validarCpf(valor) {
  const cpf = apenasDigitos(valor);
  if (cpf.length !== 11 || todosDigitosIguais(cpf)) return false;

  const primeiroDigito = calcularDigitoCpf(cpf.slice(0, 9), 10);
  if (primeiroDigito !== Number(cpf[9])) return false;

  const segundoDigito = calcularDigitoCpf(cpf.slice(0, 10), 11);
  return segundoDigito === Number(cpf[10]);
}

function calcularDigitoCnpj(baseDigitos, pesos) {
  let soma = 0;
  for (let i = 0; i < baseDigitos.length; i += 1) {
    soma += Number(baseDigitos[i]) * pesos[i];
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function validarCnpj(valor) {
  const cnpj = apenasDigitos(valor);
  if (cnpj.length !== 14 || todosDigitosIguais(cnpj)) return false;

  const pesosPrimeiroDigito = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const primeiroDigito = calcularDigitoCnpj(cnpj.slice(0, 12), pesosPrimeiroDigito);
  if (primeiroDigito !== Number(cnpj[12])) return false;

  const pesosSegundoDigito = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const segundoDigito = calcularDigitoCnpj(cnpj.slice(0, 13), pesosSegundoDigito);
  return segundoDigito === Number(cnpj[13]);
}

/**
 * Valida o campo "CNPJ ou CPF" da tela de cadastro (Quadro 15), aceitando qualquer
 * um dos dois formatos conforme a quantidade de dígitos informada.
 */
function validarCnpjOuCpf(valor) {
  const digitos = apenasDigitos(valor);
  if (digitos.length === 11) return validarCpf(digitos);
  if (digitos.length === 14) return validarCnpj(digitos);
  return false;
}

module.exports = { validarCpf, validarCnpj, validarCnpjOuCpf, apenasDigitos };
