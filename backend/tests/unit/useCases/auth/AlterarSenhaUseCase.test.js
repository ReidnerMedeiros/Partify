const { AlterarSenhaUseCase } = require("../../../../src/useCases/auth/AlterarSenhaUseCase");
const { FakeUsuarioRepository } = require("../../../fakes/FakeUsuarioRepository");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { FakeHashService } = require("../../../fakes/FakeHashService");
const { ValidationError, NotFoundError } = require("../../../../src/domain/errors/DomainErrors");

function montarUseCase() {
  const usuarioRepository = new FakeUsuarioRepository();
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const hashService = new FakeHashService();
  const useCase = new AlterarSenhaUseCase({ usuarioRepository, hashService, logAuditoriaRepository });
  return { useCase, usuarioRepository, logAuditoriaRepository, hashService };
}

async function seedUsuario(ctx, overrides = {}) {
  const usuario = {
    id: "usuario-1",
    login: "admin",
    senhaHash: await ctx.hashService.hash("senhaAtual123"),
    ...overrides,
  };
  ctx.usuarioRepository.usuarios.push(usuario);
  return usuario;
}

describe("AlterarSenhaUseCase — RF04, fluxo básico (Alterar Senha)", () => {
  test("altera a senha com sucesso quando a senha atual está correta", async () => {
    const ctx = montarUseCase();
    await seedUsuario(ctx);

    await ctx.useCase.execute({
      usuarioId: "usuario-1",
      senhaAtual: "senhaAtual123",
      novaSenha: "novaSenha456",
      confirmarNovaSenha: "novaSenha456",
    });

    expect(ctx.usuarioRepository.usuarios[0].senhaHash).toBe("hash:novaSenha456");
  });

  test("registra ALTERACAO_SENHA no log de auditoria identificando o usuário", async () => {
    const ctx = montarUseCase();
    await seedUsuario(ctx);

    await ctx.useCase.execute({
      usuarioId: "usuario-1",
      senhaAtual: "senhaAtual123",
      novaSenha: "novaSenha456",
      confirmarNovaSenha: "novaSenha456",
    });

    expect(ctx.logAuditoriaRepository.registros).toHaveLength(1);
    expect(ctx.logAuditoriaRepository.registros[0].tipoAcao).toBe("ALTERACAO_SENHA");
    expect(ctx.logAuditoriaRepository.registros[0].usuarioId).toBe("usuario-1");
    expect(ctx.logAuditoriaRepository.registros[0].detalhes.etapa).toBe("senha_alterada_pelo_usuario");
  });

  test("rejeita quando a senha atual informada está incorreta (exceção E1)", async () => {
    const ctx = montarUseCase();
    await seedUsuario(ctx);

    await expect(
      ctx.useCase.execute({
        usuarioId: "usuario-1",
        senhaAtual: "senha-errada",
        novaSenha: "novaSenha456",
        confirmarNovaSenha: "novaSenha456",
      })
    ).rejects.toMatchObject({
      fieldErrors: { senhaAtual: expect.any(String) },
    });

    // a senha não deve ter sido alterada
    expect(ctx.usuarioRepository.usuarios[0].senhaHash).toBe("hash:senhaAtual123");
  });

  test("rejeita nova senha com menos de 8 caracteres", async () => {
    const ctx = montarUseCase();
    await seedUsuario(ctx);

    await expect(
      ctx.useCase.execute({
        usuarioId: "usuario-1",
        senhaAtual: "senhaAtual123",
        novaSenha: "123",
        confirmarNovaSenha: "123",
      })
    ).rejects.toThrow(ValidationError);
  });

  test("rejeita quando a nova senha e a confirmação não coincidem (exceção E2)", async () => {
    const ctx = montarUseCase();
    await seedUsuario(ctx);

    await expect(
      ctx.useCase.execute({
        usuarioId: "usuario-1",
        senhaAtual: "senhaAtual123",
        novaSenha: "novaSenha456",
        confirmarNovaSenha: "outraSenha789",
      })
    ).rejects.toMatchObject({
      fieldErrors: { confirmarNovaSenha: expect.any(String) },
    });
  });

  test("lança NotFoundError quando o usuário não existe", async () => {
    const ctx = montarUseCase();

    await expect(
      ctx.useCase.execute({
        usuarioId: "usuario-inexistente",
        senhaAtual: "qualquer",
        novaSenha: "novaSenha456",
        confirmarNovaSenha: "novaSenha456",
      })
    ).rejects.toThrow(NotFoundError);
  });

  test("não altera a senha de outro usuário", async () => {
    const ctx = montarUseCase();
    await seedUsuario(ctx);
    await seedUsuario(ctx, { id: "usuario-2", login: "outro", senhaHash: "hash:senha-de-outro" });

    await ctx.useCase.execute({
      usuarioId: "usuario-1",
      senhaAtual: "senhaAtual123",
      novaSenha: "novaSenha456",
      confirmarNovaSenha: "novaSenha456",
    });

    const outroUsuario = ctx.usuarioRepository.usuarios.find((u) => u.id === "usuario-2");
    expect(outroUsuario.senhaHash).toBe("hash:senha-de-outro");
  });
});
