import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import { logout, obterUsuario } from "../services/authService.js";
import { listarDocumentosPendentes } from "../services/catalogoService.js";

/* Ícones em SVG inline (sem dependência externa) — mesmo estilo de traço fino
   usado no protótipo. */
function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4" />
      <path d="M6 10l6-6 6 6" />
      <path d="M4 20h16" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function IconList() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M8 10h.01" />
      <path d="M16 10h.01" />
      <path d="M8 14h.01" />
      <path d="M16 14h.01" />
    </svg>
  );
}

function IconLogOut() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

/* Seções do menu. "Gestão de Usuários e Sistema" (RF05 + acesso ao Histórico do
   Sistema, RF13) é exclusivo do Administrador: para os demais perfis o botão
   nem aparece (antes ficava só desabilitado, o que revelava sua existência). */
function montarSecoesMenu(usuario) {
  const ehAdministrador = usuario?.perfil === "ADMINISTRADOR";

  return [
    {
      chave: "catalogo",
      titulo: "Catálogo",
      itens: [
        { chave: "importar-catalogo", rotulo: "Importar Catálogo", Icone: IconUpload, rota: "/catalogos/importar" },
        { chave: "documentos-pendentes", rotulo: "Documentos Pendentes", Icone: IconClock, rota: "/catalogos/pendentes", comSelo: true },
        { chave: "consultar-catalogos", rotulo: "Consultar Catálogos", Icone: IconList, rota: "/catalogos" },
      ],
    },
    {
      chave: "consulta",
      titulo: "Consulta",
      itens: [
        { chave: "consultar-componentes", rotulo: "Consultar Componentes", Icone: IconSearch, rota: "/componentes" },
        { chave: "consulta-tecnica-ia", rotulo: "Consulta Técnica (IA)", Icone: IconChat, rota: "/consulta-tecnica" },
      ],
    },
    {
      chave: "empresa",
      titulo: "Empresa",
      itens: [
        ...(ehAdministrador
          ? [{ chave: "gestao-usuarios-sistema", rotulo: "Gestão de Usuários e Sistema", Icone: IconUsers, rota: "/usuarios" }]
          : []),
        { chave: "dados-empresa", rotulo: "Dados da Empresa", Icone: IconBuilding, rota: "/empresa" },
      ],
    },
  ];
}

/**
 * Tela inicial após o login (RF02). Ponto central de navegação do sistema.
 * O botão "Sair" (RF02-A1) vive aqui — não mais no menu do usuário no TopBar —
 * com a mesma confirmação em duas etapas (RNF03) de antes.
 */
function MenuPrincipalPage() {
  const navigate = useNavigate();
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [totalPendentes, setTotalPendentes] = useState(0);
  const secoesMenu = montarSecoesMenu(obterUsuario());

  // Selo com a quantidade de documentos na fila de pendentes. É só um aviso: se
  // a consulta falhar, o botão aparece normalmente, sem selo.
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
  }, []);

  function pedirConfirmacaoSaida() {
    setConfirmandoSaida(true);
  }

  function cancelarSaida() {
    setConfirmandoSaida(false);
  }

  async function confirmarSaida() {
    setSaindo(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setSaindo(false);
      setConfirmandoSaida(false);
    }
  }

  return (
    <>
      <TopBar mostrarVoltar={false} />
      <div className="page-content page-content--fundo-pecas">
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

            <button type="button" className="menu-btn menu-btn--danger-outline" onClick={pedirConfirmacaoSaida}>
              <span className="menu-btn__icon">
                <IconLogOut />
              </span>
              Sair
            </button>
          </div>
        </div>
      </div>

      {confirmandoSaida && (
        <ConfirmModal
          titulo="Encerrar sessão"
          mensagem="Tem certeza que deseja sair? Você precisará fazer login novamente para acessar o sistema."
          confirmando={saindo}
          textoConfirmar="Sair"
          onConfirmar={confirmarSaida}
          onCancelar={cancelarSaida}
        />
      )}
    </>
  );
}

export default MenuPrincipalPage;
