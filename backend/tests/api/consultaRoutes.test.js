const request = require("supertest");
const { prepararApp } = require("./helpers/appDeTeste");
const { cadastrarEmpresaELogar } = require("./helpers/cenarios");

let app;
let factories;

beforeEach(() => {
  ({ app, factories } = prepararApp());
});

describe("GET /componentes — RF11", () => {
  test("exige token (401 sem Authorization)", async () => {
    const resposta = await request(app).get("/componentes").query({ termo: "ABC" });
    expect(resposta.status).toBe(401);
  });

  test("base sem nenhum registro validado retorna semRegistrosNaBase=true (E2)", async () => {
    const { token } = await cadastrarEmpresaELogar(app);

    const resposta = await request(app).get("/componentes").query({ termo: "ABC123" }).set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.semRegistrosNaBase).toBe(true);
    expect(resposta.body.resultados).toEqual([]);
  });

  test("busca exata e semântica rodam juntas, sem duplicar o mesmo componente no resultado combinado", async () => {
    const { token, empresa } = await cadastrarEmpresaELogar(app);
    factories.componenteRepository.seedComponente({
      empresaId: empresa.id,
      codigo: "ABC123",
      descricao: "Escova de carvão",
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      embedding: [6, 0, 0],
    });

    const resposta = await request(app).get("/componentes").query({ termo: "ABC123" }).set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.semRegistrosNaBase).toBe(false);
    expect(resposta.body.resultados).toHaveLength(1);
    expect(resposta.body.resultados[0].codigo).toBe("ABC123");
  });

  test("filtra por marca via query string", async () => {
    const { token, empresa } = await cadastrarEmpresaELogar(app);
    factories.componenteRepository.seedComponente({
      empresaId: empresa.id,
      codigo: "COD-BOSCH",
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      embedding: [9, 0, 0],
    });
    factories.componenteRepository.seedComponente({
      empresaId: empresa.id,
      codigo: "COD-MAKITA",
      marca: "Makita",
      modelo: "HR2470",
      tensao: "V127",
      embedding: [9, 0, 0],
    });

    const resposta = await request(app)
      .get("/componentes")
      .query({ termo: "COD", marca: "Bosch" })
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.resultados.every((item) => item.marca === "Bosch")).toBe(true);
  });

  test("sem o parâmetro 'termo' retorna 422", async () => {
    const { token } = await cadastrarEmpresaELogar(app);

    const resposta = await request(app).get("/componentes").set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(422);
  });
});

describe("POST /consulta-tecnica — RF12", () => {
  test("exige token (401 sem Authorization)", async () => {
    const resposta = await request(app).post("/consulta-tecnica").send({ pergunta: "Qual a tensão do modelo X?" });
    expect(resposta.status).toBe(401);
  });

  test("base sem registros validados retorna CONTEXTO_INSUFICIENTE (E1), sem chamar a IA de resposta", async () => {
    const { token } = await cadastrarEmpresaELogar(app);

    const resposta = await request(app)
      .post("/consulta-tecnica")
      .set("Authorization", `Bearer ${token}`)
      .send({ pergunta: "Qual a tensão do modelo X?" });

    expect(resposta.status).toBe(200);
    expect(resposta.body.situacao).toBe("CONTEXTO_INSUFICIENTE");
  });

  test("com base validada, retorna RESPONDIDO com a resposta do Agente de Consulta", async () => {
    const { token, empresa } = await cadastrarEmpresaELogar(app);
    factories.componenteRepository.seedComponente({
      empresaId: empresa.id,
      codigo: "ABC123",
      descricao: "Escova de carvão",
      marca: "Bosch",
      modelo: "GWS 9-125S",
      tensao: "V127",
      embedding: [10, 0, 0],
    });

    const resposta = await request(app)
      .post("/consulta-tecnica")
      .set("Authorization", `Bearer ${token}`)
      .send({ pergunta: "Qual o código da escova de carvão?" });

    expect(resposta.status).toBe(200);
    expect(resposta.body.situacao).toBe("RESPONDIDO");
    expect(typeof resposta.body.resposta).toBe("string");
  });

  test("pergunta vazia retorna 422", async () => {
    const { token } = await cadastrarEmpresaELogar(app);

    const resposta = await request(app)
      .post("/consulta-tecnica")
      .set("Authorization", `Bearer ${token}`)
      .send({ pergunta: "" });

    expect(resposta.status).toBe(422);
  });
});
