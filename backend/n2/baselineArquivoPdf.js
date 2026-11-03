/**
 * Projeto N2 (ESW441) — baseline ("antes") da leitura do PDF do catálogo.
 *
 * ATIVIDADE DA DISCIPLINA, NÃO FAZ PARTE DO PARTIFY: a pasta backend/n2/ inteira
 * existe só para o Projeto N2 e deve ser apagada depois.
 *
 * Ponto de dor medido: toda vez que alguém clica em "Ver Vista Explodida" (ou abre
 * o documento na validação/edição), o BaixarArquivoCatalogoUseCase chama
 * `fileStorageService.obterBuffer(caminhoArquivo)`, que em produção baixa o PDF
 * inteiro do Supabase Storage pela internet. Este script roda exatamente essa
 * operação N vezes em um laço, uma depois da outra, e mede o tempo.
 *
 * Só LÊ (não grava nem apaga nada), então é seguro rodar contra o storage real.
 *
 * CUIDADO COM O TRÁFEGO: cada medida baixa o PDF inteiro. N = 1000 com um PDF de
 * 2 MB são ~2 GB de saída do Supabase, e o plano gratuito tem limite mensal. O
 * script mostra a estimativa antes de começar e se recusa a rodar acima de
 * 1 GB, a menos que você passe --permitir-trafego-alto.
 *
 * Uso (dentro de backend/):
 *   node n2/baselineArquivoPdf.js                       # N = 1000 (recusa se passar de 1 GB)
 *   node n2/baselineArquivoPdf.js --n=200               # N = 200
 *   node n2/baselineArquivoPdf.js --n=200 --aquecimento=3
 *   node n2/baselineArquivoPdf.js --catalogo=<id>       # escolhe o catálogo (senão pega o 1º validado)
 *   node n2/baselineArquivoPdf.js --permitir-trafego-alto
 *
 * Rode na máquina onde a aplicação roda (VPS) para o número refletir a latência
 * real até o Supabase Storage. Repita 3 vezes e guarde os resultados: cada
 * execução salva um JSON em backend/n2/resultados/.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const fs = require("fs");
const os = require("os");
const { performance } = require("perf_hooks");
const { prisma } = require("../src/infra/database/prismaClient");
const { SupabaseStorageService } = require("../src/infra/storage/SupabaseStorageService");
const { LocalFileStorageService } = require("../src/infra/storage/LocalFileStorageService");

const LIMITE_TRAFEGO_BYTES = 1024 ** 3; // 1 GB

function lerArgumentos() {
  const argumentos = { n: 1000, aquecimento: 3, catalogo: null, permitirTrafegoAlto: false };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--n=")) argumentos.n = Number(arg.slice(4));
    else if (arg.startsWith("--aquecimento=")) argumentos.aquecimento = Number(arg.slice(14));
    else if (arg.startsWith("--catalogo=")) argumentos.catalogo = arg.slice(11);
    else if (arg === "--permitir-trafego-alto") argumentos.permitirTrafegoAlto = true;
  }
  if (!Number.isInteger(argumentos.n) || argumentos.n < 1) throw new Error("--n deve ser um inteiro maior que zero.");
  return argumentos;
}

// Mesma escolha do composition root (main/factories/index.js).
function criarStorage() {
  if (process.env.SUPABASE_URL) {
    return {
      nome: "Supabase Storage (remoto)",
      servico: new SupabaseStorageService({
        url: process.env.SUPABASE_URL,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        bucket: process.env.SUPABASE_STORAGE_BUCKET,
      }),
    };
  }
  return { nome: "Disco local (LocalFileStorageService)", servico: new LocalFileStorageService() };
}

function percentil(ordenado, p) {
  const indice = Math.min(ordenado.length - 1, Math.ceil((p / 100) * ordenado.length) - 1);
  return ordenado[indice];
}

async function main() {
  const { n, aquecimento, catalogo: catalogoId, permitirTrafegoAlto } = lerArgumentos();
  const storage = criarStorage();

  const catalogo = await prisma.catalogo.findFirst({
    where: catalogoId ? { id: catalogoId } : { status: "VALIDADO" },
    orderBy: { criadoEm: "asc" },
    select: { id: true, nomeArquivo: true, caminhoArquivo: true },
  });
  if (!catalogo?.caminhoArquivo) {
    throw new Error("Nenhum catálogo com arquivo encontrado. Importe e valide um catálogo, ou use --catalogo=<id>.");
  }

  // Primeira leitura: confere que o arquivo existe e descobre o tamanho dos dados.
  const amostra = await storage.servico.obterBuffer(catalogo.caminhoArquivo);
  const tamanhoBytes = amostra.length;
  const trafegoEstimado = tamanhoBytes * (n + aquecimento);

  console.log(`Storage: ${storage.nome}`);
  console.log(`Catálogo: ${catalogo.nomeArquivo} (${catalogo.id})`);
  console.log(`Tamanho do PDF: ${(tamanhoBytes / 1024).toFixed(1)} KB`);
  console.log(`Tráfego estimado: ${(trafegoEstimado / 1024 ** 2).toFixed(1)} MB (${n} medidas + ${aquecimento} de aquecimento)`);

  if (trafegoEstimado > LIMITE_TRAFEGO_BYTES && !permitirTrafegoAlto) {
    throw new Error(
      "Tráfego estimado acima de 1 GB. Reduza com --n=<menor>, use um PDF menor (--catalogo=<id>), " +
        "ou confirme com --permitir-trafego-alto depois de conferir seu limite no painel do Supabase."
    );
  }

  console.log(`\nAquecendo (${aquecimento} leituras descartadas) e medindo, aguarde...`);
  for (let i = 0; i < aquecimento; i += 1) {
    await storage.servico.obterBuffer(catalogo.caminhoArquivo);
  }

  // Tempo total do laço / N = tempo médio (como pede o enunciado); o tempo de cada
  // chamada também é guardado para a mediana e o p95.
  const duracoes = new Array(n);
  const inicio = performance.now();
  for (let i = 0; i < n; i += 1) {
    const t0 = performance.now();
    await storage.servico.obterBuffer(catalogo.caminhoArquivo);
    duracoes[i] = performance.now() - t0;
    if ((i + 1) % 25 === 0 || i + 1 === n) {
      console.log(`  ${i + 1}/${n} leituras (última: ${duracoes[i].toFixed(0)} ms)`);
    }
  }
  const totalMs = performance.now() - inicio;

  const ordenado = [...duracoes].sort((a, b) => a - b);
  const mediaMs = totalMs / n;
  const cpus = os.cpus();

  const relatorio = {
    data: new Date().toISOString(),
    operacao: "FileStorageService.obterBuffer(caminhoArquivo) — leitura do PDF do catálogo",
    storage: storage.nome,
    catalogo: { id: catalogo.id, nomeArquivo: catalogo.nomeArquivo },
    maquina: {
      host: os.hostname(),
      so: `${os.type()} ${os.release()} (${os.arch()})`,
      cpu: `${cpus[0]?.model ?? "?"} x${cpus.length}`,
      memoriaGB: Number((os.totalmem() / 1024 ** 3).toFixed(1)),
      node: process.version,
    },
    tamanhoDosDados: { pdfBytes: tamanhoBytes, pdfKB: Number((tamanhoBytes / 1024).toFixed(1)) },
    medicao: {
      n,
      aquecimento,
      totalMs: Number(totalMs.toFixed(2)),
      mediaMs: Number(mediaMs.toFixed(3)),
      medianaMs: Number(percentil(ordenado, 50).toFixed(3)),
      p95Ms: Number(percentil(ordenado, 95).toFixed(3)),
      minMs: Number(ordenado[0].toFixed(3)),
      maxMs: Number(ordenado[ordenado.length - 1].toFixed(3)),
      vazaoMBs: Number((tamanhoBytes / 1024 ** 2 / (mediaMs / 1000)).toFixed(2)),
    },
  };

  console.log("\n=== Baseline: leitura do PDF do catálogo ===");
  console.log(`Máquina: ${relatorio.maquina.host} | ${relatorio.maquina.so} | ${relatorio.maquina.cpu} | ${relatorio.maquina.memoriaGB} GB | Node ${relatorio.maquina.node}`);
  console.log(`N = ${n} (aquecimento descartado: ${aquecimento})`);
  console.table([
    {
      "média (ms)": relatorio.medicao.mediaMs,
      "mediana (ms)": relatorio.medicao.medianaMs,
      "p95 (ms)": relatorio.medicao.p95Ms,
      "mín (ms)": relatorio.medicao.minMs,
      "máx (ms)": relatorio.medicao.maxMs,
      "total (ms)": relatorio.medicao.totalMs,
      "vazão (MB/s)": relatorio.medicao.vazaoMBs,
    },
  ]);

  const pasta = path.join(__dirname, "resultados");
  fs.mkdirSync(pasta, { recursive: true });
  const arquivo = path.join(pasta, `baseline-pdf-${relatorio.data.replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(arquivo, JSON.stringify(relatorio, null, 2));
  console.log(`\nResultado salvo em: ${arquivo}`);
}

main()
  .catch((erro) => {
    console.error("Falha ao medir o baseline:", erro.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
