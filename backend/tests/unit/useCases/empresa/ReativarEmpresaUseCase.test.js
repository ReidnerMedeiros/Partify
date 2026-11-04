const { ReativarEmpresaUseCase } = require("../../../../src/useCases/empresa/ReativarEmpresaUseCase");
const { FakeUsuarioRepository } = require("../../../fakes/FakeUsuarioRepository");
const { FakeEmpresaRepository } = require("../../../fakes/FakeEmpresaRepository");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { FakeHashService } = require("../../../fakes/FakeHashService");
const { UnauthorizedError, ConflictError } = require("../../../../src/domain/errors/DomainErrors");
const { Empresa } = require("../../../../src/domain/entities/Empresa");
const { StatusEmpresa } = require("../../../../src/domain/enums/StatusEmpresa");

function montarUseCase() {
  const usuarioRepository = new FakeUsuarioRepository();
  const empresaRepository = new FakeEmpresaRepository();
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const hashService = new FakeHashService();
  const useCase = new ReativarEmpresaUseCase({ usuarioRepository, empresaRepository, hashService, logAuditoriaRepository });
  return { useCase, usuarioRepository, empresaRepository, logAuditoriaRepository, hashService };
}

async function seed(ctx, { statusEmpresa = StatusEmpresa.INATIVA, perfil = "ADMINISTRADOR", usuarioAtivo = true } = {}) {
  const empresa = new Empresa({
    id: "empresa-1",
    nome: "Loja X",
    cnpjCpf: "12345678000195",
    telefone: "64999990000",
    email: "loja@x.com",
    status: statusEmpresa,
  });
  ctx.empresaRepository.empresas.push(empresa);
  ctx.usuarioRepository.usuarios.push({
    id: "usuario-1",
    nome: "Admin",
    email: "admin@x.com",
    login: "admin",
    senhaHash: await ctx.hashService.hash("senha123"),
    perfil,
    ativo: usuarioAtivo,
    empresaId: empresa.id,
  });
  return empresa;
}

describe("ReativarEmpresaUseCase — reativação da empresa pelo administrador", () => {
  test("reativa a empresa desativada quando o administrador informa login e senha corretos", async () => {
    const ctx = montarUseCase();
    const empresa = await seed(ctx);

    await ctx.useCase.execute({ login: "admin", senha: "senha123" });

    expect(empresa.status).toBe(StatusEmpresa.ATIVA);
  });

  test("registra a reativação no log de auditoria (ATIVAR_DESATIVAR_EMPRESA)", async () => {
    const ctx = montarUseCase();
    await seed(ctx);

    await ctx.useCase.execute({ login: "admin", senha: "senha123" });

    const ultimo = ctx.logAuditoriaRepository.registros[ctx.logAuditoriaRepository.registros.length - 1];
    expect(ultimo.tipoAcao).toBe("ATIVAR_DESATIVAR_EMPRESA");
    expect(ultimo.detalhes).toEqual({ statusAnterior: StatusEmpresa.INATIVA, statusNovo: StatusEmpresa.ATIVA });
  });

  test("senha incorreta é rejeitada e a empresa continua desativada", async () => {
    const ctx = montarUseCase();
    const empresa = await seed(ctx);

    await expect(ctx.useCase.execute({ login: "admin", senha: "errada" })).rejects.toThrow(UnauthorizedError);
    expect(empresa.status).toBe(StatusEmpresa.INATIVA);
  });

  test("usuário que não é administrador não pode reativar (e o fato fica no log)", async () => {
    const ctx = montarUseCase();
    const empresa = await seed(ctx, { perfil: "VENDEDOR" });

    await expect(ctx.useCase.execute({ login: "admin", senha: "senha123" })).rejects.toThrow(UnauthorizedError);
    expect(empresa.status).toBe(StatusEmpresa.INATIVA);
    const ultimo = ctx.logAuditoriaRepository.registros[ctx.logAuditoriaRepository.registros.length - 1];
    expect(ultimo.detalhes.motivo).toBe("reativacao_sem_permissao");
  });

  test("administrador inativo não pode reativar", async () => {
    const ctx = montarUseCase();
    const empresa = await seed(ctx, { usuarioAtivo: false });

    await expect(ctx.useCase.execute({ login: "admin", senha: "senha123" })).rejects.toThrow(UnauthorizedError);
    expect(empresa.status).toBe(StatusEmpresa.INATIVA);
  });

  test("empresa que já está ativa responde conflito", async () => {
    const ctx = montarUseCase();
    await seed(ctx, { statusEmpresa: StatusEmpresa.ATIVA });

    await expect(ctx.useCase.execute({ login: "admin", senha: "senha123" })).rejects.toThrow(ConflictError);
  });

  test("login inexistente é rejeitado com a mensagem genérica", async () => {
    const ctx = montarUseCase();

    await expect(ctx.useCase.execute({ login: "ninguem", senha: "x" })).rejects.toThrow(UnauthorizedError);
  });
});
