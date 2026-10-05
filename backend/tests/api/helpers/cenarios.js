const request = require("supertest");

const SENHA_PADRAO = "senha12345";

const PESOS_PRIMEIRO_DIGITO = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_SEGUNDO_DIGITO = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function calcularDigitoCnpj(baseDigitos, pesos) {
  let soma = 0;
  for (let i = 0; i < baseDigitos.length; i += 1) {
    soma += Number(baseDigitos[i]) * pesos[i];
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/**
 * Gera um CNPJ novo e válido (dígitos verificadores calculados de verdade,
 * mesmo algoritmo de `domain/validators/documentValidator.js`) a cada
 * chamada — os testes de API que criam mais de uma empresa no mesmo teste
 * (ex.: cenários de isolamento multi-tenant, RNF11) precisam de documentos
 * distintos, já que o `FakeEmpresaRepository` aplica a mesma restrição real
 * de "CNPJ/CPF já cadastrado" (`ConflictError`, 409).
 */
function gerarCnpjValido() {
  const base = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  const primeiroDigito = calcularDigitoCnpj(base, PESOS_PRIMEIRO_DIGITO);
  const segundoDigito = calcularDigitoCnpj([...base, primeiroDigito], PESOS_SEGUNDO_DIGITO);
  return [...base, primeiroDigito, segundoDigito].join("");
}

/**
 * Cadastra uma empresa nova (RF01, rota pública) e já faz login com o
 * administrador criado (RF02), devolvendo o token pronto pra usar no
 * cabeçalho Authorization dos testes de rotas protegidas. Evita repetir esse
 * par cadastro+login em cada teste de API que precisa de uma sessão válida.
 */
async function cadastrarEmpresaELogar(app, overrides = {}) {
  const sufixo = Math.random().toString(36).slice(2, 8);
  const payload = {
    nome: "Assistência Técnica Teste",
    cnpjCpf: gerarCnpjValido(),
    telefone: "(64) 99999-0000",
    email: `admin-${sufixo}@teste.com`,
    loginAdministrador: `admin-${sufixo}`,
    senhaAdministrador: SENHA_PADRAO,
    ...overrides,
  };

  const respostaCadastro = await request(app).post("/empresas").send(payload).expect(201);

  const respostaLogin = await request(app)
    .post("/auth/login")
    .send({ login: payload.loginAdministrador, senha: payload.senhaAdministrador })
    .expect(200);

  return {
    token: respostaLogin.body.token,
    usuario: respostaLogin.body.usuario,
    empresa: respostaCadastro.body.empresa,
    payloadCadastro: payload,
  };
}

/**
 * Cria um usuário Técnico/Vendedor na mesma empresa do token de administrador
 * informado (RF05, exige administrador) e já faz login com ele — usado pelos
 * testes que precisam de um perfil sem privilégios administrativos.
 */
async function criarUsuarioNaoAdminELogar(app, tokenAdministrador, overrides = {}) {
  const sufixo = Math.random().toString(36).slice(2, 8);
  const payload = {
    nome: "Usuário Técnico",
    login: `tecnico-${sufixo}`,
    email: `tecnico-${sufixo}@teste.com`,
    senha: SENHA_PADRAO,
    perfil: "TECNICO",
    ...overrides,
  };

  await request(app)
    .post("/usuarios")
    .set("Authorization", `Bearer ${tokenAdministrador}`)
    .send(payload)
    .expect(201);

  const respostaLogin = await request(app)
    .post("/auth/login")
    .send({ login: payload.login, senha: payload.senha })
    .expect(200);

  return { token: respostaLogin.body.token, usuario: respostaLogin.body.usuario };
}

module.exports = { cadastrarEmpresaELogar, criarUsuarioNaoAdminELogar, SENHA_PADRAO };
