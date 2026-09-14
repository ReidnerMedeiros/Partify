import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import {
  listarDocumentosPendentes,
  buscarDocumentoPendente,
  buscarArquivoCatalogo,
  reextrairCatalogo,
  excluirDocumentoPendente,
} from "../services/catalogoService.js";
import { extrairErroApi } from "../services/api.js";

const ROTULO_SITUACAO = {
  PENDENTE: "Pendente",
  IRRESOLUVEL: "Irresolúvel",
};

const ROTULO_CAMPO = {
  marca: "Marca",
  modelo: "Modelo",
  tensao: "Tensão",
};

function IconFile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

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

function formatarData(iso) {
  return iso ? new Date(iso).toLocaleString("pt-BR") : "—";
}

/**
 * RF10 — Manter Documentos Pendentes. Fila dos catálogos IRRESOLUVEL (RF07/A1
 * extração parcial ou E2 documento ilegível) que ainda não chegaram a
 * PENDENTE_VALIDACAO nem VALIDADO. "Preencher" reaproveita a própria tela de
 * validação do RF08 (busca o documento + o PDF por id e navega com esses
 * dados em memória, no mesmo formato que o RF06/07 já usam ao encadear para
 * lá). "Reenviar para IA" reaproveita o endpoint de nova tentativa do RF07/E1
 * (POST /catalogos/:id/extrair) — nenhum backend novo foi necessário para essa
 * ação. "Excluir" remove o documento por completo (RF10/A3, diferente da
 * exclusão de peça do RF09/A4).
 */
function DocumentosPendentesPage() {
  const navigate = useNavigate();

  const [documentos, setDocumentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagemErro, setMensagemErro] = useState("");
  const [mensagemInfo, setMensagemInfo] = useState("");

  const [preenchendoId, setPreenchendoId] = useState(null);
  const [confirmacao, setConfirmacao] = useState(null); // { tipo: "reenviar" | "excluir", documento }
  const [processandoConfirmacao, setProcessandoConfirmacao] = useState(false);

  useEffect(() => {
    carregarDocumentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarDocumentos() {
    setCarregando(true);
    setMensagemErro("");
    try {
      const lista = await listarDocumentosPendentes();
      setDocumentos(lista);
    } catch (erro) {
      setMensagemErro(extrairErroApi(erro).mensagem);
    } finally {
      setCarregando(false);
    }
  }

  async function aoPreencher(documento) {
    setMensagemErro("");
    setMensagemInfo("");
    setPreenchendoId(documento.id);
    try {
      const [catalogo, pdfUrl] = await Promise.all([
        buscarDocumentoPendente(documento.id),
        buscarArquivoCatalogo(documento.id),
      ]);
      navigate(`/catalogos/${documento.id}/validar`, { state: { resultado: catalogo, pdfUrl } });
    } catch (erro) {
      setMensagemErro(extrairErroApi(erro).mensagem);
      setPreenchendoId(null);
    }
  }

  async function confirmarReenvio() {
    const documento = confirmacao.documento;
    setProcessandoConfirmacao(true);
    setMensagemErro("");
    setMensagemInfo("");
    try {
      const resposta = await reextrairCatalogo(documento.id);
      if (resposta.catalogo.status !== "IRRESOLUVEL") {
        const pdfUrl = await buscarArquivoCatalogo(documento.id);
        navigate(`/catalogos/${documento.id}/validar`, { state: { resultado: resposta.catalogo, pdfUrl } });
        return;
      }
      setConfirmacao(null);
      setMensagemInfo("O documento foi reprocessado, mas ainda há dados pendentes de preenchimento manual.");
      await carregarDocumentos();
    } catch (erro) {
      setMensagemErro(extrairErroApi(erro).mensagem);
    } finally {
      setProcessandoConfirmacao(false);
    }
  }

  async function confirmarExclusao() {
    const documento = confirmacao.documento;
    setProcessandoConfirmacao(true);
    setMensagemErro("");
    try {
      await excluirDocumentoPendente(documento.id);
      setDocumentos((atual) => atual.filter((d) => d.id !== documento.id));
      setConfirmacao(null);
    } catch (erro) {
      setMensagemErro(extrairErroApi(erro).mensagem);
    } finally {
      setProcessandoConfirmacao(false);
    }
  }

  return (
    <>
      <TopBar mostrarVoltar />

      <div className="page-content">
        <div className="content-card content-card--wide">
          <h2>Documentos Pendentes</h2>
          <p className="content-card__subtitle">
            Documentos que a extração automática (RF07) não conseguiu concluir sozinha.
          </p>

          {mensagemErro && <div className="alert alert--error">{mensagemErro}</div>}
          {mensagemInfo && <div className="alert alert--aviso">{mensagemInfo}</div>}

          {carregando ? (
            <p className="table-card__estado">Carregando...</p>
          ) : documentos.length === 0 ? (
            <p className="table-card__estado">Nenhum documento pendente.</p>
          ) : (
            <div className="pendentes-lista">
              {documentos.map((documento) => (
                <div className="pendente-card" key={documento.id}>
                  <div className="pendente-card__topo">
                    <div className="pendente-card__arquivo">
                      <IconFile />
                      <span>{documento.nomeArquivo}</span>
                    </div>
                    <div className="pendente-card__badges">
                      <span className={`badge badge--situacao-${documento.situacao.toLowerCase()}`}>
                        {ROTULO_SITUACAO[documento.situacao] ?? documento.situacao}
                      </span>
                      {typeof documento.confiancaGeral === "number" && (
                        <span className="badge badge--confianca">{documento.confiancaGeral}% confiança</span>
                      )}
                    </div>
                  </div>

                  <p className="pendente-card__info">
                    Importado em {formatarData(documento.criadoEm)}
                    {documento.motivoPendencia ? ` · ${documento.motivoPendencia}` : ""}
                  </p>

                  {documento.camposAusentes?.length > 0 && (
                    <div className="pendente-card__campos-ausentes">
                      <span className="pendente-card__campos-ausentes-rotulo">Campos ausentes:</span>
                      {documento.camposAusentes.map((campo) => (
                        <span key={campo} className="badge badge--campo-ausente">
                          {ROTULO_CAMPO[campo] ?? campo}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pendente-card__acoes">
                    <button
                      type="button"
                      className="btn btn--outline btn--sm"
                      onClick={() => aoPreencher(documento)}
                      disabled={preenchendoId === documento.id}
                    >
                      <IconEdit /> {preenchendoId === documento.id ? "Abrindo..." : "Preencher"}
                    </button>
                    <button
                      type="button"
                      className="btn btn--outline-info btn--sm"
                      onClick={() => setConfirmacao({ tipo: "reenviar", documento })}
                      disabled={preenchendoId === documento.id}
                    >
                      <IconRefresh /> Reenviar para IA
                    </button>
                    <button
                      type="button"
                      className="btn btn--outline-danger btn--sm"
                      onClick={() => setConfirmacao({ tipo: "excluir", documento })}
                      disabled={preenchendoId === documento.id}
                    >
                      <IconTrash /> Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirmacao?.tipo === "reenviar" && (
        <ConfirmModal
          titulo="Reenviar para IA"
          mensagem={`O documento "${confirmacao.documento.nomeArquivo}" será reprocessado do zero pela Gemini API, descartando os dados já identificados. Deseja continuar?`}
          confirmando={processandoConfirmacao}
          textoConfirmar="Reenviar"
          onConfirmar={confirmarReenvio}
          onCancelar={() => setConfirmacao(null)}
        />
      )}

      {confirmacao?.tipo === "excluir" && (
        <ConfirmModal
          titulo="Excluir documento"
          mensagem={`Deseja realmente excluir "${confirmacao.documento.nomeArquivo}" da fila de pendentes? Esta ação não pode ser desfeita.`}
          confirmando={processandoConfirmacao}
          textoConfirmar="Excluir"
          onConfirmar={confirmarExclusao}
          onCancelar={() => setConfirmacao(null)}
        />
      )}
    </>
  );
}

export default DocumentosPendentesPage;
