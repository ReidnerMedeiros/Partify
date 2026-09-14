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

    const resultado = await useCase.execute({ empresaId: EMPRESA_A, pergunta: "Qual o código do motor?" });

    expect(resultado).toEqual({ situacao: "SEM_CONTEXTO_RELEVANTE", resposta: null, fonte: null });
    expect(ragService.chamadas).toHaveLength(0);
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
