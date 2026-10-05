const request = require("supertest");
const { prepararApp } = require("./helpers/appDeTeste");
const { cadastrarEmpresaELogar, criarUsuarioNaoAdminELogar } = require("./helpers/cenarios");

let app;

beforeEach(() => {
  ({ app } = prepararApp());
});

describe("GET /log-auditoria — RF13, exclusivo de administrador (RNF06)", () => {
  test("exige token (401 sem Authorization)", async () => {
    const resposta = await request(app).get("/log-auditoria");
    expect(resposta.status).toBe(401);
  });

  test("perfil Técnico/Vendedor recebe 403 (exceção E2 do DERS)", async () => {
    const { token: tokenAdmin } = await cadastrarEmpresaELogar(app);
    const { token: tokenTecnico } = await criarUsuarioNaoAdminELogar(app, tokenAdmin);

    const resposta = await request(app).get("/log-auditoria").set("Authorization", `Bearer ${tokenTecnico}`);

    expect(resposta.status).toBe(403);
  });

  test("administrador consulta o log e enxerga entradas geradas por ações anteriores (ex.: CRIACAO_EMPRESA, LOGIN)", async () => {
    const { token } = await cadastrarEmpresaELogar(app);

    const resposta = await request(app).get("/log-auditoria").set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(Array.isArray(resposta.body.registros)).toBe(true);
    // O próprio cadastro (CRIACAO_EMPRESA) e o login feito em seguida (LOGIN) já
    // deveriam ter gerado pelo menos essas duas entradas antes desta consulta.
    const tiposRegistrados = resposta.body.registros.map((r) => r.tipoAcao);
    expect(tiposRegistrados).toEqual(expect.arrayContaining(["CRIACAO_EMPRESA", "LOGIN"]));
  });

  test("filtra por tipoAcao via query string", async () => {
    const { token } = await cadastrarEmpresaELogar(app);

    const resposta = await request(app)
      .get("/log-auditoria")
      .query({ tipoAcao: "LOGIN" })
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.registros.every((r) => r.tipoAcao === "LOGIN")).toBe(true);
  });

  test("RNF11: só retorna registros da própria empresa (log de outra empresa não vaza aqui)", async () => {
    const { token: tokenEmpresaA } = await cadastrarEmpresaELogar(app);
    const { token: tokenEmpresaB } = await cadastrarEmpresaELogar(app);

    const respostaA = await request(app).get("/log-auditoria").set("Authorization", `Bearer ${tokenEmpresaA}`);
    const respostaB = await request(app).get("/log-auditoria").set("Authorization", `Bearer ${tokenEmpresaB}`);

    const idsA = new Set(respostaA.body.registros.map((r) => r.id));
    const idsB = respostaB.body.registros.map((r) => r.id);
    expect(idsB.some((id) => idsA.has(id))).toBe(false);
  });
});
