import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import { listarCatalogosValidados, excluirCatalogoValidado, buscarArquivoCatalogo } from "../services/catalogoService.js";
import { extrairErroApi } from "../services/api.js";

const ROTULO_TENSAO = {
  V127: "127V",
  V220: "220V",
  BIVOLT: "Bivolt",
  NAO_INFORMADO: "Não informado",
};

function IconFile() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
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

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
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

function descreverCatalogo(catalogo) {
  const identificacao = [catalogo.marca, catalogo.modelo].filter(Boolean).join(" ");
  return identificacao || "Sem marca e modelo";
}

/**
 * RF09 — Consultar Catálogos, fluxo alternativo A2 (Consulta de registros).
 * Lista os catálogos já validados (RF08), um cartão por documento, com filtros
 * por marca/modelo/código da peça (com o código, aparecem os catálogos que
 * contêm aquela peça). A busca peça a peça fica em "Consultar Componentes"
 * (RF11). Ações por cartão: Ver peças (tela só de leitura), Editar (A3), Baixar
 * PDF e Excluir o catálogo inteiro. Catálogos pendentes/irresolúveis têm sua
 * própria fila em "Documentos Pendentes" (RF10, ver DocumentosPendentesPage).
 */
function CatalogoPage() {
  const navigate = useNavigate();

  const [catalogos, setCatalogos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagemErro, setMensagemErro] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [codigo, setCodigo] = useState("");

  const [catalogoParaExcluir, setCatalogoParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [baixandoId, setBaixandoId] = useState(null);

  // Opções da marca derivadas da própria listagem (sem filtro), já que não
  // existe hoje um endpoint dedicado para "todas as marcas da empresa".
  const [marcasDisponiveis, setMarcasDisponiveis] = useState([]);

  useEffect(() => {
    carregarCatalogos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarCatalogos(filtros) {
    setCarregando(true);
    setMensagemErro("");
    try {
      const lista = await listarCatalogosValidados(filtros);
      setCatalogos(lista);
      if (!filtros) {
        setMarcasDisponiveis([...new Set(lista.map((c) => c.marca).filter(Boolean))].sort());
      }
    } catch (erro) {
      setMensagemErro(extrairErroApi(erro).mensagem);
    } finally {
      setCarregando(false);
    }
  }

  function aoConsultar() {
    setMensagemSucesso("");
    carregarCatalogos({ marca, modelo, codigo });
  }

  async function aoBaixarPdf(catalogo) {
    setMensagemErro("");
    setBaixandoId(catalogo.id);
    try {
      const url = await buscarArquivoCatalogo(catalogo.id);
      window.open(url, "_blank", "noopener");
    } catch (erro) {
      setMensagemErro(extrairErroApi(erro).mensagem);
    } finally {
      setBaixandoId(null);
    }
  }

  async function confirmarExclusao() {
    if (!catalogoParaExcluir) return;
    setExcluindo(true);
    setMensagemErro("");
    try {
      await excluirCatalogoValidado(catalogoParaExcluir.id);
      setCatalogos((atual) => atual.filter((c) => c.id !== catalogoParaExcluir.id));
      setMensagemSucesso(`Catálogo "${catalogoParaExcluir.nomeArquivo}" excluído com sucesso.`);
      setCatalogoParaExcluir(null);
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
          <h2>Consultar Catálogos</h2>
          <p className="content-card__subtitle">Catálogos já validados e salvos. Para buscar uma peça específica, use Consultar Componentes.</p>

          {mensagemErro && <div className="alert alert--error">{mensagemErro}</div>}
          {mensagemSucesso && <div className="alert alert--success">{mensagemSucesso}</div>}

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

          {carregando ? (
            <p className="table-card__estado">Carregando...</p>
          ) : catalogos.length === 0 ? (
            <p className="table-card__estado">Nenhum catálogo validado encontrado.</p>
          ) : (
            <div className="pendentes-lista">
              {catalogos.map((catalogo) => (
                <div className="pendente-card" key={catalogo.id}>
                  <div className="pendente-card__topo">
                    <button
                      type="button"
                      className="pendente-card__arquivo catalogo-card__titulo"
                      onClick={() => navigate(`/catalogos/${catalogo.id}/visualizar`)}
                      title="Ver peças deste catálogo"
                    >
                      <IconFile />
                      <span>{descreverCatalogo(catalogo)}</span>
                    </button>
                    <div className="pendente-card__badges">
                      {catalogo.tensao && (
                        <span className="badge badge--confianca">{ROTULO_TENSAO[catalogo.tensao] ?? catalogo.tensao}</span>
                      )}
                      <span className="badge badge--confianca">
                        {catalogo.totalPecas} {catalogo.totalPecas === 1 ? "peça" : "peças"}
                      </span>
                    </div>
                  </div>

                  <p className="pendente-card__info">
                    {catalogo.nomeArquivo} · Validado por {catalogo.validadoPor ?? "—"} em {formatarData(catalogo.validadoEm)}
                  </p>

                  <div className="pendente-card__acoes">
                    <button
                      type="button"
                      className="btn btn--outline btn--sm"
                      onClick={() => navigate(`/catalogos/${catalogo.id}/visualizar`)}
                    >
                      <IconEye /> Ver peças
                    </button>
                    <button
                      type="button"
                      className="btn btn--outline-info btn--sm"
                      onClick={() => navigate(`/catalogos/${catalogo.id}/editar`)}
                    >
                      <IconEdit /> Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn--outline btn--sm"
                      onClick={() => aoBaixarPdf(catalogo)}
                      disabled={baixandoId === catalogo.id}
                    >
                      <IconDownload /> {baixandoId === catalogo.id ? "Abrindo..." : "Abrir PDF"}
                    </button>
                    <button
                      type="button"
                      className="btn btn--outline-danger btn--sm"
                      onClick={() => setCatalogoParaExcluir(catalogo)}
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

      {catalogoParaExcluir && (
        <ConfirmModal
          titulo="Excluir catálogo"
          mensagem={`Deseja realmente excluir o catálogo "${descreverCatalogo(catalogoParaExcluir)}" (${catalogoParaExcluir.totalPecas} peças)? As peças deixarão de aparecer nas consultas e o PDF será apagado. Esta ação não pode ser desfeita.`}
          confirmando={excluindo}
          textoConfirmar="Excluir"
          onConfirmar={confirmarExclusao}
          onCancelar={() => setCatalogoParaExcluir(null)}
        />
      )}
    </>
  );
}

export default CatalogoPage;
