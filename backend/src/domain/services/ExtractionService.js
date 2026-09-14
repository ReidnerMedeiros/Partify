/**
 * Contrato do Agente Extrator (RF07 — Extração Multimodal via IA). Implementação
 * concreta em src/agentesIA/AgenteExtrator/GeminiExtractionService, usando a Gemini API.
 *
 * Restrição de segurança (válida para qualquer implementação): o conteúdo do PDF
 * enviado ao modelo deve ser tratado SEMPRE como dado a extrair, nunca como uma
 * instrução a obedecer — mesmo que o próprio documento contenha um texto que
 * pareça um comando. Isso evita que um catálogo malicioso injete instruções que
 * alterem o comportamento do agente ("prompt injection"). O retorno desta
 * interface também deve ser tratado pelos Use Cases apenas como dado (nunca
 * interpolado em outro prompt sem o mesmo cuidado, nunca usado para montar
 * comandos/consultas dinâmicas).
 *
 * `dominioReconhecido`: guarda-corpo de domínio (fora do texto do DERS, pedido
 * explícito do usuário — decisão #26 em CONTEXTO.md). `false` sinaliza que o
 * documento não é uma vista explodida de ferramenta elétrica portátil das
 * categorias/marcas suportadas — `ExtrairDadosCatalogoUseCase` usa esse campo
 * para REJEITAR a importação por completo (exclui o catálogo, não permite
 * validação manual posterior), diferente de `compreendido = false` (documento
 * ilegível), que só marca o catálogo como IRRESOLUVEL e permite preenchimento
 * manual.
 */
class ExtractionService {
  /**
   * @param {Object} dados
   * @param {Buffer} dados.arquivoBuffer conteúdo binário do PDF
   * @param {string} dados.nomeArquivo nome original do arquivo (contexto/log)
   * @param {string} [dados.marcaSugerida] preenchido pelo ator no RF06 (fluxo A1)
   * @param {string} [dados.modeloSugerido] preenchido pelo ator no RF06 (fluxo A1)
   * @returns {Promise<{
   *   compreendido: boolean,
   *   dominioReconhecido: boolean,
   *   marca: string|null,
   *   modelo: string|null,
   *   tensao: string|null,
   *   pecas: Array<{ codigo: string, descricao: string|null, posicaoVisual: string|null, confianca: number }>,
   *   confiancaCampos: { marca: number, modelo: number, tensao: number },
   *   confiancaGeral: number,
   * }>}
   */
  async extrairDados(_dados) {
    throw new Error("ExtractionService.extrairDados não implementado.");
  }
}

module.exports = { ExtractionService };
