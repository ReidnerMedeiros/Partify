/**
 * Teste de acurácia da IA (RNF10 — meta mínima de 75%).
 *
 * Roda a extração REAL (Gemini API, com a GEMINI_API_KEY de backend/.env) contra
 * um conjunto de PDFs reais de catálogos, comparando o resultado com um gabarito
 * (ground truth) anotado manualmente, e calcula a taxa de acerto.
 *
 * Uso (a partir da pasta backend/):
 *   node scripts/testeAcuraciaIA.js
 *
 * Pré-requisitos:
 *   - backend/.env com GEMINI_API_KEY e GEMINI_MODEL configurados.
 *   - Os PDFs reais colocados em backend/tests/acuracia-ia/pdfs/, com o mesmo
 *     nome de arquivo referenciado em cada gabarito (campo "arquivo").
 *
 * Este script NÃO faz parte da suíte automatizada (Jest/CI) — chama a Gemini API
 * de verdade, tem custo (pequeno) e não é determinístico, então é rodado sob
 * demanda, manualmente, não a cada commit.
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { GeminiExtractionService } = require("../src/agentesIA/AgenteExtrator/GeminiExtractionService");

const PASTA_GABARITOS = path.join(__dirname, "..", "tests", "acuracia-ia", "gabaritos");
const PASTA_PDFS = path.join(__dirname, "..", "tests", "acuracia-ia", "pdfs");

function normalizarCodigo(codigo) {
  return String(codigo ?? "")
    .replace(/\s+/g, "")
    .replace(/\.+$/g, "")
    .toUpperCase();
}

function normalizarTexto(texto) {
  return String(texto ?? "").trim().toLowerCase();
}

function normalizarPosicao(posicao) {
  return String(posicao ?? "").trim();
}

/**
 * Compara a extração real com o gabarito de um catálogo, peça por peça.
 * Algoritmo guloso: cada peça do gabarito tenta achar uma peça ainda não usada
 * na extração com o mesmo código (e, de preferência, a mesma posição visual).
 */
function compararPecas(gabaritoPecas, extraidasPecas) {
  const extraidas = extraidasPecas.map((p) => ({
    codigo: normalizarCodigo(p.codigo),
    posicaoVisual: normalizarPosicao(p.posicaoVisual),
    usada: false,
    raw: p,
  }));

  const resultados = [];

  for (const g of gabaritoPecas) {
    const codigoG = normalizarCodigo(g.codigo);
    const posicaoG = normalizarPosicao(g.posicaoVisual);

    let match = extraidas.find((e) => !e.usada && e.codigo === codigoG && e.posicaoVisual === posicaoG);
    if (match) {
      match.usada = true;
      resultados.push({ gabarito: g, status: "correta" });
      continue;
    }

    match = extraidas.find((e) => !e.usada && e.codigo === codigoG);
    if (match) {
      match.usada = true;
      resultados.push({ gabarito: g, status: "codigo_certo_posicao_errada", extraido: match.raw });
      continue;
    }

    resultados.push({ gabarito: g, status: "nao_encontrada" });
  }

  const alucinacoes = extraidas.filter((e) => !e.usada).map((e) => e.raw);

  return { resultados, alucinacoes };
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A Gemini API às vezes retorna 503 "UNAVAILABLE" (alta demanda), um erro
 * transitório do lado do Google — não indica problema no nosso código.
 * Tenta de novo com espera crescente antes de desistir.
 */
async function extrairComRetry(extractionService, args, tentativas = 6) {
  for (let tentativa = 1; tentativa <= tentativas; tentativa += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await extractionService.extrairDados(args);
    } catch (erro) {
      const status = erro?.status ?? erro?.error?.code;
      const ehTransitorio = status === 503 || status === 429;
      if (!ehTransitorio || tentativa === tentativas) {
        throw erro;
      }
      const esperaMs = tentativa * 15000;
      console.log(`  (Gemini API indisponível/sobrecarregada — tentativa ${tentativa}/${tentativas}, tentando de novo em ${esperaMs / 1000}s...)`); // eslint-disable-line no-console
      // eslint-disable-next-line no-await-in-loop
      await esperar(esperaMs);
    }
  }
  return undefined;
}

async function processarCatalogo(extractionService, nomeGabarito) {
  const gabarito = JSON.parse(fs.readFileSync(path.join(PASTA_GABARITOS, nomeGabarito), "utf-8"));
  const caminhoPdf = path.join(PASTA_PDFS, gabarito.arquivo);

  if (!fs.existsSync(caminhoPdf)) {
    return { gabarito, erro: `PDF não encontrado em ${caminhoPdf} — pulei este catálogo.` };
  }

  const arquivoBuffer = fs.readFileSync(caminhoPdf);

  let extraido;
  try {
    extraido = await extrairComRetry(extractionService, { arquivoBuffer, nomeArquivo: gabarito.arquivo });
  } catch (erro) {
    return { gabarito, erro: `Falha ao chamar a Gemini API: ${erro.message ?? erro}` };
  }

  const camposGerais = [
    { campo: "marca", correto: normalizarTexto(extraido.marca) === normalizarTexto(gabarito.marca) },
    { campo: "modelo", correto: normalizarTexto(extraido.modelo) === normalizarTexto(gabarito.modelo) },
    { campo: "tensao", correto: normalizarTexto(extraido.tensao) === normalizarTexto(gabarito.tensao) },
  ];

  const { resultados, alucinacoes } = compararPecas(gabarito.pecas, extraido.pecas ?? []);

  return { gabarito, extraido, camposGerais, resultados, alucinacoes };
}

function imprimirRelatorio(processados) {
  let totalPecasGabarito = 0;
  let totalCorretas = 0;
  let totalPosicaoErrada = 0;
  let totalNaoEncontradas = 0;
  let totalAlucinacoes = 0;
  let totalCamposCertos = 0;
  let totalCampos = 0;

  console.log("\n=== Teste de Acurácia da IA — RF07 (meta RNF10: >= 75%) ==="); // eslint-disable-line no-console
  console.log(`Modelo avaliado: ${process.env.GEMINI_MODEL}\n`); // eslint-disable-line no-console

  for (const item of processados) {
    if (item.erro) {
      console.log(`\n[${item.gabarito.arquivo}] ERRO: ${item.erro}`); // eslint-disable-line no-console
      continue;
    }

    const { gabarito, extraido, camposGerais, resultados, alucinacoes } = item;
    const corretas = resultados.filter((r) => r.status === "correta").length;
    const posicaoErrada = resultados.filter((r) => r.status === "codigo_certo_posicao_errada").length;
    const naoEncontradas = resultados.filter((r) => r.status === "nao_encontrada").length;
    const camposCertos = camposGerais.filter((c) => c.correto).length;

    totalPecasGabarito += resultados.length;
    totalCorretas += corretas;
    totalPosicaoErrada += posicaoErrada;
    totalNaoEncontradas += naoEncontradas;
    totalAlucinacoes += alucinacoes.length;
    totalCamposCertos += camposCertos;
    totalCampos += camposGerais.length;

    console.log(`\n--- ${gabarito.marca} ${gabarito.modelo} (${gabarito.arquivo}) ---`); // eslint-disable-line no-console
    console.log(`Campos gerais: ${camposCertos}/${camposGerais.length} corretos`); // eslint-disable-line no-console
    camposGerais.forEach((c) => {
      if (!c.correto) {
        console.log(`  - ${c.campo}: gabarito="${gabarito[c.campo]}" | extraído="${extraido[c.campo]}"`); // eslint-disable-line no-console
      }
    });
    console.log(`Peças: ${resultados.length} no gabarito | ${corretas} corretas | ${posicaoErrada} com posição errada | ${naoEncontradas} não encontradas | ${alucinacoes.length} alucinadas`); // eslint-disable-line no-console

    resultados
      .filter((r) => r.status !== "correta")
      .forEach((r) => {
        if (r.status === "nao_encontrada") {
          console.log(`  - NÃO ENCONTRADA: código ${r.gabarito.codigo} (posição ${r.gabarito.posicaoVisual})`); // eslint-disable-line no-console
        } else {
          console.log(`  - POSIÇÃO ERRADA: código ${r.gabarito.codigo} — gabarito diz posição ${r.gabarito.posicaoVisual}, IA disse ${r.extraido.posicaoVisual}`); // eslint-disable-line no-console
        }
      });
    alucinacoes.forEach((a) => {
      console.log(`  - ALUCINAÇÃO: a IA extraiu o código ${a.codigo} (posição ${a.posicaoVisual}), que não existe no gabarito`); // eslint-disable-line no-console
    });
  }

  const acuraciaPecas = totalPecasGabarito > 0 ? ((totalCorretas / totalPecasGabarito) * 100).toFixed(1) : "0.0";
  const acuraciaCampos = totalCampos > 0 ? ((totalCamposCertos / totalCampos) * 100).toFixed(1) : "0.0";

  console.log("\n=== Resumo agregado ==="); // eslint-disable-line no-console
  console.log(`Campos gerais (marca/modelo/tensão): ${totalCamposCertos}/${totalCampos} corretos (${acuraciaCampos}%)`); // eslint-disable-line no-console
  console.log(`Peças: ${totalCorretas}/${totalPecasGabarito} corretas (${acuraciaPecas}%)`); // eslint-disable-line no-console
  console.log(`  - Código certo, posição errada: ${totalPosicaoErrada}`); // eslint-disable-line no-console
  console.log(`  - Não encontradas (falso negativo): ${totalNaoEncontradas}`); // eslint-disable-line no-console
  console.log(`  - Alucinadas (falso positivo): ${totalAlucinacoes}`); // eslint-disable-line no-console
  console.log(`\nMeta do RNF10: >= 75% de acurácia de peças. Resultado: ${acuraciaPecas}% — ${Number(acuraciaPecas) >= 75 ? "ATINGIDA ✅" : "NÃO ATINGIDA ❌"}`); // eslint-disable-line no-console
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY não configurada em backend/.env — não dá pra rodar este teste."); // eslint-disable-line no-console
    process.exit(1);
  }

  const extractionService = new GeminiExtractionService({
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL,
    fallbackModels: process.env.GEMINI_FALLBACK_MODELS,
  });

  const arquivosGabarito = fs.readdirSync(PASTA_GABARITOS).filter((f) => f.endsWith(".json"));
  const processados = [];

  for (const nomeGabarito of arquivosGabarito) {
    console.log(`Processando ${nomeGabarito}...`); // eslint-disable-line no-console
    // eslint-disable-next-line no-await-in-loop
    const resultado = await processarCatalogo(extractionService, nomeGabarito);
    processados.push(resultado);
  }

  imprimirRelatorio(processados);
}

main().catch((erro) => {
  console.error("Erro ao rodar o teste de acurácia:", erro); // eslint-disable-line no-console
  process.exitCode = 1;
});
