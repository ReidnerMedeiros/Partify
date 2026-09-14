const { validarEmail } = require("../../../../src/domain/validators/emailValidator");

describe("validarEmail", () => {
  test.each(["admin@partify.com", "usuario.teste@empresa.com.br", "a@b.co"])(
    "aceita %s como e-mail válido",
    (email) => {
      expect(validarEmail(email)).toBe(true);
    }
  );

  test.each(["", "sem-arroba.com", "usuario@", "@dominio.com", "usuario com espaco@dominio.com", null, undefined, 123])(
    "rejeita %s como e-mail inválido",
    (valor) => {
      expect(validarEmail(valor)).toBe(false);
    }
  );

  test("ignora espaços nas extremidades", () => {
    expect(validarEmail("  admin@partify.com  ")).toBe(true);
  });
});
