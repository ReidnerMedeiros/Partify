const request = require("supertest");
const { prepararApp } = require("./helpers/appDeTeste");
const { cadastrarEmpresaELogar, SENHA_PADRAO } = require("./helpers/cenarios");

let app;
let factories;

beforeEach(() => {
  ({ app, factories } = prepararApp());
});

describe("POST /auth/login — RF02", () => {
  test("credenciais corretas retornam 200 com token JWT válido e dados do usuário", async () => {
    const { payloadCadastro } = await cadastrarEmpresaELogar(app);

    const resposta = await request(app)
      .post("/auth/login")
      .send({ login: payloadCadastro.loginAdministrador, senha: payloadCadastro.senhaAdministrador });

    expect(resposta.status).toBe(200);
    expect(typeof resposta.body.token).toBe("string");
    // Um JWT de verdade tem 3 segmentos separados por ponto (header.payload.assinatura) —
    // confirma que quem gerou o token foi o JwtTokenService real, não um stub.
    expect(resposta.body.token.split(".")).toHaveLength(3);
    expect(resposta.body.usuario.login).toBe(payloadCadastro.loginAdministrador);
    expect(resposta.body.usuario).not.toHaveProperty("senhaHash");
  });

  test("credenciais erradas retornam 401 com mensagem genérica", async () => {
    await cadastrarEmpresaELogar(app);

    const resposta = await request(app).post("/auth/login").send({ login: "usuario-inexistente", senha: "errada123" });

    expect(resposta.status).toBe(401);
    expect(resposta.body.erro).toMatch(/login ou senha inválidos/i);
  });

  test("senha errada para um login existente também retorna 401 (mesma mensagem genérica — RNF05)", async () => {
    const { payloadCadastro } = await cadastrarEmpresaELogar(app);

    const resposta = await request(app)
      .post("/auth/login")
      .send({ login: payloadCadastro.loginAdministrador, senha: "senha-errada" });

    expect(resposta.status).toBe(401);
    expect(resposta.body.erro).toMatch(/login ou senha inválidos/i);
  });
});

describe("POST /auth/logout — RF02-A1", () => {
  test("exige token (401 sem Authorization)", async () => {
    const resposta = await request(app).post("/auth/logout");
    expect(resposta.status).toBe(401);
  });

  test("encerra a sessão e o MESMO token não funciona mais numa rota protegida depois", async () => {
    const { token } = await cadastrarEmpresaELogar(app);

    const logout = await request(app).post("/auth/logout").set("Authorization", `Bearer ${token}`);
    expect(logout.status).toBe(200);

    const tentativaSeguinte = await request(app).get("/empresas/me").set("Authorization", `Bearer ${token}`);
    expect(tentativaSeguinte.status).toBe(401);
  });
});

describe("POST /auth/recuperar-senha — RF03", () => {
  test("sempre responde 200 com mensagem genérica, exista ou não a conta informada (RNF05)", async () => {
    await cadastrarEmpresaELogar(app);

    const comContaInexistente = await request(app)
      .post("/auth/recuperar-senha")
      .send({ login: "nao-existe", email: "ninguem@teste.com" });

    expect(comContaInexistente.status).toBe(200);
    expect(comContaInexistente.body.mensagem).toMatch(/se os dados informados estiverem corretos/i);
  });

  test("dados corretos enviam o e-mail de redefinição (via FakeEmailService) com um link contendo o token", async () => {
    const { payloadCadastro } = await cadastrarEmpresaELogar(app);

    const resposta = await request(app)
      .post("/auth/recuperar-senha")
      .send({ login: payloadCadastro.loginAdministrador, email: payloadCadastro.email });

    expect(resposta.status).toBe(200);
    expect(factories.emailService.enviados).toHaveLength(1);
    expect(factories.emailService.enviados[0].destinatario).toBe(payloadCadastro.email);
    expect(factories.emailService.enviados[0].link).toContain("/redefinir-senha?token=");
  });
});

describe("POST /auth/redefinir-senha — RF04-A1", () => {
  test("com o token do e-mail, redefine a senha e o login antigo para de funcionar", async () => {
    const { payloadCadastro } = await cadastrarEmpresaELogar(app);

    await request(app)
      .post("/auth/recuperar-senha")
      .send({ login: payloadCadastro.loginAdministrador, email: payloadCadastro.email });

    const link = factories.emailService.enviados[0].link;
    const token = new URL(link).searchParams.get("token");

    const novaSenha = "nova-senha-123";
    const redefinicao = await request(app)
      .post("/auth/redefinir-senha")
      .send({ token, novaSenha, confirmarNovaSenha: novaSenha });
    expect(redefinicao.status).toBe(200);

    const loginComSenhaAntiga = await request(app)
      .post("/auth/login")
      .send({ login: payloadCadastro.loginAdministrador, senha: payloadCadastro.senhaAdministrador });
    expect(loginComSenhaAntiga.status).toBe(401);

    const loginComSenhaNova = await request(app)
      .post("/auth/login")
      .send({ login: payloadCadastro.loginAdministrador, senha: novaSenha });
    expect(loginComSenhaNova.status).toBe(200);
  });
});

describe("POST /auth/alterar-senha — RF04, fluxo básico (autenticado)", () => {
  test("exige token (401 sem Authorization)", async () => {
    const resposta = await request(app)
      .post("/auth/alterar-senha")
      .send({ senhaAtual: SENHA_PADRAO, novaSenha: "outra-senha-123", confirmarNovaSenha: "outra-senha-123" });

    expect(resposta.status).toBe(401);
  });

  test("informando a senha atual errada, NÃO altera nada e o login com a senha original continua funcionando", async () => {
    const { token, payloadCadastro } = await cadastrarEmpresaELogar(app);

    const tentativa = await request(app)
      .post("/auth/alterar-senha")
      .set("Authorization", `Bearer ${token}`)
      .send({ senhaAtual: "senha-atual-errada", novaSenha: "outra-senha-123", confirmarNovaSenha: "outra-senha-123" });

    expect(tentativa.status).toBeGreaterThanOrEqual(400);

    const loginOriginal = await request(app)
      .post("/auth/login")
      .send({ login: payloadCadastro.loginAdministrador, senha: payloadCadastro.senhaAdministrador });
    expect(loginOriginal.status).toBe(200);
  });
});
