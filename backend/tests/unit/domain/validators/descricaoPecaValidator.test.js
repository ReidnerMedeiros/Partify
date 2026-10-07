const { avaliarDescricaoPeca } = require("../../../../src/domain/validators/descricaoPecaValidator");

describe("avaliarDescricaoPeca", () => {
  describe("descrições incompletas (truncadas no PDF)", () => {
    test.each([
      ["MANCAL DO", "termina em palavra de ligação"],
      ["SUPORTE DE", "termina em palavra de ligação"],
      ["CARCAÇA DO", "termina em palavra de ligação"],
      ["PARAFUSO PARA", "termina em palavra de ligação"],
      ["PLACA DE", "termina em palavra de ligação"],
      ["ANEL DE", "termina em palavra de ligação"],
      ["TAMPA COM", "termina em palavra de ligação"],
      ["PINO E", "termina em palavra de ligação"],
    ])("%s é marcada como incompleta", (descricao, motivoEsperado) => {
      const r = avaliarDescricaoPeca(descricao);
      expect(r.incompleta).toBe(true);
      expect(r.motivos).toContain(motivoEsperado);
    });

    test("marca descrição terminada em hífen, barra ou vírgula", () => {
      expect(avaliarDescricaoPeca("PORTA-").incompleta).toBe(true);
      expect(avaliarDescricaoPeca("CABO C/").incompleta).toBe(true);
      expect(avaliarDescricaoPeca("ARRUELA LISA,").incompleta).toBe(true);
    });

    test("marca parêntese aberto e não fechado", () => {
      const r = avaliarDescricaoPeca("MOLA (TIPO");
      expect(r.incompleta).toBe(true);
      expect(r.motivos).toContain("parêntese aberto e não fechado");
    });

    test("marca sigla de norma sem o número", () => {
      const r = avaliarDescricaoPeca("ANEL DE TRAVA DIN");
      expect(r.incompleta).toBe(true);
      expect(r.motivos).toContain("termina em sigla de norma sem o número");
    });

    test("marca última palavra aparentemente cortada no meio", () => {
      const r = avaliarDescricaoPeca("PORCA SEXT");
      expect(r.incompleta).toBe(true);
      expect(r.motivos).toContain("última palavra aparentemente cortada");
    });

    test("marca descrição vazia, nula ou só com espaços", () => {
      expect(avaliarDescricaoPeca("").incompleta).toBe(true);
      expect(avaliarDescricaoPeca("   ").incompleta).toBe(true);
      expect(avaliarDescricaoPeca(null).incompleta).toBe(true);
      expect(avaliarDescricaoPeca(undefined).motivos).toContain("descrição ausente");
    });

    test("ignora maiúsculas, minúsculas e acentos", () => {
      expect(avaliarDescricaoPeca("mancal do").incompleta).toBe(true);
      expect(avaliarDescricaoPeca("Carcaça do").incompleta).toBe(true);
      expect(avaliarDescricaoPeca("Carcaça").incompleta).toBe(false);
    });
  });

  describe("descrições completas (não devem gerar aviso)", () => {
    test.each([
      "SAPATA POLAR 220V",
      "INDUZIDO",
      "INTERRUPTOR",
      "PARAFUSO PARA 4x16 MM",
      "PLACA DE 1,5 MM",
      "ANEL DE DIN 471-10x1MM-FSt",
      "PINHAO RETO Z=46",
      "ROLAMENTO FIXO 6200-2Z DIN 625",
      "ARRUELA DE ACO 0,2 MM GROSSO",
      "ANEL-O",
      "PORTA-ESCOVAS",
      "JOGO ESCOVAS",
      "CHAVE MANDRIL",
      'PORTA-BROCAS Ø 1,0-10 MM, 3/8"',
      "KIT",
      "CONJUNTO KIT",
      "CABO DE LIGACAO L = 124 MM BRANCO",
    ])("%s não é marcada", (descricao) => {
      expect(avaliarDescricaoPeca(descricao)).toEqual({ incompleta: false, motivos: [] });
    });

    test("acumula mais de um motivo quando há vários sinais", () => {
      const r = avaliarDescricaoPeca("MOLA (DE");
      expect(r.incompleta).toBe(true);
      expect(r.motivos.length).toBeGreaterThanOrEqual(2);
    });
  });
});
