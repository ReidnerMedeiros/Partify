const request = require("supertest");
const { prepararApp } = require("./helpers/appDeTeste");
const { cadastrarEmpresaELogar, criarUsuarioNaoAdminELogar } = require("./helpers/cenarios");

let app;

beforeEach(() => {
  ({ app } = prepararApp());
});

describe("Rotas de /usuarios — RF05, exclusivas de administrador (RNF06)", () => {
  test("POST /usuarios sem token retorna 401", async () => {
    const resposta = await request(app).post("/usuarios").send({});
    expect(resposta.status).toBe(401);
  });

  test("POST /usuarios com token de perfil Técnico/Vendedor retorna 403 — hoje isso só era testado na lógica do Use Case, nunca pela rota HTTP real", async () => {
    const { token: tokenAdmin } = await cadastrarEmpresaELogar(app);
    const { token: tokenTecnico } = await criarUsuarioNaoAdminELogar(app, tokenAdmin);

    const resposta = await request(app)
      .post("/usuarios")
      .set("Authorization", `Bearer ${tokenTecnico}`)
      .send({ nome: "Outro", login: "outro-login", email: "outro@teste.com", senha: "senha12345", perfil: "VENDEDOR" });

    expect(resposta.status).toBe(403);
  });

  test("GET /usuarios com token de perfil Técnico/Vendedor também retorna 403", async () => {
    const { token: tokenAdmin } = await cadastrarEmpresaELogar(app);
    const { token: tokenTecnico } = await criarUsuarioNaoAdminELogar(app, tokenAdmin);

    const resposta = await request(app).get("/usuarios").set("Authorization", `Bearer ${tokenTecnico}`);

    expect(resposta.status).toBe(403);
  });

  test("Administrador consegue criar, listar, desativar e reativar um usuário (fluxo completo via HTTP)", async () => {
    const { token: tokenAdmin } = await cadastrarEmpresaELogar(app);

    const criacao = await request(app)
      .post("/usuarios")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ nome: "Fulano", login: "fulano-login", email: "fulano@teste.com", senha: "senha12345", perfil: "TECNICO" });
    expect(criacao.status).toBe(201);
    const usuarioId = criacao.body.usuario.id;

    const listagem = await request(app).get("/usuarios").set("Authorization", `Bearer ${tokenAdmin}`);
    expect(listagem.status).toBe(200);
    expect(listagem.body.usuarios.some((u) => u.id === usuarioId)).toBe(true);

    const desativacao = await request(app)
      .patch(`/usuarios/${usuarioId}/desativar`)
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(desativacao.status).toBe(200);
    expect(desativacao.body.usuario.ativo).toBe(false);

    const loginComContaDesativada = await request(app)
      .post("/auth/login")
      .send({ login: "fulano-login", senha: "senha12345" });
    expect(loginComContaDesativada.status).toBe(401);

    const reativacao = await request(app)
      .patch(`/usuarios/${usuarioId}/reativar`)
      .set("Authorization", `Bearer ${tokenAdmin}`);
    expect(reativacao.status).toBe(200);
    expect(reativacao.body.usuario.ativo).toBe(true);

    const loginAposReativar = await request(app)
      .post("/auth/login")
      .send({ login: "fulano-login", senha: "senha12345" });
    expect(loginAposReativar.status).toBe(200);
  });
});
