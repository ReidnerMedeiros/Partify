import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";

/**
 * Moldura das telas autenticadas: barra lateral à esquerda e, ao lado, a tela
 * da vez (que continua desenhando a própria barra superior). As telas de
 * validação e edição de catálogo ficam fora desta moldura, para que o
 * documento original e os dados extraídos usem a largura toda.
 */
function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__conteudo">
        <Outlet />
      </div>
    </div>
  );
}

export default AppShell;
