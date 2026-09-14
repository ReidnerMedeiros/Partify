/**
 * Teste de integração leve cruzando RF01 (cadastro) + RF02 (login) + RF04,
 * fluxo básico (Alterar Senha, autenticado): confirma que a troca de senha
 * feita pelo próprio usuário logado realmente reflete no login seguinte.
 */
const { CriarEmpresaUseCase } = require("../../src/useCases/empresa/CriarEmpresaUseCase");
const { AutenticarUsuarioUseCase } = require("../../src/useCases/auth/AutenticarUsuarioUseCase");
const { AlterarSenhaUseCase } = require("../../src/useCases/auth/AlterarSenhaUseCase");

const { FakeEmpresaRepository } = require("../fakes/FakeEmpresaRepository");
const { FakeUsuarioRepository } = require("../fakes/FakeUsuarioRepository");
const { FakeLogAuditoriaRepository } = require("../fakes/FakeLogAuditoriaRepository");
const { FakeHashService } = require("../fakes/FakeHashService");
const { FakeTokenService } = require("../fakes/FakeTokenService");

const { UnauthorizedError } = require("../../src/domain/errors/DomainErrors");

const CNPJ_VALIDO = "12345678000195";

function montarAmbiente() {
  const empresaRepository = new FakeEmpresaRepository();
  const usuarioRepository = new FakeUsuarioRepository();
  empresaRepository.usuarioRepository = usuarioRepository;
  const logAuditoriaRepository = new FakeLogAuditoriaRepository();
  const hashService = new FakeHashService();
  const tokenService = new FakeTokenService();

  return {
    criarEmpresa: new CriarEmpresaUseCase({ empresaRepository, usuarioRepository, hashService, logAuditoriaRepository }),
    autenticar: new AutenticarUsuarioUseCase({ usuarioRepository, empresaRepository, hashService, tokenService, logAuditoriaRepository }),
    alterarSenha: new AlterarSenhaUseCase({ usuarioRepository, hashService, logAuditoriaRepository }),
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

describe("Fluxo integrado: RF02 (login) + RF04 (alterar senha, autenticado)", () => {
  test("depois de alterar a senha, só a senha nova funciona no login", async () => {
    const ambiente = montarAmbiente();
    const { administrador } = await ambiente.criarEmpresa.execute(dadosCadastro());

    await ambiente.alterarSenha.execute({
      usuarioId: administrador.id,
      senhaAtual: "senhaSegura123",
      novaSenha: "senhaNova456",
      confirmarNovaSenha: "senhaNova456",
    });

    await expect(ambiente.autenticar.execute({ login: "admin.central", senha: "senhaSegura123" })).rejects.toThrow(
      UnauthorizedError
    );
    await expect(ambiente.autenticar.execute({ login: "admin.central", senha: "senhaNova456" })).resolves.toBeDefined();
  });

  test("informar a senha atual errada não altera nada — o login com a senha original continua funcionando", async () => {
    const ambiente = montarAmbiente();
    const { administrador } = await ambiente.criarEmpresa.execute(dadosCadastro());

    await expect(
      ambiente.alterarSenha.execute({
        usuarioId: administrador.id,
        senhaAtual: "senha-errada",
        novaSenha: "senhaNova456",
        confirmarNovaSenha: "senhaNova456",
      })
    ).rejects.toBeTruthy();

    await expect(
      ambiente.autenticar.execute({ login: "admin.central", senha: "senhaSegura123" })
    ).resolves.toBeDefined();
  });
});
