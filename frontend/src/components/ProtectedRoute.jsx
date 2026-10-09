import { Navigate } from "react-router-dom";
import { estaAutenticado, obterUsuario } from "../services/authService";

/**
 * RNF07 — impede acesso às telas autenticadas sem sessão ativa (RF02).
 * Com `somenteAdmin`, usuários de outros perfis são devolvidos ao Menu
 * Principal (o backend também bloqueia com 403; isto só evita abrir a tela).
 */
function ProtectedRoute({ children, somenteAdmin = false }) {
  if (!estaAutenticado()) {
    return <Navigate to="/login" replace />;
  }
  if (somenteAdmin && obterUsuario()?.perfil !== "ADMINISTRADOR") {
    return <Navigate to="/menu" replace />;
  }
  return children;
}

export default ProtectedRoute;
