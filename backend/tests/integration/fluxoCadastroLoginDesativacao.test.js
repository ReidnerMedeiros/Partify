/**
 * Testes de integração leve: várias Use Cases reais trabalhando juntas sobre os
 * mesmos repositórios fake, sem mocks parciais. Isso cobre o comportamento
 * *entre* requisitos que os testes unitários (isolados por Use Case) não
 * conseguem enxergar — em especial a regra do RF01-A2 ("desativar a empresa
 * suspende o acesso de todos os usuários"), que só é observável de ponta a
 * ponta: cadastrar -> logar -> desativar -> tentar logar de novo.
 */
const { CriarEmpresaUseCase } = require("../../src/useCases/empresa/CriarEmpresaUseCase");
const { DesativarEmpresaUseCase } = require("../../src/useCases/empresa/DesativarEmpresaUseCase");
const { AutenticarUsuarioUseCase } = require("../../src/useCases/auth/AutenticarUsuarioUseCase");
const { LogoutUseCase } = require("../../src/useCases/auth/LogoutUseCase");

const { FakeEmpresaRepository } = require("../fakes/FakeEmpresaRepository");
const { FakeUsuarioRepository } = require("../fakes/FakeUsuarioRepository");
const { FakeLogAuditoriaRepository } = require("../fakes/FakeLogAuditoriaRepository");
const { FakeSessaoRevogadaRepository } = require("../fakes/FakeSessaoRevogadaRepository");
const { FakeHashService } = require("../fakes/FakeHashService");
const { FakeTokenService } = require("../fakes/FakeTokenService");

const { UnauthorizedError } = require("../../src/domain/errors/DomainErrors");

const CNPJ_VALIDO = "12345678000195";

function montarAmbiente() {
  const empresaRepository = new FakeEmpresaRepository();
  const usuarioRepository = new FakeUsuarioRepository();
  empresaRepository.usuarioRepository = usuarioRepository;
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const sessaoRevogadaRepository = new FakeSessaoRevogadaRepository();
  const hashService = new FakeHashService();
  const tokenService = new FakeTokenService();

  return {
    empresaRepository,
    usuarioRepository,
    logAuditoriaRepository,
    sessaoRevogadaRepository,
    criarEmpresa: new CriarEmpresaUseCase({ empresaRepository, usuarioRepository, hashService, logAuditoriaRepository }),
    desativarEmpresa: new DesativarEmpresaUseCase({ empresaRepository, logAuditoriaRepository }),
    autenticar: new AutenticarUsuarioUseCase({ usuarioRepository, empresaRepository, hashService, tokenService, logAuditoriaRepository }),
    logout: new LogoutUseCase({ sessaoRevogadaRepository, logAuditoriaRepository }),
  };
}

function dadosCadastro() {
  return {
    nome: "Ferragens Central",
    cnpjCpf: CNPJ_VALIDO,
    telefone: "(64) 99999-0000",
    email: "admin@ferragenscentral.com",
    loginAdministrador: "admin.central",
    senhaAdministrador: "senhaSegura123",
  };
}

describe("Fluxo integrado: RF01 (cadastro/desativação) + RF02 (login/logout)", () => {
  test("o administrador consegue logar imediatamente após o cadastro da empresa", async () => {
    const ambiente = montarAmbiente();
    await ambiente.criarEmpresa.execute(dadosCadastro());

    const resultado = await ambiente.autenticar.execute({ login: "admin.central", senha: "senhaSegura123" });

    expect(resultado.token).toBeTruthy();
    expect(resultado.usuario.perfil).toBe("ADMINISTRADOR");
  });

  test("depois do logout, a sessão emitida no login fica marcada como revogada", async () => {
    const ambiente = montarAmbiente();
    await ambiente.criarEmpresa.execute(dadosCadastro());
    const { token, usuario } = await ambiente.autenticar.execute({ login: "admin.central", senha: "senhaSegura123" });
    const { jti, exp } = JSON.parse(token);

    await ambiente.logout.execute({ usuarioId: usuario.id, jti, exp });

    expect(await ambiente.sessaoRevogadaRepository.estaRevogado(jti)).toBe(true);
  });

  test("depois de desativar a empresa, o administrador não consegue mais logar (RF01-A2)", async () => {
    const ambiente = montarAmbiente();
    const { empresa, administrador } = await ambiente.criarEmpresa.execute(dadosCadastro());

    // login funciona normalmente antes da desativação
    await expect(ambiente.autenticar.execute({ login: "admin.central", senha: "senhaSegura123" })).resolves.toBeDefined();

    await ambiente.desativarEmpresa.execute({ empresaId: empresa.id, usuarioId: administrador.id });

    await expect(ambiente.autenticar.execute({ login: "admin.central", senha: "senhaSegura123" })).rejects.toThrow(
      UnauthorizedError
    );
  });

  test("desativar uma empresa não afeta o login de administradores de outra empresa", async () => {
    const ambiente = montarAmbiente();
    const { empresa } = await ambiente.criarEmpresa.execute(dadosCadastro());
    await ambiente.criarEmpresa.execute({
      nome: "Outra Loja",
      cnpjCpf: "12345678909",
      telefone: "64988880000",
      email: "admin@outraloja.com",
      loginAdministrador: "admin.outra",
      senhaAdministrador: "outraSenhaSegura123",
    });

    await ambiente.desativarEmpresa.execute({ empresaId: empresa.id, usuarioId: "qualquer" });

    await expect(ambiente.autenticar.execute({ login: "admin.outra", senha: "outraSenhaSegura123" })).resolves.toBeDefined();
  });
});
