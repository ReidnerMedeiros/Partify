const { ListarPecasUseCase } = require("../../../../src/useCases/catalogo/ListarPecasUseCase");
const { FakeCatalogoRepository } = require("../../../fakes/FakeCatalogoRepository");

const EMPRESA_A = "empresa-a";
const EMPRESA_B = "empresa-b";

async function catalogoValidado(catalogoRepository, { empresaId, marca, modelo, tensao, pecas }) {
  const catalogo = await catalogoRepository.criar({ empresaId, nomeArquivo: "catalogo.pdf", caminhoArquivo: "fake/1.pdf" });
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
  const useCase = new ListarPecasUseCase({ catalogoRepository });
  return { useCase, catalogoRepository };
}

describe("ListarPecasUseCase — RF09/A2 (Consulta de registros)", () => {
  test("lista peças de catálogos VALIDADO da empresa", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    await catalogoValidado(catalogoRepository, {
      empresaId: EMPRESA_A,
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      pecas: [{ codigo: "1600A004GD", descricao: "Induzido", posicaoVisual: "12", confianca: 95 }],
    });

    const pecas = await useCase.execute({ empresaId: EMPRESA_A });

    expect(pecas).toHaveLength(1);
    expect(pecas[0].marca).toBe("Bosch");
    expect(pecas[0].modelo).toBe("GWS 9-125S");
    expect(pecas[0].tensao).toBe("V127");
  });

  test("não lista peças de catálogos ainda não validados (PENDENTE_VALIDACAO/IRRESOLUVEL)", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    const catalogo = await catalogoRepository.criar({ empresaId: EMPRESA_A, nomeArquivo: "x.pdf", caminhoArquivo: "fake/2.pdf" });
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

    const pecas = await useCase.execute({ empresaId: EMPRESA_A });

    expect(pecas).toHaveLength(0);
  });

  test("RNF11: não lista peças validadas de outra empresa", async () => {
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

    const pecasA = await useCase.execute({ empresaId: EMPRESA_A });
    const pecasB = await useCase.execute({ empresaId: EMPRESA_B });

    expect(pecasA).toHaveLength(1);
    expect(pecasA[0].marca).toBe("Bosch");
    expect(pecasB).toHaveLength(1);
    expect(pecasB[0].marca).toBe("DeWalt");
  });

  test("filtra por marca, modelo e código", async () => {
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
    expect(porMarca[0].codigo).toBe("1600A002BH");

    const porCodigo = await useCase.execute({ empresaId: EMPRESA_A, codigo: "2604321905" });
    expect(porCodigo).toHaveLength(1);
    expect(porCodigo[0].descricao).toBe("Escova de carvão");

    const porModelo = await useCase.execute({ empresaId: EMPRESA_A, modelo: "GWS 9-125S" });
    expect(porModelo).toHaveLength(2);
  });
});
