/**
 * Modal de confirmação em duas etapas (RNF03), reutilizável para qualquer ação
 * impactante — usado aqui no logout (RF02, fluxo alternativo A2: "cancelar logout").
 */
import { createPortal } from "react-dom";

function ConfirmModal({ titulo, mensagem, confirmando, textoConfirmar = "Confirmar", onConfirmar, onCancelar }) {
  // Renderizado direto no <body> (portal): assim a camada do modal não fica presa
  // dentro da barra lateral ou da área de conteúdo, que criam camadas próprias e
  // podiam deixar o modal escondido atrás da tela.
  return createPortal(
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
    </div>,
    document.body
  );
}

export default ConfirmModal;
