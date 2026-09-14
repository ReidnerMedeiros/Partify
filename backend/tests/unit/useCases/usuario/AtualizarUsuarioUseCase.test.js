const { AtualizarUsuarioUseCase } = require("../../../../src/useCases/usuario/AtualizarUsuarioUseCase");
const { FakeUsuarioRepository } = require("../../../fakes/FakeUsuarioRepository");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { NotFoundError, ValidationError, ConflictError } = require("../../../../src/domain/errors/DomainErrors");
const { Perfil } = require("../../../../src/domain/enums/Perfil");

function montarUseCase() {
  const usuarioRepository = new FakeUsuarioRepository();
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const useCase = new AtualizarUsuarioUseCase({ usuarioRepository, logAuditoriaRepository });
  return { useCase, usuarioRepository, logAuditoriaRepository };
}

function seedUsuario(usuarioRepository, overrides = {}) {
  const usuario = {
    id: "usuario-1",
    nome: "João Técnico",
    login: "joao.tecnico",
    email: "joao@partify.com",
    senhaHash: "hash:senha1234",
    perfil: Perfil.TECNICO,
    ativo: true,
    empresaId: "empresa-1",
    criadoEm: new Date(),
    ...overrides,
  };
  usuarioRepository.usuarios.push(usuario);
  return usuario;
}

describe("AtualizarUsuarioUseCase — RF05, fluxo alternativo A1 (atualização)", () => {
  test("atualiza nome, login, e-mail e perfil com sucesso", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository);

    const resultado = await useCase.execute({
      usuarioId: "usuario-1",
      empresaId: "empresa-1",
      administradorId: "admin-1",
      nome: "João Silva",
      login: "joao.silva",
      email: "joao.silva@partify.com",
      perfil: Perfil.VENDEDOR,
    });

    expect(resultado.nome).toBe("João Silva");
    expect(resultado.login).toBe("joao.silva");
    expect(resultado.email).toBe("joao.silva@partify.com");
    expect(resultado.perfil).toBe(Perfil.VENDEDOR);
  });

  test("permite atualizar apenas um campo, mantendo os demais", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository);

    const resultado = await useCase.execute({
      usuarioId: "usuario-1",
      empresaId: "empresa-1",
      administradorId: "admin-1",
      nome: "Novo Nome",
    });

    expect(resultado.nome).toBe("Novo Nome");
    expect(resultado.login).toBe("joao.tecnico");
    expect(resultado.email).toBe("joao@partify.com");
  });

  test("lança NotFoundError quando o usuário não existe", async () => {
    const { useCase } = montarUseCase();

    await expect(
      useCase.execute({ usuarioId: "inexistente", empresaId: "empresa-1", administradorId: "admin-1", nome: "X" })
    ).rejects.toThrow(NotFoundError);
  });

  test("lança NotFoundError quando o usuário pertence a outra empresa", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository, { empresaId: "empresa-2" });

    await expect(
      useCase.execute({ usuarioId: "usuario-1", empresaId: "empresa-1", administradorId: "admin-1", nome: "X" })
    ).rejects.toThrow(NotFoundError);
  });

  test("rejeita nome em branco", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository);

    await expect(
      useCase.execute({ usuarioId: "usuario-1", empresaId: "empresa-1", administradorId: "admin-1", nome: "   " })
    ).rejects.toThrow(ValidationError);
  });

  test("rejeita login em branco", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository);

    await expect(
      useCase.execute({ usuarioId: "usuario-1", empresaId: "empresa-1", administradorId: "admin-1", login: "" })
    ).rejects.toThrow(ValidationError);
  });

  test("rejeita e-mail em formato inválido (fluxo de exceção E1)", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository);

    await expect(
      useCase.execute({
        usuarioId: "usuario-1",
        empresaId: "empresa-1",
        administradorId: "admin-1",
        email: "invalido",
      })
    ).rejects.toThrow(ValidationError);
  });

  test("rejeita perfil fora do domínio de valores (Técnico/Vendedor)", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository);

    await expect(
      useCase.execute({
        usuarioId: "usuario-1",
        empresaId: "empresa-1",
        administradorId: "admin-1",
        perfil: "GERENTE",
      })
    ).rejects.toThrow(ValidationError);
  });

  test("lança ConflictError ao trocar para um login já usado por outro usuário", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository);
    seedUsuario(usuarioRepository, { id: "usuario-2", login: "maria.vendas" });

    await expect(
      useCase.execute({
        usuarioId: "usuario-1",
        empresaId: "empresa-1",
        administradorId: "admin-1",
        login: "maria.vendas",
      })
    ).rejects.toThrow(ConflictError);
  });

  test("permite salvar mantendo o mesmo login (não é conflito consigo mesmo)", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository);

    const resultado = await useCase.execute({
      usuarioId: "usuario-1",
      empresaId: "empresa-1",
      administradorId: "admin-1",
      login: "joao.tecnico",
      nome: "João Atualizado",
    });

    expect(resultado.login).toBe("joao.tecnico");
    expect(resultado.nome).toBe("João Atualizado");
  });

  test("quando nenhum campo é informado, não altera nada e não quebra", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository);

    const resultado = await useCase.execute({ usuarioId: "usuario-1", empresaId: "empresa-1", administradorId: "admin-1" });

    expect(resultado.nome).toBe("João Técnico");
    expect(resultado.login).toBe("joao.tecnico");
  });

  test("registra EDICAO_USUARIO no log de auditoria com anterior/novo apenas dos campos alterados", async () => {
    const { useCase, usuarioRepository, logAuditoriaRepository } = montarUseCase();
    seedUsuario(usuarioRepository);

    await useCase.execute({
      usuarioId: "usuario-1",
      empresaId: "empresa-1",
      administradorId: "admin-1",
      nome: "João Silva",
    });

    expect(logAuditoriaRepository.registros).toHaveLength(1);
    expect(logAuditoriaRepository.registros[0].tipoAcao).toBe("EDICAO_USUARIO");
    expect(logAuditoriaRepository.registros[0].detalhes.anterior).toEqual({ nome: "João Técnico" });
    expect(logAuditoriaRepository.registros[0].detalhes.novo).toEqual({ nome: "João Silva" });
  });

  test("o log de auditoria registra anterior/novo de todos os campos alterados simultaneamente", async () => {
    const { useCase, usuarioRepository, logAuditoriaRepository } = montarUseCase();
    seedUsuario(usuarioRepository);

    await useCase.execute({
      usuarioId: "usuario-1",
      empresaId: "empresa-1",
      administradorId: "admin-1",
      nome: "João Silva",
      perfil: Perfil.VENDEDOR,
    });

    expect(logAuditoriaRepository.registros[0].detalhes.anterior).toEqual({
      nome: "João Técnico",
      perfil: Perfil.TECNICO,
    });
    expect(logAuditoriaRepository.registros[0].detalhes.novo).toEqual({
      nome: "João Silva",
      perfil: Perfil.VENDEDOR,
    });
  });

  test("normaliza espaços e caixa do e-mail", async () => {
    const { useCase, usuarioRepository } = montarUseCase();
    seedUsuario(usuarioRepository);

    const resultado = await useCase.execute({
      usuarioId: "usuario-1",
      empresaId: "empresa-1",
      administradorId: "admin-1",
      email: "  Novo@Partify.COM  ",
    });

    expect(resultado.email).toBe("novo@partify.com");
  });
});
