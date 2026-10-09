const {
  detectarModelos,
  extrairPalavrasChave,
  fazReferenciaAoAnterior,
} = require("../../../../src/useCases/consulta/analisarPergunta");

describe("fazReferenciaAoAnterior", () => {
  test.each([
    "quais as peças que compõem o motor dessa ferramenta?",
    "e o induzido dela?",
    "quantos rolamentos tem nela",
    "me mostre a mesma peça",
    "essa máquina usa qual escova",
  ])("detecta referência em: %s", (pergunta) => {
    expect(fazReferenciaAoAnterior(pergunta)).toBe(true);
  });

  test.each(["qual o rolamento 6001?", "peças do motor da GBM 13", "", null])("não detecta referência em: %s", (pergunta) => {
    expect(fazReferenciaAoAnterior(pergunta)).toBe(false);
  });
});

describe("detectarModelos", () => {
  const modelos = ["GBM 13", "GBM 13 RE", "GWS 9-125S", "4100NH", "13"];

  test("reconhece o modelo com espaço, sem espaço, com hífen e sem diferenciar maiúsculas", () => {
    expect(detectarModelos("quantos rolamentos tem a GBM 13", modelos)).toEqual(["GBM 13"]);
    expect(detectarModelos("induzido da gbm13?", modelos)).toEqual(["GBM 13"]);
    expect(detectarModelos("induzido da GBM-13", modelos)).toEqual(["GBM 13"]);
    expect(detectarModelos("escova da gws 9 125s", modelos)).toEqual(["GWS 9-125S"]);
    expect(detectarModelos("induzido da Makita 4100 NH", modelos)).toEqual(["4100NH"]);
  });

  test("não casa dentro de outro número ou palavra (GBM 13 não é GBM 130)", () => {
    expect(detectarModelos("induzido da GBM 130", modelos)).toEqual([]);
    expect(detectarModelos("induzido da XGBM 13", modelos)).toEqual([]);
  });

  test("entre modelos sobrepostos, fica só o mais longo", () => {
    expect(detectarModelos("rolamento da GBM 13 RE", modelos)).toEqual(["GBM 13 RE"]);
  });

  test("ignora modelos curtos demais (menos de 3 caracteres) e pergunta sem modelo", () => {
    expect(detectarModelos("quero 13 unidades", modelos)).toEqual([]);
    expect(detectarModelos("qual o melhor rolamento?", modelos)).toEqual([]);
  });

  test("lida com pergunta vazia ou nula", () => {
    expect(detectarModelos("", modelos)).toEqual([]);
    expect(detectarModelos(null, modelos)).toEqual([]);
  });
});

describe("extrairPalavrasChave", () => {
  test("tira palavras genéricas, números e o modelo, deixando o assunto no singular simples", () => {
    expect(extrairPalavrasChave("quantos rolamentos tem a GBM 13", ["GBM 13"])).toEqual(["rolamento"]);
  });

  test("remove acentos e deixa tudo em minúsculas", () => {
    expect(extrairPalavrasChave("Qual o êmbolo da carcaça?")).toEqual(["embolo", "carcaca"]);
  });

  test("não repete palavras e limita a 6", () => {
    expect(extrairPalavrasChave("rolamento rolamentos rolamento")).toEqual(["rolamento"]);
    const muitas = "alfa1 beta2 gama3 delta4 epsilon5 zeta66 etaaa7 theta8";
    expect(extrairPalavrasChave(muitas)).toHaveLength(6);
  });

  test("pergunta só com palavras genéricas não gera palavra-chave", () => {
    expect(extrairPalavrasChave("Qual o código da peça?")).toEqual([]);
  });

  test("tira o 's' final de plurais e mantém palavras que não terminam em 's'", () => {
    expect(extrairPalavrasChave("eixos mola")).toEqual(["eixo", "mola"]);
  });
});
