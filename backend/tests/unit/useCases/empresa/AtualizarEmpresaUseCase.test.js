const { AtualizarEmpresaUseCase } = require("../../../../src/useCases/empresa/AtualizarEmpresaUseCase");
const { FakeEmpresaRepository } = require("../../../fakes/FakeEmpresaRepository");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { NotFoundError, ValidationError } = require("../../../../src/domain/errors/DomainErrors");
const { Empresa } = require("../../../../src/domain/entities/Empresa");

function montarUseCase() {
  const empresaRepository = new FakeEmpresaRepository();
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const useCase = new AtualizarEmpresaUseCase({ empresaRepository, logAuditoriaRepository });
  return { useCase, empresaRepository, logAuditoriaRepository };
}

function seedEmpresa(empresaRepository, overrides = {}) {
  const empresa = new Empresa({
    id: "empresa-1",
    nome: "Loja X",
    cnpjCpf: "12345678000195",
    telefone: "64999990000",
    email: "loja@x.com",
    ...overrides,
  });
  empresaRepository.empresas.push(empresa);
  return empresa;
}

describe("AtualizarEmpresaUseCase — RF01, fluxo alternativo A1 (atualização)", () => {
  test("atualiza nome, telefone e e-mail com sucesso", async () => {
    const { useCase, empresaRepository } = montarUseCase();
    seedEmpresa(empresaRepository);

    const resultado = await useCase.execute({
      empresaId: "empresa-1",
      usuarioId: "usuario-1",
      nome: "Loja X Atualizada",
      telefone: "64988887777",
      email: "novo@x.com",
    });

    expect(resultado.nome).toBe("Loja X Atualizada");
    expect(resultado.telefone).toBe("64988887777");
    expect(resultado.email).toBe("novo@x.com");
  });

  test("permite atualizar apenas um campo, mantendo os demais", async () => {
    const { useCase, empresaRepository } = montarUseCase();
    seedEmpresa(empresaRepository);

    const resultado = await useCase.execute({ empresaId: "empresa-1", usuarioId: "usuario-1", telefone: "64977776666" });

    expect(resultado.nome).toBe("Loja X");
    expect(resultado.telefone).toBe("64977776666");
  });

  test("lança NotFoundError quando a empresa não existe", async () => {
    const { useCase } = montarUseCase();

    await expect(useCase.execute({ empresaId: "inexistente", usuarioId: "usuario-1", nome: "Novo nome" })).rejects.toThrow(
      NotFoundError
    );
  });

  test("rejeita e-mail em formato inválido", async () => {
    const { useCase, empresaRepository } = montarUseCase();
    seedEmpresa(empresaRepository);

    await expect(
      useCase.execute({ empresaId: "empresa-1", usuarioId: "usuario-1", email: "email-invalido" })
    ).rejects.toThrow(ValidationError);
  });

  test("rejeita nome em branco", async () => {
    const { useCase, empresaRepository } = montarUseCase();
    seedEmpresa(empresaRepository);

    await expect(useCase.execute({ empresaId: "empresa-1", usuarioId: "usuario-1", nome: "   " })).rejects.toThrow(
      ValidationError
    );
  });

  test("registra EDICAO_REGISTRO no log de auditoria com valores anterior/novo", async () => {
    const { useCase, empresaRepository, logAuditoriaRepository } = montarUseCase();
    seedEmpresa(empresaRepository);

    await useCase.execute({ empresaId: "empresa-1", usuarioId: "usuario-1", telefone: "64977776666" });

    expect(logAuditoriaRepository.registros).toHaveLength(1);
    expect(logAuditoriaRepository.registros[0].tipoAcao).toBe("EDICAO_REGISTRO");
    expect(logAuditoriaRepository.registros[0].detalhes.anterior).toEqual({ telefone: "64999990000" });
    expect(logAuditoriaRepository.registros[0].detalhes.novo).toEqual({ telefone: "64977776666" });
  });

  test("o log de auditoria registra o anterior/novo de todos os campos alterados simultaneamente", async () => {
    const { useCase, empresaRepository, logAuditoriaRepository } = montarUseCase();
    seedEmpresa(empresaRepository);

    await useCase.execute({
      empresaId: "empresa-1",
      usuarioId: "usuario-1",
      nome: "Loja X Atualizada",
      email: "novo@x.com",
    });

    expect(logAuditoriaRepository.registros[0].detalhes.anterior).toEqual({ nome: "Loja X", email: "loja@x.com" });
    expect(logAuditoriaRepository.registros[0].detalhes.novo).toEqual({ nome: "Loja X Atualizada", email: "novo@x.com" });
  });

  test("remove espaços das extremidades e normaliza o e-mail para minúsculas", async () => {
    const { useCase, empresaRepository } = montarUseCase();
    seedEmpresa(empresaRepository);

    const resultado = await useCase.execute({
      empresaId: "empresa-1",
      usuarioId: "usuario-1",
      nome: "  Loja X Atualizada  ",
      email: "  Novo@X.COM  ",
    });

    expect(resultado.nome).toBe("Loja X Atualizada");
    expect(resultado.email).toBe("novo@x.com");
  });

  test("quando nenhum campo é informado, não altera nada e não quebra", async () => {
    const { useCase, empresaRepository } = montarUseCase();
    seedEmpresa(empresaRepository);

    const resultado = await useCase.execute({ empresaId: "empresa-1", usuarioId: "usuario-1" });

    expect(resultado.nome).toBe("Loja X");
    expect(resultado.telefone).toBe("64999990000");
    expect(resultado.email).toBe("loja@x.com");
  });

  test("não permite editar o CNPJ/CPF (não é um campo aceito pelo use case)", async () => {
    const { useCase, empresaRepository } = montarUseCase();
    seedEmpresa(empresaRepository);

    const resultado = await useCase.execute({
      empresaId: "empresa-1",
      usuarioId: "usuario-1",
      cnpjCpf: "00000000000000",
      nome: "Loja X Atualizada",
    });

    expect(resultado.cnpjCpf).toBe("12345678000195");
  });
});
