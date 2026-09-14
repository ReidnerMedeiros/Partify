/**
 * Validação simples e pragmática de formato de e-mail (RF01 fluxo de exceção E2).
 * Não substitui a confirmação real de posse do e-mail (isso é feito pelo Supabase
 * no fluxo de recuperação de senha — RF03).
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarEmail(valor) {
  return typeof valor === "string" && EMAIL_REGEX.test(valor.trim());
}

module.exports = { validarEmail };
