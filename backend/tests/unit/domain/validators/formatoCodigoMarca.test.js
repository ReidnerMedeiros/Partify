const {
  chaveDaMarca,
  codigoCombinaComMarca,
  avaliarCodigoPorMarca,
  removerPrefixoPeloFormatoDaMarca,
} = require("../../../../src/domain/validators/formatoCodigoMarca");

describe("chaveDaMarca", () => {
  test("reconhece a marca ignorando maiúsculas, acento e texto extra", () => {
    expect(chaveDaMarca("Bosch")).toBe("bosch");
    expect(chaveDaMarca("  BOSCH Power Tools ")).toBe("bosch");
    expect(chaveDaMarca("DeWalt")).toBe("dewalt");
    expect(chaveDaMarca("Makita")).toBe("makita");
  });

  test("devolve null para marca desconhecida ou vazia", () => {
    expect(chaveDaMarca("Metabo")).toBeNull();
    expect(chaveDaMarca("")).toBeNull();
    expect(chaveDaMarca(null)).toBeNull();
  });
});

describe("codigoCombinaComMarca", () => {
  test("Bosch: 10 caracteres, com ou sem espaços e com letras no meio", () => {
    expect(codigoCombinaComMarca("1 614 011 072", "Bosch")).toBe(true);
    expect(codigoCombinaComMarca("0 601 132 703", "Bosch")).toBe(true);
    expect(codigoCombinaComMarca("1619P09140", "Bosch")).toBe(true);
    expect(codigoCombinaComMarca("1600A00RR2", "Bosch")).toBe(true);
    expect(codigoCombinaComMarca("1 600 A00 4GD", "Bosch")).toBe(true);
    expect(codigoCombinaComMarca("0445110270", "Bosch")).toBe(true);
  });

  test("Bosch: tamanho diferente de 10 não combina", () => {
    expect(codigoCombinaComMarca("1 9 618 086 800", "Bosch")).toBe(false);
    expect(codigoCombinaComMarca("916 660 009", "Bosch")).toBe(false);
  });

  test("Makita: 6 dígitos + hífen + 1 dígito, ou 3-3-3", () => {
    expect(codigoCombinaComMarca("211014-6", "Makita")).toBe(true);
    expect(codigoCombinaComMarca("664064-4", "Makita")).toBe(true);
    expect(codigoCombinaComMarca("962-300-017", "Makita")).toBe(true);
    expect(codigoCombinaComMarca("326 173 081", "Makita")).toBe(true);
    expect(codigoCombinaComMarca("2 211014-6", "Makita")).toBe(false);
  });

  test("DeWalt: 6+2 com hífen, N + 6 dígitos e código curto no estilo do modelo", () => {
    expect(codigoCombinaComMarca("682211-00", "DeWalt")).toBe(true);
    expect(codigoCombinaComMarca("152274-15", "DeWalt")).toBe(true);
    expect(codigoCombinaComMarca("N397466", "DeWalt")).toBe(true);
    expect(codigoCombinaComMarca("DC9096", "DeWalt")).toBe(true);
    expect(codigoCombinaComMarca("1 682211-00", "DeWalt")).toBe(false);
  });

  test("devolve null (sem opinião) para marca desconhecida ou código vazio", () => {
    expect(codigoCombinaComMarca("123", "Metabo")).toBeNull();
    expect(codigoCombinaComMarca("", "Bosch")).toBeNull();
    expect(codigoCombinaComMarca(null, "Bosch")).toBeNull();
  });
});

describe("avaliarCodigoPorMarca", () => {
  test("sinaliza código fora do formato da marca", () => {
    const r = avaliarCodigoPorMarca("1 9 618 086 800", "Bosch");
    expect(r.suspeito).toBe(true);
    expect(r.motivo).toMatch(/formato/);
  });

  test("não sinaliza código no formato, nem marca desconhecida", () => {
    expect(avaliarCodigoPorMarca("9 618 086 800", "Bosch").suspeito).toBe(false);
    expect(avaliarCodigoPorMarca("qualquer coisa", "Metabo").suspeito).toBe(false);
  });
});

describe("removerPrefixoPeloFormatoDaMarca", () => {
  test("Bosch: remove o número colado quando o restante bate com o formato", () => {
    expect(removerPrefixoPeloFormatoDaMarca("1 9 618 086 800", "Bosch")).toEqual({ codigo: "9 618 086 800", prefixo: 1 });
    expect(removerPrefixoPeloFormatoDaMarca("2 1 900 905 029", "Bosch")).toEqual({ codigo: "1 900 905 029", prefixo: 2 });
  });

  test("Makita e DeWalt", () => {
    expect(removerPrefixoPeloFormatoDaMarca("2 211014-6", "Makita")).toEqual({ codigo: "211014-6", prefixo: 2 });
    expect(removerPrefixoPeloFormatoDaMarca("1 682211-00", "DeWalt")).toEqual({ codigo: "682211-00", prefixo: 1 });
  });

  test("não altera código que já bate com o formato (ex.: Bosch que começa por 1)", () => {
    expect(removerPrefixoPeloFormatoDaMarca("1 600 A00 4GD", "Bosch")).toBeNull();
    expect(removerPrefixoPeloFormatoDaMarca("9 618 086 800", "Bosch")).toBeNull();
  });

  test("não remove quando o restante também não bate com o formato", () => {
    expect(removerPrefixoPeloFormatoDaMarca("1 12345", "Bosch")).toBeNull();
  });

  test("não remove quando o primeiro trecho não é um número pequeno", () => {
    expect(removerPrefixoPeloFormatoDaMarca("F 9 618 086 800", "Bosch")).toBeNull();
    expect(removerPrefixoPeloFormatoDaMarca("1234 9 618 086 800", "Bosch")).toBeNull();
  });

  test("marca desconhecida: nunca altera", () => {
    expect(removerPrefixoPeloFormatoDaMarca("1 9 618 086 800", "Metabo")).toBeNull();
  });
});
