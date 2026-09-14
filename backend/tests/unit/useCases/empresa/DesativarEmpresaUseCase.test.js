const { DesativarEmpresaUseCase } = require("../../../../src/useCases/empresa/DesativarEmpresaUseCase");
const { FakeEmpresaRepository } = require("../../../fakes/FakeEmpresaRepository");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { NotFoundError, ConflictError } = require("../../../../src/domain/errors/DomainErrors");
const { Empresa } = require("../../../../src/domain/entities/Empresa");
const { StatusEmpresa } = require("../../../../src/domain/enums/StatusEmpresa");

function montarUseCase() {
  const empresaRepository = new FakeEmpresaRepository();
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const useCase = new DesativarEmpresaUseCase({ empresaRepository, logAuditoriaRepository });
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

describe("DesativarEmpresaUseCase — RF01, fluxo alternativo A2 (desativação)", () => {
  test("desativa a empresa com sucesso, sem apagar nenhum dado", async () => {
    const { useCase, empresaRepository } = montarUseCase();
    seedEmpresa(empresaRepository);

    const resultado = await useCase.execute({ empresaId: "empresa-1", usuarioId: "usuario-1" });

    expect(resultado.status).toBe(StatusEmpresa.INATIVA);
    expect(empresaRepository.empresas).toHaveLength(1);
    expect(empresaRepository.empresas[0].nome).toBe("Loja X");
  });

  test("lança NotFoundError quando a empresa não existe", async () => {
    const { useCase } = montarUseCase();

    await expect(useCase.execute({ empresaId: "inexistente", usuarioId: "usuario-1" })).rejects.toThrow(NotFoundError);
  });

  test("lança ConflictError quando a empresa já está desativada", async () => {
    const { useCase, empresaRepository } = montarUseCase();
    seedEmpresa(empresaRepository, { status: StatusEmpresa.INATIVA });

    await expect(useCase.execute({ empresaId: "empresa-1", usuarioId: "usuario-1" })).rejects.toThrow(ConflictError);
  });

  test("registra ATIVAR_DESATIVAR_EMPRESA no log de auditoria", async () => {
    const { useCase, empresaRepository, logAuditoriaRepository } = montarUseCase();
    seedEmpresa(empresaRepository);

    await useCase.execute({ empresaId: "empresa-1", usuarioId: "usuario-1" });

    expect(logAuditoriaRepository.registros).toHaveLength(1);
    expect(logAuditoriaRepository.registros[0].tipoAcao).toBe("ATIVAR_DESATIVAR_EMPRESA");
    expect(logAuditoriaRepository.registros[0].detalhes).toEqual({
      statusAnterior: StatusEmpresa.ATIVA,
      statusNovo: StatusEmpresa.INATIVA,
    });
  });

  test("o log registra o id do usuário (administrador) que solicitou a desativação", async () => {
    const { useCase, empresaRepository, logAuditoriaRepository } = montarUseCase();
    seedEmpresa(empresaRepository);

    await useCase.execute({ empresaId: "empresa-1", usuarioId: "usuario-admin-42" });

    expect(logAuditoriaRepository.registros[0].usuarioId).toBe("usuario-admin-42");
    expect(logAuditoriaRepository.registros[0].registroAfetado).toBe("empresa-1");
  });

  test("preserva o CNPJ/CPF e demais dados cadastrais após a desativação", async () => {
    const { useCase, empresaRepository } = montarUseCase();
    seedEmpresa(empresaRepository);

    const resultado = await useCase.execute({ empresaId: "empresa-1", usuarioId: "usuario-1" });

    expect(resultado.cnpjCpf).toBe("12345678000195");
    expect(resultado.email).toBe("loja@x.com");
    expect(resultado.telefone).toBe("64999990000");
  });
});
