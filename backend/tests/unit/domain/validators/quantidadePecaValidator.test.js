const { normalizarQuantidade } = require("../../../../src/domain/validators/quantidadePecaValidator");

describe("normalizarQuantidade", () => {
  test.each([[null], [undefined], [""], ["   "]])("%p significa quantidade não informada (válido, valor null)", (entrada) => {
    expect(normalizarQuantidade(entrada)).toEqual({ valida: true, valor: null });
  });

  test.each([
    [1, 1],
    ["2", 2],
    [" 5 ", 5],
    ["12", 12],
  ])("aceita %p e normaliza para %p", (entrada, esperado) => {
    expect(normalizarQuantidade(entrada)).toEqual({ valida: true, valor: esperado });
  });

  test.each([["0"], [0], ["-1"], ["1,5"], ["1.5"], ["abc"], ["2x"], [1.5]])("rejeita %p", (entrada) => {
    expect(normalizarQuantidade(entrada)).toEqual({ valida: false, valor: null });
  });

  test("rejeita número grande demais para ser um inteiro seguro", () => {
    expect(normalizarQuantidade("99999999999999999999").valida).toBe(false);
  });
});
