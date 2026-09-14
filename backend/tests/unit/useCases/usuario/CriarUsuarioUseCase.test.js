const { CriarUsuarioUseCase } = require("../../../../src/useCases/usuario/CriarUsuarioUseCase");
const { FakeUsuarioRepository } = require("../../../fakes/FakeUsuarioRepository");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { FakeHashService } = require("../../../fakes/FakeHashService");
const { ValidationError, ConflictError } = require("../../../../src/domain/errors/DomainErrors");
const { Perfil } = require("../../../../src/domain/enums/Perfil");

function montarUseCase() {
  const usuarioRepository = new FakeUsuarioRepository();
  const hashService = new FakeHashService();
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const useCase = new CriarUsuarioUseCase({ usuarioRepository, hashService, logAuditoriaRepository });
  return { useCase, usuarioRepository, hashService, logAuditoriaRepository };
}

function dadosValidos(overrides = {}) {
  return {
    empresaId: "empresa-1",
    administradorId: "admin-1",
    nome: "João Técnico",
    login: "joao.tecnico",
    email: "joao@partify.com",
    senha: "senha1234",
    perfil: Perfil.TECNICO,
    ...overrides,
  };
}

describe("CriarUsuarioUseCase — RF05, fluxo básico (Criação)", () => {
  test("cria um usuário Técnico com sucesso", async () => {
    const { useCase } = montarUseCase();

    const usuario = await useCase.execute(dadosValidos());

    expect(usuario.id).toBeDefined();
    expect(usuario.nome).toBe("João Técnico");
    expect(usuario.login).toBe("joao.tecnico");
    expect(usuario.perfil).toBe(Perfil.TECNICO);
    expect(usuario.ativo).toBe(true);
    expect(usuario.empresaId).toBe("empresa-1");
  });

  test("cria um usuário Vendedor com sucesso", async () => {
    const { useCase } = montarUseCase();

    const usuario = await useCase.execute(dadosValidos({ perfil: Perfil.VENDEDOR, login: "maria.vendas" }));

    expect(usuario.perfil).toBe(Perfil.VENDEDOR);
  });

  test("a senha é armazenada como hash, nunca em texto puro", async () => {
    const { useCase, usuarioRepository } = montarUseCase();

    await useCase.execute(dadosValidos());

    expect(usuarioRepository.usuarios[0].senhaHash).toBe("hash:senha1234");
  });

  test("rejeita perfil Administrador (fora do domínio de valores do Quadro 19)", async () => {
    const { useCase } = montarUseCase();

    await expect(useCase.execute(dadosValidos({ perfil: Perfil.ADMINISTRADOR }))).rejects.toThrow(ValidationError);
  });

  test("rejeita perfil inexistente/inválido", async () => {
    const { useCase } = montarUseCase();

    await expect(useCase.execute(dadosValidos({ perfil: "GERENTE" }))).rejects.toThrow(ValidationError);
  });

  test("rejeita quando nenhum perfil é informado", async () => {
    const { useCase } = montarUseCase();

    await expect(useCase.execute(dadosValidos({ perfil: undefined }))).rejects.toThrow(ValidationError);
  });

  test("rejeita nome em branco", async () => {
    const { useCase } = montarUseCase();

    await expect(useCase.execute(dadosValidos({ nome: "   " }))).rejects.toThrow(ValidationError);
  });

  test("rejeita login em branco", async () => {
    const { useCase } = montarUseCase();

    await expect(useCase.execute(dadosValidos({ login: "" }))).rejects.toThrow(ValidationError);
  });

  test("rejeita e-mail em formato inválido (fluxo de exceção E1)", async () => {
    const { useCase } = montarUseCase();

    await expect(useCase.execute(dadosValidos({ email: "email-invalido" }))).rejects.toThrow(ValidationError);
  });

  test("rejeita senha com menos de 8 caracteres", async () => {
    const { useCase } = montarUseCase();

    await expect(useCase.execute(dadosValidos({ senha: "1234567" }))).rejects.toThrow(ValidationError);
  });

  test("aceita senha com exatamente 8 caracteres (limite)", async () => {
    const { useCase } = montarUseCase();

    const usuario = await useCase.execute(dadosValidos({ senha: "12345678" }));

    expect(usuario).toBeDefined();
  });

  test("acumula todos os erros de campo simultaneamente", async () => {
    const { useCase } = montarUseCase();

    try {
      await useCase.execute(dadosValidos({ nome: "", login: "", email: "invalido", senha: "123", perfil: undefined }));
      throw new Error("deveria ter lançado ValidationError");
    } catch (erro) {
      expect(erro).toBeInstanceOf(ValidationError);
      expect(Object.keys(erro.fieldErrors).sort()).toEqual(["email", "login", "nome", "perfil", "senha"]);
    }
  });

  test("lança ConflictError quando o login já está em uso", async () => {
    const { useCase } = montarUseCase();
    await useCase.execute(dadosValidos());

    await expect(useCase.execute(dadosValidos({ email: "outro@partify.com" }))).rejects.toThrow(ConflictError);
  });

  test("normaliza espaços e caixa do e-mail", async () => {
    const { useCase } = montarUseCase();

    const usuario = await useCase.execute(dadosValidos({ email: "  Joao@Partify.COM  " }));

    expect(usuario.email).toBe("joao@partify.com");
  });

  test("registra CRIACAO_USUARIO no log de auditoria", async () => {
    const { useCase, logAuditoriaRepository } = montarUseCase();

    await useCase.execute(dadosValidos());

    expect(logAuditoriaRepository.registros).toHaveLength(1);
    expect(logAuditoriaRepository.registros[0].tipoAcao).toBe("CRIACAO_USUARIO");
    expect(logAuditoriaRepository.registros[0].usuarioId).toBe("admin-1");
    expect(logAuditoriaRepository.registros[0].detalhes).toEqual({
      nome: "João Técnico",
      login: "joao.tecnico",
      perfil: Perfil.TECNICO,
    });
  });

  test("o novo usuário fica vinculado à empresa do administrador que o criou", async () => {
    const { useCase } = montarUseCase();

    const usuario = await useCase.execute(dadosValidos({ empresaId: "empresa-42" }));

    expect(usuario.empresaId).toBe("empresa-42");
  });
});
