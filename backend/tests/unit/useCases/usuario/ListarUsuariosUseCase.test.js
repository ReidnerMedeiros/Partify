const { ListarUsuariosUseCase } = require("../../../../src/useCases/usuario/ListarUsuariosUseCase");
const { FakeUsuarioRepository } = require("../../../fakes/FakeUsuarioRepository");
const { Perfil } = require("../../../../src/domain/enums/Perfil");

function montarUseCase() {
  const usuarioRepository = new FakeUsuarioRepository();
  const useCase = new ListarUsuariosUseCase({ usuarioRepository });
  return { useCase, usuarioRepository };
}

function seedUsuario(usuarioRepository, overrides = {}) {
  usuarioRepository.usuarios.push({
    id: overrides.id ?? `usuario-${usuarioRepository.usuarios.length + 1}`,
    nome: "Usuário",
    login: "usuario",
    email: "usuario@partify.com",
    senhaHash: "hash:x",
    perfil: Perfil.TECNICO,
    ativo: true,
    empresaId: "empresa-1",
    criadoEm: new Date(),
    ...overrides,
  });
}

describe("ListarUsuariosUseCase — RF05, consulta (parte do fluxo alternativo A1)", () => {
  test("lista todos os usuários da empresa informada", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository, { id: "u1" });
    seedUsuario(usuarioRepository, { id: "u2" });

    const usuarios = await useCase.execute({ empresaId: "empresa-1" });

    expect(usuarios).toHaveLength(2);
  });

  test("não retorna usuários de outras empresas (isolamento multi-tenant)", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository, { id: "u1", empresaId: "empresa-1" });
    seedUsuario(usuarioRepository, { id: "u2", empresaId: "empresa-2" });

    const usuarios = await useCase.execute({ empresaId: "empresa-1" });

    expect(usuarios).toHaveLength(1);
    expect(usuarios[0].id).toBe("u1");
  });

  test("inclui usuários de qualquer perfil, inclusive Administrador", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository, { id: "u1", perfil: Perfil.ADMINISTRADOR });
    seedUsuario(usuarioRepository, { id: "u2", perfil: Perfil.TECNICO });
    seedUsuario(usuarioRepository, { id: "u3", perfil: Perfil.VENDEDOR });

    const usuarios = await useCase.execute({ empresaId: "empresa-1" });

    expect(usuarios.map((u) => u.perfil).sort()).toEqual([Perfil.ADMINISTRADOR, Perfil.TECNICO, Perfil.VENDEDOR]);
  });

  test("inclui usuários ativos e inativos", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository, { id: "u1", ativo: true });
    seedUsuario(usuarioRepository, { id: "u2", ativo: false });

    const usuarios = await useCase.execute({ empresaId: "empresa-1" });

    expect(usuarios).toHaveLength(2);
  });

  test("retorna lista vazia quando a empresa não tem usuários", async () => {
    const { useCase } = montarUseCase();

    const usuarios = await useCase.execute({ empresaId: "empresa-sem-usuarios" });

    expect(usuarios).toEqual([]);
  });
});
