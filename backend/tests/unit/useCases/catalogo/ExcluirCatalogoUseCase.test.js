const { ExcluirCatalogoUseCase } = require("../../../../src/useCases/catalogo/ExcluirCatalogoUseCase");
const { FakeCatalogoRepository } = require("../../../fakes/FakeCatalogoRepository");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { NotFoundError } = require("../../../../src/domain/errors/DomainErrors");

const EMPRESA_ID = "empresa-1";

async function montarCatalogoIrresoluvel(catalogoRepository, { pecas = [] } = {}) {
  const catalogo = await catalogoRepository.criar({ empresaId: EMPRESA_ID, nomeArquivo: "catalogo.pdf", caminhoArquivo: "fake/1.pdf" });
  await catalogoRepository.registrarResultadoExtracao(catalogo.id, EMPRESA_ID, {
    marca: "Bosch",
    modelo: "GWS 9-125S",
    tensao: pecas.length > 0 ? "V127" : null,
    pecas,
    confiancaCampos: {},
    confiancaGeral: 62,
    status: "IRRESOLUVEL",
    motivoPendencia: "Extração incompleta: alguns campos obrigatórios não foram identificados automaticamente.",
    camposAusentes: pecas.length > 0 ? [] : ["tensao"],
  });
  return catalogo;
}

function montarUseCase() {
  const catalogoRepository = new FakeCatalogoRepository();
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const useCase = new ExcluirCatalogoUseCase({ catalogoRepository, logAuditoriaRepository });
  return { useCase, catalogoRepository, logAuditoriaRepository };
}

describe("ExcluirCatalogoUseCase — RF10/A3 (Exclusão do documento)", () => {
  test("exclui o catálogo IRRESOLUVEL da fila de pendentes", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    const catalogo = await montarCatalogoIrresoluvel(catalogoRepository);

    await useCase.execute({ catalogoId: catalogo.id, empresaId: EMPRESA_ID, usuarioId: "usuario-1" });

    expect(catalogoRepository.catalogos.some((c) => c.id === catalogo.id)).toBe(false);
  });

  test("exclui também as peças que a extração parcial tenha chegado a gravar", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    const catalogo = await montarCatalogoIrresoluvel(catalogoRepository, {
      pecas: [{ codigo: "1600A004GD", descricao: "Induzido", posicaoVisual: "12", confianca: 40 }],
    });

    await useCase.execute({ catalogoId: catalogo.id, empresaId: EMPRESA_ID, usuarioId: "usuario-1" });

    expect(catalogoRepository.pecas.some((p) => p.catalogoId === catalogo.id)).toBe(false);
  });

  test("lança NotFoundError quando o catálogo não existe", async () => {
    const { useCase } = montarUseCase();

    await expect(
      useCase.execute({ catalogoId: "inexistente", empresaId: EMPRESA_ID, usuarioId: "usuario-1" })
    ).rejects.toThrow(NotFoundError);
  });

  test("lança NotFoundError quando o catálogo já foi validado (fora do escopo do RF10)", async () => {
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

    await expect(
      useCase.execute({ catalogoId: catalogo.id, empresaId: EMPRESA_ID, usuarioId: "usuario-1" })
    ).rejects.toThrow(NotFoundError);
  });

  test("RNF11: lança NotFoundError quando o catálogo pertence a outra empresa", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    const catalogo = await montarCatalogoIrresoluvel(catalogoRepository);

    await expect(
      useCase.execute({ catalogoId: catalogo.id, empresaId: "empresa-invasora", usuarioId: "usuario-1" })
    ).rejects.toThrow(NotFoundError);
  });

  test("registra EXCLUSAO_REGISTRO no log de auditoria", async () => {
    const { useCase, catalogoRepository, logAuditoriaRepository } = montarUseCase();
    const catalogo = await montarCatalogoIrresoluvel(catalogoRepository);

    await useCase.execute({ catalogoId: catalogo.id, empresaId: EMPRESA_ID, usuarioId: "usuario-9" });

    expect(logAuditoriaRepository.registros).toHaveLength(1);
    expect(logAuditoriaRepository.registros[0].tipoAcao).toBe("EXCLUSAO_REGISTRO");
    expect(logAuditoriaRepository.registros[0].usuarioId).toBe("usuario-9");
    expect(logAuditoriaRepository.registros[0].registroAfetado).toBe(catalogo.id);
  });
});
