import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmModal from "./ConfirmModal.jsx";
import { logout } from "../services/authService.js";

/**
 * RF02-A1 — Sair do sistema, com a confirmação em duas etapas (RNF03).
 * Usado pelo Menu Principal e pela barra lateral, para que os dois "Sair"
 * se comportem exatamente igual. `modalSaida` deve ser renderizado pelo chamador.
 */
export function useSair() {
  const navigate = useNavigate();
  const [confirmando, setConfirmando] = useState(false);
  const [saindo, setSaindo] = useState(false);

  async function confirmarSaida() {
    setSaindo(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setSaindo(false);
      setConfirmando(false);
    }
  }

  const modalSaida = confirmando ? (
    <ConfirmModal
      titulo="Encerrar sessão"
      mensagem="Tem certeza que deseja sair? Você precisará fazer login novamente para acessar o sistema."
      confirmando={saindo}
      textoConfirmar="Sair"
      onConfirmar={confirmarSaida}
      onCancelar={() => setConfirmando(false)}
    />
  ) : null;

  return { pedirSaida: () => setConfirmando(true), modalSaida };
}
