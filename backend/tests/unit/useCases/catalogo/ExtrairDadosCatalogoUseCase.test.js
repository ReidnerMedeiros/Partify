const { ExtrairDadosCatalogoUseCase } = require("../../../../src/useCases/catalogo/ExtrairDadosCatalogoUseCase");
const { FakeCatalogoRepository } = require("../../../fakes/FakeCatalogoRepository");
const { FakeFileStorageService } = require("../../../fakes/FakeFileStorageService");
const { FakeExtractionService } = require("../../../fakes/FakeExtractionService");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { NotFoundError, ServiceUnavailableError, ValidationError } = require("../../../../src/domain/errors/DomainErrors");

const EMPRESA_ID = "empresa-1";

async function montarUseCaseComCatalogo() {
  const catalogoRepository = new FakeCatalogoRepository();
  const fileStorageService = new FakeFileStorageService();
  const extractionService = new FakeExtractionService();
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const useCase = new ExtrairDadosCatalogoUseCase({
    catalogoRepository,
    fileStorageService,
    extractionService,
    logAuditoriaRepository,
  });

  const caminhoArquivo = await fileStorageService.salvar({
    buffer: Buffer.from("pdf fictício"),
    nomeOriginal: "catalogo.pdf",
  });
  const catalogo = await catalogoRepository.criar({ empresaId: EMPRESA_ID, nomeArquivo: "catalogo.pdf", caminhoArquivo });

  return { useCase, catalogoRepository, extractionService, logAuditoriaRepository, catalogo };
}

function respostaCompleta(overrides = {}) {
  return {
    compreendido: true,
    dominioReconhecido: true,
    marca: "Bosch",
    modelo: "GWS 9-125S",
    tensao: "V127",
    pecas: [
      { codigo: "1600A004GD", descricao: "Induzido 127V", posicaoVisual: "12", confianca: 95 },
      { codigo: "2604321905", descricao: "Escova de carvão", posicaoVisual: "18", confianca: 30 },
    ],
    confiancaCampos: { marca: 95, modelo: 70, tensao: 98 },
    confiancaGeral: 82,
    ...overrides,
  };
}

describe("ExtrairDadosCatalogoUseCase — RF07, fluxo básico + A1 + E1 + E2", () => {
  test("extração completa: marca/modelo/tensão e peças persistidos, status PENDENTE_VALIDACAO", async () => {
    const { useCase, extractionService, catalogo } = await montarUseCaseComCatalogo();
    extractionService.proximaResposta = respostaCompleta();

    const resultado = await useCase.execute({ catalogoId: catalogo.id, usuarioId: "usuario-1", empresaId: EMPRESA_ID });

    expect(resultado.catalogo.status).toBe("PENDENTE_VALIDACAO");
    expect(resultado.marca).toBe("Bosch");
    expect(resultado.modelo).toBe("GWS 9-125S");
    expect(resultado.tensao).toBe("V127");
    expect(resultado.pecas).toHaveLength(2);
    expect(resultado.catalogo.confiancaGeral).toBe(82);
  });

  test("persiste a quantidade de cada peça extraída", async () => {
    const { useCase, extractionService, catalogo } = await montarUseCaseComCatalogo();
    extractionService.proximaResposta = respostaCompleta({
      pecas: [
        { codigo: "1600A004GD", descricao: "Induzido 127V", posicaoVisual: "12", quantidade: 2, confianca: 95 },
        { codigo: "2604321905", descricao: "Escova de carvão", posicaoVisual: "18", quantidade: null, confianca: 90 },
      ],
    });

    const resultado = await useCase.execute({ catalogoId: catalogo.id, usuarioId: "usuario-1", empresaId: EMPRESA_ID });

    expect(resultado.pecas[0].quantidade).toBe(2);
    expect(resultado.pecas[1].quantidade).toBeNull();
  });

  test("remove a quantidade colada no código quando o documento tem um padrão de comprimento", async () => {
    const { useCase, extractionService, catalogo } = await montarUseCaseComCatalogo();
    extractionService.proximaResposta = respostaCompleta({
      pecas: [
        { codigo: "9 618 085 763", descricao: "SAPATA POLAR", posicaoVisual: "2", quantidade: 1, confianca: 95 },
        { codigo: "9 618 083 506", descricao: "INDUZIDO", posicaoVisual: "3", quantidade: 1, confianca: 95 },
        { codigo: "9 618 086 703", descricao: "INTERRUPTOR", posicaoVisual: "4", quantidade: 1, confianca: 95 },
        { codigo: "2 9618 087 099", descricao: "PARAFUSO PARA 4x16 MM", posicaoVisual: "19", quantidade: null, confianca: 90 },
      ],
    });

    const resultado = await useCase.execute({ catalogoId: catalogo.id, usuarioId: "usuario-1", empresaId: EMPRESA_ID });

    expect(resultado.pecas[3].codigo).toBe("9618 087 099");
    expect(resultado.pecas[3].quantidade).toBe(2);
  });

  test("limita a confiança de peças com descrição possivelmente truncada", async () => {
    const { useCase, extractionService, catalogo } = await montarUseCaseComCatalogo();
    extractionService.proximaResposta = respostaCompleta({
      pecas: [{ codigo: "9618083219", descricao: "MANCAL DO", posicaoVisual: "5", quantidade: 1, confianca: 95 }],
    });

    const resultado = await useCase.execute({ catalogoId: catalogo.id, usuarioId: "usuario-1", empresaId: EMPRESA_ID });

    expect(resultado.pecas[0].confianca).toBe(60);
  });

  test("passa marcaSugerida/modeloSugerido (RF06-A1) para o ExtractionService", async () => {
    const { useCase, extractionService, catalogo } = await montarUseCaseComCatalogo();
    extractionService.proximaResposta = respostaCompleta();

    await useCase.execute({
      catalogoId: catalogo.id,
      marcaSugerida: "Bosch",
      modeloSugerido: "GWS 9-125S",
      usuarioId: "usuario-1",
      empresaId: EMPRESA_ID,
    });

    expect(extractionService.chamadas[0].marcaSugerida).toBe("Bosch");
    expect(extractionService.chamadas[0].modeloSugerido).toBe("GWS 9-125S");
  });

  test("lança NotFoundError quando o catálogo não existe", async () => {
    const { useCase } = await montarUseCaseComCatalogo();

    await expect(
      useCase.execute({ catalogoId: "inexistente", usuarioId: "usuario-1", empresaId: EMPRESA_ID })
    ).rejects.toThrow(NotFoundError);
  });

  test("RNF11: lança NotFoundError quando o catálogo pertence a outra empresa", async () => {
    const { useCase, catalogo } = await montarUseCaseComCatalogo();

    await expect(
      useCase.execute({ catalogoId: catalogo.id, usuarioId: "usuario-1", empresaId: "empresa-invasora" })
    ).rejects.toThrow(NotFoundError);
  });

  test("fluxo de exceção E1: falha de comunicação lança ServiceUnavailableError e não altera o catálogo", async () => {
    const { useCase, extractionService, catalogo, catalogoRepository } = await montarUseCaseComCatalogo();
    extractionService.deveFalhar = true;

    await expect(
      useCase.execute({ catalogoId: catalogo.id, usuarioId: "usuario-1", empresaId: EMPRESA_ID })
    ).rejects.toThrow(ServiceUnavailableError);

    const atual = await catalogoRepository.buscarComPecas(catalogo.id);
    expect(atual.catalogo.status).toBe("PENDENTE_EXTRACAO");
  });

  test("teste de recuperação: depois de uma falha E1, uma nova tentativa bem-sucedida não deixa resíduo (peças duplicadas) do estado anterior", async () => {
    const { useCase, extractionService, catalogo, catalogoRepository } = await montarUseCaseComCatalogo();

    // 1ª tentativa: falha de comunicação (E1) — nada deve ter sido persistido.
    extractionService.deveFalhar = true;
    await expect(
      useCase.execute({ catalogoId: catalogo.id, usuarioId: "usuario-1", empresaId: EMPRESA_ID })
    ).rejects.toThrow(ServiceUnavailableError);

    const apósFalha = await catalogoRepository.buscarComPecas(catalogo.id);
    expect(apósFalha.pecas).toHaveLength(0);

    // 2ª tentativa (retry do usuário, mesmo catalogoId): sucesso.
    extractionService.deveFalhar = false;
    extractionService.proximaResposta = respostaCompleta();
    const resultado = await useCase.execute({ catalogoId: catalogo.id, usuarioId: "usuario-1", empresaId: EMPRESA_ID });

    // Só as 2 peças da extração bem-sucedida — nenhum resíduo da tentativa que falhou.
    expect(resultado.pecas).toHaveLength(2);
    const finalNoRepositorio = await catalogoRepository.buscarComPecas(catalogo.id);
    expect(finalNoRepositorio.pecas).toHaveLength(2);
  });

  test("fluxo alternativo A1: extração parcial (modelo ausente) fica IRRESOLUVEL com camposAusentes", async () => {
    const { useCase, extractionService, catalogo } = await montarUseCaseComCatalogo();
    extractionService.proximaResposta = respostaCompleta({ modelo: null });

    const resultado = await useCase.execute({ catalogoId: catalogo.id, usuarioId: "usuario-1", empresaId: EMPRESA_ID });

    expect(resultado.catalogo.status).toBe("IRRESOLUVEL");
    expect(resultado.catalogo.camposAusentes).toEqual(["modelo"]);
  });

  test("fluxo de exceção E2: nada identificável fica IRRESOLUVEL sem criar peças", async () => {
    const { useCase, extractionService, catalogo } = await montarUseCaseComCatalogo();
    extractionService.proximaResposta = respostaCompleta({
      compreendido: false,
      marca: null,
      modelo: null,
      tensao: null,
      pecas: [],
    });

    const resultado = await useCase.execute({ catalogoId: catalogo.id, usuarioId: "usuario-1", empresaId: EMPRESA_ID });

    expect(resultado.catalogo.status).toBe("IRRESOLUVEL");
    expect(resultado.catalogo.camposAusentes).toEqual(["marca", "modelo", "tensao"]);
    expect(resultado.pecas).toHaveLength(0);
  });

  test("guarda-corpo de domínio: rejeita e exclui o catálogo quando o documento é compreendido mas não é do domínio suportado", async () => {
    const { useCase, extractionService, catalogo, catalogoRepository, logAuditoriaRepository } = await montarUseCaseComCatalogo();
    // Ex.: um PDF de peça automotiva — bem formado e legível, mas fora do domínio.
    extractionService.proximaResposta = respostaCompleta({
      dominioReconhecido: false,
      marca: "Ford",
      modelo: "Pastilha de freio",
    });

    await expect(
      useCase.execute({ catalogoId: catalogo.id, usuarioId: "usuario-1", empresaId: EMPRESA_ID })
    ).rejects.toThrow(ValidationError);

    const atual = await catalogoRepository.buscarComPecas(catalogo.id);
    expect(atual).toBeNull();
    expect(logAuditoriaRepository.registros).toHaveLength(1);
    expect(logAuditoriaRepository.registros[0].tipoAcao).toBe("EXCLUSAO_REGISTRO");
  });

  test("guarda-corpo de domínio: documento ilegível (não compreendido) NÃO é rejeitado como fora do domínio — cai no fluxo E2 normal", async () => {
    const { useCase, extractionService, catalogo, catalogoRepository } = await montarUseCaseComCatalogo();
    extractionService.proximaResposta = respostaCompleta({
      compreendido: false,
      dominioReconhecido: false,
      marca: null,
      modelo: null,
      tensao: null,
      pecas: [],
    });

    const resultado = await useCase.execute({ catalogoId: catalogo.id, usuarioId: "usuario-1", empresaId: EMPRESA_ID });

    expect(resultado.catalogo.status).toBe("IRRESOLUVEL");
    const atual = await catalogoRepository.buscarComPecas(catalogo.id);
    expect(atual).not.toBeNull();
  });

  test("registra EXTRACAO_IA no log de auditoria, sem o texto bruto extraído", async () => {
    const { useCase, extractionService, catalogo, logAuditoriaRepository } = await montarUseCaseComCatalogo();
    extractionService.proximaResposta = respostaCompleta();

    await useCase.execute({ catalogoId: catalogo.id, usuarioId: "usuario-1", empresaId: EMPRESA_ID });

    expect(logAuditoriaRepository.registros).toHaveLength(1);
    expect(logAuditoriaRepository.registros[0].tipoAcao).toBe("EXTRACAO_IA");
    expect(logAuditoriaRepository.registros[0].detalhes.totalPecasIdentificadas).toBe(2);
    expect(logAuditoriaRepository.registros[0].detalhes.confiancaGeral).toBe(82);
  });

  test("duas extrações da mesma marca/modelo/tensão, na mesma empresa, reaproveitam a mesma VersaoTensao (find-or-create)", async () => {
    const { useCase, extractionService, catalogoRepository, catalogo } = await montarUseCaseComCatalogo();
    extractionService.proximaResposta = respostaCompleta();
    const resultado1 = await useCase.execute({ catalogoId: catalogo.id, usuarioId: "usuario-1", empresaId: EMPRESA_ID });

    // Segundo catálogo, mesma empresa, mesma marca/modelo/tensão.
    const catalogo2 = await catalogoRepository.criar({
      empresaId: EMPRESA_ID,
      nomeArquivo: "outro.pdf",
      caminhoArquivo: "fake/2-outro.pdf",
    });
    extractionService.proximaResposta = respostaCompleta({ pecas: [{ codigo: "9999", descricao: "Outra peça", confianca: 90 }] });
    const resultado2 = await useCase.execute({ catalogoId: catalogo2.id, usuarioId: "usuario-1", empresaId: EMPRESA_ID });

    expect(resultado1.pecas[0].versaoTensaoId).toBe(resultado2.pecas[0].versaoTensaoId);
    expect(catalogoRepository.marcas).toHaveLength(1);
    expect(catalogoRepository.ferramentas).toHaveLength(1);
    expect(catalogoRepository.versoesTensao).toHaveLength(1);
  });

  test("RNF11: duas empresas com marca/modelo/tensão idênticos NÃO reaproveitam Marca/Ferramenta/VersaoTensao entre si", async () => {
    const { useCase, extractionService, catalogoRepository, catalogo } = await montarUseCaseComCatalogo();
    extractionService.proximaResposta = respostaCompleta();
    const resultado1 = await useCase.execute({ catalogoId: catalogo.id, usuarioId: "usuario-1", empresaId: EMPRESA_ID });

    // Catálogo de uma SEGUNDA empresa, mesma marca/modelo/tensão do fabricante.
    const outraEmpresaId = "empresa-2";
    const catalogo2 = await catalogoRepository.criar({
      empresaId: outraEmpresaId,
      nomeArquivo: "outro.pdf",
      caminhoArquivo: "fake/2-outro.pdf",
    });
    extractionService.proximaResposta = respostaCompleta();
    const resultado2 = await useCase.execute({ catalogoId: catalogo2.id, usuarioId: "usuario-2", empresaId: outraEmpresaId });

    expect(resultado1.pecas[0].versaoTensaoId).not.toBe(resultado2.pecas[0].versaoTensaoId);
    expect(catalogoRepository.marcas).toHaveLength(2);
    expect(catalogoRepository.ferramentas).toHaveLength(2);
    expect(catalogoRepository.versoesTensao).toHaveLength(2);
    expect(catalogoRepository.marcas.every((m) => m.empresaId)).toBe(true);
  });
});
