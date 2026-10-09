/**
 * RF11 — Consulta de Componentes. Contrato do repositório usado pelo Agente de
 * Consulta: combina correspondência exata por código (SQL comum) com
 * similaridade semântica (busca vetorial via pgvector). Só enxerga peças de
 * catálogos já VALIDADO (RF08/RF09) e sempre escopado por empresaId (RNF11) —
 * mesmo padrão de isolamento já aplicado em CatalogoRepository.
 */
class ComponenteRepository {
  /**
   * Correspondência exata pelo código numérico oficial do fabricante (RN03).
   */
  async buscarPorCodigoExato(_filtros /* { empresaId, termo, marca, tensao } */) {
    throw new Error("ComponenteRepository.buscarPorCodigoExato não implementado.");
  }

  /**
   * Busca vetorial por similaridade semântica (pgvector, distância de cosseno)
   * a partir de um vetor já calculado pelo EmbeddingService para o termo de
   * busca. Cada resultado inclui `distancia` (menor = mais similar) e
   * `validadoEm` (data da validação mais recente do catálogo — usado pelo RF12
   * para compor a citação de fonte na resposta do Agente de Consulta).
   */
  async buscarPorSimilaridadeSemantica(_filtros /* { empresaId, vetor, marca, tensao, modelos, limite } */) {
    throw new Error("ComponenteRepository.buscarPorSimilaridadeSemantica não implementado.");
  }

  /**
   * RF12 — busca por palavra-chave na descrição da peça (sem diferenciar
   * maiúsculas nem acentos), complementar à busca semântica. `palavras` já vêm
   * normalizadas (sem acento, minúsculas). Basta uma palavra aparecer; o
   * resultado vem ordenado por quantas palavras casaram. `modelos` (opcional)
   * restringe a peças desses modelos. Funciona também para peças sem embedding.
   */
  async buscarPorPalavrasChave(_filtros /* { empresaId, palavras, modelos, limite } */) {
    throw new Error("ComponenteRepository.buscarPorPalavrasChave não implementado.");
  }

  /**
   * RF12 — todas as peças validadas dos modelos informados (até `limite`), para
   * dar ao Agente de Consulta o catálogo inteiro do modelo quando ele cabe no
   * contexto. Inclui peças sem embedding.
   */
  async listarPecasDoModelo(_filtros /* { empresaId, modelos, limite } */) {
    throw new Error("ComponenteRepository.listarPecasDoModelo não implementado.");
  }

  /**
   * RF12 — lista os pares marca/modelo distintos dos catálogos validados da
   * empresa, para identificar na pergunta qual modelo o usuário citou.
   */
  async listarModelosValidados(_filtros /* { empresaId } */) {
    throw new Error("ComponenteRepository.listarModelosValidados não implementado.");
  }

  /**
   * Fluxo de exceção E2 — checa se existe ao menos uma peça validada na
   * instância, para distinguir "base vazia" de "busca sem resultados" (E1).
   */
  async existeRegistroValidado(_filtros /* { empresaId } */) {
    throw new Error("ComponenteRepository.existeRegistroValidado não implementado.");
  }
}

module.exports = { ComponenteRepository };
