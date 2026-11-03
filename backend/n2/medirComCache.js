/**
 * Projeto N2 (ESW441), Semana 3: primeira medição do "depois" (leitura pela camada de cache).
 * ATIVIDADE DA DISCIPLINA, NÃO FAZ PARTE DO PARTIFY (pasta backend/n2/ será apagada).
 *
 * Mesma operação do baseline (obterBuffer do PDF do catálogo), mesmo catálogo, mesmo N,
 * agora pela camada ArquivoCacheStorageService. Só LÊ do Supabase (uma única vez, no
 * MISS) e grava apenas na pasta do cache (backend/n2/cache/pdfs/, descartável).
 *
 * Uso (dentro de backend/, na mesma máquina do baseline):
 *   node n2/medirComCache.js                 # N = 200, 1º catálogo validado
 *   node n2/medirComCache.js --n=1000        # N maior (só o MISS usa a rede, então o tráfego é mínimo)
 *   node n2/medirComCache.js --catalogo=<id>
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const fs = require("fs");
const os = require("os");
const { performance } = require("perf_hooks");
const { prisma } = require("../src/infra/database/prismaClient");
const { SupabaseStorageService } = require("../src/infra/storage/SupabaseStorageService");
const { LocalFileStorageService } = require("../src/infra/storage/LocalFileStorageService");
const { ArquivoCacheStorageService } = require("./ArquivoCacheStorageService");

function lerArgumentos() {
  const argumentos = { n: 200, aquecimento: 3, catalogo: null };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--n=")) argumentos.n = Number(arg.slice(4));
    else if (arg.startsWith("--aquecimento=")) argumentos.aquecimento = Number(arg.slice(14));
    else if (arg.startsWith("--catalogo=")) argumentos.catalogo = arg.slice(11);
  }
  if (!Number.isInteger(argumentos.n) || argumentos.n < 1) throw new Error("--n deve ser um inteiro maior que zero.");
  return argumentos;
}

function criarStorageRemoto() {
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
  return ordenado[Math.min(ordenado.length - 1, Math.ceil((p / 100) * ordenado.length) - 1)];
}

async function main() {
  const { n, aquecimento, catalogo: catalogoId } = lerArgumentos();
  const remoto = criarStorageRemoto();
  const catalogo = await prisma.catalogo.findFirst({
    where: catalogoId ? { id: catalogoId } : { status: "VALIDADO" },
    orderBy: { criadoEm: "asc" },
    select: { id: true, nomeArquivo: true, caminhoArquivo: true },
  });
  if (!catalogo?.caminhoArquivo) throw new Error("Nenhum catálogo com arquivo encontrado.");

  // Pasta nova a cada execução, para o primeiro acesso ser sempre um MISS de verdade.
  const diretorio = path.join(__dirname, "cache", "pdfs");
  fs.rmSync(diretorio, { recursive: true, force: true });
  const cache = new ArquivoCacheStorageService({ storageRemoto: remoto.servico, diretorio });

  console.log(`Storage remoto: ${remoto.nome}`);
  console.log(`Catálogo: ${catalogo.nomeArquivo} (${catalogo.id})`);

  // MISS: primeira leitura, baixa do remoto e grava em disco.
  const t0 = performance.now();
  const pdf = await cache.obterBuffer(catalogo.caminhoArquivo);
  const missMs = performance.now() - t0;
  console.log(`MISS (1ª leitura): ${missMs.toFixed(1)} ms, PDF de ${(pdf.length / 1024).toFixed(1)} KB`);

  for (let i = 0; i < aquecimento; i += 1) await cache.obterBuffer(catalogo.caminhoArquivo);

  // HIT: N leituras seguidas, saindo do disco.
  const duracoes = new Array(n);
  const inicio = performance.now();
  for (let i = 0; i < n; i += 1) {
    const t = performance.now();
    await cache.obterBuffer(catalogo.caminhoArquivo);
    duracoes[i] = performance.now() - t;
  }
  const totalMs = performance.now() - inicio;
  const ordenado = [...duracoes].sort((a, b) => a - b);
  const mediaMs = totalMs / n;
  const cpus = os.cpus();

  const relatorio = {
    data: new Date().toISOString(),
    operacao: "ArquivoCacheStorageService.obterBuffer(caminhoArquivo), leitura do PDF pelo cache em arquivo",
    storageRemoto: remoto.nome,
    catalogo: { id: catalogo.id, nomeArquivo: catalogo.nomeArquivo },
    maquina: {
      host: os.hostname(),
      so: `${os.type()} ${os.release()} (${os.arch()})`,
      cpu: `${cpus[0]?.model ?? "?"} x${cpus.length}`,
      memoriaGB: Number((os.totalmem() / 1024 ** 3).toFixed(1)),
      node: process.version,
    },
    tamanhoDosDados: { pdfBytes: pdf.length, pdfKB: Number((pdf.length / 1024).toFixed(1)) },
    miss: { ms: Number(missMs.toFixed(3)) },
    hit: {
      n,
      aquecimento,
      totalMs: Number(totalMs.toFixed(2)),
      mediaMs: Number(mediaMs.toFixed(4)),
      medianaMs: Number(percentil(ordenado, 50).toFixed(4)),
      p95Ms: Number(percentil(ordenado, 95).toFixed(4)),
      minMs: Number(ordenado[0].toFixed(4)),
      maxMs: Number(ordenado[ordenado.length - 1].toFixed(4)),
    },
    estatisticasCache: cache.obterEstatisticas(),
  };

  console.log("\n=== Depois: leitura do PDF pelo cache em arquivo ===");
  console.table([{ "MISS (ms)": relatorio.miss.ms, "HIT média (ms)": relatorio.hit.mediaMs, "HIT mediana (ms)": relatorio.hit.medianaMs, "HIT p95 (ms)": relatorio.hit.p95Ms, N: n }]);
  console.log("Estatísticas do cache:", relatorio.estatisticasCache);

  const pasta = path.join(__dirname, "resultados");
  fs.mkdirSync(pasta, { recursive: true });
  const arquivo = path.join(pasta, `depois-cache-${relatorio.data.replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(arquivo, JSON.stringify(relatorio, null, 2));
  console.log(`\nResultado salvo em: ${arquivo}`);
  console.log("Compare a média do HIT com a do baseline (mesma máquina, mesmo PDF).");
}

main()
  .catch((erro) => {
    console.error("Falha na medição:", erro.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
