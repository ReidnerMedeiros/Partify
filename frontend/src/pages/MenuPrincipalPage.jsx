import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { montarSecoesMenu } from "../components/menuItens.jsx";
import { useSair } from "../components/useSair.jsx";
import { obterUsuario } from "../services/authService.js";
import { listarDocumentosPendentes, listarCatalogosValidados } from "../services/catalogoService.js";

const ROTULO_TENSAO = {
  V127: "127V",
  V220: "220V",
  BIVOLT: "Bivolt",
};

function formatarData(iso) {
  return iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";
}

function descreverCatalogo(catalogo) {
  return [catalogo.marca, catalogo.modelo].filter(Boolean).join(" ") || "Sem marca e modelo";
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

/**
 * Tela inicial após o login (RF02). Ponto central de navegação do sistema.
 * Em telas largas a barra lateral já oferece a navegação e o "Sair"; em telas
 * estreitas (sem barra lateral) este menu em tela cheia é a navegação, com o
 * botão "Sair" (RF02-A1) e a mesma confirmação em duas etapas (RNF03).
 */
function MenuPrincipalPage() {
  const navigate = useNavigate();
  const { pedirSaida, modalSaida } = useSair();
  const [pendentes, setPendentes] = useState(null);
  const [validados, setValidados] = useState(null);
  const secoesMenu = montarSecoesMenu(obterUsuario());
  const totalPendentes = pendentes?.length ?? 0;

  // Resumo da visão geral e selo de pendentes. São só avisos: se a consulta
  // falhar, o menu aparece normalmente e os números ficam como "—".
  useEffect(() => {
    let cancelado = false;
    listarDocumentosPendentes()
      .then((documentos) => {
        if (!cancelado) setPendentes(documentos);
      })
      .catch(() => {});
    listarCatalogosValidados()
      .then((lista) => {
        if (!cancelado) setValidados(lista);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  const totalPecas = validados?.reduce((soma, catalogo) => soma + (catalogo.totalPecas ?? 0), 0);
  const totalMarcas = validados ? new Set(validados.map((catalogo) => catalogo.marca).filter(Boolean)).size : undefined;
  const aguardandoValidacao = pendentes?.filter((documento) => documento.situacao === "PENDENTE").length;
  const extracaoIncompleta = pendentes?.filter((documento) => documento.situacao === "IRRESOLUVEL").length;
  const ultimosValidados = validados
    ? [...validados].sort((a, b) => new Date(b.validadoEm ?? 0) - new Date(a.validadoEm ?? 0)).slice(0, 5)
    : [];

  return (
    <>
      <TopBar mostrarVoltar={false} />
      <div className="page-content page-content--fundo-pecas">
        {/* Telas largas: visão geral (a navegação fica na barra lateral). */}
        <section className="painel-inicio" aria-label="Visão geral">
          <h2 className="painel-inicio__titulo">Visão geral</h2>

          <div className="painel-inicio__cards">
            <div className="painel-card">
              <span className="painel-card__rotulo">Catálogos validados</span>
              <strong className="painel-card__valor">{validados ? validados.length : "—"}</strong>
              <span className="painel-card__detalhe">
                {totalMarcas === undefined ? " " : `${totalMarcas} ${totalMarcas === 1 ? "marca" : "marcas"}`}
              </span>
            </div>
            <div className="painel-card">
              <span className="painel-card__rotulo">Peças cadastradas</span>
              <strong className="painel-card__valor">{totalPecas ?? "—"}</strong>
              <span className="painel-card__detalhe">disponíveis nas consultas</span>
            </div>
            <div className="painel-card">
              <span className="painel-card__rotulo">Documentos pendentes</span>
              <strong className="painel-card__valor">{pendentes ? pendentes.length : "—"}</strong>
              <span className="painel-card__detalhe">
                {pendentes ? `${aguardandoValidacao} aguardando validação ` : " "}
              </span>
            </div>
          </div>

          <div className="painel-inicio__lista">
            <h3>Últimos catálogos validados</h3>
            {validados && ultimosValidados.length === 0 ? (
              <p className="table-card__estado">Nenhum catálogo validado ainda.</p>
            ) : (
              <div className="table-card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Catálogo</th>
                      <th>Tensão</th>
                      <th>Peças</th>
                      <th>Validado por</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimosValidados.map((catalogo) => (
                      <tr key={catalogo.id}>
                        <td>{descreverCatalogo(catalogo)}</td>
                        <td>{ROTULO_TENSAO[catalogo.tensao] ?? "—"}</td>
                        <td>{catalogo.totalPecas}</td>
                        <td>{catalogo.validadoPor ?? "—"}</td>
                        <td className="col-data-hora">{formatarData(catalogo.validadoEm)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
