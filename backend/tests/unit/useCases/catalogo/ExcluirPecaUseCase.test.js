const { ExcluirPecaUseCase } = require("../../../../src/useCases/catalogo/ExcluirPecaUseCase");
const { FakeCatalogoRepository } = require("../../../fakes/FakeCatalogoRepository");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { NotFoundError } = require("../../../../src/domain/errors/DomainErrors");

const EMPRESA_ID = "empresa-1";

async function montarUseCaseComPeca() {
  const catalogoRepository = new FakeCatalogoRepository();
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const useCase = new ExcluirPecaUseCase({ catalogoRepository, logAuditoriaRepository });

  const catalogo = await catalogoRepository.criar({ empresaId: EMPRESA_ID, nomeArquivo: "catalogo.pdf", caminhoArquivo: "fake/1.pdf" });
  const resultado = await catalogoRepository.registrarResultadoExtracao(catalogo.id, EMPRESA_ID, {
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

  return { useCase, catalogoRepository, logAuditoriaRepository, peca: resultado.pecas[0] };
}

describe("ExcluirPecaUseCase — RF09/A4 (Exclusão de registro)", () => {
  test("exclui a peça com sucesso", async () => {
    const { useCase, catalogoRepository, peca } = await montarUseCaseComPeca();

    await useCase.execute({ pecaId: peca.id, empresaId: EMPRESA_ID, usuarioId: "usuario-1" });

    expect(catalogoRepository.pecas.some((p) => p.id === peca.id)).toBe(false);
  });

  test("remove também o embedding associado (mesma linha)", async () => {
    const { useCase, catalogoRepository, peca } = await montarUseCaseComPeca();
    await catalogoRepository.atualizarEmbeddingPeca(peca.id, [1, 2, 3]);

    await useCase.execute({ pecaId: peca.id, empresaId: EMPRESA_ID, usuarioId: "usuario-1" });

    expect(catalogoRepository.pecas.some((p) => p.id === peca.id)).toBe(false);
  });

  test("lança NotFoundError quando a peça não existe", async () => {
    const { useCase } = await montarUseCaseComPeca();

    await expect(useCase.execute({ pecaId: "inexistente", empresaId: EMPRESA_ID, usuarioId: "usuario-1" })).rejects.toThrow(
      NotFoundError
    );
  });

  test("RNF11: lança NotFoundError quando a peça pertence a outra empresa", async () => {
    const { useCase, peca } = await montarUseCaseComPeca();

    await expect(
      useCase.execute({ pecaId: peca.id, empresaId: "empresa-invasora", usuarioId: "usuario-1" })
    ).rejects.toThrow(NotFoundError);
  });

  test("registra EXCLUSAO_REGISTRO no log de auditoria", async () => {
    const { useCase, logAuditoriaRepository, peca } = await montarUseCaseComPeca();

    await useCase.execute({ pecaId: peca.id, empresaId: EMPRESA_ID, usuarioId: "usuario-9" });

    expect(logAuditoriaRepository.registros).toHaveLength(1);
    expect(logAuditoriaRepository.registros[0].tipoAcao).toBe("EXCLUSAO_REGISTRO");
    expect(logAuditoriaRepository.registros[0].usuarioId).toBe("usuario-9");
    expect(logAuditoriaRepository.registros[0].registroAfetado).toBe(peca.id);
  });
});
