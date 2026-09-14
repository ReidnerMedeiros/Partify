import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PartifyLogo from "./PartifyLogo";

/**
 * Barra superior das telas autenticadas (Figuras 6, 7, 9...).
 * 👤 abre o menu de sessão com a opção "Alterar Senha" (RF04, fluxo básico).
 * O ícone de engrenagem (Dados da Empresa) e o "Sair" (RF02-A1) não ficam
 * mais aqui — ambos viraram botões dedicados no Menu Principal, evitando
 * duplicar o mesmo destino em dois lugares (ver MenuPrincipalPage.jsx).
 */
function TopBar({ mostrarVoltar = true }) {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar__left">
        {mostrarVoltar && (
          <button type="button" className="topbar__back" onClick={() => navigate(-1)} aria-label="Voltar">
            ←
          </button>
        )}
        <span className="topbar__logo">
          <PartifyLogo />
        </span>
      </div>
      <div className="topbar__actions">
        <div className="topbar__menu-wrapper">
          <button
            type="button"
            className="topbar__icon-button"
            title="Usuário autenticado"
            onClick={() => setMenuAberto((atual) => !atual)}
          >
            👤
          </button>
          {menuAberto && (
            <div className="topbar__dropdown" onMouseLeave={() => setMenuAberto(false)}>
              <button
                type="button"
                className="topbar__dropdown-item"
                onClick={() => {
                  setMenuAberto(false);
                  navigate("/alterar-senha");
                }}
              >
                Alterar Senha
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopBar;
