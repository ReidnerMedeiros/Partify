/**
 * Contrato do repositório de Validacao (RF08). Registra formalmente cada
 * confirmação de validação humana de um Catalogo — distinto do LogAuditoria
 * (que registra toda e qualquer ação sensível do sistema, não só validações).
 */
class ValidacaoRepository {
  async registrar(_dados /* { empresaId, catalogoId, usuarioId, observacoes } */) {
    throw new Error("ValidacaoRepository.registrar não implementado.");
  }
}

module.exports = { ValidacaoRepository };
