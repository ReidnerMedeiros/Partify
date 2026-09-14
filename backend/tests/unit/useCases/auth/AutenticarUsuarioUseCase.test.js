const { AutenticarUsuarioUseCase } = require("../../../../src/useCases/auth/AutenticarUsuarioUseCase");
const { FakeUsuarioRepository } = require("../../../fakes/FakeUsuarioRepository");
const { FakeEmpresaRepository } = require("../../../fakes/FakeEmpresaRepository");
const { FakeLogAuditoriaRepository } = require("../../../fakes/FakeLogAuditoriaRepository");
const { FakeHashService } = require("../../../fakes/FakeHashService");
const { FakeTokenService } = require("../../../fakes/FakeTokenService");
const { UnauthorizedError } = require("../../../../src/domain/errors/DomainErrors");
const { Empresa } = require("../../../../src/domain/entities/Empresa");
const { StatusEmpresa } = require("../../../../src/domain/enums/StatusEmpresa");

function montarUseCase() {
  const usuarioRepository = new FakeUsuarioRepository();
  const empresaRepository = new FakeEmpresaRepository();
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const hashService = new FakeHashService();
  const tokenService = new FakeTokenService();
  const useCase = new AutenticarUsuarioUseCase({ usuarioRepository, empresaRepository, hashService, tokenService, logAuditoriaRepository });
  return { useCase, usuarioRepository, empresaRepository, logAuditoriaRepository, hashService, tokenService };
}

async function seedUsuarioEEmpresa(ctx, overrides = {}) {
  const empresa = new Empresa({
    id: "empresa-1",
    nome: "Loja X",
    cnpjCpf: "12345678000195",
    telefone: "64999990000",
    email: "loja@x.com",
    status: overrides.statusEmpresa ?? StatusEmpresa.ATIVA,
  });
  ctx.empresaRepository.empresas.push(empresa);

  const usuario = {
    id: "usuario-1",
    nome: "Admin",
    email: "admin@x.com",
    login: "admin",
    senhaHash: await ctx.hashService.hash("senha123"),
    perfil: "ADMINISTRADOR",
    ativo: overrides.usuarioAtivo ?? true,
    empresaId: empresa.id,
  };
  ctx.usuarioRepository.usuarios.push(usuario);
  return { empresa, usuario };
}

describe("AutenticarUsuarioUseCase — RF02, fluxo básico (Login)", () => {
  test("autentica com sucesso e retorna token + dados do usuário sem a senha", async () => {
    const ctx = montarUseCase();
    await seedUsuarioEEmpresa(ctx);

    const resultado = await ctx.useCase.execute({ login: "admin", senha: "senha123" });

    expect(resultado.token).toBeTruthy();
    expect(resultado.usuario.login).toBe("admin");
    expect(resultado.usuario).not.toHaveProperty("senhaHash");
  });

  test("registra LOGIN no log de auditoria em caso de sucesso", async () => {
    const ctx = montarUseCase();
    await seedUsuarioEEmpresa(ctx);

    await ctx.useCase.execute({ login: "admin", senha: "senha123" });

    const ultimoLog = ctx.logAuditoriaRepository.registros[ctx.logAuditoriaRepository.registros.length - 1];
    expect(ultimoLog.tipoAcao).toBe("LOGIN");
  });

  test("rejeita login inexistente (fluxo de exceção E1)", async () => {
    const ctx = montarUseCase();

    await expect(ctx.useCase.execute({ login: "nao-existe", senha: "qualquer" })).rejects.toThrow(UnauthorizedError);
    expect(ctx.logAuditoriaRepository.registros[0].detalhes.motivo).toBe("credenciais_invalidas");
  });

  test("rejeita senha incorreta (fluxo de exceção E1)", async () => {
    const ctx = montarUseCase();
    await seedUsuarioEEmpresa(ctx);

    await expect(ctx.useCase.execute({ login: "admin", senha: "senha-errada" })).rejects.toThrow(UnauthorizedError);
  });

  test("rejeita usuário inativo (fluxo de exceção E2)", async () => {
    const ctx = montarUseCase();
    await seedUsuarioEEmpresa(ctx, { usuarioAtivo: false });

    await expect(ctx.useCase.execute({ login: "admin", senha: "senha123" })).rejects.toThrow(UnauthorizedError);
    const ultimoLog = ctx.logAuditoriaRepository.registros[ctx.logAuditoriaRepository.registros.length - 1];
    expect(ultimoLog.detalhes.motivo).toBe("conta_inativa");
  });

  test("rejeita login quando a empresa/instância está desativada (decorrência do RF01-A2)", async () => {
    const ctx = montarUseCase();
    await seedUsuarioEEmpresa(ctx, { statusEmpresa: StatusEmpresa.INATIVA });

    await expect(ctx.useCase.execute({ login: "admin", senha: "senha123" })).rejects.toThrow(UnauthorizedError);
    const ultimoLog = ctx.logAuditoriaRepository.registros[ctx.logAuditoriaRepository.registros.length - 1];
    expect(ultimoLog.detalhes.motivo).toBe("instancia_desativada");
  });

  test("rejeita login quando o usuário aponta para uma empresa inexistente", async () => {
    const ctx = montarUseCase();
    await seedUsuarioEEmpresa(ctx);
    // Remove a empresa do repositório sem remover o usuário — cenário de
    // inconsistência de dados que o use case também precisa cobrir.
    ctx.empresaRepository.empresas = [];

    await expect(ctx.useCase.execute({ login: "admin", senha: "senha123" })).rejects.toThrow(UnauthorizedError);
    const ultimoLog = ctx.logAuditoriaRepository.registros[ctx.logAuditoriaRepository.registros.length - 1];
    expect(ultimoLog.detalhes.motivo).toBe("instancia_desativada");
  });

  test("remove espaços das extremidades do login antes de buscar o usuário", async () => {
    const ctx = montarUseCase();
    await seedUsuarioEEmpresa(ctx);

    const resultado = await ctx.useCase.execute({ login: "  admin  ", senha: "senha123" });

    expect(resultado.usuario.login).toBe("admin");
  });

  test("o token gerado carrega o id do usuário, a empresa e o perfil", async () => {
    const ctx = montarUseCase();
    await seedUsuarioEEmpresa(ctx);

    const resultado = await ctx.useCase.execute({ login: "admin", senha: "senha123" });
    const payload = JSON.parse(resultado.token);

    expect(payload.sub).toBe("usuario-1");
    expect(payload.empresaId).toBe("empresa-1");
    expect(payload.perfil).toBe("ADMINISTRADOR");
  });

  test("cada tentativa de login com credenciais inválidas gera um novo registro de auditoria", async () => {
    const ctx = montarUseCase();
    await seedUsuarioEEmpresa(ctx);

    await expect(ctx.useCase.execute({ login: "admin", senha: "errada-1" })).rejects.toThrow(UnauthorizedError);
    await expect(ctx.useCase.execute({ login: "admin", senha: "errada-2" })).rejects.toThrow(UnauthorizedError);

    expect(ctx.logAuditoriaRepository.registros).toHaveLength(2);
    expect(ctx.logAuditoriaRepository.registros.every((r) => r.tipoAcao === "ACESSO_NAO_AUTORIZADO")).toBe(true);
  });
});
