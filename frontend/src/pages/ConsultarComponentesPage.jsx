import { useState } from "react";
import TopBar from "../components/TopBar.jsx";
import { buscarComponentes } from "../services/consultaService.js";
import { buscarArquivoCatalogo } from "../services/catalogoService.js";
import { extrairErroApi } from "../services/api.js";

const MARCAS = ["Bosch", "Makita", "DeWalt"];

const OPCOES_TENSAO = [
  { valor: "V127", rotulo: "127V" },
  { valor: "V220", rotulo: "220V" },
  { valor: "BIVOLT", rotulo: "Bivolt" },
];

const ROTULO_TENSAO = { V127: "127V", V220: "220V", BIVOLT: "Bivolt", NAO_INFORMADO: "Não informado" };

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

/**
 * RF11 — Consulta de Componentes (Agente de Consulta). Fluxo básico + A2
 * (busca sem filtros) + E1 (nenhum resultado) + E2 (base sem registros
 * validados). Os botões "Busca Semântica"/"Busca por Código Exato" só
 * escolhem o `modo` de ORDENAÇÃO do resultado combinado — o backend sempre
 * roda os dois motores (SQL exato + pgvector) juntos, como o DERS descreve
 * (ver CONTEXTO.md); o botão "Buscar" é quem de fato dispara a consulta.
 */
function ConsultarComponentesPage() {
  const [termo, setTermo] = useState("");
  const [marca, setMarca] = useState("");
  const [tensao, setTensao] = useState("");
  const [modo, setModo] = useState("semantica");

  const [buscou, setBuscou] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [resultados, setResultados] = useState([]);
  const [semRegistrosNaBase, setSemRegistrosNaBase] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");
  const [erroCampos, setErroCampos] = useState({});
  const [abrindoId, setAbrindoId] = useState(null);

  async function aoBuscar() {
    setMensagemErro("");
    setErroCampos({});
    setCarregando(true);
    try {
      const data = await buscarComponentes({ termo, marca, tensao, modo });
      setResultados(data.resultados);
      setSemRegistrosNaBase(data.semRegistrosNaBase);
      setBuscou(true);
    } catch (erro) {
      const { mensagem, campos } = extrairErroApi(erro);
      setMensagemErro(mensagem);
      setErroCampos(campos);
    } finally {
      setCarregando(false);
    }
  }

  async function aoVerVistaExplodida(catalogoId) {
    setAbrindoId(catalogoId);
    try {
      const url = await buscarArquivoCatalogo(catalogoId);
      // RF11/A1 — "interface de visualização dedicada, permitindo zoom e
      // navegação pelo documento": reaproveita o visualizador nativo de PDF
      // do navegador (abre numa nova aba), que já oferece zoom/paginação sem
      // exigir uma dependência de renderização própria (ex.: pdf.js).
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (erro) {
      setMensagemErro(extrairErroApi(erro).mensagem);
    } finally {
      setAbrindoId(null);
    }
  }

  return (
    <>
      <TopBar mostrarVoltar />

      <div className="page-content">
      <div className="consulta-layout">
        <div className="content-card content-card--wide">
          <h2>Consultar Componentes</h2>

          {mensagemErro && <div className="alert alert--error">{mensagemErro}</div>}

          <div className="field">
            <label htmlFor="termo">Termo de busca</label>
            <input
              id="termo"
              placeholder="Digite o código da peça ou descrição técnica..."
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              className={erroCampos.termo ? "field--invalid" : ""}
            />
            {erroCampos.termo && <p className="field__error">{erroCampos.termo}</p>}
          </div>

          <div className="form-row">
            <div className="field">
              <label htmlFor="filtro-marca">Marca</label>
              <select id="filtro-marca" value={marca} onChange={(e) => setMarca(e.target.value)}>
                <option value="">Todas</option>
                {MARCAS.map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="filtro-tensao">Tensão</label>
              <select id="filtro-tensao" value={tensao} onChange={(e) => setTensao(e.target.value)}>
                <option value="">Todas</option>
                {OPCOES_TENSAO.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="consulta-acoes">
            <div className="consulta-modo">
              <button
                type="button"
                className={`btn btn--sm ${modo === "semantica" ? "btn--primary" : "btn--outline"}`}
                onClick={() => setModo("semantica")}
              >
                Busca Semântica
              </button>
              <button
                type="button"
                className={`btn btn--sm ${modo === "codigo_exato" ? "btn--primary" : "btn--outline"}`}
                onClick={() => setModo("codigo_exato")}
              >
                Busca por Código Exato
              </button>
            </div>
            <button type="button" className="btn btn--primary" onClick={aoBuscar} disabled={carregando}>
              {carregando ? (
                <>
                  <span className="spinner" role="status" aria-label="Buscando" />
                  Buscando...
                </>
              ) : (
                "Buscar"
              )}
            </button>
          </div>
        </div>

        <div className="content-card content-card--wide">
          {!buscou && !carregando && (
            <div className="empty-state">
              <span className="empty-state__icone">
                <IconSearch />
              </span>
              <p>Digite um termo para buscar componentes</p>
            </div>
          )}

          {buscou && semRegistrosNaBase && (
            <p className="table-card__estado">
              Ainda não há componentes validados nesta instância. Importe e valide catálogos técnicos em "Importar Catálogo" antes de
              buscar.
            </p>
          )}

          {buscou && !semRegistrosNaBase && resultados.length === 0 && (
            <p className="table-card__estado">
              Nenhum componente encontrado para os critérios informados. Tente reformular a busca (a consulta em linguagem natural do
              RF12 ainda não está disponível).
            </p>
          )}

          {buscou && !semRegistrosNaBase && resultados.length > 0 && (
            <div className="table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Pos.</th>
                    <th>Descrição</th>
                    <th>Marca</th>
                    <th>Modelo</th>
                    <th>Tensão</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="table-link">{item.codigo}</span>
                      </td>
                      <td>{item.posicaoVisual || "—"}</td>
                      <td>{item.descricao || "—"}</td>
                      <td>{item.marca}</td>
                      <td>
                        <span className="table-link">{item.modelo}</span>
                      </td>
                      <td>
                        <span className="badge badge--confianca">{ROTULO_TENSAO[item.tensao] ?? item.tensao}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => aoVerVistaExplodida(item.catalogoId)}
                          disabled={abrindoId === item.catalogoId}
                        >
                          {abrindoId === item.catalogoId ? "Abrindo..." : "Ver Vista Explodida"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}

export default ConsultarComponentesPage;
