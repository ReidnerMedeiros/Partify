/**
 * Contrato do repositório de Catalogo/Peca (RF06/RF07/RF08). A implementação
 * concreta (Prisma) resolve internamente a cadeia Marca -> Ferramenta ->
 * VersaoTensao -> Peca (find-or-create), para que os Use Cases não precisem
 * conhecer esse detalhe relacional do modelo de dados.
 *
 * RNF11 — todo o domínio técnico é isolado por instância: o find-or-create de
 * Marca/Ferramenta/VersaoTensao é sempre escopado por empresaId (duas empresas
 * nunca reaproveitam o mesmo registro, mesmo importando o catálogo do mesmo
 * fabricante/modelo).
 */
class CatalogoRepository {
  async criar(_dados /* { empresaId, nomeArquivo, caminhoArquivo } */) {
    throw new Error("CatalogoRepository.criar não implementado.");
  }

  /**
   * Retorna o catálogo enriquecido com marca/modelo/tensão (via a cadeia
   * Ferramenta/VersaoTensao da primeira peça, quando existir) e a lista de
   * peças já extraídas/validadas. Retorna null se o catálogo não existir.
   * O chamador (Use Case) é responsável por checar `catalogo.empresaId` contra
   * a empresa autenticada e lançar NotFoundError em caso de divergência — mesmo
   * padrão já usado em AtualizarUsuarioUseCase (RF05).
   */
  async buscarComPecas(_catalogoId) {
    throw new Error("CatalogoRepository.buscarComPecas não implementado.");
  }

  /**
   * RF07 — grava o resultado da extração da IA: resolve/cria Marca, Ferramenta
   * e VersaoTensao (quando identificados, escopados por empresaId), cria as
   * Peca provisórias e atualiza status/motivoPendencia/camposAusentes/confiança
   * do Catalogo.
   */
  async registrarResultadoExtracao(_catalogoId, _empresaId, _dadosExtracao) {
    throw new Error("CatalogoRepository.registrarResultadoExtracao não implementado.");
  }

  /**
   * RF08 — grava a validação humana final: aplica as edições do validador às
   * peças (atualiza as existentes, cria as novas), resolve marca/modelo/tensão
   * possivelmente corrigidos (escopados por empresaId) e marca o Catalogo como
   * VALIDADO.
   */
  async registrarValidacao(_catalogoId, _empresaId, _dadosValidacao) {
    throw new Error("CatalogoRepository.registrarValidacao não implementado.");
  }

  /**
   * RF08/RNF04 — grava o vetor de embedding (pgvector) de uma peça já validada.
   * Via SQL bruto porque o Prisma Client ainda não modela o tipo vector nativamente.
   */
  async atualizarEmbeddingPeca(_pecaId, _vetor) {
    throw new Error("CatalogoRepository.atualizarEmbeddingPeca não implementado.");
  }

  /**
   * RF09 — fluxo alternativo A2 (Consulta de registros). Lista as peças de
   * catálogos já VALIDADO da empresa, com filtros opcionais por marca/modelo/
   * código, enriquecidas com marca/modelo/tensão e quem validou o catálogo.
   */
  async listarPecasValidadas(_filtros /* { empresaId, marca, modelo, codigo } */) {
    throw new Error("CatalogoRepository.listarPecasValidadas não implementado.");
  }

  /**
   * RF09 — fluxo alternativo A3 (Atualização de registro). Aplica as edições
   * do ator a marca/modelo/tensão e à lista de peças de um catálogo já
   * VALIDADO: peças com id são atualizadas, peças sem id são criadas, e peças
   * que existiam antes mas não vieram mais na lista são excluídas.
   */
  async atualizarCatalogo(_catalogoId, _empresaId, _dadosAtualizacao) {
    throw new Error("CatalogoRepository.atualizarCatalogo não implementado.");
  }

  /**
   * RF09 — fluxo alternativo A4 (Exclusão de registro). Remove uma peça (e o
   * embedding associado, apagado junto por ser a mesma linha). Retorna a peça
   * excluída, ou null se não existir ou não pertencer à empresa informada.
   */
  async excluirPeca(_pecaId, _empresaId) {
    throw new Error("CatalogoRepository.excluirPeca não implementado.");
  }

  /**
   * RF10 — fluxo básico (fila de pendentes). Lista os catálogos IRRESOLUVEL
   * da empresa, mais recentes primeiro.
   */
  async listarPendentes(_filtros /* { empresaId } */) {
    throw new Error("CatalogoRepository.listarPendentes não implementado.");
  }

  /**
   * RF10 — fluxo alternativo A3 (Exclusão do documento). Remove o Catalogo
   * por completo, junto com quaisquer peças que a extração parcial tenha
   * chegado a gravar.
   */
  async excluirCatalogo(_catalogoId) {
    throw new Error("CatalogoRepository.excluirCatalogo não implementado.");
  }
}

module.exports = { CatalogoRepository };
