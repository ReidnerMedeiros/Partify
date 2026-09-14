const { CriarEmpresaUseCase } = require("../../../../src/useCases/empresa/CriarEmpresaUseCase");
const { FakeEmpresaRepository } = require("../../../fakes/FakeEmpresaRepository");
const { FakeUsuarioRepository } = require("../../../fakes/FakeUsuarioRepository");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { FakeHashService } = require("../../../fakes/FakeHashService");
const { ValidationError, ConflictError } = require("../../../../src/domain/errors/DomainErrors");

const CNPJ_VALIDO = "12345678000195";
const CPF_VALIDO = "12345678909";

function montarUseCase() {
  const empresaRepository = new FakeEmpresaRepository();
  const usuarioRepository = new FakeUsuarioRepository();
  empresaRepository.usuarioRepository = usuarioRepository;
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const hashService = new FakeHashService();
  const useCase = new CriarEmpresaUseCase({ empresaRepository, usuarioRepository, hashService, logAuditoriaRepository });
  return { useCase, empresaRepository, usuarioRepository, logAuditoriaRepository, hashService };
}

function dadosValidos(overrides = {}) {
  return {
    nome: "Ferragens Central",
    cnpjCpf: CNPJ_VALIDO,
    telefone: "(64) 99999-0000",
    email: "admin@ferragenscentral.com",
    loginAdministrador: "admin.central",
    senhaAdministrador: "senhaSegura123",
    ...overrides,
  };
}

describe("CriarEmpresaUseCase — RF01, fluxo básico (Criação)", () => {
  test("cria a empresa e o administrador com sucesso", async () => {
    const { useCase, empresaRepository, usuarioRepository } = montarUseCase();

    const resultado = await useCase.execute(dadosValidos());

    expect(resultado.empresa.nome).toBe("Ferragens Central");
    expect(resultado.administrador.perfil).toBe("ADMINISTRADOR");
    expect(empresaRepository.empresas).toHaveLength(1);
    expect(usuarioRepository.usuarios).toHaveLength(1);
  });

  test("nunca persiste a senha do administrador em texto puro", async () => {
    const { useCase, usuarioRepository } = montarUseCase();

    await useCase.execute(dadosValidos());

    expect(usuarioRepository.usuarios[0].senhaHash).not.toBe("senhaSegura123");
    expect(usuarioRepository.usuarios[0].senhaHash).toBe("hash:senhaSegura123");
  });

  test("registra CRIACAO_EMPRESA no log de auditoria (RNF09)", async () => {
    const { useCase, logAuditoriaRepository } = montarUseCase();

    await useCase.execute(dadosValidos());

    expect(logAuditoriaRepository.registros).toHaveLength(1);
    expect(logAuditoriaRepository.registros[0].tipoAcao).toBe("CRIACAO_EMPRESA");
  });

  test("rejeita CNPJ/CPF já cadastrado (ConflictError)", async () => {
    const { useCase } = montarUseCase();
    await useCase.execute(dadosValidos());

    await expect(useCase.execute(dadosValidos({ loginAdministrador: "outro.login" }))).rejects.toThrow(ConflictError);
  });

  test("rejeita login de administrador já em uso (ConflictError)", async () => {
    const { useCase } = montarUseCase();
    await useCase.execute(dadosValidos());

    await expect(useCase.execute(dadosValidos({ cnpjCpf: CPF_VALIDO }))).rejects.toThrow(ConflictError);
  });

  test("rejeita CNPJ/CPF inválido (fluxo de exceção E1)", async () => {
    const { useCase } = montarUseCase();

    await expect(useCase.execute(dadosValidos({ cnpjCpf: "11111111111111" }))).rejects.toThrow(ValidationError);
  });

  test("rejeita e-mail em formato inválido (fluxo de exceção E2)", async () => {
    const { useCase } = montarUseCase();

    await expect(useCase.execute(dadosValidos({ email: "nao-e-um-email" }))).rejects.toThrow(ValidationError);
  });

  test("rejeita senha com menos de 8 caracteres", async () => {
    const { useCase } = montarUseCase();

    await expect(useCase.execute(dadosValidos({ senhaAdministrador: "123" }))).rejects.toThrow(ValidationError);
  });

  test("rejeita cadastro com campos obrigatórios ausentes, listando todos em fieldErrors", async () => {
    const { useCase } = montarUseCase();

    await expect(
      useCase.execute({ nome: "", cnpjCpf: "", telefone: "", email: "", loginAdministrador: "", senhaAdministrador: "" })
    ).rejects.toMatchObject({
      fieldErrors: {
        nome: expect.any(String),
        telefone: expect.any(String),
        loginAdministrador: expect.any(String),
        cnpjCpf: expect.any(String),
        email: expect.any(String),
        senhaAdministrador: expect.any(String),
      },
    });
  });

  test("rejeita nome contendo apenas espaços em branco", async () => {
    const { useCase } = montarUseCase();

    await expect(useCase.execute(dadosValidos({ nome: "   " }))).rejects.toThrow(ValidationError);
  });

  test("aceita CNPJ/CPF formatado com máscara (pontos, barra e traço)", async () => {
    const { useCase } = montarUseCase();

    const resultado = await useCase.execute(dadosValidos({ cnpjCpf: "12.345.678/0001-95" }));

    expect(resultado.empresa.cnpjCpf).toBe("12.345.678/0001-95");
  });

  test("remove espaços das extremidades de nome, telefone, e-mail e login", async () => {
    const { useCase } = montarUseCase();

    const resultado = await useCase.execute(
      dadosValidos({
        nome: "  Ferragens Central  ",
        telefone: "  (64) 99999-0000  ",
        email: "  admin@ferragenscentral.com  ",
        loginAdministrador: "  admin.central  ",
      })
    );

    expect(resultado.empresa.nome).toBe("Ferragens Central");
    expect(resultado.empresa.telefone).toBe("(64) 99999-0000");
    expect(resultado.administrador.email).toBe("admin@ferragenscentral.com");
    expect(resultado.administrador.login).toBe("admin.central");
  });

  test("normaliza o e-mail para minúsculas", async () => {
    const { useCase } = montarUseCase();

    const resultado = await useCase.execute(dadosValidos({ email: "Admin@FerragensCentral.COM" }));

    expect(resultado.empresa.email).toBe("admin@ferragenscentral.com");
  });

  test("o administrador criado é sempre do perfil ADMINISTRADOR e começa ativo", async () => {
    const { useCase } = montarUseCase();

    const resultado = await useCase.execute(dadosValidos());

    expect(resultado.administrador.perfil).toBe("ADMINISTRADOR");
    expect(resultado.administrador.ativo).toBe(true);
  });
});
