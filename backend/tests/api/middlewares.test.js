const request = require("supertest");
const { prepararApp } = require("./helpers/appDeTeste");
const { cadastrarEmpresaELogar } = require("./helpers/cenarios");

let app;

beforeEach(() => {
  ({ app } = prepararApp());
});

describe("Middlewares — CORS, errorHandler, 404, autenticação/autorização", () => {
  test("CORS: aceita a origem configurada em FRONTEND_URL", async () => {
    const resposta = await request(app).post("/auth/login").set("Origin", "http://localhost:5173").send({});

    expect(resposta.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  test("CORS: o header Access-Control-Allow-Origin é sempre a URL fixa de FRONTEND_URL, nunca reflete a origem da requisição", async () => {
    // O middleware `cors` deste projeto é configurado com uma string fixa (não uma
    // função de validação) — por isso o header devolvido é sempre o mesmo valor
    // configurado, mesmo quando a requisição chega de uma origem diferente. É essa
    // fixidez que faz o navegador de um site não autorizado bloquear a resposta do
    // lado do cliente (o valor do header não bate com a origem real da página).
    const resposta = await request(app).post("/auth/login").set("Origin", "http://site-nao-autorizado.com").send({});

    expect(resposta.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(resposta.headers["access-control-allow-origin"]).not.toBe("http://site-nao-autorizado.com");
  });

  test("rota inexistente retorna 404", async () => {
    const resposta = await request(app).get("/rota-que-nao-existe");

    expect(resposta.status).toBe(404);
  });

  test("errorHandler formata um DomainError comum (ex.: 401 de credenciais inválidas) no mesmo formato JSON", async () => {
    const resposta = await request(app).post("/auth/login").send({ login: "inexistente", senha: "qualquer" });

    expect(resposta.status).toBe(401);
    expect(resposta.body).toHaveProperty("erro");
    expect(typeof resposta.body.erro).toBe("string");
    // Formato de ValidationError (com "campos") não deve aparecer aqui — é um DomainError simples.
    expect(resposta.body.campos).toBeUndefined();
  });

  test("errorHandler formata um ValidationError com o campo 'campos' (fieldErrors) — ex.: cadastro de empresa incompleto", async () => {
    const resposta = await request(app).post("/empresas").send({});

    expect(resposta.status).toBe(422);
    expect(resposta.body).toHaveProperty("erro");
    expect(resposta.body).toHaveProperty("campos");
    expect(resposta.body.campos).toHaveProperty("nome");
  });

  test("authMiddleware: bloqueia rota protegida sem cabeçalho Authorization (401)", async () => {
    const resposta = await request(app).get("/empresas/me");

    expect(resposta.status).toBe(401);
  });

  test("authMiddleware: bloqueia token malformado/inválido (401)", async () => {
    const resposta = await request(app).get("/empresas/me").set("Authorization", "Bearer token-invalido");

    expect(resposta.status).toBe(401);
  });

  test("authMiddleware: token válido libera acesso à rota protegida", async () => {
    const { token } = await cadastrarEmpresaELogar(app);

    const resposta = await request(app).get("/empresas/me").set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
  });

  test("exigirAdministrador: bloqueia perfil sem permissão (403) — ex.: Técnico tentando acessar rota exclusiva de administrador", async () => {
    const { token: tokenAdmin } = await cadastrarEmpresaELogar(app);
    const { criarUsuarioNaoAdminELogar } = require("./helpers/cenarios");
    const { token: tokenTecnico } = await criarUsuarioNaoAdminELogar(app, tokenAdmin);

    const resposta = await request(app)
      .patch("/empresas/me/desativar")
      .set("Authorization", `Bearer ${tokenTecnico}`);

    expect(resposta.status).toBe(403);
  });
});
