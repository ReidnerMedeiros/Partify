const { DesativarUsuarioUseCase } = require("../../../../src/useCases/usuario/DesativarUsuarioUseCase");
const { FakeUsuarioRepository } = require("../../../fakes/FakeUsuarioRepository");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { NotFoundError, ConflictError } = require("../../../../src/domain/errors/DomainErrors");
const { Perfil } = require("../../../../src/domain/enums/Perfil");

function montarUseCase() {
  const usuarioRepository = new FakeUsuarioRepository();
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const useCase = new DesativarUsuarioUseCase({ usuarioRepository, logAuditoriaRepository });
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
    ativo: true,
    empresaId: "empresa-1",
    criadoEm: new Date(),
    ...overrides,
  };
  usuarioRepository.usuarios.push(usuario);
  return usuario;
}

describe("DesativarUsuarioUseCase — RF05, fluxo alternativo A2 (desativação)", () => {
  test("desativa um usuário Técnico/Vendedor com sucesso, sem apagar dados", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository);

    const resultado = await useCase.execute({ usuarioId: "usuario-1", empresaId: "empresa-1", administradorId: "admin-1" });

    expect(resultado.ativo).toBe(false);
    expect(usuarioRepository.usuarios).toHaveLength(1);
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

  test("lança ConflictError quando o usuário já está inativo", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository, { ativo: false });

    await expect(
      useCase.execute({ usuarioId: "usuario-1", empresaId: "empresa-1", administradorId: "admin-1" })
    ).rejects.toThrow(ConflictError);
  });

  test("fluxo de exceção E2: bloqueia desativar o único administrador ativo da instância", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository, { perfil: Perfil.ADMINISTRADOR });

    await expect(
      useCase.execute({ usuarioId: "usuario-1", empresaId: "empresa-1", administradorId: "usuario-1" })
    ).rejects.toThrow(ConflictError);
  });

  test("permite desativar um administrador quando existe outro administrador ativo", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository, { id: "usuario-1", perfil: Perfil.ADMINISTRADOR });
    seedUsuario(usuarioRepository, { id: "usuario-2", perfil: Perfil.ADMINISTRADOR });

    const resultado = await useCase.execute({ usuarioId: "usuario-1", empresaId: "empresa-1", administradorId: "usuario-2" });

    expect(resultado.ativo).toBe(false);
  });

  test("a checagem E2 não se aplica a Técnico/Vendedor (pode sempre desativar)", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository, { perfil: Perfil.TECNICO });

    const resultado = await useCase.execute({ usuarioId: "usuario-1", empresaId: "empresa-1", administradorId: "admin-1" });

    expect(resultado.ativo).toBe(false);
  });

  test("registra ATIVAR_DESATIVAR_USUARIO no log de auditoria", async () => {
    const { useCase, usuarioRepository, logAuditoriaRepository } = montarUseCase();
    seedUsuario(usuarioRepository);

    await useCase.execute({ usuarioId: "usuario-1", empresaId: "empresa-1", administradorId: "admin-1" });

    expect(logAuditoriaRepository.registros).toHaveLength(1);
    expect(logAuditoriaRepository.registros[0].tipoAcao).toBe("ATIVAR_DESATIVAR_USUARIO");
    expect(logAuditoriaRepository.registros[0].detalhes).toEqual({ statusAnterior: "ATIVO", statusNovo: "INATIVO" });
    expect(logAuditoriaRepository.registros[0].registroAfetado).toBe("usuario-1");
  });
});
