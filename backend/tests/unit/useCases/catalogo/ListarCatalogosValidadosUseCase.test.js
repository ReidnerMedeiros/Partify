const { ListarCatalogosValidadosUseCase } = require("../../../../src/useCases/catalogo/ListarCatalogosValidadosUseCase");
const { FakeCatalogoRepository } = require("../../../fakes/FakeCatalogoRepository");

const EMPRESA_A = "empresa-a";
const EMPRESA_B = "empresa-b";

async function catalogoValidado(catalogoRepository, { empresaId, nomeArquivo = "catalogo.pdf", marca, modelo, tensao, pecas }) {
  const catalogo = await catalogoRepository.criar({ empresaId, nomeArquivo, caminhoArquivo: `fake/${nomeArquivo}` });
  await catalogoRepository.registrarResultadoExtracao(catalogo.id, empresaId, {
    marca,
    modelo,
    tensao,
    pecas,
    confiancaCampos: {},
    confiancaGeral: 90,
    status: "PENDENTE_VALIDACAO",
    motivoPendencia: null,
    camposAusentes: null,
  });
  const extraido = await catalogoRepository.buscarComPecas(catalogo.id);
  await catalogoRepository.registrarValidacao(catalogo.id, empresaId, {
    marca,
    modelo,
    tensao,
    pecas: extraido.pecas.map((p) => ({ id: p.id, codigo: p.codigo, descricao: p.descricao, posicaoVisual: p.posicaoVisual })),
  });
  return catalogo;
}

function montarUseCase() {
  const catalogoRepository = new FakeCatalogoRepository();
  const useCase = new ListarCatalogosValidadosUseCase({ catalogoRepository });
  return { useCase, catalogoRepository };
}

describe("ListarCatalogosValidadosUseCase — RF09/A2, visão por catálogo", () => {
  test("lista um item por catálogo validado, com marca, modelo, tensão e total de peças", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    await catalogoValidado(catalogoRepository, {
      empresaId: EMPRESA_A,
      nomeArquivo: "bosch.pdf",
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      pecas: [
        { codigo: "1600A004GD", descricao: "Induzido", posicaoVisual: "12", confianca: 95 },
        { codigo: "2604321905", descricao: "Escova de carvão", posicaoVisual: "18", confianca: 90 },
      ],
    });

    const catalogos = await useCase.execute({ empresaId: EMPRESA_A });

    expect(catalogos).toHaveLength(1);
    expect(catalogos[0]).toMatchObject({
      nomeArquivo: "bosch.pdf",
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      totalPecas: 2,
    });
  });

  test("não lista catálogos ainda não validados (PENDENTE_VALIDACAO/IRRESOLUVEL)", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    const catalogo = await catalogoRepository.criar({ empresaId: EMPRESA_A, nomeArquivo: "x.pdf", caminhoArquivo: "fake/x.pdf" });
    await catalogoRepository.registrarResultadoExtracao(catalogo.id, EMPRESA_A, {
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

    const catalogos = await useCase.execute({ empresaId: EMPRESA_A });

    expect(catalogos).toHaveLength(0);
  });

  test("RNF11: não lista catálogos validados de outra empresa", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    await catalogoValidado(catalogoRepository, {
      empresaId: EMPRESA_A,
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      pecas: [{ codigo: "1600A004GD", descricao: "Induzido", posicaoVisual: "12", confianca: 95 }],
    });
    await catalogoValidado(catalogoRepository, {
      empresaId: EMPRESA_B,
      marca: "DeWalt",
      modelo: "DWE4517",
      tensao: "V220",
      pecas: [{ codigo: "N123456", descricao: "Motor", posicaoVisual: "5", confianca: 92 }],
    });

    const catalogosA = await useCase.execute({ empresaId: EMPRESA_A });
    const catalogosB = await useCase.execute({ empresaId: EMPRESA_B });

    expect(catalogosA).toHaveLength(1);
    expect(catalogosA[0].marca).toBe("Bosch");
    expect(catalogosB).toHaveLength(1);
    expect(catalogosB[0].marca).toBe("DeWalt");
  });

  test("filtra por marca, modelo e código (catálogos que contêm a peça)", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    await catalogoValidado(catalogoRepository, {
      empresaId: EMPRESA_A,
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      pecas: [
        { codigo: "1600A004GD", descricao: "Induzido", posicaoVisual: "12", confianca: 95 },
        { codigo: "2604321905", descricao: "Escova de carvão", posicaoVisual: "18", confianca: 90 },
      ],
    });
    await catalogoValidado(catalogoRepository, {
      empresaId: EMPRESA_A,
      marca: "Makita",
      modelo: "4100NH",
      tensao: "V220",
      pecas: [{ codigo: "1600A002BH", descricao: "Rolamento", posicaoVisual: "3", confianca: 88 }],
    });

    const porMarca = await useCase.execute({ empresaId: EMPRESA_A, marca: "Makita" });
    expect(porMarca).toHaveLength(1);
    expect(porMarca[0].modelo).toBe("4100NH");

    const porModelo = await useCase.execute({ empresaId: EMPRESA_A, modelo: "gws" });
    expect(porModelo).toHaveLength(1);
    expect(porModelo[0].marca).toBe("Bosch");

    const porCodigo = await useCase.execute({ empresaId: EMPRESA_A, codigo: "2604321905" });
    expect(porCodigo).toHaveLength(1);
    expect(porCodigo[0].totalPecas).toBe(2);
  });

  test("ignora filtros vazios ou só com espaços", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    await catalogoValidado(catalogoRepository, {
      empresaId: EMPRESA_A,
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      pecas: [{ codigo: "1600A004GD", descricao: "Induzido", posicaoVisual: "12", confianca: 95 }],
    });

    const catalogos = await useCase.execute({ empresaId: EMPRESA_A, marca: "  ", modelo: "", codigo: "   " });

    expect(catalogos).toHaveLength(1);
  });
});
