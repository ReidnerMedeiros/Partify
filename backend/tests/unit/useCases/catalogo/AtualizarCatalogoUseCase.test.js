const { AtualizarCatalogoUseCase } = require("../../../../src/useCases/catalogo/AtualizarCatalogoUseCase");
const { FakeCatalogoRepository } = require("../../../fakes/FakeCatalogoRepository");
const { FakeEmbeddingService } = require("../../../fakes/FakeEmbeddingService");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { NotFoundError, ValidationError } = require("../../../../src/domain/errors/DomainErrors");

const EMPRESA_ID = "empresa-1";

async function montarUseCaseComCatalogoValidado() {
  const catalogoRepository = new FakeCatalogoRepository();
  const embeddingService = new FakeEmbeddingService();
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const useCase = new AtualizarCatalogoUseCase({ catalogoRepository, embeddingService, logAuditoriaRepository });

  const catalogo = await catalogoRepository.criar({ empresaId: EMPRESA_ID, nomeArquivo: "catalogo.pdf", caminhoArquivo: "fake/1.pdf" });
  await catalogoRepository.registrarResultadoExtracao(catalogo.id, EMPRESA_ID, {
    marca: "Bosch",
    modelo: "GWS 9-125S",
    tensao: "V127",
    pecas: [
      { codigo: "1600A004GD", descricao: "Induzido 127V", posicaoVisual: "12", confianca: 95 },
      { codigo: "2604321905", descricao: "Escova de carvão", posicaoVisual: "18", confianca: 90 },
    ],
    confiancaCampos: {},
    confiancaGeral: 92,
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
  const validado = await catalogoRepository.buscarComPecas(catalogo.id);

  return { useCase, catalogoRepository, embeddingService, logAuditoriaRepository, catalogo, validado };
}

function payloadValido(validado, overrides = {}) {
  return {
    catalogoId: validado.catalogo.id,
    empresaId: EMPRESA_ID,
    usuarioId: "usuario-1",
    marca: validado.marca,
    modelo: validado.modelo,
    tensao: validado.tensao,
    pecas: validado.pecas.map((p) => ({ id: p.id, codigo: p.codigo, descricao: p.descricao, posicaoVisual: p.posicaoVisual })),
    ...overrides,
  };
}

describe("AtualizarCatalogoUseCase — RF09/A3 (Atualização de registro)", () => {
  test("aplica edições aos campos e mantém o catálogo VALIDADO", async () => {
    const { useCase, validado } = await montarUseCaseComCatalogoValidado();

    const resultado = await useCase.execute(payloadValido(validado, { modelo: "GWS 9-125S Corrigido" }));

    expect(resultado.modelo).toBe("GWS 9-125S Corrigido");
    expect(resultado.catalogo.status).toBe("VALIDADO");
  });

  test("permite adicionar uma peça nova", async () => {
    const { useCase, validado } = await montarUseCaseComCatalogoValidado();

    const resultado = await useCase.execute(
      payloadValido(validado, {
        pecas: [
          ...validado.pecas.map((p) => ({ id: p.id, codigo: p.codigo, descricao: p.descricao, posicaoVisual: p.posicaoVisual })),
          { codigo: "9999999999", descricao: "Peça nova", posicaoVisual: "20" },
        ],
      })
    );

    expect(resultado.pecas).toHaveLength(3);
  });

  test("permite remover uma peça existente (ela não é mais retornada nem listada)", async () => {
    const { useCase, catalogoRepository, validado } = await montarUseCaseComCatalogoValidado();
    const [primeira, segunda] = validado.pecas;

    const resultado = await useCase.execute(
      payloadValido(validado, {
        pecas: [{ id: primeira.id, codigo: primeira.codigo, descricao: primeira.descricao, posicaoVisual: primeira.posicaoVisual }],
      })
    );

    expect(resultado.pecas).toHaveLength(1);
    expect(resultado.pecas[0].id).toBe(primeira.id);
    expect(catalogoRepository.pecas.some((p) => p.id === segunda.id)).toBe(false);
  });

  test("lança NotFoundError quando o catálogo não existe", async () => {
    const { useCase, validado } = await montarUseCaseComCatalogoValidado();

    await expect(useCase.execute(payloadValido(validado, { catalogoId: "inexistente" }))).rejects.toThrow(NotFoundError);
  });

  test("RNF11: lança NotFoundError quando o catálogo pertence a outra empresa", async () => {
    const { useCase, validado } = await montarUseCaseComCatalogoValidado();

    await expect(useCase.execute(payloadValido(validado, { empresaId: "empresa-invasora" }))).rejects.toThrow(NotFoundError);
  });

  test("rejeita quando marca está vazia", async () => {
    const { useCase, validado } = await montarUseCaseComCatalogoValidado();

    await expect(useCase.execute(payloadValido(validado, { marca: "" }))).rejects.toThrow(ValidationError);
  });

  test("RN04: rejeita quando uma peça está sem posição visual", async () => {
    const { useCase, validado } = await montarUseCaseComCatalogoValidado();

    await expect(
      useCase.execute(
        payloadValido(validado, {
          pecas: [{ id: validado.pecas[0].id, codigo: validado.pecas[0].codigo, posicaoVisual: "" }],
        })
      )
    ).rejects.toThrow(ValidationError);
  });

  test("registra EDICAO_REGISTRO no log de auditoria com anterior/novo", async () => {
    const { useCase, validado, logAuditoriaRepository } = await montarUseCaseComCatalogoValidado();

    await useCase.execute(payloadValido(validado, { modelo: "GWS 9-125S Corrigido" }));

    expect(logAuditoriaRepository.registros).toHaveLength(1);
    expect(logAuditoriaRepository.registros[0].tipoAcao).toBe("EDICAO_REGISTRO");
    expect(logAuditoriaRepository.registros[0].detalhes.anterior.modelo).toBe("GWS 9-125S");
    expect(logAuditoriaRepository.registros[0].detalhes.novo.modelo).toBe("GWS 9-125S Corrigido");
  });

  test("só reprocessa o embedding de peças novas ou cujo texto mudou", async () => {
    const { useCase, validado, embeddingService } = await montarUseCaseComCatalogoValidado();
    const [primeira, segunda] = validado.pecas;

    await useCase.execute(
      payloadValido(validado, {
        pecas: [
          { id: primeira.id, codigo: primeira.codigo, descricao: "Descrição totalmente nova", posicaoVisual: primeira.posicaoVisual },
          { id: segunda.id, codigo: segunda.codigo, descricao: segunda.descricao, posicaoVisual: segunda.posicaoVisual },
        ],
      })
    );

    // Só a primeira peça teve o texto alterado — a segunda foi reenviada
    // idêntica e não deveria gerar uma nova chamada de embedding.
    expect(embeddingService.chamadas).toHaveLength(1);
  });

  test("uma falha ao reprocessar embedding não impede a atualização de ser concluída", async () => {
    const { useCase, validado, embeddingService } = await montarUseCaseComCatalogoValidado();
    embeddingService.deveFalhar = true;

    const resultado = await useCase.execute(payloadValido(validado, { modelo: "GWS 9-125S Corrigido" }));

    expect(resultado.modelo).toBe("GWS 9-125S Corrigido");
  });
});
