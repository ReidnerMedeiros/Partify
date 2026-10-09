const { ConsultarViaRagUseCase } = require("../../../../src/useCases/consulta/ConsultarViaRagUseCase");
const { FakeComponenteRepository } = require("../../../fakes/FakeComponenteRepository");
const { FakeEmbeddingService } = require("../../../fakes/FakeEmbeddingService");
const { FakeRAGService } = require("../../../fakes/FakeRAGService");
const { ValidationError, ServiceUnavailableError } = require("../../../../src/domain/errors/DomainErrors");

const EMPRESA_A = "empresa-a";
const EMPRESA_B = "empresa-b";

function montarUseCase() {
  const componenteRepository = new FakeComponenteRepository();
  const embeddingService = new FakeEmbeddingService();
  const ragService = new FakeRAGService();
  const useCase = new ConsultarViaRagUseCase({ componenteRepository, embeddingService, ragService });
  return { useCase, componenteRepository, embeddingService, ragService };
}

describe("ConsultarViaRagUseCase — RF12 (Agente de Consulta, RAG)", () => {
  test("fluxo básico: retorna resposta fundamentada com fonte citada", async () => {
    const { useCase, componenteRepository } = montarUseCase();
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "1600A004GD",
      descricao: "Induzido completo 127V",
      posicaoVisual: "12",
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      embedding: [10, 0, 0],
      validadoEm: new Date("2026-04-08T00:00:00.000Z"),
    });

    const resultado = await useCase.execute({ empresaId: EMPRESA_A, pergunta: "Qual o induzido da GWS 9-125S?" });

    expect(resultado.situacao).toBe("RESPONDIDO");
    expect(resultado.resposta).toContain("Qual o induzido da GWS 9-125S?");
    expect(resultado.fonte).toEqual({
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      codigo: "1600A004GD",
      catalogoId: expect.any(String),
      validadoEm: new Date("2026-04-08T00:00:00.000Z"),
    });
  });

  test("rejeita pergunta vazia", async () => {
    const { useCase } = montarUseCase();

    await expect(useCase.execute({ empresaId: EMPRESA_A, pergunta: "" })).rejects.toThrow(ValidationError);
    await expect(useCase.execute({ empresaId: EMPRESA_A, pergunta: "   " })).rejects.toThrow(ValidationError);
  });

  test("exceção E1 (pré-condição 4.2): nenhum registro validado na empresa — nem chama a Gemini", async () => {
    const { useCase, embeddingService, ragService } = montarUseCase();

    const resultado = await useCase.execute({ empresaId: EMPRESA_A, pergunta: "Qualquer pergunta" });

    expect(resultado).toEqual({ situacao: "CONTEXTO_INSUFICIENTE", resposta: null, fonte: null });
    expect(embeddingService.chamadas).toHaveLength(0);
    expect(ragService.chamadas).toHaveLength(0);
  });

  test("exceção E1: Agente de Consulta classifica o contexto recuperado como insuficiente", async () => {
    const { useCase, componenteRepository, ragService } = montarUseCase();
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "N123",
      descricao: "Motor",
      marca: "DeWalt",
      modelo: "DWE4517",
      tensao: "V220",
      embedding: [5, 0, 0],
    });
    ragService.proximaResposta = { situacao: "CONTEXTO_INSUFICIENTE", resposta: null, pecaCitadaId: null };

    const resultado = await useCase.execute({ empresaId: EMPRESA_A, pergunta: "Qual a espessura do rolamento X?" });

    expect(resultado).toEqual({ situacao: "CONTEXTO_INSUFICIENTE", resposta: null, fonte: null });
  });

  test("exceção E3: Agente de Consulta classifica a pergunta como sem contexto relevante", async () => {
    const { useCase, componenteRepository, ragService } = montarUseCase();
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "N123",
      descricao: "Motor",
      marca: "DeWalt",
      modelo: "DWE4517",
      tensao: "V220",
      embedding: [5, 0, 0],
    });
    ragService.proximaResposta = { situacao: "SEM_CONTEXTO_RELEVANTE", resposta: null, pecaCitadaId: null };

    const resultado = await useCase.execute({ empresaId: EMPRESA_A, pergunta: "Qual a previsão do tempo amanhã?" });

    expect(resultado).toEqual({ situacao: "SEM_CONTEXTO_RELEVANTE", resposta: null, fonte: null });
  });

  test("exceção E3 (defensiva): existe registro validado mas nenhum tem embedding — não chega a chamar o Agente de Consulta", async () => {
    const { useCase, componenteRepository, ragService } = montarUseCase();
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "N123",
      descricao: "Motor",
      marca: "DeWalt",
      modelo: "DWE4517",
      tensao: "V220",
      // sem embedding
    });

    // Pergunta só com palavras genéricas: sem palavra-chave nem embedding que recupere peça.
    const resultado = await useCase.execute({ empresaId: EMPRESA_A, pergunta: "Qual o código da peça?" });

    expect(resultado).toEqual({ situacao: "SEM_CONTEXTO_RELEVANTE", resposta: null, fonte: null });
    expect(ragService.chamadas).toHaveLength(0);
  });

  describe("recuperação por modelo e palavra-chave (decisão #53)", () => {
    function semearGbm13(componenteRepository) {
      const base = { empresaId: EMPRESA_A, marca: "Bosch", modelo: "GBM 13", tensao: "V127", catalogoId: "cat-gbm" };
      componenteRepository.seedComponente({ ...base, codigo: "R1", descricao: "Rolamento de esferas", quantidade: 1, embedding: [1, 0, 0] });
      componenteRepository.seedComponente({ ...base, codigo: "R2", descricao: "ROLAMENTO AGULHAS", quantidade: 2, embedding: [2, 0, 0] });
      componenteRepository.seedComponente({ ...base, codigo: "I1", descricao: "Induzido", embedding: [3, 0, 0] });
      componenteRepository.seedComponente({
        empresaId: EMPRESA_A,
        marca: "Makita",
        modelo: "4100NH",
        tensao: "V127",
        codigo: "R9",
        descricao: "Rolamento 6001",
        embedding: [4, 0, 0],
      });
    }

    test("restringe o contexto ao modelo citado na pergunta (ignora o mesmo assunto em outro modelo)", async () => {
      const { useCase, componenteRepository, ragService } = montarUseCase();
      semearGbm13(componenteRepository);

      await useCase.execute({ empresaId: EMPRESA_A, pergunta: "quantos rolamentos tem a GBM 13" });

      const codigos = ragService.chamadas[0].contexto.map((p) => p.codigo);
      expect(codigos).toEqual(expect.arrayContaining(["R1", "R2", "I1"]));
      expect(codigos).not.toContain("R9");
    });

    test("reconhece o modelo escrito sem espaço ou com hífen e sem diferenciar maiúsculas", async () => {
      const { useCase, componenteRepository, ragService } = montarUseCase();
      semearGbm13(componenteRepository);

      await useCase.execute({ empresaId: EMPRESA_A, pergunta: "qual o induzido da gbm-13?" });

      expect(ragService.chamadas[0].contexto.map((p) => p.codigo)).not.toContain("R9");
    });

    test("palavra-chave traz a peça mesmo sem embedding e vem antes da semântica", async () => {
      const { useCase, componenteRepository, ragService } = montarUseCase();
      componenteRepository.seedComponente({
        empresaId: EMPRESA_A,
        marca: "Bosch",
        modelo: "GWS 9-125S",
        tensao: "V127",
        codigo: "SEM-EMB",
        descricao: "Rolamento 608",
        // sem embedding
      });
      componenteRepository.seedComponente({
        empresaId: EMPRESA_A,
        marca: "Bosch",
        modelo: "GWS 9-125S",
        tensao: "V127",
        codigo: "COM-EMB",
        descricao: "Carcaça",
        embedding: [1, 0, 0],
      });

      await useCase.execute({ empresaId: EMPRESA_A, pergunta: "preciso do rolamento" });

      expect(ragService.chamadas[0].contexto.map((p) => p.codigo)).toEqual(["SEM-EMB", "COM-EMB"]);
    });

    test("com modelo identificado e catálogo pequeno, manda o catálogo inteiro e avisa que a listagem é completa", async () => {
      const { useCase, componenteRepository, ragService } = montarUseCase();
      semearGbm13(componenteRepository);

      await useCase.execute({ empresaId: EMPRESA_A, pergunta: "quantos rolamentos tem a GBM 13" });

      expect(ragService.chamadas[0].listagemCompleta).toEqual({ modelos: ["GBM 13"] });
      expect(ragService.chamadas[0].contexto).toHaveLength(3);
    });

    test("pergunta conceitual ('peça que gira') leva o catálogo inteiro, inclusive peças sem embedding e sem a palavra", async () => {
      const { useCase, componenteRepository, ragService } = montarUseCase();
      semearGbm13(componenteRepository);
      componenteRepository.seedComponente({
        empresaId: EMPRESA_A,
        marca: "Bosch",
        modelo: "GBM 13",
        tensao: "V127",
        codigo: "E1",
        descricao: "Engrenagem",
        // sem embedding
      });

      await useCase.execute({ empresaId: EMPRESA_A, pergunta: "qual a peça que gira dentro da gbm 13" });

      expect(ragService.chamadas[0].contexto.map((p) => p.codigo)).toEqual(expect.arrayContaining(["R1", "R2", "I1", "E1"]));
    });

    test("catálogo grande demais para o contexto: manda 80 peças e só garante completude para os termos buscados", async () => {
      const { useCase, componenteRepository, ragService } = montarUseCase();
      for (let i = 0; i < 85; i += 1) {
        componenteRepository.seedComponente({
          empresaId: EMPRESA_A,
          marca: "Bosch",
          modelo: "GBM 13",
          tensao: "V127",
          codigo: `G${String(i).padStart(3, "0")}`,
          descricao: i < 3 ? "Rolamento" : "Parafuso",
          embedding: [i, 0, 0],
        });
      }

      await useCase.execute({ empresaId: EMPRESA_A, pergunta: "quantos rolamentos tem a GBM 13" });

      const chamada = ragService.chamadas[0];
      expect(chamada.contexto).toHaveLength(80);
      expect(chamada.listagemCompleta).toEqual({ modelos: ["GBM 13"], palavras: ["rolamento"] });
    });

    test("'dessa ferramenta' usa o modelo da pergunta anterior reenviado pelo frontend", async () => {
      const { useCase, componenteRepository, ragService } = montarUseCase();
      semearGbm13(componenteRepository);

      const resultado = await useCase.execute({
        empresaId: EMPRESA_A,
        pergunta: "quais as peças que compõem o motor dessa ferramenta?",
        modeloAnterior: "GBM 13",
      });

      expect(ragService.chamadas[0].contexto.map((p) => p.codigo)).not.toContain("R9");
      expect(resultado.modeloIdentificado).toBe("GBM 13");
    });

    test("modelo anterior é ignorado quando a pergunta não faz referência a ele ou o modelo não existe", async () => {
      const { useCase, componenteRepository, ragService } = montarUseCase();
      semearGbm13(componenteRepository);

      await useCase.execute({ empresaId: EMPRESA_A, pergunta: "qual o rolamento 6001?", modeloAnterior: "GBM 13" });
      expect(ragService.chamadas[0].contexto.map((p) => p.codigo)).toContain("R9");

      await useCase.execute({ empresaId: EMPRESA_A, pergunta: "peças dessa ferramenta", modeloAnterior: "MODELO-INEXISTENTE" });
      expect(ragService.chamadas[1].listagemCompleta).toBeNull();
    });

    test("resposta com várias peças devolve todas as fontes válidas e ignora ids que não estavam no contexto", async () => {
      const { useCase, componenteRepository, ragService } = montarUseCase();
      const r1 = componenteRepository.seedComponente({
        empresaId: EMPRESA_A,
        marca: "Bosch",
        modelo: "GBM 13",
        tensao: "V127",
        codigo: "R1",
        descricao: "Rolamento",
        embedding: [1, 0, 0],
      });
      const i1 = componenteRepository.seedComponente({
        empresaId: EMPRESA_A,
        marca: "Bosch",
        modelo: "GBM 13",
        tensao: "V127",
        codigo: "I1",
        descricao: "Induzido",
        embedding: [2, 0, 0],
      });
      ragService.proximaResposta = {
        situacao: "RESPONDIDO",
        resposta: "Pelas descrições do catálogo, giram o induzido e o rolamento.",
        pecaCitadaId: i1.id,
        pecasCitadasIds: [i1.id, r1.id, "id-inventado"],
      };

      const resultado = await useCase.execute({ empresaId: EMPRESA_A, pergunta: "qual a peça que gira dentro da gbm 13" });

      expect(resultado.fontes.map((f) => f.codigo)).toEqual(["I1", "R1"]);
      expect(resultado.fonte.codigo).toBe("I1");
      expect(resultado.modeloIdentificado).toBe("GBM 13");
    });

    test("pergunta recusada pelo agente ainda informa o modelo identificado (para o frontend reaproveitar)", async () => {
      const { useCase, componenteRepository, ragService } = montarUseCase();
      semearGbm13(componenteRepository);
      ragService.proximaResposta = { situacao: "CONTEXTO_INSUFICIENTE", resposta: null, pecaCitadaId: null };

      const resultado = await useCase.execute({ empresaId: EMPRESA_A, pergunta: "qual a tensão da GBM 13?" });

      expect(resultado).toEqual({ situacao: "CONTEXTO_INSUFICIENTE", resposta: null, fonte: null, modeloIdentificado: "GBM 13" });
    });

    test("sem modelo na pergunta, não afirma listagem completa e mantém o limite de 8 peças", async () => {
      const { useCase, componenteRepository, ragService } = montarUseCase();
      for (let i = 0; i < 12; i += 1) {
        componenteRepository.seedComponente({
          empresaId: EMPRESA_A,
          marca: "Bosch",
          modelo: "GWS 9-125S",
          tensao: "V127",
          codigo: `P${i}`,
          descricao: "Rolamento",
          embedding: [i, 0, 0],
        });
      }

      await useCase.execute({ empresaId: EMPRESA_A, pergunta: "quantos rolamentos existem" });

      expect(ragService.chamadas[0].listagemCompleta).toBeNull();
      expect(ragService.chamadas[0].contexto).toHaveLength(8);
    });

    test("RNF11: palavra-chave e modelo só enxergam peças da própria empresa", async () => {
      const { useCase, componenteRepository, ragService } = montarUseCase();
      semearGbm13(componenteRepository);
      componenteRepository.seedComponente({
        empresaId: EMPRESA_B,
        marca: "Bosch",
        modelo: "GBM 13",
        tensao: "V127",
        codigo: "OUTRA-EMPRESA",
        descricao: "Rolamento",
        embedding: [1, 0, 0],
      });

      await useCase.execute({ empresaId: EMPRESA_A, pergunta: "quantos rolamentos tem a GBM 13" });

      expect(ragService.chamadas[0].contexto.map((p) => p.codigo)).not.toContain("OUTRA-EMPRESA");
    });
  });

  test("exceção E2: falha ao gerar o embedding da pergunta vira ServiceUnavailableError", async () => {
    const { useCase, componenteRepository, embeddingService } = montarUseCase();
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "N123",
      descricao: "Motor",
      marca: "DeWalt",
      modelo: "DWE4517",
      tensao: "V220",
      embedding: [5, 0, 0],
    });
    embeddingService.deveFalhar = true;

    await expect(useCase.execute({ empresaId: EMPRESA_A, pergunta: "Qual o código do motor?" })).rejects.toThrow(
      ServiceUnavailableError
    );
  });

  test("exceção E2: falha na geração da resposta (Agente de Consulta) vira ServiceUnavailableError", async () => {
    const { useCase, componenteRepository, ragService } = montarUseCase();
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "N123",
      descricao: "Motor",
      marca: "DeWalt",
      modelo: "DWE4517",
      tensao: "V220",
      embedding: [5, 0, 0],
    });
    ragService.deveFalhar = true;

    await expect(useCase.execute({ empresaId: EMPRESA_A, pergunta: "Qual o código do motor?" })).rejects.toThrow(
      ServiceUnavailableError
    );
  });

  test("ignora um pecaCitadaId que não veio no contexto enviado e usa a peça mais relevante como fallback", async () => {
    const { useCase, componenteRepository, ragService } = montarUseCase();
    // termo "abc" (3 caracteres) — FakeEmbeddingService gera [3, 0, 0].
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "PERTO",
      descricao: "Peça mais próxima",
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      embedding: [3, 0, 0],
    });
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "LONGE",
      descricao: "Peça mais distante",
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      embedding: [50, 0, 0],
    });
    ragService.proximaResposta = { situacao: "RESPONDIDO", resposta: "texto", pecaCitadaId: "id-que-nao-existe-no-contexto" };

    const resultado = await useCase.execute({ empresaId: EMPRESA_A, pergunta: "abc" });

    expect(resultado.fonte.codigo).toBe("PERTO");
  });

  test("RNF11: base sem registros validados de uma empresa não é afetada por registros de outra", async () => {
    const { useCase, componenteRepository } = montarUseCase();
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "N123",
      descricao: "Motor",
      marca: "DeWalt",
      modelo: "DWE4517",
      tensao: "V220",
      embedding: [5, 0, 0],
    });

    const resultadoB = await useCase.execute({ empresaId: EMPRESA_B, pergunta: "Qual o código do motor?" });

    expect(resultadoB).toEqual({ situacao: "CONTEXTO_INSUFICIENTE", resposta: null, fonte: null });
  });
});
