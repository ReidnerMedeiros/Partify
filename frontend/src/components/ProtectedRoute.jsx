import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { estaAutenticado, obterUsuario } from "../services/authService";
import { limparSessao } from "../services/authStorage";

// RF02 — encerramento da sessão por inatividade (sem mouse, teclado, toque ou rolagem).
const TEMPO_INATIVIDADE_MS = 30 * 60 * 1000;
const EVENTOS_ATIVIDADE = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

/**
 * RNF07 — impede acesso às telas autenticadas sem sessão ativa (RF02).
 * Com `somenteAdmin`, usuários de outros perfis são devolvidos ao Menu
 * Principal (o backend também bloqueia com 403; isto só evita abrir a tela).
 * Encerra a sessão após 30 min de inatividade e redireciona ao login.
 */
function ProtectedRoute({ children, somenteAdmin = false }) {
  const autenticado = estaAutenticado();

  useEffect(() => {
    if (!autenticado) return undefined;
    let timer;
    const reiniciar = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        limparSessao();
        window.location.assign("/login");
      }, TEMPO_INATIVIDADE_MS);
    };
    reiniciar();
    EVENTOS_ATIVIDADE.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }));
    return () => {
      clearTimeout(timer);
      EVENTOS_ATIVIDADE.forEach((e) => window.removeEventListener(e, reiniciar));
    };
  }, [autenticado]);

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }
  if (somenteAdmin && obterUsuario()?.perfil !== "ADMINISTRADOR") {
    return <Navigate to="/menu" replace />;
  }
  return children;
}

export default ProtectedRoute;
