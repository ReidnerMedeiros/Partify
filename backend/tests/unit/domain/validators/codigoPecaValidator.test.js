const {
  comprimentoPadraoDosCodigos,
  separarQuantidadeDoCodigo,
  avaliarCodigoContraPadrao,
  corrigirCodigosComQuantidade,
} = require("../../../../src/domain/validators/codigoPecaValidator");

describe("comprimentoPadraoDosCodigos", () => {
  test("retorna o comprimento predominante (só letras e dígitos)", () => {
    const codigos = ["9 618 085 763", "9618083506", "2 606 320 021", "F 000 600 231"];
    expect(comprimentoPadraoDosCodigos(codigos)).toBe(10);
  });

  test("retorna null com poucos códigos para formar um padrão", () => {
    expect(comprimentoPadraoDosCodigos(["9618085763", "2606320021"])).toBeNull();
  });

  test("retorna null quando nenhum comprimento é majoritário", () => {
    expect(comprimentoPadraoDosCodigos(["123456", "1234567", "12345678", "123456789"])).toBeNull();
  });

  test("ignora códigos vazios ou nulos", () => {
    expect(comprimentoPadraoDosCodigos(["9618085763", "", null, "2606320021", "1900905232"])).toBe(10);
  });
});

describe("separarQuantidadeDoCodigo", () => {
  test("separa a quantidade colada na frente do código (caso real da Bosch)", () => {
    expect(separarQuantidadeDoCodigo("1 9618 085 763", 10)).toEqual({ quantidade: 1, codigo: "9618 085 763" });
  });

  test("aceita quantidade de até 3 dígitos", () => {
    expect(separarQuantidadeDoCodigo("12 9 618 085 763", 10)).toEqual({ quantidade: 12, codigo: "9 618 085 763" });
  });

  test("não separa quando o restante não tem o comprimento padrão", () => {
    expect(separarQuantidadeDoCodigo("2 606 320 021", 10)).toBeNull();
  });

  test("não separa quando o primeiro trecho não é um número pequeno", () => {
    expect(separarQuantidadeDoCodigo("F 000 600 231 9", 10)).toBeNull();
  });

  test("não separa código de um único trecho", () => {
    expect(separarQuantidadeDoCodigo("19618085763", 10)).toBeNull();
  });
});

describe("avaliarCodigoContraPadrao", () => {
  test("marca código mais longo que o padrão", () => {
    const r = avaliarCodigoContraPadrao("1 9618 085 763", 10);
    expect(r.suspeito).toBe(true);
    expect(r.motivo).toMatch(/mais longo/);
  });

  test("não marca código no padrão ou mais curto", () => {
    expect(avaliarCodigoContraPadrao("9 618 085 763", 10).suspeito).toBe(false);
    expect(avaliarCodigoContraPadrao("961808", 10).suspeito).toBe(false);
  });

  test("não marca nada quando não há padrão", () => {
    expect(avaliarCodigoContraPadrao("1 9618 085 763", null).suspeito).toBe(false);
  });
});

describe("corrigirCodigosComQuantidade", () => {
  const pecasDoCatalogoBosch = () => [
    { codigo: "9 618 085 763", descricao: "SAPATA POLAR", posicaoVisual: "2", quantidade: 1 },
    { codigo: "9 618 083 506", descricao: "INDUZIDO", posicaoVisual: "3", quantidade: 1 },
    { codigo: "9 618 086 703", descricao: "INTERRUPTOR", posicaoVisual: "4", quantidade: 1 },
    { codigo: "2 606 320 021", descricao: "PINHAO RETO", posicaoVisual: "7", quantidade: 1 },
  ];

  test("remove a quantidade colada no código e recupera a quantidade quando ausente", () => {
    const pecas = [...pecasDoCatalogoBosch(), { codigo: "2 9618 087 099", descricao: "PARAFUSO", posicaoVisual: "19", quantidade: null }];

    const { pecas: corrigidas, corrigidas: indices } = corrigirCodigosComQuantidade(pecas);

    expect(indices).toEqual([4]);
    expect(corrigidas[4].codigo).toBe("9618 087 099");
    expect(corrigidas[4].quantidade).toBe(2);
  });

  test("mantém a quantidade já lida pelo Extrator quando existe", () => {
    const pecas = [...pecasDoCatalogoBosch(), { codigo: "1 9618 085 763", descricao: "X", posicaoVisual: "9", quantidade: 1 }];

    const { pecas: corrigidas } = corrigirCodigosComQuantidade(pecas);

    expect(corrigidas[4].codigo).toBe("9618 085 763");
    expect(corrigidas[4].quantidade).toBe(1);
  });

  test("não altera peças que já estão no padrão", () => {
    const pecas = pecasDoCatalogoBosch();

    const { pecas: resultado, corrigidas } = corrigirCodigosComQuantidade(pecas);

    expect(corrigidas).toEqual([]);
    expect(resultado.map((p) => p.codigo)).toEqual(pecas.map((p) => p.codigo));
  });

  test("não corrige código longo que não tem o formato quantidade + código", () => {
    const pecas = [...pecasDoCatalogoBosch(), { codigo: "9 618 085 763 EXTRA", descricao: "X", posicaoVisual: "9", quantidade: null }];

    const { pecas: resultado, corrigidas } = corrigirCodigosComQuantidade(pecas);

    expect(corrigidas).toEqual([]);
    expect(resultado[4].codigo).toBe("9 618 085 763 EXTRA");
  });

  test("sem padrão de comprimento no documento, não altera nada", () => {
    const pecas = [
      { codigo: "123456", quantidade: null },
      { codigo: "1 9618 085 763", quantidade: null },
    ];

    const { pecas: resultado, corrigidas } = corrigirCodigosComQuantidade(pecas);

    expect(corrigidas).toEqual([]);
    expect(resultado).toEqual(pecas);
  });
});
