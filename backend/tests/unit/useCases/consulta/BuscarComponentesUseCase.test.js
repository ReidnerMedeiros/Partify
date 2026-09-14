const { BuscarComponentesUseCase } = require("../../../../src/useCases/consulta/BuscarComponentesUseCase");
const { FakeComponenteRepository } = require("../../../fakes/FakeComponenteRepository");
const { FakeEmbeddingService } = require("../../../fakes/FakeEmbeddingService");
const { ValidationError } = require("../../../../src/domain/errors/DomainErrors");

const EMPRESA_A = "empresa-a";
const EMPRESA_B = "empresa-b";

function montarUseCase() {
  const componenteRepository = new FakeComponenteRepository();
  const embeddingService = new FakeEmbeddingService();
  const useCase = new BuscarComponentesUseCase({ componenteRepository, embeddingService });
  return { useCase, componenteRepository, embeddingService };
}

describe("BuscarComponentesUseCase — RF11 (Agente de Consulta)", () => {
  test("fluxo básico: retorna correspondência exata pelo código", async () => {
    const { useCase, componenteRepository } = montarUseCase();
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "1600A004GD",
      descricao: "Induzido",
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
    });

    const resultado = await useCase.execute({ empresaId: EMPRESA_A, termo: "1600A004GD" });

    expect(resultado.semRegistrosNaBase).toBe(false);
    expect(resultado.resultados).toHaveLength(1);
    expect(resultado.resultados[0].correspondenciaExata).toBe(true);
  });

  test("fluxo básico: os dois motores sempre rodam juntos — busca por descrição também aciona a busca semântica", async () => {
    const { useCase, componenteRepository, embeddingService } = montarUseCase();
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "1600A004GD",
      descricao: "Induzido 127V",
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      embedding: [10, 0, 0],
    });

    await useCase.execute({ empresaId: EMPRESA_A, termo: "induzido de esmerilhadeira" });

    expect(embeddingService.chamadas).toContain("induzido de esmerilhadeira");
  });

  test("não duplica um resultado que bate tanto na busca exata quanto na semântica", async () => {
    const { useCase, componenteRepository, embeddingService } = montarUseCase();
    // termo "ABC" tem 3 caracteres — a FakeEmbeddingService gera [3, 0, 0].
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "ABC",
      descricao: "Peça de teste",
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      embedding: [3, 0, 0],
    });

    const resultado = await useCase.execute({ empresaId: EMPRESA_A, termo: "ABC" });

    expect(resultado.resultados).toHaveLength(1);
    expect(resultado.resultados[0].correspondenciaExata).toBe(true);
    expect(resultado.resultados[0].distancia).toBe(0);
    expect(embeddingService.chamadas).toContain("ABC");
  });

  test("A2: busca sem filtros de marca/tensão percorre todos os registros da empresa", async () => {
    const { useCase, componenteRepository } = montarUseCase();
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "N123",
      descricao: "Motor",
      marca: "DeWalt",
      modelo: "DWE4517",
      tensao: "V220",
    });

    const resultado = await useCase.execute({ empresaId: EMPRESA_A, termo: "N123" });

    expect(resultado.resultados).toHaveLength(1);
  });

  test("filtra por marca e tensão quando informados", async () => {
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

    const semFiltro = await useCase.execute({ empresaId: EMPRESA_A, termo: "N123" });
    expect(semFiltro.resultados).toHaveLength(1);

    const comFiltroErrado = await useCase.execute({ empresaId: EMPRESA_A, termo: "N123", marca: "Bosch" });
    expect(comFiltroErrado.resultados).toHaveLength(0);

    const comFiltroCerto = await useCase.execute({ empresaId: EMPRESA_A, termo: "N123", marca: "DeWalt", tensao: "V220" });
    expect(comFiltroCerto.resultados).toHaveLength(1);
  });

  test("exceção E1: nenhum resultado encontrado para o termo, mas a base não está vazia", async () => {
    const { useCase, componenteRepository } = montarUseCase();
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "N123",
      descricao: "Motor",
      marca: "DeWalt",
      modelo: "DWE4517",
      tensao: "V220",
    });

    const resultado = await useCase.execute({ empresaId: EMPRESA_A, termo: "codigo-que-nao-existe" });

    expect(resultado.semRegistrosNaBase).toBe(false);
    expect(resultado.resultados).toHaveLength(0);
  });

  test("exceção E2: nenhum registro validado na base da empresa", async () => {
    const { useCase } = montarUseCase();

    const resultado = await useCase.execute({ empresaId: EMPRESA_A, termo: "qualquer coisa" });

    expect(resultado.semRegistrosNaBase).toBe(true);
    expect(resultado.resultados).toHaveLength(0);
  });

  test("rejeita busca sem termo", async () => {
    const { useCase } = montarUseCase();

    await expect(useCase.execute({ empresaId: EMPRESA_A, termo: "" })).rejects.toThrow(ValidationError);
    await expect(useCase.execute({ empresaId: EMPRESA_A, termo: "   " })).rejects.toThrow(ValidationError);
  });

  test("RNF11: não retorna componentes validados de outra empresa", async () => {
    const { useCase, componenteRepository } = montarUseCase();
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "N123",
      descricao: "Motor",
      marca: "DeWalt",
      modelo: "DWE4517",
      tensao: "V220",
    });
    componenteRepository.seedComponente({
      empresaId: EMPRESA_B,
      codigo: "N123",
      descricao: "Motor de outra empresa",
      marca: "DeWalt",
      modelo: "DWE4517",
      tensao: "V220",
    });

    const resultadoA = await useCase.execute({ empresaId: EMPRESA_A, termo: "N123" });
    expect(resultadoA.resultados).toHaveLength(1);
    expect(resultadoA.resultados[0].descricao).toBe("Motor");
  });

  test("RNF11: base vazia numa empresa não é afetada por registros validados de outra", async () => {
    const { useCase, componenteRepository } = montarUseCase();
    componenteRepository.seedComponente({
      empresaId: EMPRESA_B,
      codigo: "N123",
      descricao: "Motor",
      marca: "DeWalt",
      modelo: "DWE4517",
      tensao: "V220",
    });

    const resultadoA = await useCase.execute({ empresaId: EMPRESA_A, termo: "N123" });
    expect(resultadoA.semRegistrosNaBase).toBe(true);
  });

  test("modo codigo_exato prioriza correspondências exatas na ordenação", async () => {
    const { useCase, componenteRepository } = montarUseCase();
    // termo "peça" (4 caracteres) — FakeEmbeddingService gera [4, 0, 0].
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "SEMANTICO-PERTO",
      descricao: "Resultado só semântico, bem próximo do termo",
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      embedding: [4, 0, 0],
    });
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "peça",
      descricao: "Resultado exato, mas sem embedding",
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
    });

    const resultado = await useCase.execute({ empresaId: EMPRESA_A, termo: "peça", modo: "codigo_exato" });

    expect(resultado.resultados[0].correspondenciaExata).toBe(true);
    expect(resultado.resultados[0].codigo).toBe("peça");
  });

  test("modo semantica (padrão) ordena pela relevância semântica", async () => {
    const { useCase, componenteRepository } = montarUseCase();
    // termo "abcd" (4 caracteres) — FakeEmbeddingService gera [4, 0, 0].
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "LONGE",
      descricao: "Resultado semântico distante",
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      embedding: [100, 0, 0],
    });
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "PERTO",
      descricao: "Resultado semântico próximo",
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      embedding: [5, 0, 0],
    });

    const resultado = await useCase.execute({ empresaId: EMPRESA_A, termo: "abcd", modo: "semantica" });

    expect(resultado.resultados[0].codigo).toBe("PERTO");
    expect(resultado.resultados[1].codigo).toBe("LONGE");
  });

  test("uma falha ao gerar o embedding não impede a busca — cai para só correspondência exata (best-effort)", async () => {
    const { useCase, componenteRepository, embeddingService } = montarUseCase();
    embeddingService.deveFalhar = true;
    componenteRepository.seedComponente({
      empresaId: EMPRESA_A,
      codigo: "N123",
      descricao: "Motor",
      marca: "DeWalt",
      modelo: "DWE4517",
      tensao: "V220",
    });

    const resultado = await useCase.execute({ empresaId: EMPRESA_A, termo: "N123" });

    expect(resultado.resultados).toHaveLength(1);
    expect(resultado.resultados[0].correspondenciaExata).toBe(true);
  });
});
