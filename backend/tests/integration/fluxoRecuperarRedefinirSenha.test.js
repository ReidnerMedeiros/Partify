/**
 * Testes de integração leve cruzando RF02 (login) + RF03 (recuperar senha) +
 * RF04 (redefinir senha): simula o usuário esquecendo a senha, pedindo o link,
 * usando-o para definir uma nova senha, e confirmando que só a senha nova
 * funciona a partir daí.
 */
const { CriarEmpresaUseCase } = require("../../src/useCases/empresa/CriarEmpresaUseCase");
const { AutenticarUsuarioUseCase } = require("../../src/useCases/auth/AutenticarUsuarioUseCase");
const { SolicitarRecuperacaoSenhaUseCase } = require("../../src/useCases/auth/SolicitarRecuperacaoSenhaUseCase");
const { RedefinirSenhaUseCase } = require("../../src/useCases/auth/RedefinirSenhaUseCase");

const { FakeEmpresaRepository } = require("../fakes/FakeEmpresaRepository");
const { FakeUsuarioRepository } = require("../fakes/FakeUsuarioRepository");
const { FakeLogAuditoriaRepository } = require("../fakes/FakeLogAuditoriaRepository");
const { FakeTokenRedefinicaoSenhaRepository } = require("../fakes/FakeTokenRedefinicaoSenhaRepository");
const { FakeRandomTokenService } = require("../fakes/FakeRandomTokenService");
const { FakeEmailService } = require("../fakes/FakeEmailService");
const { FakeHashService } = require("../fakes/FakeHashService");
const { FakeTokenService } = require("../fakes/FakeTokenService");

const { UnauthorizedError } = require("../../src/domain/errors/DomainErrors");

const CNPJ_VALIDO = "12345678000195";

function montarAmbiente() {
  const empresaRepository = new FakeEmpresaRepository();
  const usuarioRepository = new FakeUsuarioRepository();
  empresaRepository.usuarioRepository = usuarioRepository;
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const tokenRedefinicaoSenhaRepository = new FakeTokenRedefinicaoSenhaRepository();
  const randomTokenService = new FakeRandomTokenService();
  const emailService = new FakeEmailService();
  const hashService = new FakeHashService();
  const tokenService = new FakeTokenService();

  return {
    emailService,
    criarEmpresa: new CriarEmpresaUseCase({ empresaRepository, usuarioRepository, hashService, logAuditoriaRepository }),
    autenticar: new AutenticarUsuarioUseCase({ usuarioRepository, empresaRepository, hashService, tokenService, logAuditoriaRepository }),
    solicitarRecuperacao: new SolicitarRecuperacaoSenhaUseCase({
      usuarioRepository,
      tokenRedefinicaoSenhaRepository,
      randomTokenService,
      emailService,
      logAuditoriaRepository,
      frontendUrl: "http://localhost:5173",
    }),
    redefinirSenha: new RedefinirSenhaUseCase({
      usuarioRepository,
      tokenRedefinicaoSenhaRepository,
      randomTokenService,
      hashService,
      logAuditoriaRepository,
    }),
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

function extrairTokenDoLink(link) {
  return new URL(link).searchParams.get("token");
}

describe("Fluxo integrado: RF02 (login) + RF03 (recuperar senha) + RF04 (redefinir senha)", () => {
  test("depois de redefinir a senha pelo link recebido, só a senha nova funciona no login", async () => {
    const ambiente = montarAmbiente();
    await ambiente.criarEmpresa.execute(dadosCadastro());

    // a senha antiga funciona antes da redefinição
    await expect(ambiente.autenticar.execute({ login: "admin.central", senha: "senhaSegura123" })).resolves.toBeDefined();

    await ambiente.solicitarRecuperacao.execute({ login: "admin.central", email: "admin@ferragenscentral.com" });
    const tokenBruto = extrairTokenDoLink(ambiente.emailService.enviados[0].link);

    await ambiente.redefinirSenha.execute({
      token: tokenBruto,
      novaSenha: "novaSenhaSegura456",
      confirmarNovaSenha: "novaSenhaSegura456",
    });

    await expect(ambiente.autenticar.execute({ login: "admin.central", senha: "senhaSegura123" })).rejects.toThrow(
      UnauthorizedError
    );
    await expect(
      ambiente.autenticar.execute({ login: "admin.central", senha: "novaSenhaSegura456" })
    ).resolves.toBeDefined();
  });

  test("um link de recuperação solicitado com e-mail errado não gera token nem permite redefinir nada", async () => {
    const ambiente = montarAmbiente();
    await ambiente.criarEmpresa.execute(dadosCadastro());

    await ambiente.solicitarRecuperacao.execute({ login: "admin.central", email: "email-que-nao-e-do-usuario@x.com" });

    expect(ambiente.emailService.enviados).toHaveLength(0);
    // a senha original continua sendo a única válida
    await expect(ambiente.autenticar.execute({ login: "admin.central", senha: "senhaSegura123" })).resolves.toBeDefined();
  });
});
