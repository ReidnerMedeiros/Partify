const {
  gerarConteudoComFallback,
  listarModelos,
  ehTransitorio,
} = require("../../../src/agentesIA/comum/gerarConteudoComFallback");

function erro(status, message = "falha") {
  const e = new Error(message);
  e.status = status;
  return e;
}

function clienteFake(comportamentos) {
  // comportamentos: { [modelo]: [resp1, resp2...] } — Error => lança, outro => retorna
  const chamadas = [];
  return {
    chamadas,
    models: {
      generateContent: jest.fn(async ({ model }) => {
        chamadas.push(model);
        const fila = comportamentos[model];
        const proximo = fila.length > 1 ? fila.shift() : fila[0];
        if (proximo instanceof Error) throw proximo;
        return proximo;
      }),
    },
  };
}

const rapido = { esperaBaseMs: 0 };

describe("listarModelos", () => {
  it("junta principal e fallbacks, ignorando vazios e duplicados", () => {
    expect(listarModelos("a", " b, ,a,c ")).toEqual(["a", "b", "c"]);
  });

  it("funciona sem fallbacks", () => {
    expect(listarModelos("a", undefined)).toEqual(["a"]);
  });
});

describe("ehTransitorio", () => {
  it.each([429, 500, 503, 504])("status %i é transitório", (s) => {
    expect(ehTransitorio(erro(s))).toBe(true);
  });

  it.each([400, 401, 403, 404])("status %i não é transitório", (s) => {
    expect(ehTransitorio(erro(s))).toBe(false);
  });

  it("reconhece 503 só pela mensagem", () => {
    expect(ehTransitorio(new Error('{"error":{"code":503,"status":"UNAVAILABLE"}}'))).toBe(true);
  });
});

describe("gerarConteudoComFallback", () => {
  it("retorna direto quando o modelo principal responde", async () => {
    const client = clienteFake({ principal: [{ text: "ok" }] });
    const r = await gerarConteudoComFallback({ client, modelos: ["principal"], requisicao: {}, ...rapido });
    expect(r.text).toBe("ok");
    expect(client.chamadas).toEqual(["principal"]);
  });

  it("tenta de novo no mesmo modelo antes de usar o fallback", async () => {
    const client = clienteFake({ principal: [erro(503), { text: "ok" }], reserva: [{ text: "reserva" }] });
    const r = await gerarConteudoComFallback({ client, modelos: ["principal", "reserva"], requisicao: {}, ...rapido });
    expect(r.text).toBe("ok");
    expect(client.chamadas).toEqual(["principal", "principal"]);
  });

  it("cai pro fallback quando o principal continua indisponível", async () => {
    const client = clienteFake({ principal: [erro(503)], reserva: [{ text: "reserva" }] });
    const r = await gerarConteudoComFallback({ client, modelos: ["principal", "reserva"], requisicao: {}, ...rapido });
    expect(r.text).toBe("reserva");
    expect(client.chamadas).toEqual(["principal", "principal", "reserva"]);
  });

  it("não tenta fallback em erro não transitório", async () => {
    const client = clienteFake({ principal: [erro(400)], reserva: [{ text: "reserva" }] });
    await expect(
      gerarConteudoComFallback({ client, modelos: ["principal", "reserva"], requisicao: {}, ...rapido })
    ).rejects.toMatchObject({ status: 400 });
    expect(client.chamadas).toEqual(["principal"]);
  });

  it("lança o último erro quando todos os modelos falham", async () => {
    const client = clienteFake({ principal: [erro(503)], reserva: [erro(429)] });
    await expect(
      gerarConteudoComFallback({ client, modelos: ["principal", "reserva"], requisicao: {}, ...rapido })
    ).rejects.toMatchObject({ status: 429 });
    expect(client.chamadas).toHaveLength(4);
  });
});
