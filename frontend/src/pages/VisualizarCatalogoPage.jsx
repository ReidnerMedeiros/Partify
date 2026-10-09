import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import { buscarCatalogo, buscarArquivoCatalogo, excluirPeca } from "../services/catalogoService.js";
import { extrairErroApi } from "../services/api.js";

const ROTULO_TENSAO = {
  V127: "127V",
  V220: "220V",
  BIVOLT: "Bivolt",
  NAO_INFORMADO: "Não informado",
};

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

/**
 * RF09 — visualização de um catálogo validado (somente leitura). Mostra a
 * identificação do catálogo e a lista de peças, com acesso ao PDF original e
 * ao botão Editar (A3). A exclusão de uma peça (A4) continua disponível aqui,
 * com confirmação em duas etapas (RNF03); qualquer alteração de dados é feita
 * na tela de edição.
 */
function VisualizarCatalogoPage() {
  const navigate = useNavigate();
  const { id: catalogoId } = useParams();

  const [carregando, setCarregando] = useState(true);
  const [catalogo, setCatalogo] = useState(null);
  const [mensagemErro, setMensagemErro] = useState("");
  const [abrindoPdf, setAbrindoPdf] = useState(false);

  const [pecaParaExcluir, setPecaParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setMensagemErro("");
      try {
        setCatalogo(await buscarCatalogo(catalogoId));
      } catch (erro) {
        setMensagemErro(extrairErroApi(erro).mensagem);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [catalogoId]);

  async function aoAbrirPdf() {
    setMensagemErro("");
    setAbrindoPdf(true);
    try {
      const url = await buscarArquivoCatalogo(catalogoId);
      window.open(url, "_blank", "noopener");
    } catch (erro) {
      setMensagemErro(extrairErroApi(erro).mensagem);
    } finally {
      setAbrindoPdf(false);
    }
  }

  async function confirmarExclusaoPeca() {
    if (!pecaParaExcluir) return;
    setExcluindo(true);
    setMensagemErro("");
    try {
      await excluirPeca(pecaParaExcluir.id);
      setCatalogo((atual) => ({ ...atual, pecas: atual.pecas.filter((p) => p.id !== pecaParaExcluir.id) }));
      setPecaParaExcluir(null);
    } catch (erro) {
      setMensagemErro(extrairErroApi(erro).mensagem);
    } finally {
      setExcluindo(false);
    }
  }

  const pecas = catalogo?.pecas ?? [];

  return (
    <>
      <TopBar mostrarVoltar />

      <div className="page-content">
        <div className="content-card content-card--wide">
          <h2>{catalogo ? [catalogo.marca, catalogo.modelo].filter(Boolean).join(" ") || "Catálogo" : "Catálogo"}</h2>

          {mensagemErro && <div className="alert alert--error">{mensagemErro}</div>}

          {carregando ? (
            <p className="table-card__estado">Carregando...</p>
          ) : catalogo ? (
            <>
              <p className="content-card__subtitle">
                {catalogo.nomeArquivo}
                {catalogo.tensao ? ` · ${ROTULO_TENSAO[catalogo.tensao] ?? catalogo.tensao}` : ""} · {pecas.length}{" "}
                {pecas.length === 1 ? "peça" : "peças"}
              </p>

              <div className="pendente-card__acoes">
                <button type="button" className="btn btn--outline-info btn--sm" onClick={() => navigate(`/catalogos/${catalogoId}/editar`)}>
                  Editar catálogo
                </button>
                <button type="button" className="btn btn--outline btn--sm" onClick={aoAbrirPdf} disabled={abrindoPdf}>
                  {abrindoPdf ? "Abrindo..." : "Abrir PDF original"}
                </button>
              </div>

              <div className="table-card">
                {pecas.length === 0 ? (
                  <p className="table-card__estado">Este catálogo não tem peças.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Pos.</th>
                        <th>Código</th>
                        <th>Qtd.</th>
                        <th>Descrição</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pecas.map((peca) => (
                        <tr key={peca.id}>
                          <td>{peca.posicaoVisual ?? "—"}</td>
                          <td>
                            <span className="table-link">{peca.codigo}</span>
                          </td>
                          <td>{peca.quantidade ?? "—"}</td>
                          <td>
                            {peca.descricao || "—"}
                            {peca.descricaoIncompleta && (
                              <span className="badge badge--campo-ausente" title="A descrição pode estar truncada no PDF original">
                                Descrição possivelmente incompleta
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="table-actions">
                              <button
                                type="button"
                                className="icon-btn icon-btn--danger"
                                title="Excluir peça"
                                onClick={() => setPecaParaExcluir(peca)}
                              >
                                <IconTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {pecaParaExcluir && (
        <ConfirmModal
          titulo="Excluir peça"
          mensagem={`Deseja realmente excluir a peça "${pecaParaExcluir.codigo}"? Esta ação não pode ser desfeita.`}
          confirmando={excluindo}
          textoConfirmar="Excluir"
          onConfirmar={confirmarExclusaoPeca}
          onCancelar={() => setPecaParaExcluir(null)}
        />
      )}
    </>
  );
}

export default VisualizarCatalogoPage;
