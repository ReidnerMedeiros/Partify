/**
 * Contrato de armazenamento de arquivos (RF06 — Importar Catálogo). Implementações
 * concretas em src/infra/storage — por padrão, LocalFileStorageService (dev, salva
 * em disco dentro do próprio backend) e SupabaseStorageService (produção,
 * configurável via SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY em backend/.env).
 */
class FileStorageService {
  /**
   * Salva o buffer do arquivo e retorna um identificador (caminho/URL) que pode
   * ser usado depois para recuperá-lo via obterBuffer.
   */
  async salvar(_dados /* { buffer, nomeOriginal, mimeType } */) {
    throw new Error("FileStorageService.salvar não implementado.");
  }

  /**
   * Recupera o conteúdo binário de um arquivo previamente salvo, a partir do
   * identificador retornado por salvar() (Catalogo.caminhoArquivo).
   */
  async obterBuffer(_caminhoArquivo) {
    throw new Error("FileStorageService.obterBuffer não implementado.");
  }
}

module.exports = { FileStorageService };
