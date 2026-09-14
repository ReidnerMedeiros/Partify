/**
 * Entidade LogAuditoria — registro imutável de auditoria (RNF09).
 * Só admite criação; não existem métodos de edição propositalmente.
 */
class LogAuditoria {
  constructor({ id, usuarioId, tipoAcao, registroAfetado, detalhes, realizadoEm }) {
    this.id = id;
    this.usuarioId = usuarioId ?? null;
    this.tipoAcao = tipoAcao;
    this.registroAfetado = registroAfetado ?? null;
    this.detalhes = detalhes ?? null;
    this.realizadoEm = realizadoEm;
  }
}

module.exports = { LogAuditoria };
