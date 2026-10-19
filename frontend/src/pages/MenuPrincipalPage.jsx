import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { montarSecoesMenu } from "../components/menuItens.jsx";
import { useSair } from "../components/useSair.jsx";
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

function IconEngrenagem() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M19.14 12.94a7.14 7.14 0 0 0 .06-.94 7.14 7.14 0 0 0-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.14.56-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.62-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.42.32.6.22l2.39-.96c.48.38 1.03.7 1.62.94l.36 2.54c.05.24.26.42.5.42h3.84c.24 0 .45-.18.5-.42l.36-2.54c.59-.24 1.14-.56 1.62-.94l2.39.96c.24.1.5 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Tela inicial após o login (RF02). Em telas largas a barra lateral já oferece
 * a navegação e o "Sair", então aqui fica só uma mensagem de boas-vindas; em
 * telas estreitas (sem barra lateral) o menu em tela cheia é a navegação, com
 * o botão "Sair" (RF02-A1) e a mesma confirmação em duas etapas (RNF03).
 */
function MenuPrincipalPage() {
  const navigate = useNavigate();
  const { pedirSaida, modalSaida } = useSair();
  const [pendentes, setPendentes] = useState(null);
  const usuario = obterUsuario();
  const secoesMenu = montarSecoesMenu(usuario);
  const totalPendentes = pendentes?.length ?? 0;

  // Selo de pendentes no menu. É só um aviso: se a consulta falhar, o menu
  // aparece normalmente, sem o número.
  useEffect(() => {
    let cancelado = false;
    listarDocumentosPendentes()
      .then((documentos) => {
        if (!cancelado) setPendentes(documentos);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <>
      <TopBar mostrarVoltar={false} />
      <div className="page-content page-content--fundo-pecas">
        {/* Telas largas: boas-vindas (a navegação fica na barra lateral). */}
        <section className="painel-inicio" aria-label="Boas-vindas">
          <span className="painel-inicio__icone">
            <IconEngrenagem />
          </span>
          <h2 className="painel-inicio__titulo">Bem-vindo(a), {usuario?.nome}!</h2>
          <p className="painel-inicio__texto">
            O Partify ajuda você a importar catálogos técnicos de ferramentas elétricas, consultar componentes e tirar dúvidas com o
            assistente de IA, usando apenas os catálogos validados da sua empresa.
          </p>
          <p className="painel-inicio__dica">Escolha uma opção no menu à esquerda para começar.</p>
        </section>

        {/* Telas estreitas (sem barra lateral): o menu em tela cheia é a navegação. */}
        <div className="menu-card">
          <div className="menu-card__header">Menu Principal</div>

          <div className="menu-card__body">
            {secoesMenu.map((secao) => (
              <section key={secao.chave} className="menu-secao" aria-labelledby={`menu-secao-${secao.chave}`}>
                <h3 id={`menu-secao-${secao.chave}`} className="menu-secao__titulo">
                  {secao.titulo}
                </h3>
                <div className="menu-secao__itens">
                  {secao.itens.map((item) => (
                    <button key={item.chave} type="button" className="menu-btn menu-btn--primary" onClick={() => navigate(item.rota)}>
                      <span className="menu-btn__icon">
                        <item.Icone />
                      </span>
                      <span className="menu-btn__rotulo">{item.rotulo}</span>
                      {item.comSelo && totalPendentes > 0 && (
                        <span className="menu-btn__selo" aria-label={`${totalPendentes} documentos pendentes`}>
                          {totalPendentes}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            ))}

            <button type="button" className="menu-btn menu-btn--danger-outline menu-btn--sair-pagina" onClick={pedirSaida}>
              <span className="menu-btn__icon">
                <IconLogOut />
              </span>
              Sair
            </button>
          </div>
        </div>
      </div>

      {modalSaida}
    </>
  );
}

export default MenuPrincipalPage;
