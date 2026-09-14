const { BuscarCatalogoParaEdicaoUseCase } = require("../../../../src/useCases/catalogo/BuscarCatalogoParaEdicaoUseCase");
const { FakeCatalogoRepository } = require("../../../fakes/FakeCatalogoRepository");
const { NotFoundError } = require("../../../../src/domain/errors/DomainErrors");

const EMPRESA_ID = "empresa-1";

async function montarCatalogoValidado(catalogoRepository) {
  const catalogo = await catalogoRepository.criar({ empresaId: EMPRESA_ID, nomeArquivo: "catalogo.pdf", caminhoArquivo: "fake/1.pdf" });
  await catalogoRepository.registrarResultadoExtracao(catalogo.id, EMPRESA_ID, {
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
  const extraido = await catalogoRepository.buscarComPecas(catalogo.id);
  await catalogoRepository.registrarValidacao(catalogo.id, EMPRESA_ID, {
    marca: "Bosch",
    modelo: "GWS 9-125S",
    tensao: "V127",
    pecas: extraido.pecas.map((p) => ({ id: p.id, codigo: p.codigo, descricao: p.descricao, posicaoVisual: p.posicaoVisual })),
  });
  return catalogo;
}

function montarUseCase() {
  const catalogoRepository = new FakeCatalogoRepository();
  const useCase = new BuscarCatalogoParaEdicaoUseCase({ catalogoRepository });
  return { useCase, catalogoRepository };
}

describe("BuscarCatalogoParaEdicaoUseCase — RF09/A3 (carregamento da tela de edição)", () => {
  test("retorna o catálogo VALIDADO com marca/modelo/tensão/peças", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    const catalogo = await montarCatalogoValidado(catalogoRepository);

    const resultado = await useCase.execute({ catalogoId: catalogo.id, empresaId: EMPRESA_ID });

    expect(resultado.marca).toBe("Bosch");
    expect(resultado.pecas).toHaveLength(1);
  });

  test("lança NotFoundError quando o catálogo não existe", async () => {
    const { useCase } = montarUseCase();

    await expect(useCase.execute({ catalogoId: "inexistente", empresaId: EMPRESA_ID })).rejects.toThrow(NotFoundError);
  });

  test("lança NotFoundError quando o catálogo ainda não foi validado", async () => {
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
    const catalogo = await montarCatalogoValidado(catalogoRepository);

    await expect(useCase.execute({ catalogoId: catalogo.id, empresaId: "empresa-invasora" })).rejects.toThrow(NotFoundError);
  });
});
