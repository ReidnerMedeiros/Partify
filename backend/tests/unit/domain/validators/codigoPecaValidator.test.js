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

  describe("com a marca conhecida (formato do código)", () => {
    test("corrige um prefixo colado mesmo com poucas peças ou sem quantidade para conferir", () => {
      const pecas = [
        { codigo: "1 9 618 086 800", descricao: "INDUZIDO", quantidade: null },
        { codigo: "9 618 086 993", descricao: "SAPATA", quantidade: 1 },
      ];

      const { pecas: resultado, corrigidas } = corrigirCodigosComQuantidade(pecas, { marca: "Bosch" });

      expect(corrigidas).toEqual([0]);
      expect(resultado[0].codigo).toBe("9 618 086 800");
      expect(resultado[0].quantidade).toBe(1);
      expect(resultado[1].codigo).toBe("9 618 086 993");
    });

    test("não toca em códigos Bosch legítimos que começam por 1", () => {
      const pecas = [
        { codigo: "1 600 A00 4GD", quantidade: 1 },
        { codigo: "1 619 P08 530", quantidade: 1 },
        { codigo: "2 604 448 018", quantidade: 2 },
      ];

      const { pecas: resultado, corrigidas } = corrigirCodigosComQuantidade(pecas, { marca: "Bosch" });

      expect(corrigidas).toEqual([]);
      expect(resultado.map((p) => p.codigo)).toEqual(pecas.map((p) => p.codigo));
    });

    test("corrige Makita e DeWalt pelo formato", () => {
      const makita = corrigirCodigosComQuantidade([{ codigo: "2 211014-6", quantidade: 2 }], { marca: "Makita" });
      const dewalt = corrigirCodigosComQuantidade([{ codigo: "1 682211-00", quantidade: 1 }], { marca: "DeWalt" });

      expect(makita.pecas[0].codigo).toBe("211014-6");
      expect(dewalt.pecas[0].codigo).toBe("682211-00");
    });

    test("sem marca (ou marca desconhecida) não aplica a regra de formato", () => {
      const pecas = [{ codigo: "1 9 618 086 800", quantidade: 1 }];

      expect(corrigirCodigosComQuantidade(pecas).corrigidas).toEqual([]);
      expect(corrigirCodigosComQuantidade(pecas, { marca: "Metabo" }).corrigidas).toEqual([]);
    });

    test("uma peça corrigida por mais de uma regra aparece uma só vez em corrigidas", () => {
      const pecas = [
        { codigo: "1 9 618 086 993", quantidade: 1 },
        { codigo: "1 9 618 086 800", quantidade: 1 },
        { codigo: "2 1 900 905 029", quantidade: 2 },
        { codigo: "7 9 618 087 099", quantidade: 7 },
      ];

      const { corrigidas } = corrigirCodigosComQuantidade(pecas, { marca: "Bosch" });

      expect(corrigidas).toEqual([0, 1, 2, 3]);
    });
  });

  describe("poluição sistemática (quantidade colada em todas as linhas)", () => {
    // Bosch GBM 10: colunas "N° | Un | N° de peça". O Extrator leu a quantidade certa
    // no campo próprio, mas a colou também na frente do código, em todas as linhas.
    const catalogoGbm10Poluido = () => [
      { codigo: "1 9 618 086 993", descricao: "SAPATA POLAR", posicaoVisual: "2", quantidade: 1 },
      { codigo: "1 9 618 086 800", descricao: "INDUZIDO COM", posicaoVisual: "3", quantidade: 1 },
      { codigo: "2 1 900 905 029", descricao: "ROLAMENTO FIXO", posicaoVisual: "13", quantidade: 2 },
      { codigo: "7 9 618 087 099", descricao: "PARAFUSO PARA", posicaoVisual: "32", quantidade: 7 },
      { codigo: "1 1 608 571 079", descricao: "PORTA-BROCAS", posicaoVisual: "660", quantidade: 1 },
      { codigo: "2 2 604 448 018", descricao: "CABO DE LIGACAO", posicaoVisual: "812", quantidade: 2 },
    ];

    test("remove o prefixo igual à quantidade em todas as linhas e mantém a quantidade", () => {
      const { pecas, corrigidas } = corrigirCodigosComQuantidade(catalogoGbm10Poluido());

      expect(pecas.map((p) => p.codigo)).toEqual([
        "9 618 086 993",
        "9 618 086 800",
        "1 900 905 029",
        "9 618 087 099",
        "1 608 571 079",
        "2 604 448 018",
      ]);
      expect(pecas.map((p) => p.quantidade)).toEqual([1, 1, 2, 7, 1, 2]);
      expect(corrigidas).toEqual([0, 1, 2, 3, 4, 5]);
    });

    test("corrige as linhas poluídas mesmo quando algumas já vieram certas", () => {
      const pecas = [...catalogoGbm10Poluido(), { codigo: "9 618 086 864", descricao: "PUNHO", posicaoVisual: "663", quantidade: 1 }];

      const { pecas: resultado, corrigidas } = corrigirCodigosComQuantidade(pecas);

      expect(resultado[6].codigo).toBe("9 618 086 864");
      expect(corrigidas).not.toContain(6);
      expect(resultado[0].codigo).toBe("9 618 086 993");
    });

    test("não mexe em códigos legítimos que só coincidem com a quantidade 1", () => {
      // Todos os códigos começam por "1" e a quantidade é sempre 1: sem nenhuma
      // quantidade maior que 1 coincidindo, não dá para afirmar que há prefixo colado.
      const pecas = [
        { codigo: "1 600 A00 4GD", quantidade: 1 },
        { codigo: "1 619 P08 530", quantidade: 1 },
        { codigo: "1 600 A01 234", quantidade: 1 },
        { codigo: "1 604 010 123", quantidade: 1 },
      ];

      const { pecas: resultado, corrigidas } = corrigirCodigosComQuantidade(pecas);

      expect(corrigidas).toEqual([]);
      expect(resultado.map((p) => p.codigo)).toEqual(pecas.map((p) => p.codigo));
    });

    test("não age quando só uma minoria das peças tem o prefixo igual à quantidade", () => {
      const pecas = [
        { codigo: "2 604 448 018", quantidade: 2 },
        { codigo: "9 618 086 800", quantidade: 1 },
        { codigo: "9 618 086 993", quantidade: 1 },
        { codigo: "9 618 087 135", quantidade: 1 },
        { codigo: "9 618 081 609", quantidade: 1 },
      ];

      const { corrigidas } = corrigirCodigosComQuantidade(pecas);

      expect(corrigidas).toEqual([]);
    });

    test("não age com menos de 3 peças com quantidade", () => {
      const pecas = [
        { codigo: "2 1 900 905 029", quantidade: 2 },
        { codigo: "7 9 618 087 099", quantidade: 7 },
      ];

      const { corrigidas } = corrigirCodigosComQuantidade(pecas);

      expect(corrigidas).toEqual([]);
    });
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
