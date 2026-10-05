const request = require("supertest");
const { prepararApp } = require("./helpers/appDeTeste");
const { cadastrarEmpresaELogar } = require("./helpers/cenarios");

let app;
let factories;

beforeEach(() => {
  ({ app, factories } = prepararApp());
});

function respostaCompletaDaExtracao(overrides = {}) {
  return {
    compreendido: true,
    dominioReconhecido: true,
    marca: "Bosch",
    modelo: "GWS 9-125S",
    tensao: "V127",
    pecas: [{ codigo: "1600A004GD", descricao: "Induzido 127V", posicaoVisual: "12", confianca: 95 }],
    confiancaCampos: { marca: 95, modelo: 70, tensao: 98 },
    confiancaGeral: 82,
    ...overrides,
  };
}

describe("POST /catalogos — RF06 + RF07 encadeados (upload multipart)", () => {
  test("exige token (401 sem Authorization)", async () => {
    const resposta = await request(app).post("/catalogos").attach("arquivo", Buffer.from("%PDF-1.4 fake"), {
      filename: "catalogo.pdf",
      contentType: "application/pdf",
    });
    expect(resposta.status).toBe(401);
  });

  test("upload de um PDF de verdade (multipart) é aceito, extrai os dados e retorna 201", async () => {
    const { token } = await cadastrarEmpresaELogar(app);
    factories.extractionService.proximaResposta = respostaCompletaDaExtracao();

    const resposta = await request(app)
      .post("/catalogos")
      .set("Authorization", `Bearer ${token}`)
      .attach("arquivo", Buffer.from("%PDF-1.4 conteúdo fictício de teste"), {
        filename: "catalogo.pdf",
        contentType: "application/pdf",
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body.catalogo.status).toBe("PENDENTE_VALIDACAO");
    expect(resposta.body.catalogo.marca).toBe("Bosch");
    expect(resposta.body.catalogo.pecas).toHaveLength(1);
  });

  test("upload de um arquivo que NÃO é PDF é rejeitado com 422 (RF06/E1, formato inválido)", async () => {
    const { token } = await cadastrarEmpresaELogar(app);

    const resposta = await request(app)
      .post("/catalogos")
      .set("Authorization", `Bearer ${token}`)
      .attach("arquivo", Buffer.from("não é um pdf"), { filename: "catalogo.txt", contentType: "text/plain" });

    expect(resposta.status).toBe(422);
    expect(resposta.body.campos).toHaveProperty("arquivo");
  });

  test("requisição sem nenhum arquivo anexado é rejeitada com 422", async () => {
    const { token } = await cadastrarEmpresaELogar(app);

    const resposta = await request(app).post("/catalogos").set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(422);
    expect(resposta.body.campos).toHaveProperty("arquivo");
  });
});

describe("Ordem das rotas /catalogos/pendentes vs /catalogos/:id — RF09/RF10", () => {
  test("GET /catalogos/pendentes NÃO é capturada pela rota dinâmica /catalogos/:id (retorna a lista, não um erro de id inválido)", async () => {
    const { token } = await cadastrarEmpresaELogar(app);

    const resposta = await request(app).get("/catalogos/pendentes").set("Authorization", `Bearer ${token}`);

    // Se a ordem das rotas estivesse errada, isso cairia em GET /catalogos/:id
    // com id="pendentes" e provavelmente devolveria 404 (catálogo "pendentes" não existe),
    // em vez do corpo esperado desta rota (a lista de documentos pendentes).
    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveProperty("documentos");
    expect(Array.isArray(resposta.body.documentos)).toBe(true);
  });

  test("GET /catalogos/:id com um id de verdade continua funcionando normalmente (catálogo já VALIDADO, RF09)", async () => {
    const { token } = await cadastrarEmpresaELogar(app);
    factories.extractionService.proximaResposta = respostaCompletaDaExtracao();

    const upload = await request(app)
      .post("/catalogos")
      .set("Authorization", `Bearer ${token}`)
      .attach("arquivo", Buffer.from("%PDF-1.4 fake"), { filename: "catalogo.pdf", contentType: "application/pdf" });

    // GET /catalogos/:id (RF09) só enxerga catálogos já VALIDADOS — precisa
    // passar pela validação (RF08) antes, senão o próprio catálogo da mesma
    // empresa também retornaria 404 (ver BuscarCatalogoParaEdicaoUseCase).
    await request(app)
      .put(`/catalogos/${upload.body.catalogo.id}/validar`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        marca: "Bosch",
        modelo: "GWS 9-125S",
        tensao: "V127",
        pecas: [{ codigo: "1600A004GD", descricao: "Induzido 127V", posicaoVisual: "12" }],
      });

    const resposta = await request(app)
      .get(`/catalogos/${upload.body.catalogo.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.catalogo.id).toBe(upload.body.catalogo.id);
  });
});

describe("PUT /catalogos/:id/validar — RF08 (HITL)", () => {
  test("valida e salva com sucesso, marcando o catálogo como VALIDADO", async () => {
    const { token } = await cadastrarEmpresaELogar(app);
    factories.extractionService.proximaResposta = respostaCompletaDaExtracao();

    const upload = await request(app)
      .post("/catalogos")
      .set("Authorization", `Bearer ${token}`)
      .attach("arquivo", Buffer.from("%PDF-1.4 fake"), { filename: "catalogo.pdf", contentType: "application/pdf" });

    const resposta = await request(app)
      .put(`/catalogos/${upload.body.catalogo.id}/validar`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        marca: "Bosch",
        modelo: "GWS 9-125S",
        tensao: "V127",
        pecas: [{ codigo: "1600A004GD", descricao: "Induzido 127V", posicaoVisual: "12" }],
      });

    expect(resposta.status).toBe(200);
    expect(resposta.body.catalogo.status).toBe("VALIDADO");
  });
});

describe("RNF11 — isolamento multi-tenant também pela rota HTTP", () => {
  test("catálogo de uma empresa não é acessível com o token de outra (404, como se não existisse)", async () => {
    const { token: tokenEmpresaA } = await cadastrarEmpresaELogar(app);
    const { token: tokenEmpresaB } = await cadastrarEmpresaELogar(app);
    factories.extractionService.proximaResposta = respostaCompletaDaExtracao();

    const upload = await request(app)
      .post("/catalogos")
      .set("Authorization", `Bearer ${tokenEmpresaA}`)
      .attach("arquivo", Buffer.from("%PDF-1.4 fake"), { filename: "catalogo.pdf", contentType: "application/pdf" });

    await request(app)
      .put(`/catalogos/${upload.body.catalogo.id}/validar`)
      .set("Authorization", `Bearer ${tokenEmpresaA}`)
      .send({
        marca: "Bosch",
        modelo: "GWS 9-125S",
        tensao: "V127",
        pecas: [{ codigo: "1600A004GD", descricao: "Induzido 127V", posicaoVisual: "12" }],
      });

    const resposta = await request(app)
      .get(`/catalogos/${upload.body.catalogo.id}`)
      .set("Authorization", `Bearer ${tokenEmpresaB}`);

    expect(resposta.status).toBe(404);
  });
});
