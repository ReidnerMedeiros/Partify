const { SolicitarRecuperacaoSenhaUseCase } = require("../../../../src/useCases/auth/SolicitarRecuperacaoSenhaUseCase");
const { FakeUsuarioRepository } = require("../../../fakes/FakeUsuarioRepository");
const { FakeTokenRedefinicaoSenhaRepository } = require("../../../fakes/FakeTokenRedefinicaoSenhaRepository");
const { FakeRandomTokenService } = require("../../../fakes/FakeRandomTokenService");
const { FakeEmailService } = require("../../../fakes/FakeEmailService");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");

function montarUseCase() {
  const usuarioRepository = new FakeUsuarioRepository();
  const tokenRedefinicaoSenhaRepository = new FakeTokenRedefinicaoSenhaRepository();
  const randomTokenService = new FakeRandomTokenService();
  const emailService = new FakeEmailService();
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const useCase = new SolicitarRecuperacaoSenhaUseCase({
    usuarioRepository,
    tokenRedefinicaoSenhaRepository,
    randomTokenService,
    emailService,
    logAuditoriaRepository,
    frontendUrl: "http://localhost:5173",
  });
  return { useCase, usuarioRepository, tokenRedefinicaoSenhaRepository, randomTokenService, emailService, logAuditoriaRepository };
}

describe("SolicitarRecuperacaoSenhaUseCase — RF03, fluxo básico + exceção E1", () => {
  test("gera token, persiste apenas o hash e envia o e-mail quando login e e-mail conferem", async () => {
    const ctx = montarUseCase();
    ctx.usuarioRepository.usuarios.push({ id: "usuario-1", login: "admin", email: "admin@x.com" });

    await ctx.useCase.execute({ login: "admin", email: "admin@x.com" });

    expect(ctx.emailService.enviados).toHaveLength(1);
    expect(ctx.emailService.enviados[0].destinatario).toBe("admin@x.com");
    expect(ctx.emailService.enviados[0].link).toContain("http://localhost:5173/redefinir-senha?token=");
    expect(ctx.tokenRedefinicaoSenhaRepository.tokens).toHaveLength(1);
  });

  test("registra ALTERACAO_SENHA (etapa de envio) no log de auditoria", async () => {
    const ctx = montarUseCase();
    ctx.usuarioRepository.usuarios.push({ id: "usuario-1", login: "admin", email: "admin@x.com" });

    await ctx.useCase.execute({ login: "admin", email: "admin@x.com" });

    expect(ctx.logAuditoriaRepository.registros[0].tipoAcao).toBe("ALTERACAO_SENHA");
    expect(ctx.logAuditoriaRepository.registros[0].detalhes.etapa).toBe("link_de_redefinicao_enviado");
  });

  test("o link enviado usa o token bruto, nunca o hash persistido no banco", async () => {
    const ctx = montarUseCase();
    ctx.usuarioRepository.usuarios.push({ id: "usuario-1", login: "admin", email: "admin@x.com" });

    await ctx.useCase.execute({ login: "admin", email: "admin@x.com" });

    const tokenPersistido = ctx.tokenRedefinicaoSenhaRepository.tokens[0];
    expect(ctx.emailService.enviados[0].link).not.toContain(tokenPersistido.tokenHash);
  });

  test("não envia e-mail nem lança erro quando o e-mail não confere com o login (E1)", async () => {
    const ctx = montarUseCase();
    ctx.usuarioRepository.usuarios.push({ id: "usuario-1", login: "admin", email: "admin@x.com" });

    await expect(ctx.useCase.execute({ login: "admin", email: "email-errado@x.com" })).resolves.toBeUndefined();

    expect(ctx.emailService.enviados).toHaveLength(0);
    expect(ctx.tokenRedefinicaoSenhaRepository.tokens).toHaveLength(0);
    expect(ctx.logAuditoriaRepository.registros[0].detalhes.motivo).toBe("recuperacao_senha_dados_nao_conferem");
  });

  test("não lança erro nem revela se o login existe (RNF05)", async () => {
    const ctx = montarUseCase();

    await expect(ctx.useCase.execute({ login: "nao-existe", email: "qualquer@x.com" })).resolves.toBeUndefined();
    expect(ctx.emailService.enviados).toHaveLength(0);
  });

  test("o token gerado expira em aproximadamente 30 minutos", async () => {
    const ctx = montarUseCase();
    ctx.usuarioRepository.usuarios.push({ id: "usuario-1", login: "admin", email: "admin@x.com" });
    const antes = Date.now();

    await ctx.useCase.execute({ login: "admin", email: "admin@x.com" });

    const expiraEm = ctx.tokenRedefinicaoSenhaRepository.tokens[0].expiraEm.getTime();
    expect(expiraEm).toBeGreaterThan(antes + 29 * 60 * 1000);
    expect(expiraEm).toBeLessThanOrEqual(antes + 30 * 60 * 1000 + 1000);
  });

  test("cada solicitação gera um novo token, sem invalidar os anteriores", async () => {
    const ctx = montarUseCase();
    ctx.usuarioRepository.usuarios.push({ id: "usuario-1", login: "admin", email: "admin@x.com" });

    await ctx.useCase.execute({ login: "admin", email: "admin@x.com" });
    await ctx.useCase.execute({ login: "admin", email: "admin@x.com" });

    expect(ctx.tokenRedefinicaoSenhaRepository.tokens).toHaveLength(2);
    expect(ctx.emailService.enviados).toHaveLength(2);
    expect(ctx.tokenRedefinicaoSenhaRepository.tokens[0].tokenHash).not.toBe(ctx.tokenRedefinicaoSenhaRepository.tokens[1].tokenHash);
  });

  test("o log de auditoria não guarda o token bruto nem o hash em texto explorável", async () => {
    const ctx = montarUseCase();
    ctx.usuarioRepository.usuarios.push({ id: "usuario-1", login: "admin", email: "admin@x.com" });

    await ctx.useCase.execute({ login: "admin", email: "admin@x.com" });

    const detalhes = JSON.stringify(ctx.logAuditoriaRepository.registros[0].detalhes ?? {});
    expect(detalhes).not.toMatch(/token-bruto/);
  });

  test("a comparação de e-mail ignora maiúsculas/minúsculas e espaços", async () => {
    const ctx = montarUseCase();
    ctx.usuarioRepository.usuarios.push({ id: "usuario-1", login: "admin", email: "admin@x.com" });

    await ctx.useCase.execute({ login: "admin", email: "  Admin@X.COM  " });

    expect(ctx.emailService.enviados).toHaveLength(1);
  });
});
