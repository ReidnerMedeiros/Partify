const { ListarDocumentosPendentesUseCase } = require("../../../../src/useCases/catalogo/ListarDocumentosPendentesUseCase");
const { FakeCatalogoRepository } = require("../../../fakes/FakeCatalogoRepository");

const EMPRESA_A = "empresa-a";
const EMPRESA_B = "empresa-b";

async function catalogoIrresoluvel(catalogoRepository, { empresaId, nomeArquivo, camposAusentes, confiancaGeral, pecas = [] }) {
  const catalogo = await catalogoRepository.criar({ empresaId, nomeArquivo, caminhoArquivo: `fake/${nomeArquivo}` });
  await catalogoRepository.registrarResultadoExtracao(catalogo.id, empresaId, {
    marca: camposAusentes.includes("marca") ? null : "Bosch",
    modelo: camposAusentes.includes("modelo") ? null : "GWS 9-125S",
    tensao: camposAusentes.includes("tensao") ? null : "V127",
    pecas,
    confiancaCampos: {},
    confiancaGeral,
    status: "IRRESOLUVEL",
    motivoPendencia: "Extração incompleta: alguns campos obrigatórios não foram identificados automaticamente.",
    camposAusentes,
  });
  return catalogo;
}

function montarUseCase() {
  const catalogoRepository = new FakeCatalogoRepository();
  const useCase = new ListarDocumentosPendentesUseCase({ catalogoRepository });
  return { useCase, catalogoRepository };
}

describe("ListarDocumentosPendentesUseCase — RF10 fluxo básico (fila de pendentes)", () => {
  test("lista documentos IRRESOLUVEL da empresa, mais recentes primeiro", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    await catalogoIrresoluvel(catalogoRepository, {
      empresaId: EMPRESA_A,
      nomeArquivo: "catalogo_bosch_gsr18.pdf",
      camposAusentes: ["tensao"],
      confiancaGeral: 62,
    });

    const documentos = await useCase.execute({ empresaId: EMPRESA_A });

    expect(documentos).toHaveLength(1);
    expect(documentos[0].nomeArquivo).toBe("catalogo_bosch_gsr18.pdf");
    expect(documentos[0].confiancaGeral).toBe(62);
  });

  test("classifica como PENDENTE quando ao menos um campo do documento foi identificado", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    await catalogoIrresoluvel(catalogoRepository, {
      empresaId: EMPRESA_A,
      nomeArquivo: "catalogo_bosch_gsr18.pdf",
      camposAusentes: ["tensao"],
      confiancaGeral: 62,
    });

    const documentos = await useCase.execute({ empresaId: EMPRESA_A });

    expect(documentos[0].situacao).toBe("PENDENTE");
  });

  test("classifica como IRRESOLUVEL quando nada do documento foi identificado", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    await catalogoIrresoluvel(catalogoRepository, {
      empresaId: EMPRESA_A,
      nomeArquivo: "vista_explodida_makita.pdf",
      camposAusentes: ["marca", "modelo", "tensao"],
      confiancaGeral: 18,
    });

    const documentos = await useCase.execute({ empresaId: EMPRESA_A });

    expect(documentos[0].situacao).toBe("IRRESOLUVEL");
  });

  test("não lista catálogos PENDENTE_VALIDACAO nem VALIDADO", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    const catalogo = await catalogoRepository.criar({ empresaId: EMPRESA_A, nomeArquivo: "ok.pdf", caminhoArquivo: "fake/ok.pdf" });
    await catalogoRepository.registrarResultadoExtracao(catalogo.id, EMPRESA_A, {
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      pecas: [{ codigo: "1600A004GD", descricao: "Induzido", posicaoVisual: "12", confianca: 95 }],
      confiancaCampos: {},
      confiancaGeral: 95,
      status: "PENDENTE_VALIDACAO",
      motivoPendencia: null,
      camposAusentes: null,
    });

    const documentos = await useCase.execute({ empresaId: EMPRESA_A });

    expect(documentos).toHaveLength(0);
  });

  test("RNF11: não lista documentos pendentes de outra empresa", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    await catalogoIrresoluvel(catalogoRepository, {
      empresaId: EMPRESA_A,
      nomeArquivo: "a.pdf",
      camposAusentes: ["tensao"],
      confiancaGeral: 62,
    });
    await catalogoIrresoluvel(catalogoRepository, {
      empresaId: EMPRESA_B,
      nomeArquivo: "b.pdf",
      camposAusentes: ["marca", "modelo", "tensao"],
      confiancaGeral: 18,
    });

    const documentosA = await useCase.execute({ empresaId: EMPRESA_A });
    const documentosB = await useCase.execute({ empresaId: EMPRESA_B });

    expect(documentosA).toHaveLength(1);
    expect(documentosA[0].nomeArquivo).toBe("a.pdf");
    expect(documentosB).toHaveLength(1);
    expect(documentosB[0].nomeArquivo).toBe("b.pdf");
  });
});
