/* eslint-disable react-refresh/only-export-components -- arquivo de dados (ícones + funções), não um componente de tela */
/* Itens de navegação do sistema, compartilhados pelo Menu Principal (cartões) e
   pela barra lateral. Ícones em SVG inline (sem dependência externa), no mesmo
   estilo de traço fino usado no protótipo. */
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

/* Seções do menu. "Gestão de Usuários e Sistema" (RF05 + acesso ao Histórico do
   Sistema, RF13) e "Dados da Empresa" (RF01) são exclusivos do Administrador:
   para os demais perfis os itens nem aparecem. A seção "Empresa" some quando
   fica vazia. */
export function montarSecoesMenu(usuario) {
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
      itens: ehAdministrador
        ? [
            { chave: "gestao-usuarios-sistema", rotulo: "Gestão de Usuários e Sistema", Icone: IconUsers, rota: "/usuarios" },
            { chave: "dados-empresa", rotulo: "Dados da Empresa", Icone: IconBuilding, rota: "/empresa" },
          ]
        : [],
    },
  ].filter((secao) => secao.itens.length > 0);
}

/* Indica se o item deve aparecer destacado para a rota atual. Telas "filhas"
   destacam o item de origem: visualizar/editar catálogo → Consultar Catálogos,
   Histórico do Sistema → Gestão de Usuários e Sistema. */
export function itemEstaAtivo(item, caminho) {
  if (caminho === item.rota) return true;
  if (item.chave === "consultar-catalogos") return /^\/catalogos\/[^/]+\/(visualizar|editar)$/.test(caminho);
  if (item.chave === "gestao-usuarios-sistema") return caminho === "/log-sistema";
  return false;
}
