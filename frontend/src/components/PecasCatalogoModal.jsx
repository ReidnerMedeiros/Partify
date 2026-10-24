import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { buscarCatalogo } from "../services/catalogoService.js";
import { extrairErroApi } from "../services/api.js";

/**
 * RF09 — lista de peças de um catálogo validado, em um modal sobre a própria
 * tela de Consultar Catálogos (somente leitura: sem busca, edição ou exclusão).
 * As peças são buscadas ao abrir. Fecha pelo botão "Fechar", pelo "×", ao clicar
 * fora do modal ou ao pressionar Esc. Renderizado no <body> (portal), como o
 * ConfirmModal, para não ficar preso às camadas da barra lateral ou do conteúdo.
 */
function PecasCatalogoModal({ catalogoId, titulo, subtitulo, onFechar }) {
  const [carregando, setCarregando] = useState(true);
  const [pecas, setPecas] = useState([]);
  const [mensagemErro, setMensagemErro] = useState("");

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setMensagemErro("");
    buscarCatalogo(catalogoId)
      .then((catalogo) => {
        if (!cancelado) setPecas(catalogo.pecas ?? []);
      })
      .catch((erro) => {
        if (!cancelado) setMensagemErro(extrairErroApi(erro).mensagem);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [catalogoId]);

  useEffect(() => {
    function fecharComEsc(evento) {
      if (evento.key === "Escape") onFechar();
    }
    document.addEventListener("keydown", fecharComEsc);
    return () => document.removeEventListener("keydown", fecharComEsc);
  }, [onFechar]);

  return createPortal(
    <div className="modal-overlay" role="presentation" onClick={onFechar}>
      <div
        className="modal-box modal-box--pecas"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-pecas-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-pecas__cabecalho">
          <div>
            <h3 id="modal-pecas-titulo">{titulo}</h3>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          <button type="button" className="modal-pecas__fechar" onClick={onFechar} aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="modal-pecas__corpo">
          {mensagemErro && <div className="alert alert--error">{mensagemErro}</div>}

          {carregando ? (
            <p className="table-card__estado">Carregando...</p>
          ) : !mensagemErro && pecas.length === 0 ? (
            <p className="table-card__estado">Este catálogo não tem peças.</p>
          ) : (
            !mensagemErro && (
              <div className="table-card">
                <table className="data-table data-table--cartoes">
                  <thead>
                    <tr>
                      <th>Pos.</th>
                      <th>Código</th>
                      <th>Qtd.</th>
                      <th>Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pecas.map((peca) => (
                      <tr key={peca.id}>
                        <td data-label="Pos.">{peca.posicaoVisual ?? "—"}</td>
                        <td data-label="Código">
                          <span className="table-link">{peca.codigo}</span>
                        </td>
                        <td data-label="Qtd.">{peca.quantidade ?? "—"}</td>
                        <td data-label="Descrição">
                          {peca.descricao || "—"}
                          {peca.descricaoIncompleta && (
                            <span className="badge badge--campo-ausente" title="A descrição pode estar truncada no PDF original">
                              Descrição possivelmente incompleta
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn--outline" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default PecasCatalogoModal;
