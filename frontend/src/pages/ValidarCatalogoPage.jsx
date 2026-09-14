import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import { validarCatalogo } from "../services/catalogoService.js";
import { extrairErroApi } from "../services/api.js";

const OPCOES_TENSAO = [
  { valor: "V127", rotulo: "127V" },
  { valor: "V220", rotulo: "220V" },
  { valor: "BIVOLT", rotulo: "Bivolt" },
  { valor: "NAO_INFORMADO", rotulo: "Não informado" },
];

function faixaConfianca(valor) {
  if (valor === null || valor === undefined) return null;
  if (valor >= 75) return "alta";
  if (valor >= 50) return "media";
  return "baixa";
}

function BarraConfianca({ valor }) {
  const faixa = faixaConfianca(valor);
  if (faixa === null) return null;
  return (
    <div className="confidence-bar" title={`${valor}% de confiança`}>
      <div className={`confidence-bar__fill confidence-bar__fill--${faixa}`} style={{ width: `${valor}%` }} />
    </div>
  );
}

let contadorNovaPeca = 0;

/**
 * RF08 — Interface de Validação (HITL). Tela dividida: documento original à
 * esquerda (pré-visualização client-side do PDF já selecionado no RF06 — não
 * existe endpoint de download aqui, então dependemos do File já em memória) e
 * o formulário com os dados extraídos (RF07) à direita, para revisão humana.
 */
function ValidarCatalogoPage() {
  const navigate = useNavigate();
  const { id: catalogoId } = useParams();
  const location = useLocation();
  const resultadoInicial = location.state?.resultado;
  const arquivo = location.state?.arquivo;
  // RF10/A1 — quando esta tela é aberta a partir da fila de pendentes, não há
  // um File em memória (o documento já foi importado há mais tempo); a tela
  // de Documentos Pendentes busca o PDF via GET /catalogos/:id/arquivo e passa
  // a URL já pronta aqui, em vez do File cru do RF06/RF08.
  const pdfUrlPronta = location.state?.pdfUrl;

  const pdfUrl = useMemo(
    () => pdfUrlPronta ?? (arquivo ? URL.createObjectURL(arquivo) : null),
    [arquivo, pdfUrlPronta]
  );
  useEffect(() => () => !pdfUrlPronta && pdfUrl && URL.revokeObjectURL(pdfUrl), [pdfUrl, pdfUrlPronta]);

  const [marca, setMarca] = useState(resultadoInicial?.marca ?? "");
  const [modelo, setModelo] = useState(resultadoInicial?.modelo ?? "");
  const [tensao, setTensao] = useState(resultadoInicial?.tensao ?? "");
  const [pecas, setPecas] = useState(resultadoInicial?.pecas ?? []);
  const [erroCampos, setErroCampos] = useState({});
  const [mensagemErro, setMensagemErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const confiancaCampos = resultadoInicial?.confiancaCampos ?? {};
  const confiancaGeral = resultadoInicial?.confiancaGeral;

  useEffect(() => {
    // Sem o resultado em memória (ex.: a página foi recarregada, perdendo o
    // state de navegação), a saída consistente é reimportar o documento. Se o
    // catálogo já estava IRRESOLUVEL, ele continua acessível pela fila de
    // pendentes (RF10) — não precisamos tratar esse caso aqui.
    if (!resultadoInicial) {
      navigate("/catalogos/importar", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!resultadoInicial) {
    return null;
  }

  function atualizarPeca(indice, campo, valor) {
    setPecas((atual) => atual.map((peca, i) => (i === indice ? { ...peca, [campo]: valor } : peca)));
    setErroCampos((atual) => ({ ...atual, [`pecas.${indice}.${campo}`]: undefined }));
  }

  function adicionarPeca() {
    contadorNovaPeca += 1;
    setPecas((atual) => [
      ...atual,
      { id: null, codigo: "", descricao: "", posicaoVisual: "", confianca: null, chaveTemp: `nova-${contadorNovaPeca}` },
    ]);
  }

  function removerPeca(indice) {
    setPecas((atual) => atual.filter((_, i) => i !== indice));
  }

  async function aoSalvar() {
    setMensagemErro("");
    setErroCampos({});
    setSalvando(true);
    try {
      await validarCatalogo(catalogoId, { marca, modelo, tensao, pecas });
      setSalvo(true);
    } catch (erro) {
      const { mensagem, campos } = extrairErroApi(erro);
      setMensagemErro(mensagem);
      setErroCampos(campos);
      // RF08/E2 — os dados preenchidos permanecem no estado (nada é limpo aqui),
      // para que o ator não precise digitar tudo de novo numa nova tentativa.
    } finally {
      setSalvando(false);
    }
  }

  function confirmarCancelamento() {
    setConfirmandoCancelamento(false);
    navigate("/catalogos/importar", { replace: true });
  }

  if (salvo) {
    return (
      <>
        <TopBar mostrarVoltar={false} />
        <div className="page-content">
          <div className="content-card">
            <div className="alert alert--success">Dados validados e salvos com sucesso.</div>
            <div className="form-actions">
              <button type="button" className="btn btn--outline" onClick={() => navigate("/menu")}>
                Ir para o menu
              </button>
              <button type="button" className="btn btn--primary" onClick={() => navigate("/catalogos/importar")}>
                Importar outro catálogo
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
            {typeof confiancaGeral === "number" && <span className="badge badge--confianca">{confiancaGeral}% confiança geral</span>}
          </div>

          {mensagemErro && <div className="alert alert--error">{mensagemErro}</div>}
          {resultadoInicial.motivoPendencia && <div className="alert alert--aviso">{resultadoInicial.motivoPendencia}</div>}

          <div className="field">
            <label htmlFor="marca">Marca</label>
            <input id="marca" value={marca} onChange={(e) => setMarca(e.target.value)} className={erroCampos.marca ? "field--invalid" : ""} />
            <BarraConfianca valor={confiancaCampos.marca} />
            {erroCampos.marca && <p className="field__error">{erroCampos.marca}</p>}
          </div>

          <div className="field">
            <label htmlFor="modelo">Modelo</label>
            <input id="modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} className={erroCampos.modelo ? "field--invalid" : ""} />
            <BarraConfianca valor={confiancaCampos.modelo} />
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
            <BarraConfianca valor={confiancaCampos.tensao} />
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
                  />
                </div>
                <button type="button" className="icon-btn icon-btn--danger" title="Remover peça" onClick={() => removerPeca(indice)}>
                  ×
                </button>
              </div>
              <BarraConfianca valor={peca.confianca} />
            </div>
          ))}

          <button type="button" className="btn btn--outline btn--sm" onClick={adicionarPeca}>
            + Adicionar peça
          </button>

          <div className="form-actions">
            <button type="button" className="btn btn--outline" onClick={() => setConfirmandoCancelamento(true)} disabled={salvando}>
              Cancelar
            </button>
            <button type="button" className="btn btn--primary" onClick={aoSalvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Validar e Salvar"}
            </button>
          </div>
        </div>
      </div>

      {confirmandoCancelamento && (
        <ConfirmModal
          titulo="Cancelar validação"
          mensagem="Deseja realmente cancelar? Os dados extraídos desta sessão serão descartados; será necessário importar o documento novamente."
          textoConfirmar="Cancelar validação"
          onConfirmar={confirmarCancelamento}
          onCancelar={() => setConfirmandoCancelamento(false)}
        />
      )}
    </>
  );
}

export default ValidarCatalogoPage;
