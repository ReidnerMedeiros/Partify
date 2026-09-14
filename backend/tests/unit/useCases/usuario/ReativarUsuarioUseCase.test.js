const { ReativarUsuarioUseCase } = require("../../../../src/useCases/usuario/ReativarUsuarioUseCase");
const { FakeUsuarioRepository } = require("../../../fakes/FakeUsuarioRepository");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { NotFoundError, ConflictError } = require("../../../../src/domain/errors/DomainErrors");
const { Perfil } = require("../../../../src/domain/enums/Perfil");

function montarUseCase() {
  const usuarioRepository = new FakeUsuarioRepository();
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const useCase = new ReativarUsuarioUseCase({ usuarioRepository, logAuditoriaRepository });
  return { useCase, usuarioRepository, logAuditoriaRepository };
}

function seedUsuario(usuarioRepository, overrides = {}) {
  const usuario = {
    id: "usuario-1",
    nome: "João Técnico",
    login: "joao.tecnico",
    email: "joao@partify.com",
    senhaHash: "hash:x",
    perfil: Perfil.TECNICO,
    ativo: false,
    empresaId: "empresa-1",
    criadoEm: new Date(),
    ...overrides,
  };
  usuarioRepository.usuarios.push(usuario);
  return usuario;
}

describe("ReativarUsuarioUseCase — RF05, fluxo alternativo A3 (reativação)", () => {
  test("reativa um usuário inativo com sucesso", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository);

    const resultado = await useCase.execute({ usuarioId: "usuario-1", empresaId: "empresa-1", administradorId: "admin-1" });

    expect(resultado.ativo).toBe(true);
    expect(usuarioRepository.usuarios[0].nome).toBe("João Técnico");
  });

  test("lança NotFoundError quando o usuário não existe", async () => {
    const { useCase } = montarUseCase();

    await expect(
      useCase.execute({ usuarioId: "inexistente", empresaId: "empresa-1", administradorId: "admin-1" })
    ).rejects.toThrow(NotFoundError);
  });

  test("lança NotFoundError quando o usuário pertence a outra empresa", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository, { empresaId: "empresa-2" });

    await expect(
      useCase.execute({ usuarioId: "usuario-1", empresaId: "empresa-1", administradorId: "admin-1" })
    ).rejects.toThrow(NotFoundError);
  });

  test("lança ConflictError quando o usuário já está ativo", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository, { ativo: true });

    await expect(
      useCase.execute({ usuarioId: "usuario-1", empresaId: "empresa-1", administradorId: "admin-1" })
    ).rejects.toThrow(ConflictError);
  });

  test("reativar não exige a checagem E2 (é exclusiva da desativação)", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository, { perfil: Perfil.ADMINISTRADOR, ativo: false });

    const resultado = await useCase.execute({ usuarioId: "usuario-1", empresaId: "empresa-1", administradorId: "admin-2" });

    expect(resultado.ativo).toBe(true);
  });

  test("registra ATIVAR_DESATIVAR_USUARIO no log de auditoria", async () => {
    const { useCase, usuarioRepository, logAuditoriaRepository } = montarUseCase();
    seedUsuario(usuarioRepository);

    await useCase.execute({ usuarioId: "usuario-1", empresaId: "empresa-1", administradorId: "admin-1" });

    expect(logAuditoriaRepository.registros).toHaveLength(1);
    expect(logAuditoriaRepository.registros[0].tipoAcao).toBe("ATIVAR_DESATIVAR_USUARIO");
    expect(logAuditoriaRepository.registros[0].detalhes).toEqual({ statusAnterior: "INATIVO", statusNovo: "ATIVO" });
  });
});
