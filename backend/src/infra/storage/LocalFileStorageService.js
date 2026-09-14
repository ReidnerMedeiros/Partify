const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");
const { FileStorageService } = require("../../domain/services/FileStorageService");

const DIRETORIO_BASE = path.join(__dirname, "..", "..", "..", "storage", "catalogos");

/**
 * Implementação usada em desenvolvimento (quando SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY
 * não estão configurados em backend/.env): salva o PDF em disco, dentro do próprio
 * backend, em vez de subir para um bucket externo. Mesmo espírito do
 * ConsoleEmailService (RF03) — permite testar o fluxo do RF06 localmente sem
 * depender de uma conta/serviço externo configurado.
 */
class LocalFileStorageService extends FileStorageService {
  async salvar({ buffer, nomeOriginal }) {
    await fs.mkdir(DIRETORIO_BASE, { recursive: true });

    const nomeSeguro = nomeOriginal.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const nomeArmazenado = `${randomUUID()}-${nomeSeguro}`;
    await fs.writeFile(path.join(DIRETORIO_BASE, nomeArmazenado), buffer);

    // Identificador relativo (não o caminho absoluto do disco), para ser
    // intercambiável com a implementação do Supabase Storage (que também
    // retorna um caminho relativo dentro do bucket).
    return `local/${nomeArmazenado}`;
  }

  async obterBuffer(caminhoArquivo) {
    const nomeArmazenado = caminhoArquivo.replace(/^local\//, "");
    return fs.readFile(path.join(DIRETORIO_BASE, nomeArmazenado));
  }
}

module.exports = { LocalFileStorageService };
