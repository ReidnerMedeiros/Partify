/**
 * Projeto N2 (ESW441), Semana 3: demonstração da camada de cache em arquivo.
 * ATIVIDADE DA DISCIPLINA, NÃO FAZ PARTE DO PARTIFY (pasta backend/n2/ será apagada).
 *
 * Não precisa de banco, internet nem .env: usa um storage falso que demora 300 ms
 * por leitura (imita a latência até o Supabase) e uma pasta temporária.
 *
 * Mostra: MISS, HIT, invalidação na exclusão (o arquivo some do cache), cache que
 * sobrevive a reinício do processo e fallback quando o disco do cache falha.
 *
 * Uso (dentro de backend/):  node n2/demoCache.js
 */
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { performance } = require("perf_hooks");
const { ArquivoCacheStorageService } = require("./ArquivoCacheStorageService");

class StorageRemotoFalso {
  constructor(latenciaMs) {
    this.latenciaMs = latenciaMs;
    this.arquivos = new Map();
    this.leituras = 0;
  }
  async salvar({ buffer, nomeOriginal }) {
    const caminho = `uuid-${nomeOriginal}`;
    this.arquivos.set(caminho, buffer);
    return caminho;
  }
  async obterBuffer(caminho) {
    this.leituras += 1;
    await new Promise((r) => setTimeout(r, this.latenciaMs));
    if (!this.arquivos.has(caminho)) throw new Error("arquivo não existe no storage remoto");
    return this.arquivos.get(caminho);
  }
  async excluir(caminho) {
    this.arquivos.delete(caminho);
  }
}

async function medir(rotulo, fn) {
  const t0 = performance.now();
  const resultado = await fn();
  console.log(`  ${rotulo}: ${(performance.now() - t0).toFixed(1)} ms`);
  return resultado;
}

async function main() {
  const diretorio = fs.mkdtempSync(path.join(os.tmpdir(), "n2-cache-"));
  const remoto = new StorageRemotoFalso(300);
  const pdf = Buffer.alloc(100 * 1024, 7);
  const caminho = await remoto.salvar({ buffer: pdf, nomeOriginal: "catalogo.pdf" });
  const cache = new ArquivoCacheStorageService({ storageRemoto: remoto, diretorio });
  const chave = cache.chave(caminho);
  const arquivoCache = path.join(diretorio, `${chave}.pdf`);

  console.log("1) Leitura pela camada nova");
  const a = await medir("1ª leitura (MISS, baixa do remoto e grava em disco)", () => cache.obterBuffer(caminho));
  const b = await medir("2ª leitura (HIT, sai do disco)", () => cache.obterBuffer(caminho));
  assert.ok(a.equals(pdf) && b.equals(pdf), "conteúdo igual ao original");
  assert.strictEqual(remoto.leituras, 1, "o remoto foi lido uma única vez");
  assert.ok(fs.existsSync(arquivoCache), "arquivo existe em disco");
  console.log("  OK: 1 leitura remota, arquivo em", path.basename(arquivoCache));

  console.log("2) Cache sobrevive a reinício do processo");
  const cache2 = new ArquivoCacheStorageService({ storageRemoto: remoto, diretorio });
  await medir("leitura após 'reiniciar' (HIT pelo índice remontado)", () => cache2.obterBuffer(caminho));
  assert.strictEqual(remoto.leituras, 1, "continuou sem ler o remoto");

  console.log("3) Leituras simultâneas em MISS compartilham um único download");
  const outro = await remoto.salvar({ buffer: Buffer.alloc(50 * 1024, 1), nomeOriginal: "outro.pdf" });
  const antes = remoto.leituras;
  await Promise.all([cache2.obterBuffer(outro), cache2.obterBuffer(outro), cache2.obterBuffer(outro)]);
  assert.strictEqual(remoto.leituras - antes, 1, "3 pedidos, 1 download");
  console.log("  OK: 3 pedidos simultâneos, 1 download");

  console.log("4) Invalidação: excluir apaga na fonte da verdade e depois no cache");
  await cache2.excluir(caminho);
  assert.ok(!fs.existsSync(arquivoCache), "arquivo saiu do cache");
  await assert.rejects(() => cache2.obterBuffer(caminho), /não existe/);
  console.log("  OK: arquivo sumiu do disco e a leitura não devolve cópia velha");

  console.log("5) Falha do cache não derruba a leitura (fallback para o remoto)");
  const quebrado = new ArquivoCacheStorageService({ storageRemoto: remoto, diretorio: path.join(arquivoCache, "impossivel") });
  const c = await quebrado.obterBuffer(outro);
  assert.strictEqual(c.length, 50 * 1024);
  console.log("  OK: leitura funcionou mesmo com o disco do cache inutilizável");

  console.log("6) Limite de espaço remove o menos usado (LRU)");
  const pequeno = new ArquivoCacheStorageService({ storageRemoto: remoto, diretorio: path.join(diretorio, "lru"), limiteBytes: 120 * 1024 });
  const p1 = await remoto.salvar({ buffer: Buffer.alloc(60 * 1024, 1), nomeOriginal: "p1.pdf" });
  const p2 = await remoto.salvar({ buffer: Buffer.alloc(60 * 1024, 2), nomeOriginal: "p2.pdf" });
  const p3 = await remoto.salvar({ buffer: Buffer.alloc(60 * 1024, 3), nomeOriginal: "p3.pdf" });
  await pequeno.obterBuffer(p1);
  await new Promise((r) => setTimeout(r, 5));
  await pequeno.obterBuffer(p2);
  await new Promise((r) => setTimeout(r, 5));
  await pequeno.obterBuffer(p3);
  assert.ok(!pequeno.indice.has(pequeno.chave(p1)), "o mais antigo (p1) foi removido");
  assert.ok(pequeno.indice.has(pequeno.chave(p3)), "o mais novo (p3) ficou");
  console.log("  OK: p1 removido, p2 e p3 no cache");

  console.log("\nEstatísticas (cache2):", cache2.obterEstatisticas());
  fs.rmSync(diretorio, { recursive: true, force: true });
  console.log("\nTudo certo.");
}

main().catch((erro) => {
  console.error("Falhou:", erro);
  process.exitCode = 1;
});
