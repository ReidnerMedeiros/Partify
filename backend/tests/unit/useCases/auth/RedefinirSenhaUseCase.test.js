const { RedefinirSenhaUseCase } = require("../../../../src/useCases/auth/RedefinirSenhaUseCase");
const { FakeUsuarioRepository } = require("../../../fakes/FakeUsuarioRepository");
const { FakeTokenRedefinicaoSenhaRepository } = require("../../../fakes/FakeTokenRedefinicaoSenhaRepository");
const { FakeRandomTokenService } = require("../../../fakes/FakeRandomTokenService");
const { FakeHashService } = require("../../../fakes/FakeHashService");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { ValidationError, UnauthorizedError } = require("../../../../src/domain/errors/DomainErrors");

function montarUseCase() {
  const usuarioRepository = new FakeUsuarioRepository();
  const tokenRedefinicaoSenhaRepository = new FakeTokenRedefinicaoSenhaRepository();
  const randomTokenService = new FakeRandomTokenService();
  const hashService = new FakeHashService();
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const useCase = new RedefinirSenhaUseCase({
    usuarioRepository,
    tokenRedefinicaoSenhaRepository,
    randomTokenService,
    hashService,
    logAuditoriaRepository,
  });
  return { useCase, usuarioRepository, tokenRedefinicaoSenhaRepository, randomTokenService, hashService, logAuditoriaRepository };
}

async function seedTokenValido(ctx, overrides = {}) {
  ctx.usuarioRepository.usuarios.push({ id: "usuario-1", login: "admin", senhaHash: "hash:antiga" });
  const { tokenBruto, tokenHash } = ctx.randomTokenService.gerarTokenEHash();
  await ctx.tokenRedefinicaoSenhaRepository.criar({
    usuarioId: "usuario-1",
    tokenHash,
    expiraEm: overrides.expiraEm ?? new Date(Date.now() + 30 * 60 * 1000),
  });
  if (overrides.usado) {
    const registro = ctx.tokenRedefinicaoSenhaRepository.tokens[0];
    await ctx.tokenRedefinicaoSenhaRepository.marcarComoUsado(registro.id);
  }
  return tokenBruto;
}

describe("RedefinirSenhaUseCase — RF04, fluxo alternativo A1 (destino do link do RF03)", () => {
  test("redefine a senha com um token válido, marcando-o como usado", async () => {
    const ctx = montarUseCase();
    const tokenBruto = await seedTokenValido(ctx);

    await ctx.useCase.execute({ token: tokenBruto, novaSenha: "novaSenha123", confirmarNovaSenha: "novaSenha123" });

    expect(ctx.usuarioRepository.usuarios[0].senhaHash).toBe("hash:novaSenha123");
    expect(ctx.tokenRedefinicaoSenhaRepository.tokens[0].usadoEm).not.toBeNull();
    expect(ctx.logAuditoriaRepository.registros[0].detalhes.etapa).toBe("senha_redefinida_via_link");
  });

  test("rejeita senha com menos de 8 caracteres", async () => {
    const ctx = montarUseCase();
    const tokenBruto = await seedTokenValido(ctx);

    await expect(
      ctx.useCase.execute({ token: tokenBruto, novaSenha: "123", confirmarNovaSenha: "123" })
    ).rejects.toThrow(ValidationError);
  });

  test("rejeita quando a confirmação de senha não coincide", async () => {
    const ctx = montarUseCase();
    const tokenBruto = await seedTokenValido(ctx);

    await expect(
      ctx.useCase.execute({ token: tokenBruto, novaSenha: "novaSenha123", confirmarNovaSenha: "outraSenha123" })
    ).rejects.toThrow(ValidationError);
  });

  test("rejeita um token que não existe", async () => {
    const ctx = montarUseCase();

    await expect(
      ctx.useCase.execute({ token: "token-que-nao-existe", novaSenha: "novaSenha123", confirmarNovaSenha: "novaSenha123" })
    ).rejects.toThrow(UnauthorizedError);
  });

  test("rejeita um token expirado", async () => {
    const ctx = montarUseCase();
    const tokenBruto = await seedTokenValido(ctx, { expiraEm: new Date(Date.now() - 1000) });

    await expect(
      ctx.useCase.execute({ token: tokenBruto, novaSenha: "novaSenha123", confirmarNovaSenha: "novaSenha123" })
    ).rejects.toThrow(UnauthorizedError);
  });

  test("rejeita um token que já foi usado (uso único)", async () => {
    const ctx = montarUseCase();
    const tokenBruto = await seedTokenValido(ctx, { usado: true });

    await expect(
      ctx.useCase.execute({ token: tokenBruto, novaSenha: "novaSenha123", confirmarNovaSenha: "novaSenha123" })
    ).rejects.toThrow(UnauthorizedError);
  });

  test("um token usado com sucesso não pode ser reaproveitado numa segunda tentativa", async () => {
    const ctx = montarUseCase();
    const tokenBruto = await seedTokenValido(ctx);

    await ctx.useCase.execute({ token: tokenBruto, novaSenha: "novaSenha123", confirmarNovaSenha: "novaSenha123" });

    await expect(
      ctx.useCase.execute({ token: tokenBruto, novaSenha: "outraSenha456", confirmarNovaSenha: "outraSenha456" })
    ).rejects.toThrow(UnauthorizedError);
    // a senha definida na primeira tentativa (bem-sucedida) permanece válida
    expect(ctx.usuarioRepository.usuarios[0].senhaHash).toBe("hash:novaSenha123");
  });

  test("rejeita quando nenhum token é informado", async () => {
    const ctx = montarUseCase();

    await expect(
      ctx.useCase.execute({ token: undefined, novaSenha: "novaSenha123", confirmarNovaSenha: "novaSenha123" })
    ).rejects.toThrow(UnauthorizedError);
  });

  test("não altera a senha de outro usuário quando o token pertence a outra conta", async () => {
    const ctx = montarUseCase();
    ctx.usuarioRepository.usuarios.push({ id: "usuario-2", login: "outro", senhaHash: "hash:outra-senha" });
    const tokenBruto = await seedTokenValido(ctx);

    await ctx.useCase.execute({ token: tokenBruto, novaSenha: "novaSenha123", confirmarNovaSenha: "novaSenha123" });

    const outroUsuario = ctx.usuarioRepository.usuarios.find((u) => u.id === "usuario-2");
    expect(outroUsuario.senhaHash).toBe("hash:outra-senha");
  });
});
