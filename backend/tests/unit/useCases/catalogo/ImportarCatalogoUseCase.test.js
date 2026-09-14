const { ImportarCatalogoUseCase } = require("../../../../src/useCases/catalogo/ImportarCatalogoUseCase");
const { FakeCatalogoRepository } = require("../../../fakes/FakeCatalogoRepository");
const { FakeFileStorageService } = require("../../../fakes/FakeFileStorageService");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { ValidationError } = require("../../../../src/domain/errors/DomainErrors");

function montarUseCase() {
  const catalogoRepository = new FakeCatalogoRepository();
  const fileStorageService = new FakeFileStorageService();
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const useCase = new ImportarCatalogoUseCase({ catalogoRepository, fileStorageService, logAuditoriaRepository });
  return { useCase, catalogoRepository, fileStorageService, logAuditoriaRepository };
}

function dadosValidos(overrides = {}) {
  return {
    arquivoBuffer: Buffer.from("%PDF-1.4 conteúdo fictício de teste"),
    nomeArquivo: "bosch-gws-9-125s.pdf",
    mimeType: "application/pdf",
    usuarioId: "usuario-1",
    empresaId: "empresa-1",
    ...overrides,
  };
}

describe("ImportarCatalogoUseCase — RF06, fluxo básico + A1 (marca/modelo opcionais)", () => {
  test("importa um PDF válido com sucesso, registrado como PENDENTE_EXTRACAO", async () => {
    const { useCase } = montarUseCase();

    const { catalogo } = await useCase.execute(dadosValidos());

    expect(catalogo.id).toBeDefined();
    expect(catalogo.nomeArquivo).toBe("bosch-gws-9-125s.pdf");
    expect(catalogo.status).toBe("PENDENTE_EXTRACAO");
  });

  test("o catálogo criado fica vinculado à empresa de quem fez o upload (RNF11)", async () => {
    const { useCase } = montarUseCase();

    const { catalogo } = await useCase.execute(dadosValidos({ empresaId: "empresa-42" }));

    expect(catalogo.empresaId).toBe("empresa-42");
  });

  test("salva o conteúdo do arquivo através do FileStorageService", async () => {
    const { useCase, fileStorageService } = montarUseCase();

    const { catalogo } = await useCase.execute(dadosValidos());

    const bufferSalvo = await fileStorageService.obterBuffer(catalogo.caminhoArquivo);
    expect(bufferSalvo.toString()).toContain("conteúdo fictício de teste");
  });

  test("rejeita quando nenhum arquivo é enviado", async () => {
    const { useCase } = montarUseCase();

    await expect(useCase.execute(dadosValidos({ arquivoBuffer: null }))).rejects.toThrow(ValidationError);
  });

  test("rejeita formato diferente de PDF (fluxo de exceção E1)", async () => {
    const { useCase } = montarUseCase();

    await expect(useCase.execute(dadosValidos({ mimeType: "image/png" }))).rejects.toThrow(ValidationError);
  });

  test("a mensagem de erro do E1 é a especificada no DERS", async () => {
    const { useCase } = montarUseCase();

    try {
      await useCase.execute(dadosValidos({ mimeType: "image/png" }));
      throw new Error("deveria ter lançado ValidationError");
    } catch (erro) {
      expect(erro).toBeInstanceOf(ValidationError);
      expect(erro.fieldErrors.arquivo).toBe("O sistema aceita exclusivamente arquivos em formato PDF.");
    }
  });

  test("rejeita arquivo maior que 50MB", async () => {
    const { useCase } = montarUseCase();
    const bufferGrande = Buffer.alloc(51 * 1024 * 1024);

    await expect(useCase.execute(dadosValidos({ arquivoBuffer: bufferGrande }))).rejects.toThrow(ValidationError);
  });

  test("aceita marca e modelo opcionais (fluxo alternativo A1) e retorna trimados", async () => {
    const { useCase } = montarUseCase();

    const resultado = await useCase.execute(dadosValidos({ marca: "  Bosch  ", modelo: " GWS 9-125S " }));

    expect(resultado.marcaSugerida).toBe("Bosch");
    expect(resultado.modeloSugerido).toBe("GWS 9-125S");
  });

  test("retorna marcaSugerida/modeloSugerido como null quando não informados", async () => {
    const { useCase } = montarUseCase();

    const resultado = await useCase.execute(dadosValidos());

    expect(resultado.marcaSugerida).toBeNull();
    expect(resultado.modeloSugerido).toBeNull();
  });

  test("registra UPLOAD_VISTA_EXPLODIDA no log de auditoria", async () => {
    const { useCase, logAuditoriaRepository } = montarUseCase();

    const { catalogo } = await useCase.execute(dadosValidos({ usuarioId: "usuario-42" }));

    expect(logAuditoriaRepository.registros).toHaveLength(1);
    expect(logAuditoriaRepository.registros[0].tipoAcao).toBe("UPLOAD_VISTA_EXPLODIDA");
    expect(logAuditoriaRepository.registros[0].usuarioId).toBe("usuario-42");
    expect(logAuditoriaRepository.registros[0].registroAfetado).toBe(catalogo.id);
  });
});
