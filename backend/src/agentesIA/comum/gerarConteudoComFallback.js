/**
 * Chama `client.models.generateContent` com tolerância a indisponibilidade
 * temporária da Gemini API (ex.: 503 "high demand", 429 cota, 500/504).
 *
 * Estratégia: pra cada modelo da lista (principal primeiro, depois os
 * fallbacks), tenta até `tentativasPorModelo` vezes com espera crescente. Só
 * passa pro próximo modelo se o erro for transitório; erros de requisição
 * (400, 401, 403, 404...) são relançados na hora, pois outro modelo não resolve.
 */

const STATUS_TRANSITORIOS = new Set([429, 500, 502, 503, 504]);

function extrairStatus(erro) {
  const status = erro?.status ?? erro?.code ?? erro?.error?.code;
  if (Number.isInteger(status)) return status;
  // O SDK às vezes só traz o código dentro da mensagem (JSON serializado).
  const m = /"code"\s*:\s*(\d{3})|\b(429|500|502|503|504)\b/.exec(String(erro?.message ?? ""));
  return m ? Number(m[1] ?? m[2]) : null;
}

function ehTransitorio(erro) {
  const status = extrairStatus(erro);
  if (status !== null) return STATUS_TRANSITORIOS.has(status);
  return /UNAVAILABLE|RESOURCE_EXHAUSTED|DEADLINE_EXCEEDED|overloaded|high demand|fetch failed|ECONNRESET|ETIMEDOUT/i.test(
    String(erro?.message ?? "")
  );
}

const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** "a, b ,c" -> ["a","b","c"] (ignora vazios e duplicados) */
function listarModelos(principal, fallbacks) {
  const lista = [principal, ...String(fallbacks ?? "").split(",")]
    .map((m) => (m ?? "").trim())
    .filter(Boolean);
  return [...new Set(lista)];
}

async function gerarConteudoComFallback({
  client,
  modelos,
  requisicao,
  tentativasPorModelo = 2,
  esperaBaseMs = 1500,
  rotulo = "Gemini",
}) {
  let ultimoErro;

  for (let i = 0; i < modelos.length; i++) {
    const modelo = modelos[i];

    for (let tentativa = 1; tentativa <= tentativasPorModelo; tentativa++) {
      try {
        const resposta = await client.models.generateContent({ ...requisicao, model: modelo });
        if (i > 0) {
          console.warn(`[${rotulo}] respondido pelo modelo de fallback "${modelo}"`); // eslint-disable-line no-console
        }
        return resposta;
      } catch (erro) {
        ultimoErro = erro;
        if (!ehTransitorio(erro)) throw erro;

        console.warn(
          `[${rotulo}] modelo "${modelo}" indisponível (tentativa ${tentativa}/${tentativasPorModelo}): ${String(erro?.message ?? erro).slice(0, 160)}`
        ); // eslint-disable-line no-console

        if (tentativa < tentativasPorModelo) await dormir(esperaBaseMs * tentativa);
      }
    }
  }

  throw ultimoErro;
}

module.exports = { gerarConteudoComFallback, listarModelos, ehTransitorio };
