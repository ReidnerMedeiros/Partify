import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PartifyLogo from "./PartifyLogo";
import { montarSecoesMenu, itemEstaAtivo } from "./menuItens.jsx";
import { useSair } from "./useSair.jsx";
import { obterUsuario } from "../services/authService.js";
import { listarDocumentosPendentes } from "../services/catalogoService.js";

function IconLogOut() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

/**
 * Barra lateral de navegação das telas autenticadas (somente telas largas; no
 * celular continua valendo o Menu Principal em tela cheia). Usa os mesmos itens
 * e as mesmas regras de perfil do Menu Principal, sem nenhuma opção nova.
 */
function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { pedirSaida, modalSaida } = useSair();
  const [totalPendentes, setTotalPendentes] = useState(0);
  const secoesMenu = montarSecoesMenu(obterUsuario());

  // Selo de pendentes: atualizado a cada troca de tela, para refletir o que foi
  // importado, validado ou excluído. É só um aviso, então falha em silêncio.
  useEffect(() => {
    let cancelado = false;
    listarDocumentosPendentes()
      .then((documentos) => {
        if (!cancelado) setTotalPendentes(documentos.length);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [pathname]);

  return (
    <aside className="sidebar" aria-label="Navegação principal">
      <button type="button" className="sidebar__marca" onClick={() => navigate("/menu")} aria-label="Ir para o Menu Principal">
        <PartifyLogo />
      </button>

      <nav className="sidebar__nav">
        {secoesMenu.map((secao) => (
          <section key={secao.chave} className="sidebar__secao" aria-labelledby={`sidebar-secao-${secao.chave}`}>
            <h3 id={`sidebar-secao-${secao.chave}`} className="sidebar__titulo">
              {secao.titulo}
            </h3>
            {secao.itens.map((item) => {
              const ativo = itemEstaAtivo(item, pathname);
              return (
                <button
                  key={item.chave}
                  type="button"
                  className={`sidebar__item ${ativo ? "sidebar__item--ativo" : ""}`}
                  aria-current={ativo ? "page" : undefined}
                  onClick={() => navigate(item.rota)}
                >
                  <span className="sidebar__icone">
                    <item.Icone />
                  </span>
                  <span className="sidebar__rotulo">{item.rotulo}</span>
                  {item.comSelo && totalPendentes > 0 && (
                    <span className="sidebar__selo" aria-label={`${totalPendentes} documentos pendentes`}>
                      {totalPendentes}
                    </span>
                  )}
                </button>
              );
            })}
          </section>
        ))}
      </nav>

      <button type="button" className="sidebar__sair" onClick={pedirSaida}>
        <span className="sidebar__icone">
          <IconLogOut />
        </span>
        Sair
      </button>

      {modalSaida}
    </aside>
  );
}

export default Sidebar;
