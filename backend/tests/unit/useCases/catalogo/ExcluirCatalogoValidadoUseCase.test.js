const { ExcluirCatalogoValidadoUseCase } = require("../../../../src/useCases/catalogo/ExcluirCatalogoValidadoUseCase");
const { FakeCatalogoRepository } = require("../../../fakes/FakeCatalogoRepository");
const { FakeFileStorageService } = require("../../../fakes/FakeFileStorageService");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { NotFoundError } = require("../../../../src/domain/errors/DomainErrors");

const EMPRESA_ID = "empresa-1";

async function montarCatalogo(catalogoRepository, { status }) {
  const catalogo = await catalogoRepository.criar({ empresaId: EMPRESA_ID, nomeArquivo: "catalogo.pdf", caminhoArquivo: "fake/1.pdf" });
  await catalogoRepository.registrarResultadoExtracao(catalogo.id, EMPRESA_ID, {
    marca: "Bosch",
    modelo: "GWS 9-125S",
    tensao: "V127",
    pecas: [
      { codigo: "1600A004GD", descricao: "Induzido", posicaoVisual: "12", confianca: 95 },
      { codigo: "2604321905", descricao: "Escova de carvão", posicaoVisual: "18", confianca: 90 },
    ],
    confiancaCampos: {},
    confiancaGeral: 90,
    status,
    motivoPendencia: null,
    camposAusentes: null,
  });
  return catalogo;
}

function montarUseCase() {
  const catalogoRepository = new FakeCatalogoRepository();
  const fileStorageService = new FakeFileStorageService();
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const useCase = new ExcluirCatalogoValidadoUseCase({ catalogoRepository, fileStorageService, logAuditoriaRepository });
  return { useCase, catalogoRepository, fileStorageService, logAuditoriaRepository };
}

describe("ExcluirCatalogoValidadoUseCase — RF09, exclusão de catálogo inteiro", () => {
  test("exclui o catálogo VALIDADO e todas as suas peças", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    const catalogo = await montarCatalogo(catalogoRepository, { status: "VALIDADO" });

    await useCase.execute({ catalogoId: catalogo.id, empresaId: EMPRESA_ID, usuarioId: "usuario-1" });

    expect(catalogoRepository.catalogos.some((c) => c.id === catalogo.id)).toBe(false);
    expect(catalogoRepository.pecas.some((p) => p.catalogoId === catalogo.id)).toBe(false);
  });

  test("remove o PDF original do armazenamento", async () => {
    const { useCase, catalogoRepository, fileStorageService } = montarUseCase();
    const catalogo = await montarCatalogo(catalogoRepository, { status: "VALIDADO" });
    fileStorageService.arquivos.set(catalogo.caminhoArquivo, Buffer.from("pdf"));

    await useCase.execute({ catalogoId: catalogo.id, empresaId: EMPRESA_ID, usuarioId: "usuario-1" });

    expect(fileStorageService.arquivos.has(catalogo.caminhoArquivo)).toBe(false);
  });

  test("uma falha ao remover o arquivo não impede a exclusão do catálogo", async () => {
    const { useCase, catalogoRepository, fileStorageService, logAuditoriaRepository } = montarUseCase();
    const catalogo = await montarCatalogo(catalogoRepository, { status: "VALIDADO" });
    fileStorageService.deveFalharAoExcluir = true;

    await useCase.execute({ catalogoId: catalogo.id, empresaId: EMPRESA_ID, usuarioId: "usuario-1" });

    expect(catalogoRepository.catalogos.some((c) => c.id === catalogo.id)).toBe(false);
    expect(logAuditoriaRepository.registros).toHaveLength(1);
  });

  test("registra EXCLUSAO_REGISTRO no log de auditoria com marca, modelo e total de peças", async () => {
    const { useCase, catalogoRepository, logAuditoriaRepository } = montarUseCase();
    const catalogo = await montarCatalogo(catalogoRepository, { status: "VALIDADO" });

    await useCase.execute({ catalogoId: catalogo.id, empresaId: EMPRESA_ID, usuarioId: "usuario-9" });

    expect(logAuditoriaRepository.registros).toHaveLength(1);
    expect(logAuditoriaRepository.registros[0]).toMatchObject({
      tipoAcao: "EXCLUSAO_REGISTRO",
      usuarioId: "usuario-9",
      registroAfetado: catalogo.id,
    });
    expect(logAuditoriaRepository.registros[0].detalhes).toMatchObject({ marca: "Bosch", modelo: "GWS 9-125S", totalPecas: 2 });
  });

  test("lança NotFoundError quando o catálogo não existe", async () => {
    const { useCase } = montarUseCase();

    await expect(
      useCase.execute({ catalogoId: "inexistente", empresaId: EMPRESA_ID, usuarioId: "usuario-1" })
    ).rejects.toThrow(NotFoundError);
  });

  test("lança NotFoundError para catálogo que ainda não foi validado (esses são excluídos pela fila de pendentes)", async () => {
    const { useCase, catalogoRepository, fileStorageService } = montarUseCase();
    const catalogo = await montarCatalogo(catalogoRepository, { status: "PENDENTE_VALIDACAO" });
    fileStorageService.arquivos.set(catalogo.caminhoArquivo, Buffer.from("pdf"));

    await expect(
      useCase.execute({ catalogoId: catalogo.id, empresaId: EMPRESA_ID, usuarioId: "usuario-1" })
    ).rejects.toThrow(NotFoundError);

    expect(catalogoRepository.catalogos.some((c) => c.id === catalogo.id)).toBe(true);
    expect(fileStorageService.arquivos.has(catalogo.caminhoArquivo)).toBe(true);
  });

  test("RNF11: lança NotFoundError quando o catálogo pertence a outra empresa e não apaga nada", async () => {
    const { useCase, catalogoRepository } = montarUseCase();
    const catalogo = await montarCatalogo(catalogoRepository, { status: "VALIDADO" });

    await expect(
      useCase.execute({ catalogoId: catalogo.id, empresaId: "empresa-invasora", usuarioId: "usuario-1" })
    ).rejects.toThrow(NotFoundError);

    expect(catalogoRepository.catalogos.some((c) => c.id === catalogo.id)).toBe(true);
  });
});
