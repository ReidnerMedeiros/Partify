const { createClient } = require("@supabase/supabase-js");
const { randomUUID } = require("crypto");
const { FileStorageService } = require("../../domain/services/FileStorageService");

/**
 * Implementação de produção de FileStorageService, usando o Supabase Storage
 * (o mesmo projeto Supabase já usado para o Postgres). Ativada automaticamente
 * pelo composition root quando SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão
 * configurados em backend/.env — caso contrário, usa-se LocalFileStorageService.
 *
 * Pré-requisito: criar manualmente um bucket (privado) no painel do Supabase,
 * com o nome definido em SUPABASE_STORAGE_BUCKET (padrão: "catalogos").
 */
class SupabaseStorageService extends FileStorageService {
  constructor({ url, serviceRoleKey, bucket }) {
    super();
    this.bucket = bucket ?? "catalogos";
    this.client = createClient(url, serviceRoleKey);
  }

  async salvar({ buffer, nomeOriginal, mimeType }) {
    const nomeSeguro = nomeOriginal.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const caminho = `${randomUUID()}-${nomeSeguro}`;

    const { error } = await this.client.storage.from(this.bucket).upload(caminho, buffer, {
      contentType: mimeType ?? "application/pdf",
      upsert: false,
    });

    if (error) {
      throw new Error(`Falha ao salvar arquivo no Supabase Storage: ${error.message}`);
    }

    return caminho;
  }

  async obterBuffer(caminhoArquivo) {
    const { data, error } = await this.client.storage.from(this.bucket).download(caminhoArquivo);
    if (error) {
      throw new Error(`Falha ao recuperar arquivo do Supabase Storage: ${error.message}`);
    }
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

module.exports = { SupabaseStorageService };
