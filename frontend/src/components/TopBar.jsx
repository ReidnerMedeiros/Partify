import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PartifyLogo from "./PartifyLogo";
import { obterUsuario } from "../services/authService.js";

const ROTULO_PERFIL = {
  ADMINISTRADOR: "Administrador",
  TECNICO: "Técnico",
  VENDEDOR: "Vendedor",
};

function IconeVoltar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function IconeUsuario() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

/**
 * Barra superior das telas autenticadas (Figuras 6, 7, 9...).
 * O botão de usuário abre o menu de sessão com a opção "Alterar Senha" (RF04).
 * O menu fecha ao clicar/tocar fora, ao pressionar Esc e ao escolher uma opção.
 * "Voltar" é explícito: usa `voltarPara` quando informado; sem histórico
 * interno (ex.: página aberta por link direto) cai no Menu Principal.
 */
function TopBar({ mostrarVoltar = true, voltarPara }) {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const wrapperRef = useRef(null);
  const usuario = obterUsuario();
  const perfil = ROTULO_PERFIL[usuario?.perfil] ?? usuario?.perfil;

  useEffect(() => {
    if (!menuAberto) return undefined;

    function fecharAoClicarFora(evento) {
      if (wrapperRef.current && !wrapperRef.current.contains(evento.target)) {
        setMenuAberto(false);
      }
    }
    function fecharComEsc(evento) {
      if (evento.key === "Escape") setMenuAberto(false);
    }

    document.addEventListener("pointerdown", fecharAoClicarFora);
    document.addEventListener("keydown", fecharComEsc);
    return () => {
      document.removeEventListener("pointerdown", fecharAoClicarFora);
      document.removeEventListener("keydown", fecharComEsc);
    };
  }, [menuAberto]);

  function voltar() {
    if (voltarPara) {
      navigate(voltarPara);
    } else if (window.history.state?.idx > 0) {
      navigate(-1);
    } else {
      navigate("/menu");
    }
  }

  return (
    <header className="topbar">
      <div className="topbar__left">
        {mostrarVoltar && (
          <button type="button" className="topbar__back" onClick={voltar} aria-label="Voltar">
            <IconeVoltar />
          </button>
        )}
        <span className="topbar__logo">
          <PartifyLogo />
        </span>
      </div>
      <div className="topbar__actions">
        <div className="topbar__menu-wrapper" ref={wrapperRef}>
          <button
            type="button"
            className="topbar__usuario"
            aria-label="Menu do usuário"
            aria-haspopup="menu"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto((atual) => !atual)}
          >
            <span className="topbar__avatar">
              <IconeUsuario />
            </span>
            {usuario?.nome && (
              <span className="topbar__usuario-info">
                <span className="topbar__usuario-nome">{usuario.nome}</span>
                {perfil && <span className="topbar__usuario-perfil">{perfil}</span>}
              </span>
            )}
          </button>
          {menuAberto && (
            <div className="topbar__dropdown" role="menu">
              <button
                type="button"
                role="menuitem"
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
