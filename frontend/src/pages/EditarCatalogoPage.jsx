import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import { buscarCatalogo, buscarArquivoCatalogo, atualizarCatalogo } from "../services/catalogoService.js";
import { extrairErroApi } from "../services/api.js";

const OPCOES_TENSAO = [
  { valor: "V127", rotulo: "127V" },
  { valor: "V220", rotulo: "220V" },
  { valor: "BIVOLT", rotulo: "Bivolt" },
  { valor: "NAO_INFORMADO", rotulo: "Não informado" },
];

let contadorNovaPeca = 0;

/**
 * RF09 — Manter Catálogo, fluxo alternativo A3 (Atualização de registro).
 * Tela dividida como o RF08, mas sem as barras de confiança da IA (o catálogo
 * já foi validado por um humano) e carregando os dados do servidor em vez de
 * receber via navegação — o documento original também precisa ser rebaixado
 * (GET /catalogos/:id/arquivo), já que não está mais em memória no navegador.
 */
function EditarCatalogoPage() {
  const navigate = useNavigate();
  const { id: catalogoId } = useParams();

  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState("");
  const [pdfUrl, setPdfUrl] = useState(null);

  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [tensao, setTensao] = useState("");
  const [pecas, setPecas] = useState([]);
  const [erroCampos, setErroCampos] = useState({});
  const [mensagemErro, setMensagemErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);

  useEffect(() => {
    carregarCatalogo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogoId]);

  async function carregarCatalogo() {
    setCarregando(true);
    setErroCarregamento("");
    try {
      const [catalogo, urlArquivo] = await Promise.all([
        buscarCatalogo(catalogoId),
        buscarArquivoCatalogo(catalogoId).catch(() => null),
      ]);
      setMarca(catalogo.marca ?? "");
      setModelo(catalogo.modelo ?? "");
      setTensao(catalogo.tensao ?? "");
      setPecas(catalogo.pecas ?? []);
      setPdfUrl(urlArquivo);
    } catch (erro) {
      setErroCarregamento(extrairErroApi(erro).mensagem);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    return () => pdfUrl && URL.revokeObjectURL(pdfUrl);
  }, [pdfUrl]);

  function atualizarPeca(indice, campo, valor) {
    setPecas((atual) => atual.map((peca, i) => (i === indice ? { ...peca, [campo]: valor } : peca)));
    setErroCampos((atual) => ({ ...atual, [`pecas.${indice}.${campo}`]: undefined }));
  }

  function adicionarPeca() {
    contadorNovaPeca += 1;
    setPecas((atual) => [...atual, { id: null, codigo: "", descricao: "", posicaoVisual: "", chaveTemp: `nova-${contadorNovaPeca}` }]);
  }

  function removerPeca(indice) {
    setPecas((atual) => atual.filter((_, i) => i !== indice));
  }

  async function aoSalvar() {
    setMensagemErro("");
    setErroCampos({});
    setSalvando(true);
    try {
      await atualizarCatalogo(catalogoId, { marca, modelo, tensao, pecas });
      navigate("/catalogos");
    } catch (erro) {
      const { mensagem, campos } = extrairErroApi(erro);
      setMensagemErro(mensagem);
      setErroCampos(campos);
    } finally {
      setSalvando(false);
    }
  }

  function confirmarCancelamento() {
    setConfirmandoCancelamento(false);
    navigate("/catalogos");
  }

  if (carregando) {
    return (
      <>
        <TopBar mostrarVoltar />
        <div className="page-content">
          <div className="content-card">
            <p className="table-card__estado">Carregando...</p>
          </div>
        </div>
      </>
    );
  }

  if (erroCarregamento) {
    return (
      <>
        <TopBar mostrarVoltar />
        <div className="page-content">
          <div className="content-card">
            <div className="alert alert--error">{erroCarregamento}</div>
            <div className="form-actions">
              <button type="button" className="btn btn--outline" onClick={() => navigate("/catalogos")}>
                Voltar
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar mostrarVoltar />

      <div className="page-content page-content--split">
        <div className="split-panel split-panel--documento">
          <h3>Documento Original</h3>
          <div className="pdf-preview">
            {pdfUrl ? (
              <iframe src={pdfUrl} title="Documento original" className="pdf-preview__frame" />
            ) : (
              <p className="pdf-preview__vazio">PDF Preview</p>
            )}
          </div>
        </div>

        <div className="split-panel split-panel--dados">
          <div className="split-panel__cabecalho">
            <h3>Dados Extraídos</h3>
          </div>

          {mensagemErro && <div className="alert alert--error">{mensagemErro}</div>}

          <div className="field">
            <label htmlFor="marca">Marca</label>
            <input id="marca" value={marca} onChange={(e) => setMarca(e.target.value)} className={erroCampos.marca ? "field--invalid" : ""} />
            {erroCampos.marca && <p className="field__error">{erroCampos.marca}</p>}
          </div>

          <div className="field">
            <label htmlFor="modelo">Modelo</label>
            <input id="modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} className={erroCampos.modelo ? "field--invalid" : ""} />
            {erroCampos.modelo && <p className="field__error">{erroCampos.modelo}</p>}
          </div>

          <div className="field">
            <label htmlFor="tensao">Tensão</label>
            <select id="tensao" value={tensao} onChange={(e) => setTensao(e.target.value)} className={erroCampos.tensao ? "field--invalid" : ""}>
              <option value="">Selecione...</option>
              {OPCOES_TENSAO.map((opcao) => (
                <option key={opcao.valor} value={opcao.valor}>
                  {opcao.rotulo}
                </option>
              ))}
            </select>
            {erroCampos.tensao && <p className="field__error">{erroCampos.tensao}</p>}
          </div>

          <h4 className="split-panel__subtitulo">Peças Identificadas</h4>
          {erroCampos.pecas && <p className="field__error">{erroCampos.pecas}</p>}

          {pecas.map((peca, indice) => (
            <div className="peca-row" key={peca.id ?? peca.chaveTemp ?? indice}>
              <div className="peca-row__campos">
                <div className="field">
                  <label htmlFor={`peca-codigo-${indice}`}>Código</label>
                  <input
                    id={`peca-codigo-${indice}`}
                    value={peca.codigo}
                    onChange={(e) => atualizarPeca(indice, "codigo", e.target.value)}
                    className={erroCampos[`pecas.${indice}.codigo`] ? "field--invalid" : ""}
                  />
                  {erroCampos[`pecas.${indice}.codigo`] && <p className="field__error">{erroCampos[`pecas.${indice}.codigo`]}</p>}
                </div>
                <div className="field">
                  <label htmlFor={`peca-descricao-${indice}`}>Descrição</label>
                  <input
                    id={`peca-descricao-${indice}`}
                    value={peca.descricao ?? ""}
                    onChange={(e) => atualizarPeca(indice, "descricao", e.target.value)}
                  />
                </div>
                <div className="field field--posicao">
                  <label htmlFor={`peca-posicao-${indice}`}>Posição</label>
                  <input
                    id={`peca-posicao-${indice}`}
                    value={peca.posicaoVisual ?? ""}
                    onChange={(e) => atualizarPeca(indice, "posicaoVisual", e.target.value)}
                    className={erroCampos[`pecas.${indice}.posicaoVisual`] ? "field--invalid" : ""}
                  />
                  {erroCampos[`pecas.${indice}.posicaoVisual`] && (
                    <p className="field__error">{erroCampos[`pecas.${indice}.posicaoVisual`]}</p>
                  )}
                </div>
                <button type="button" className="icon-btn icon-btn--danger" title="Remover peça" onClick={() => removerPeca(indice)}>
                  ×
                </button>
              </div>
            </div>
          ))}

          <button type="button" className="btn btn--outline btn--sm" onClick={adicionarPeca}>
            + Adicionar Peça
          </button>

          <div className="form-actions">
            <button type="button" className="btn btn--outline" onClick={() => setConfirmandoCancelamento(true)} disabled={salvando}>
              Cancelar
            </button>
            <button type="button" className="btn btn--primary" onClick={aoSalvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>
      </div>

      {confirmandoCancelamento && (
        <ConfirmModal
          titulo="Cancelar edição"
          mensagem="Deseja realmente cancelar? As alterações feitas nesta tela serão descartadas."
          textoConfirmar="Cancelar edição"
          onConfirmar={confirmarCancelamento}
          onCancelar={() => setConfirmandoCancelamento(false)}
        />
      )}
    </>
  );
}

export default EditarCatalogoPage;
