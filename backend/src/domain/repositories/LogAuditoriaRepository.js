/**
 * Contrato do repositório de log de auditoria. Propositalmente expõe apenas
 * "registrar" e "consultar" (leitura) — a imutabilidade dos logs (RNF09) começa
 * pelo próprio desenho da interface, que nunca oferece atualizar/excluir.
 *
 * "consultar" foi adicionado para o RF13 (Manter Log Sistema). Retorna os registros
 * brutos (sem nome do usuário resolvido — isso é responsabilidade do Use Case, que
 * já tem acesso ao UsuarioRepository para montar esse enriquecimento), ordenados do
 * mais antigo para o mais recente (mesma ordem do protótipo do RF13).
 */
class LogAuditoriaRepository {
  async registrar(_logAuditoria) {
    throw new Error("LogAuditoriaRepository.registrar não implementado.");
  }

  /**
   * @param {{ empresaId: string, usuarioId?: string, tipoAcao?: string, dataInicial?: Date, dataFinal?: Date }} _filtros
   * empresaId é sempre obrigatório (RNF11 — nunca retorna log de outra instância).
   */
  async consultar(_filtros) {
    throw new Error("LogAuditoriaRepository.consultar não implementado.");
  }
}

module.exports = { LogAuditoriaRepository };
