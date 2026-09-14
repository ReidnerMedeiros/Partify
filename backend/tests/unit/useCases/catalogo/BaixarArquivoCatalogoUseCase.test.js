const { BaixarArquivoCatalogoUseCase } = require("../../../../src/useCases/catalogo/BaixarArquivoCatalogoUseCase");
const { FakeCatalogoRepository } = require("../../../fakes/FakeCatalogoRepository");
const { FakeFileStorageService } = require("../../../fakes/FakeFileStorageService");
const { NotFoundError } = require("../../../../src/domain/errors/DomainErrors");

const EMPRESA_ID = "empresa-1";

async function montarUseCase() {
  const catalogoRepository = new FakeCatalogoRepository();
  const fileStorageService = new FakeFileStorageService();
  const useCase = new BaixarArquivoCatalogoUseCase({ catalogoRepository, fileStorageService });

  const caminhoArquivo = await fileStorageService.salvar({ buffer: Buffer.from("pdf fictício"), nomeOriginal: "catalogo.pdf" });
  const catalogo = await catalogoRepository.criar({ empresaId: EMPRESA_ID, nomeArquivo: "catalogo.pdf", caminhoArquivo });

  return { useCase, catalogo };
}

describe("BaixarArquivoCatalogoUseCase — RF09 (reexibição do documento original)", () => {
  test("retorna o buffer e o nome do arquivo do catálogo", async () => {
    const { useCase, catalogo } = await montarUseCase();

    const resultado = await useCase.execute({ catalogoId: catalogo.id, empresaId: EMPRESA_ID });

    expect(resultado.buffer.toString()).toContain("pdf fictício");
    expect(resultado.nomeArquivo).toBe("catalogo.pdf");
  });

  test("lança NotFoundError quando o catálogo não existe", async () => {
    const { useCase } = await montarUseCase();

    await expect(useCase.execute({ catalogoId: "inexistente", empresaId: EMPRESA_ID })).rejects.toThrow(NotFoundError);
  });

  test("RNF11: lança NotFoundError quando o catálogo pertence a outra empresa", async () => {
    const { useCase, catalogo } = await montarUseCase();

    await expect(useCase.execute({ catalogoId: catalogo.id, empresaId: "empresa-invasora" })).rejects.toThrow(NotFoundError);
  });
});
