import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import { listarPecas, excluirPeca } from "../services/catalogoService.js";
import { extrairErroApi } from "../services/api.js";

const ROTULO_TENSAO = {
  V127: "127V",
  V220: "220V",
  BIVOLT: "Bivolt",
  NAO_INFORMADO: "Não informado",
};

function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
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
  return iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";
}

/**
 * RF09 — Manter Catálogo, fluxo alternativo A2 (Consulta de registros). Lista
 * as peças já validadas (RF08), com filtros por marca/modelo/código — só
 * catálogos VALIDADO aparecem aqui; pendentes/irresolúveis têm sua própria
 * fila em "Documentos Pendentes" (RF10, ver DocumentosPendentesPage).
 */
function CatalogoPage() {
  const navigate = useNavigate();

  const [pecas, setPecas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagemErro, setMensagemErro] = useState("");

  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [codigo, setCodigo] = useState("");

  const [pecaParaExcluir, setPecaParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    carregarPecas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opções da marca derivadas da própria listagem (sem filtro), já que não
  // existe hoje um endpoint dedicado para "todas as marcas da empresa".
  const [marcasDisponiveis, setMarcasDisponiveis] = useState([]);

  async function carregarPecas(filtros) {
    setCarregando(true);
    setMensagemErro("");
    try {
      const lista = await listarPecas(filtros);
      setPecas(lista);
      if (!filtros) {
        setMarcasDisponiveis([...new Set(lista.map((p) => p.marca).filter(Boolean))].sort());
      }
    } catch (erro) {
      setMensagemErro(extrairErroApi(erro).mensagem);
    } finally {
      setCarregando(false);
    }
  }

  function aoConsultar() {
    carregarPecas({ marca, modelo, codigo });
  }

  async function confirmarExclusao() {
    if (!pecaParaExcluir) return;
    setExcluindo(true);
    setMensagemErro("");
    try {
      await excluirPeca(pecaParaExcluir.id);
      setPecas((atual) => atual.filter((p) => p.id !== pecaParaExcluir.id));
      setPecaParaExcluir(null);
    } catch (erro) {
      setMensagemErro(extrairErroApi(erro).mensagem);
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <>
      <TopBar mostrarVoltar />

      <div className="page-content">
        <div className="content-card content-card--wide">
          <h2>Manter Catálogo</h2>

          {mensagemErro && <div className="alert alert--error">{mensagemErro}</div>}

          <div className="filtros-row">
            <div className="field">
              <label htmlFor="filtro-marca">Marca</label>
              <select id="filtro-marca" value={marca} onChange={(e) => setMarca(e.target.value)}>
                <option value="">Todas</option>
                {marcasDisponiveis.map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="filtro-modelo">Modelo</label>
              <input id="filtro-modelo" placeholder="Ex: GWS 9-125S" value={modelo} onChange={(e) => setModelo(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="filtro-codigo">Código da Peça</label>
              <input id="filtro-codigo" placeholder="Ex: 1600A004GD" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            </div>
            <button type="button" className="btn btn--primary" onClick={aoConsultar} disabled={carregando}>
              Consultar
            </button>
          </div>

          <div className="table-card">
            {carregando ? (
              <p className="table-card__estado">Carregando...</p>
            ) : pecas.length === 0 ? (
              <p className="table-card__estado">Nenhuma peça validada encontrada.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descrição</th>
                    <th>Marca</th>
                    <th>Modelo</th>
                    <th>Tensão</th>
                    <th>Validado por</th>
                    <th>Data</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pecas.map((peca) => (
                    <tr key={peca.id}>
                      <td>
                        <span className="table-link">{peca.codigo}</span>
                      </td>
                      <td>{peca.descricao || "—"}</td>
                      <td>{peca.marca}</td>
                      <td>{peca.modelo}</td>
                      <td>
                        <span className="badge badge--confianca">{ROTULO_TENSAO[peca.tensao] ?? peca.tensao}</span>
                      </td>
                      <td>{peca.validadoPor ?? "—"}</td>
                      <td>{formatarData(peca.validadoEm)}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            title="Editar"
                            onClick={() => navigate(`/catalogos/${peca.catalogoId}/editar`)}
                          >
                            <IconEdit />
                          </button>
                          <button
                            type="button"
                            className="icon-btn icon-btn--danger"
                            title="Excluir"
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
        </div>
      </div>

      {pecaParaExcluir && (
        <ConfirmModal
          titulo="Excluir peça"
          mensagem={`Deseja realmente excluir a peça "${pecaParaExcluir.codigo}"? Esta ação não pode ser desfeita.`}
          confirmando={excluindo}
          textoConfirmar="Excluir"
          onConfirmar={confirmarExclusao}
          onCancelar={() => setPecaParaExcluir(null)}
        />
      )}
    </>
  );
}

export default CatalogoPage;
