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
  const [copiadoId, setCopiadoId] = useState(null);

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

  async function aoCopiarCodigo(id, codigo) {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiadoId(id);
      setTimeout(() => setCopiadoId((atual) => (atual === id ? null : atual)), 1500);
    } catch {
      setMensagemErro("Não foi possível copiar o código. Selecione e copie manualmente.");
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
            <div className="segmentado" role="group" aria-label="Ordenar resultados">
              <button
                type="button"
                className={`segmentado__opcao ${modo === "semantica" ? "segmentado__opcao--ativa" : ""}`}
                aria-pressed={modo === "semantica"}
                onClick={() => setModo("semantica")}
              >
                Por descrição
              </button>
              <button
                type="button"
                className={`segmentado__opcao ${modo === "codigo_exato" ? "segmentado__opcao--ativa" : ""}`}
                aria-pressed={modo === "codigo_exato"}
                onClick={() => setModo("codigo_exato")}
              >
                Por código
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
              Ainda não há componentes validados nesta instância. Importe e valide catálogos técnicos em &quot;Importar Catálogo&quot; antes de
              buscar.
            </p>
          )}

          {buscou && !semRegistrosNaBase && resultados.length === 0 && (
            <p className="table-card__estado">
              Nenhum componente encontrado para os critérios informados. Tente reformular a busca ou use a Consulta Técnica (IA)
              para perguntar em linguagem natural.
            </p>
          )}

          {buscou && !semRegistrosNaBase && resultados.length > 0 && (
            <div className="table-card">
              <table className="data-table data-table--cartoes">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Pos.</th>
                    <th>Qtd.</th>
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
                      <td data-label="Código">
                        <span className="codigo-peca">
                          <span className="table-link">{item.codigo}</span>
                          {item.correspondenciaExata && <span className="badge badge--exato">Exato</span>}
                          <button
                            type="button"
                            className="btn-copiar"
                            onClick={() => aoCopiarCodigo(item.id, item.codigo)}
                            aria-label={`Copiar código ${item.codigo}`}
                          >
                            {copiadoId === item.id ? "Copiado" : "Copiar"}
                          </button>
                        </span>
                      </td>
                      <td data-label="Pos.">{item.posicaoVisual || "—"}</td>
                      <td data-label="Qtd.">{item.quantidade ?? "—"}</td>
                      <td data-label="Descrição">{item.descricao || "—"}</td>
                      <td data-label="Marca">{item.marca}</td>
                      <td data-label="Modelo">
                        <span className="table-link">{item.modelo}</span>
                      </td>
                      <td data-label="Tensão">
                        <span className="badge badge--confianca">{ROTULO_TENSAO[item.tensao] ?? item.tensao}</span>
                      </td>
                      <td data-label="Ações">
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
