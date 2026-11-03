/**
 * Projeto N2 (ESW441), Semana 3: camada de cache em ARQUIVO para o PDF do catálogo.
 *
 * ATIVIDADE DA DISCIPLINA, NÃO FAZ PARTE DO PARTIFY: a pasta backend/n2/ inteira
 * existe só para o Projeto N2 e deve ser apagada depois.
 *
 * Decorador do contrato FileStorageService (mesmos métodos: salvar, obterBuffer,
 * excluir). Fica no lugar do storage remoto sem mudar nenhuma regra de negócio.
 *
 * Padrão cache-aside, com o desenho da Semana 2 (MODELAGEM_SEMANA_2.md):
 *   - Estrutura em disco: <diretorio>/<sha256(caminhoArquivo)>.pdf
 *   - Índice em memória: Map<chave, { bytes, criadoEm, ultimoAcesso }>
 *   - HIT: chave no índice e dentro do TTL, lê do disco (sem rede).
 *   - MISS: baixa do storage remoto (fonte da verdade), grava em arquivo temporário,
 *     renomeia (gravação atômica) e registra no índice.
 *   - Invalidação: excluir() apaga primeiro na fonte da verdade e só depois no cache.
 *   - TTL de 7 dias e limite de espaço (LRU) como rede de segurança.
 *   - Qualquer erro do cache cai para o storage remoto: o cache nunca derruba a operação.
 */
const fs = require("fs/promises");
const path = require("path");
const { createHash } = require("crypto");
const { performance } = require("perf_hooks");

const TTL_PADRAO_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const LIMITE_PADRAO_BYTES = 200 * 1024 * 1024; // 200 MB

class ArquivoCacheStorageService {
  /**
   * @param {object} opcoes
   * @param {object} opcoes.storageRemoto  qualquer FileStorageService (Supabase ou Local)
   * @param {string} opcoes.diretorio      pasta do cache (ex.: backend/n2/cache/pdfs)
   * @param {number} [opcoes.ttlMs]
   * @param {number} [opcoes.limiteBytes]
   * @param {() => number} [opcoes.agora]  relógio injetável (testes)
   */
  constructor({ storageRemoto, diretorio, ttlMs = TTL_PADRAO_MS, limiteBytes = LIMITE_PADRAO_BYTES, agora = Date.now, aoEvento = null }) {
    this.aoEvento = aoEvento; // opcional: recebe "HIT"/"MISS"/"INVALIDADO"... para a demonstração ao vivo
    this.storageRemoto = storageRemoto;
    this.diretorio = diretorio;
    this.ttlMs = ttlMs;
    this.limiteBytes = limiteBytes;
    this.agora = agora;
    this.indice = new Map();
    this.emAndamento = new Map(); // downloads em curso: evita baixar o mesmo arquivo duas vezes
    this.estatisticas = { hits: 0, misses: 0, erros: 0 };
    this.pronto = this.iniciar();
  }

  chave(caminhoArquivo) {
    return createHash("sha256").update(caminhoArquivo).digest("hex");
  }

  arquivoDe(chave) {
    return path.join(this.diretorio, `${chave}.pdf`);
  }

  /** Na subida: varre a pasta, apaga temporários e expirados, monta o índice. */
  async iniciar() {
    try {
      await fs.mkdir(this.diretorio, { recursive: true });
      for (const nome of await fs.readdir(this.diretorio)) {
        const arquivo = path.join(this.diretorio, nome);
        if (nome.endsWith(".tmp")) {
          await fs.rm(arquivo, { force: true });
          continue;
        }
        if (!nome.endsWith(".pdf")) continue;
        const info = await fs.stat(arquivo);
        if (this.agora() - info.mtimeMs > this.ttlMs) {
          await fs.rm(arquivo, { force: true });
          continue;
        }
        this.indice.set(nome.slice(0, -4), { bytes: info.size, criadoEm: info.mtimeMs, ultimoAcesso: info.atimeMs });
      }
    } catch {
      this.estatisticas.erros += 1; // cache indisponível: segue só com o storage remoto
    }
  }

  async obterBuffer(caminhoArquivo) {
    await this.pronto;
    const chave = this.chave(caminhoArquivo);
    const inicio = performance.now();
    const tempo = () => `${(performance.now() - inicio).toFixed(2)} ms`;

    // HIT
    const entrada = this.indice.get(chave);
    if (entrada) {
      if (this.agora() - entrada.criadoEm > this.ttlMs) {
        await this.removerDoCache(chave); // expirou: trata como MISS
      } else {
        try {
          const buffer = await fs.readFile(this.arquivoDe(chave));
          entrada.ultimoAcesso = this.agora();
          this.estatisticas.hits += 1;
          this.aoEvento?.(`HIT   ${caminhoArquivo} — ${tempo()} (lido do disco)`);
          return buffer;
        } catch {
          this.estatisticas.erros += 1;
          this.indice.delete(chave); // arquivo sumiu ou ilegível: cai para o MISS
        }
      }
    }

    // MISS (com download compartilhado entre leituras simultâneas)
    this.estatisticas.misses += 1;
    if (!this.emAndamento.has(chave)) {
      const download = this.baixarEGuardar(caminhoArquivo, chave).finally(() => this.emAndamento.delete(chave));
      this.emAndamento.set(chave, download);
    }
    const resultado = await this.emAndamento.get(chave);
    this.aoEvento?.(`MISS  ${caminhoArquivo} — ${tempo()} (baixou do Supabase e gravou no cache)`);
    return resultado;
  }

  async baixarEGuardar(caminhoArquivo, chave) {
    const buffer = await this.storageRemoto.obterBuffer(caminhoArquivo);
    await this.guardar(chave, buffer);
    return buffer;
  }

  /** Grava em arquivo temporário e renomeia (atômico). Falha de disco não derruba a leitura. */
  async guardar(chave, buffer) {
    try {
      await fs.mkdir(this.diretorio, { recursive: true });
      const destino = this.arquivoDe(chave);
      const temporario = `${destino}.${process.pid}.${this.agora()}.tmp`;
      await fs.writeFile(temporario, buffer);
      await fs.rename(temporario, destino);
      const agora = this.agora();
      this.indice.set(chave, { bytes: buffer.length, criadoEm: agora, ultimoAcesso: agora });
      await this.aplicarLimite();
    } catch {
      this.estatisticas.erros += 1;
    }
  }

  /** Passou do limite de espaço: remove os menos usados recentemente (LRU). */
  async aplicarLimite() {
    let total = 0;
    for (const entrada of this.indice.values()) total += entrada.bytes;
    if (total <= this.limiteBytes) return;
    const porUso = [...this.indice.entries()].sort((a, b) => a[1].ultimoAcesso - b[1].ultimoAcesso);
    for (const [chave, entrada] of porUso) {
      if (total <= this.limiteBytes) break;
      await this.removerDoCache(chave);
      total -= entrada.bytes;
    }
  }

  async removerDoCache(chave) {
    this.indice.delete(chave);
    await fs.rm(this.arquivoDe(chave), { force: true }).catch(() => {
      this.estatisticas.erros += 1;
    });
  }

  /** Importar: grava na fonte da verdade primeiro; depois já deixa o PDF no cache (a extração lê logo em seguida). */
  async salvar(dados) {
    const caminhoArquivo = await this.storageRemoto.salvar(dados);
    await this.pronto;
    await this.guardar(this.chave(caminhoArquivo), dados.buffer);
    return caminhoArquivo;
  }

  /** Excluir: fonte da verdade primeiro. Se ela falhar, o cache não é tocado. */
  async excluir(caminhoArquivo) {
    await this.storageRemoto.excluir(caminhoArquivo);
    await this.pronto;
    await this.removerDoCache(this.chave(caminhoArquivo));
    this.aoEvento?.(`INVALIDADO ${caminhoArquivo} (apagado no Supabase e no cache)`);
  }

  /** Para o relatório e o README: quantos acertos e falhas de cache houve. */
  obterEstatisticas() {
    return { ...this.estatisticas, arquivosNoCache: this.indice.size };
  }
}

module.exports = { ArquivoCacheStorageService };
