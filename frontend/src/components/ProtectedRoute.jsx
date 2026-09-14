import { Navigate } from "react-router-dom";
import { estaAutenticado } from "../services/authService";

/**
 * RNF07 — impede acesso às telas autenticadas sem sessão ativa (RF02).
 */
function ProtectedRoute({ children }) {
  if (!estaAutenticado()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default ProtectedRoute;
