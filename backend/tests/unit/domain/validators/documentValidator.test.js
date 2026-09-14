const { validarCpf, validarCnpj, validarCnpjOuCpf, apenasDigitos } = require("../../../../src/domain/validators/documentValidator");

// Números sintéticos (não pertencem a ninguém), calculados manualmente com o
// mesmo algoritmo de dígito verificador implementado em documentValidator.js.
const CPF_VALIDO = "12345678909";
const CNPJ_VALIDO = "12345678000195";

describe("apenasDigitos", () => {
  test("remove qualquer caractere que não seja dígito", () => {
    expect(apenasDigitos("123.456.789-09")).toBe("12345678909");
    expect(apenasDigitos("12.345.678/0001-95")).toBe("12345678000195");
    expect(apenasDigitos(null)).toBe("");
    expect(apenasDigitos(undefined)).toBe("");
  });
});

describe("validarCpf", () => {
  test("aceita um CPF com dígitos verificadores corretos", () => {
    expect(validarCpf(CPF_VALIDO)).toBe(true);
  });

  test("aceita o mesmo CPF formatado com máscara", () => {
    expect(validarCpf("123.456.789-09")).toBe(true);
  });

  test("rejeita CPF com o último dígito verificador errado", () => {
    expect(validarCpf("12345678900")).toBe(false);
  });

  test("rejeita CPF com todos os dígitos iguais", () => {
    expect(validarCpf("11111111111")).toBe(false);
  });

  test("rejeita CPF com quantidade de dígitos diferente de 11", () => {
    expect(validarCpf("123456789")).toBe(false);
  });
});

describe("validarCnpj", () => {
  test("aceita um CNPJ com dígitos verificadores corretos", () => {
    expect(validarCnpj(CNPJ_VALIDO)).toBe(true);
  });

  test("aceita o mesmo CNPJ formatado com máscara", () => {
    expect(validarCnpj("12.345.678/0001-95")).toBe(true);
  });

  test("rejeita CNPJ com o último dígito verificador errado", () => {
    expect(validarCnpj("12345678000199")).toBe(false);
  });

  test("rejeita CNPJ com todos os dígitos iguais", () => {
    expect(validarCnpj("11111111111111")).toBe(false);
  });

  test("rejeita CNPJ com quantidade de dígitos diferente de 14", () => {
    expect(validarCnpj("123456780001")).toBe(false);
  });
});

describe("validarCnpjOuCpf", () => {
  test("aceita um CPF válido de 11 dígitos", () => {
    expect(validarCnpjOuCpf(CPF_VALIDO)).toBe(true);
  });

  test("aceita um CNPJ válido de 14 dígitos", () => {
    expect(validarCnpjOuCpf(CNPJ_VALIDO)).toBe(true);
  });

  test("rejeita valores com quantidade de dígitos que não é nem CPF nem CNPJ", () => {
    expect(validarCnpjOuCpf("123456789012")).toBe(false);
  });

  test("rejeita valor vazio", () => {
    expect(validarCnpjOuCpf("")).toBe(false);
  });
});
