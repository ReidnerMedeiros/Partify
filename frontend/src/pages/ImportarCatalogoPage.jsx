import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { importarCatalogo, reextrairCatalogo } from "../services/catalogoService.js";
import { extrairErroApi } from "../services/api.js";

function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4" />
      <path d="M6 10l6-6 6 6" />
      <path d="M4 20h16" />
    </svg>
  );
}

/**
 * RF06 — fluxo básico + A1 (marca/modelo opcionais) + E1 (formato inválido).
 * Encadeia automaticamente com o RF07 (extração via IA): ao concluir o upload
 * com sucesso, o próprio backend já retorna os dados extraídos, e esta tela
 * navega direto para a validação (RF08) com o resultado em mãos — não existe,
 * neste projeto, uma fila/worker assíncrono separado (ver CONTEXTO.md).
 */
function ImportarCatalogoPage() {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [arquivo, setArquivo] = useState(null);
  const [arrastando, setArrastando] = useState(false);
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [processando, setProcessando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");
  const [erroCampos, setErroCampos] = useState({});
  const [catalogoPendenteRetentativa, setCatalogoPendenteRetentativa] = useState(null);

  function selecionarArquivo(arquivoSelecionado) {
    setMensagemErro("");
    setErroCampos({});
    setCatalogoPendenteRetentativa(null);
    if (arquivoSelecionado && arquivoSelecionado.type !== "application/pdf") {
      // Fluxo de exceção E1 — bloqueado já na seleção, antes de chamar o backend (RNF06).
      setMensagemErro("O sistema aceita exclusivamente arquivos em formato PDF.");
      return;
    }
    setArquivo(arquivoSelecionado ?? null);
  }

  function aoSoltarArquivo(evento) {
    evento.preventDefault();
    setArrastando(false);
    const arquivoSolto = evento.dataTransfer.files?.[0];
    selecionarArquivo(arquivoSolto);
  }

  async function processarResultado(resposta) {
    if (resposta.erroExtracao) {
      setMensagemErro(resposta.mensagem);
      setCatalogoPendenteRetentativa(resposta.catalogo.id);
      return;
    }

    navigate(`/catalogos/${resposta.catalogo.id}/validar`, {
      state: { resultado: resposta.catalogo, arquivo },
    });
  }

  async function aoImportar() {
    setMensagemErro("");
    setErroCampos({});
    setProcessando(true);
    try {
      const resposta = await importarCatalogo({ arquivo, marca, modelo });
      await processarResultado(resposta);
    } catch (erro) {
      const { mensagem, campos } = extrairErroApi(erro);
      setMensagemErro(mensagem);
      setErroCampos(campos);
    } finally {
      setProcessando(false);
    }
  }

  async function aoTentarNovamente() {
    setMensagemErro("");
    setProcessando(true);
    try {
      const resposta = await reextrairCatalogo(catalogoPendenteRetentativa, { marca, modelo });
      await processarResultado({ ...resposta, catalogo: resposta.catalogo });
    } catch (erro) {
      setMensagemErro(extrairErroApi(erro).mensagem);
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <TopBar mostrarVoltar />

      <div className="page-content">
        <div className="content-card">
          <h2>Importar Catálogo</h2>

          {mensagemErro && (
            <div className="alert alert--error">
              {mensagemErro}
              {catalogoPendenteRetentativa && (
                <button type="button" className="alert__acao" onClick={aoTentarNovamente} disabled={processando}>
                  Tentar novamente
                </button>
              )}
            </div>
          )}

          <div
            className={`upload-dropzone ${arrastando ? "upload-dropzone--ativa" : ""} ${erroCampos.arquivo ? "upload-dropzone--invalida" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={aoSoltarArquivo}
          >
            <span className="upload-dropzone__icone">
              <IconUpload />
            </span>
            <p className="upload-dropzone__titulo">{arquivo ? arquivo.name : "Clique ou arraste o arquivo aqui"}</p>
            <p className="upload-dropzone__subtitulo">PDF — máximo 50MB</p>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => selecionarArquivo(e.target.files?.[0])}
            />
          </div>
          {erroCampos.arquivo && <p className="field__error">{erroCampos.arquivo}</p>}

          <div className="form-row">
            <div className="field">
              <label htmlFor="marca">Marca (opcional)</label>
              <input id="marca" placeholder="Ex: Bosch" value={marca} onChange={(e) => setMarca(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="modelo">Modelo (opcional)</label>
              <input id="modelo" placeholder="Ex: GWS 9-125S" value={modelo} onChange={(e) => setModelo(e.target.value)} />
            </div>
          </div>
          <p className="content-card__subtitle">
            Informar marca e modelo ajuda a IA a identificar as peças com maior precisão.
          </p>

          <button type="button" className="btn btn--primary btn--block" onClick={aoImportar} disabled={!arquivo || processando}>
            {processando ? (
              <>
                <span className="spinner" role="status" aria-label="Processando" />
                Processando documento... isso pode levar alguns instantes
              </>
            ) : (
              "Importar e Extrair"
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export default ImportarCatalogoPage;
