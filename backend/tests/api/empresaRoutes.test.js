const request = require("supertest");
const { prepararApp } = require("./helpers/appDeTeste");
const { cadastrarEmpresaELogar } = require("./helpers/cenarios");

let app;

beforeEach(() => {
  ({ app } = prepararApp());
});

describe("POST /empresas — RF01, fluxo básico (público, sem token)", () => {
  test("cadastro válido funciona sem nenhum token e retorna 201", async () => {
    const resposta = await request(app).post("/empresas").send({
      nome: "Oficina do Zé",
      cnpjCpf: "12345678000195",
      telefone: "(64) 3333-4444",
      email: "ze@oficina.com",
      loginAdministrador: "ze-admin",
      senhaAdministrador: "senha12345",
    });

    expect(resposta.status).toBe(201);
    expect(resposta.body.empresa.nome).toBe("Oficina do Zé");
    expect(resposta.body.administrador.login).toBe("ze-admin");
    expect(resposta.body.administrador).not.toHaveProperty("senhaHash");
  });

  test("cadastro com dados incompletos retorna 422 com o formato de erro de validação (campos)", async () => {
    const resposta = await request(app).post("/empresas").send({ nome: "Só o nome" });

    expect(resposta.status).toBe(422);
    expect(resposta.body).toHaveProperty("erro");
    expect(resposta.body.campos).toEqual(
      expect.objectContaining({
        telefone: expect.any(String),
        loginAdministrador: expect.any(String),
        cnpjCpf: expect.any(String),
        email: expect.any(String),
        senhaAdministrador: expect.any(String),
      })
    );
  });

  test("CNPJ/CPF já cadastrado retorna 409 (conflito)", async () => {
    const payload = {
      nome: "Empresa Um",
      cnpjCpf: "12345678000195",
      telefone: "(64) 3333-4444",
      email: "um@teste.com",
      loginAdministrador: "admin-um",
      senhaAdministrador: "senha12345",
    };
    await request(app).post("/empresas").send(payload).expect(201);

    const resposta = await request(app)
      .post("/empresas")
      .send({ ...payload, email: "outro@teste.com", loginAdministrador: "admin-outro" });

    expect(resposta.status).toBe(409);
  });
});

describe("GET/PUT /empresas/me — RF01-A1 (autenticado)", () => {
  test("GET /empresas/me exige token (401 sem Authorization)", async () => {
    const resposta = await request(app).get("/empresas/me");
    expect(resposta.status).toBe(401);
  });

  test("GET /empresas/me com token válido retorna os dados da própria empresa", async () => {
    const { token, empresa } = await cadastrarEmpresaELogar(app);

    const resposta = await request(app).get("/empresas/me").set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.empresa.id).toBe(empresa.id);
  });

  test("PUT /empresas/me atualiza os dados da empresa autenticada", async () => {
    const { token } = await cadastrarEmpresaELogar(app);

    const resposta = await request(app)
      .put("/empresas/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ nome: "Nome Atualizado", telefone: "(64) 90000-0000", email: "novo@teste.com" });

    expect(resposta.status).toBe(200);
    expect(resposta.body.empresa.nome).toBe("Nome Atualizado");
  });
});

describe("PATCH /empresas/me/desativar — RF01-A2 (autenticado + administrador)", () => {
  test("desativa a empresa e o login de qualquer usuário dela para de funcionar depois", async () => {
    const { token, payloadCadastro } = await cadastrarEmpresaELogar(app);

    const resposta = await request(app).patch("/empresas/me/desativar").set("Authorization", `Bearer ${token}`);
    expect(resposta.status).toBe(200);

    const tentativaLogin = await request(app)
      .post("/auth/login")
      .send({ login: payloadCadastro.loginAdministrador, senha: payloadCadastro.senhaAdministrador });
    expect(tentativaLogin.status).toBe(401);
  });
});
