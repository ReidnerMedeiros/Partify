const { ConsultarLogAuditoriaUseCase } = require("../../../../src/useCases/log/ConsultarLogAuditoriaUseCase");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { FakeUsuarioRepository } = require("../../../fakes/FakeUsuarioRepository");
const { ValidationError } = require("../../../../src/domain/errors/DomainErrors");
const { TipoAcao } = require("../../../../src/domain/enums/TipoAcao");

const EMPRESA_ID = "empresa-1";

function montarUseCase() {
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const usuarioRepository = new FakeUsuarioRepository();
  const useCase = new ConsultarLogAuditoriaUseCase({ logAuditoriaRepository, usuarioRepository });
  return { useCase, logAuditoriaRepository, usuarioRepository };
}

async function seedUsuario(ctx, overrides = {}) {
  return ctx.usuarioRepository.criar({
    nome: "João Silva",
    login: "joao.silva",
    email: "joao@empresa.com",
    senhaHash: "hash",
    perfil: "TECNICO",
    empresaId: EMPRESA_ID,
    ...overrides,
  });
}

describe("ConsultarLogAuditoriaUseCase — RF13, fluxo básico + E1", () => {
  test("retorna os registros da empresa, com o nome do usuário responsável resolvido", async () => {
    const ctx = montarUseCase();
    const usuario = await seedUsuario(ctx);

    await ctx.logAuditoriaRepository.registrar({
      usuarioId: usuario.id,
      empresaId: EMPRESA_ID,
      tipoAcao: TipoAcao.LOGIN,
      registroAfetado: usuario.id,
    });

    const resultado = await ctx.useCase.execute({ empresaId: EMPRESA_ID });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].usuarioNome).toBe("João Silva");
    expect(resultado[0].tipoAcao).toBe(TipoAcao.LOGIN);
  });

  test('registros com usuarioId nulo (ex.: CRIACAO_EMPRESA) aparecem como "sistema"', async () => {
    const ctx = montarUseCase();

    await ctx.logAuditoriaRepository.registrar({
      usuarioId: null,
      empresaId: EMPRESA_ID,
      tipoAcao: TipoAcao.CRIACAO_EMPRESA,
      registroAfetado: EMPRESA_ID,
    });

    const resultado = await ctx.useCase.execute({ empresaId: EMPRESA_ID });

    expect(resultado[0].usuarioNome).toBe("sistema");
  });

  test("RNF11: nunca retorna registros de outra empresa", async () => {
    const ctx = montarUseCase();
    await ctx.logAuditoriaRepository.registrar({ usuarioId: null, empresaId: EMPRESA_ID, tipoAcao: TipoAcao.LOGIN });
    await ctx.logAuditoriaRepository.registrar({ usuarioId: null, empresaId: "empresa-2", tipoAcao: TipoAcao.LOGIN });

    const resultado = await ctx.useCase.execute({ empresaId: EMPRESA_ID });

    expect(resultado).toHaveLength(1);
  });

  test("filtra por usuário", async () => {
    const ctx = montarUseCase();
    const usuario1 = await seedUsuario(ctx, { login: "usuario1" });
    const usuario2 = await seedUsuario(ctx, { login: "usuario2", nome: "Maria Santos" });
    await ctx.logAuditoriaRepository.registrar({ usuarioId: usuario1.id, empresaId: EMPRESA_ID, tipoAcao: TipoAcao.LOGIN });
    await ctx.logAuditoriaRepository.registrar({ usuarioId: usuario2.id, empresaId: EMPRESA_ID, tipoAcao: TipoAcao.LOGIN });

    const resultado = await ctx.useCase.execute({ empresaId: EMPRESA_ID, usuarioId: usuario2.id });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].usuarioNome).toBe("Maria Santos");
  });

  test("filtra por tipo de ação", async () => {
    const ctx = montarUseCase();
    await ctx.logAuditoriaRepository.registrar({ usuarioId: null, empresaId: EMPRESA_ID, tipoAcao: TipoAcao.LOGIN });
    await ctx.logAuditoriaRepository.registrar({ usuarioId: null, empresaId: EMPRESA_ID, tipoAcao: TipoAcao.LOGOUT });

    const resultado = await ctx.useCase.execute({ empresaId: EMPRESA_ID, tipoAcao: TipoAcao.LOGOUT });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].tipoAcao).toBe(TipoAcao.LOGOUT);
  });

  test("filtra por intervalo de datas (inclusive, dia inteiro)", async () => {
    const ctx = montarUseCase();
    const dentroDoIntervalo = { id: "log-dentro", realizadoEm: new Date("2026-04-15T12:00:00.000Z"), usuarioId: null, empresaId: EMPRESA_ID, tipoAcao: TipoAcao.LOGIN };
    const foraDoIntervalo = { id: "log-fora", realizadoEm: new Date("2026-05-01T12:00:00.000Z"), usuarioId: null, empresaId: EMPRESA_ID, tipoAcao: TipoAcao.LOGIN };
    ctx.logAuditoriaRepository.registros.push(dentroDoIntervalo, foraDoIntervalo);

    const resultado = await ctx.useCase.execute({ empresaId: EMPRESA_ID, dataInicial: "2026-04-01", dataFinal: "2026-04-30" });

    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe("log-dentro");
  });

  test("fluxo de exceção E1: nenhum registro encontrado retorna lista vazia (sem lançar erro)", async () => {
    const ctx = montarUseCase();

    const resultado = await ctx.useCase.execute({ empresaId: EMPRESA_ID, tipoAcao: TipoAcao.LOGOUT });

    expect(resultado).toEqual([]);
  });

  test("rejeita data inicial inválida", async () => {
    const ctx = montarUseCase();

    await expect(ctx.useCase.execute({ empresaId: EMPRESA_ID, dataInicial: "data-invalida" })).rejects.toThrow(ValidationError);
  });

  test("rejeita data final inválida", async () => {
    const ctx = montarUseCase();

    await expect(ctx.useCase.execute({ empresaId: EMPRESA_ID, dataFinal: "31/12/2026" })).rejects.toThrow(ValidationError);
  });

  test("retorna os registros ordenados do mais antigo para o mais recente (mesma ordem do protótipo)", async () => {
    const ctx = montarUseCase();
    const maisRecente = { id: "log-recente", realizadoEm: new Date("2026-04-20T10:00:00.000Z"), usuarioId: null, empresaId: EMPRESA_ID, tipoAcao: TipoAcao.LOGIN };
    const maisAntigo = { id: "log-antigo", realizadoEm: new Date("2026-04-09T09:00:00.000Z"), usuarioId: null, empresaId: EMPRESA_ID, tipoAcao: TipoAcao.CRIACAO_EMPRESA };
    ctx.logAuditoriaRepository.registros.push(maisRecente, maisAntigo);

    const resultado = await ctx.useCase.execute({ empresaId: EMPRESA_ID });

    expect(resultado.map((r) => r.id)).toEqual(["log-antigo", "log-recente"]);
  });

  test('registro cujo usuarioId não pertence mais à lista de usuários da empresa aparece como "Usuário removido"', async () => {
    const ctx = montarUseCase();
    await ctx.logAuditoriaRepository.registrar({ usuarioId: "usuario-inexistente", empresaId: EMPRESA_ID, tipoAcao: TipoAcao.LOGIN });

    const resultado = await ctx.useCase.execute({ empresaId: EMPRESA_ID });

    expect(resultado[0].usuarioNome).toBe("Usuário removido");
  });
});
