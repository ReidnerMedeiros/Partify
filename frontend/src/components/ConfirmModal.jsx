/**
 * Modal de confirmação em duas etapas (RNF03), reutilizável para qualquer ação
 * impactante — usado aqui no logout (RF02, fluxo alternativo A2: "cancelar logout").
 */
function ConfirmModal({ titulo, mensagem, confirmando, textoConfirmar = "Confirmar", onConfirmar, onCancelar }) {
  return (
    <div className="modal-overlay" role="presentation" onClick={onCancelar}>
      <div className="modal-box" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{titulo}</h3>
        <p>{mensagem}</p>
        <div className="form-actions">
          <button type="button" className="btn btn--outline" onClick={onCancelar} disabled={confirmando}>
            Cancelar
          </button>
          <button type="button" className="btn btn--danger-outline" onClick={onConfirmar} disabled={confirmando}>
            {confirmando ? "Aguarde..." : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
