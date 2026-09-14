const { BuscarDocumentoPendenteUseCase } = require("../../../../src/useCases/catalogo/BuscarDocumentoPendenteUseCase");
const { FakeCatalogoRepository } = require("../../../fakes/FakeCatalogoRepository");
const { NotFoundError } = require("../../../../src/domain/errors/DomainErrors");

const EMPRESA_ID = "empresa-1";

async function montarCatalogoIrresoluvel(catalogoRepository) {
  const catalogo = await catalogoRepository.criar({ empresaId: EMPRESA_ID, nomeArquivo: "catalogo.pdf", caminhoArquivo: "fake/1.pdf" });
  await catalogoRepository.registrarResultadoExtracao(catalogo.id, EMPRESA_ID, {
    marca: "Bosch",
    modelo: "GWS 9-125S",
    tensao: null,
    pecas: [],
    confiancaCampos: {},
    confiancaGeral: 62,
    status: "IRRESOLUVEL",
    motivoPendencia: "Extração incompleta: alguns campos obrigatórios não foram identificados automaticamente.",
    camposAusentes: ["tensao"],
  });
  return catalogo;
}

function montarUseCase() {
  const catalogoRepository = new FakeCatalogoRepository();
  const useCase = new BuscarDocumentoPendenteUseCase({ catalogoRepository });
  return { useCase, catalogoRepository };
}

describe("BuscarDocumentoPendenteUseCase — RF10/A1 (carregamento pra preenchimento manual)", () => {
  test("retorna o documento IRRESOLUVEL com motivoPendencia e camposAusentes", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    const catalogo = await montarCatalogoIrresoluvel(catalogoRepository);

    const resultado = await useCase.execute({ catalogoId: catalogo.id, empresaId: EMPRESA_ID });

    expect(resultado.catalogo.status).toBe("IRRESOLUVEL");
    expect(resultado.catalogo.camposAusentes).toEqual(["tensao"]);
  });

  test("lança NotFoundError quando o catálogo não existe", async () => {
    const { useCase } = montarUseCase();

    await expect(useCase.execute({ catalogoId: "inexistente", empresaId: EMPRESA_ID })).rejects.toThrow(NotFoundError);
  });

  test("lança NotFoundError quando o catálogo já foi validado", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    const catalogo = await catalogoRepository.criar({ empresaId: EMPRESA_ID, nomeArquivo: "x.pdf", caminhoArquivo: "fake/2.pdf" });
    await catalogoRepository.registrarResultadoExtracao(catalogo.id, EMPRESA_ID, {
      marca: "Makita",
      modelo: "4100NH",
      tensao: "V220",
      pecas: [{ codigo: "1600A002BH", descricao: "Rolamento", posicaoVisual: "3", confianca: 60 }],
      confiancaCampos: {},
      confiancaGeral: 60,
      status: "PENDENTE_VALIDACAO",
      motivoPendencia: null,
      camposAusentes: null,
    });

    await expect(useCase.execute({ catalogoId: catalogo.id, empresaId: EMPRESA_ID })).rejects.toThrow(NotFoundError);
  });

  test("RNF11: lança NotFoundError quando o catálogo pertence a outra empresa", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    const catalogo = await montarCatalogoIrresoluvel(catalogoRepository);

    await expect(useCase.execute({ catalogoId: catalogo.id, empresaId: "empresa-invasora" })).rejects.toThrow(NotFoundError);
  });
});
