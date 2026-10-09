import { useState } from "react";
import TopBar from "../components/TopBar.jsx";
import { perguntarTecnico } from "../services/consultaService.js";
import { buscarArquivoCatalogo } from "../services/catalogoService.js";
import { extrairErroApi } from "../services/api.js";

const MENSAGEM_CONTEXTO_INSUFICIENTE =
  'Não encontrei informações suficientes nos catálogos validados desta instância para responder com segurança. Considere importar um catálogo técnico relacionado em "Importar Catálogo".';

const MENSAGEM_SEM_CONTEXTO =
  "Não consegui identificar contexto técnico relevante para essa pergunta. Tente reformular incluindo marca, modelo ou o nome da peça.";

const SUGESTOES = [
  "Qual o induzido correto para a Makita 4100NH 127V?",
  "Qual o código do rolamento da Bosch GWS 060?",
  "Quais peças usam a escova de carvão?",
];

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4z" />
    </svg>
  );
}

function formatarData(data) {
  if (!data) return null;
  try {
    return new Date(data).toLocaleDateString("pt-BR");
  } catch {
    return null;
  }
}

/**
 * RF12 — Consulta Técnica via RAG (Agente de Consulta). Fluxo básico + E1
 * (CONTEXTO_INSUFICIENTE) + E2 (falha de comunicação com a IA) + E3
 * (SEM_CONTEXTO_RELEVANTE). Cada pergunta é tratada de forma independente
 * pelo backend (sem histórico mantido no servidor — pós-condição do RF12); a
 * transcrição exibida aqui é só um estado local da tela, não uma conversa
 * multi-turno enviada ao backend.
 */
function ConsultaTecnicaPage() {
  const [pergunta, setPergunta] = useState("");
  const [mensagens, setMensagens] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [abrindoId, setAbrindoId] = useState(null);
  // Último modelo citado na conversa, reenviado para o backend entender
  // "dessa ferramenta". Zerado em "Limpar conversa".
  const [modeloContexto, setModeloContexto] = useState(undefined);

  function aoEnviar(evento) {
    evento.preventDefault();
    enviarPergunta(pergunta);
  }

  async function enviarPergunta(texto) {
    const perguntaAtual = texto.trim();
    if (!perguntaAtual || enviando) return;

    const idUsuario = `u-${Date.now()}`;
    setMensagens((atual) => [...atual, { id: idUsuario, autor: "usuario", texto: perguntaAtual }]);
    setPergunta("");
    setEnviando(true);

    try {
      const resultado = await perguntarTecnico(perguntaAtual, modeloContexto);
      if (resultado.modeloIdentificado) setModeloContexto(resultado.modeloIdentificado);
      setMensagens((atual) => [
        ...atual,
        {
          id: `ia-${Date.now()}`,
          autor: "ia",
          situacao: resultado.situacao,
          texto: resultado.resposta,
          fonte: resultado.fonte,
          fontes: resultado.fontes?.length ? resultado.fontes : resultado.fonte ? [resultado.fonte] : [],
        },
      ]);
    } catch (erro) {
      setMensagens((atual) => [
        ...atual,
        { id: `erro-${Date.now()}`, autor: "ia", situacao: "ERRO", texto: extrairErroApi(erro).mensagem },
      ]);
    } finally {
      setEnviando(false);
    }
  }

  async function aoVerVistaExplodida(catalogoId) {
    setAbrindoId(catalogoId);
    try {
      const url = await buscarArquivoCatalogo(catalogoId);
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setAbrindoId(null);
    }
  }

  return (
    <>
      <TopBar mostrarVoltar />

      <div className="page-content">
        <div className="content-card content-card--wide consulta-tecnica-card">
          <div className="page-toolbar">
            <h2>Consulta Técnica (IA)</h2>
            {mensagens.length > 0 && (
              <button type="button" className="btn btn--outline btn--sm" onClick={() => {
                  setMensagens([]);
                  setModeloContexto(undefined);
                }}
                disabled={enviando}
              >
                Limpar conversa
              </button>
            )}
          </div>
          <p className="content-card__subtitle">
            Respostas baseadas exclusivamente nos catálogos técnicos validados desta instância.
          </p>

          <div className="chat-transcricao" aria-live="polite">
            {mensagens.length === 0 && (
              <div className="empty-state">
                <span className="empty-state__icone">
                  <IconChat />
                </span>
                <p>Faça uma pergunta técnica sobre componentes. Experimente uma sugestão:</p>
                <div className="chat-sugestoes">
                  {SUGESTOES.map((sugestao) => (
                    <button key={sugestao} type="button" className="chat-sugestao" onClick={() => enviarPergunta(sugestao)}>
                      {sugestao}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mensagens.map((mensagem) => (
              <div key={mensagem.id} className={`chat-bolha chat-bolha--${mensagem.autor}`}>
                {mensagem.autor === "usuario" && <p>{mensagem.texto}</p>}

                {mensagem.autor === "ia" && mensagem.situacao === "RESPONDIDO" && (
                  <>
                    <p>{mensagem.texto}</p>
                    {mensagem.fontes?.length > 0 && (
                      <div className="fonte-citada">
                        <div className="fonte-citada__texto">
                          {mensagem.fontes.length > 1 ? "Fontes citadas" : "Fonte citada"}: {mensagem.fontes[0].marca}{" "}
                          {mensagem.fontes[0].modelo} — Vista Explodida
                          {formatarData(mensagem.fontes[0].validadoEm) &&
                            ` (validado em ${formatarData(mensagem.fontes[0].validadoEm)})`}
                        </div>
                        <div className="fonte-citada__codigos">
                          {mensagem.fontes.map((fonte) => (
                            <span key={fonte.codigo} className="badge badge--confianca">
                              {fonte.codigo}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {[...new Set((mensagem.fontes ?? []).map((fonte) => fonte.catalogoId))].map((catalogoId) => (
                      <button
                        key={catalogoId}
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => aoVerVistaExplodida(catalogoId)}
                        disabled={abrindoId === catalogoId}
                      >
                        {abrindoId === catalogoId ? "Abrindo..." : "Ver Vista Explodida"}
                      </button>
                    ))}
                  </>
                )}

                {mensagem.autor === "ia" && mensagem.situacao === "CONTEXTO_INSUFICIENTE" && <p>{MENSAGEM_CONTEXTO_INSUFICIENTE}</p>}

                {mensagem.autor === "ia" && mensagem.situacao === "SEM_CONTEXTO_RELEVANTE" && <p>{MENSAGEM_SEM_CONTEXTO}</p>}

                {mensagem.autor === "ia" && mensagem.situacao === "ERRO" && <p className="chat-bolha__erro">{mensagem.texto}</p>}
              </div>
            ))}

            {enviando && (
              <div className="chat-bolha chat-bolha--ia chat-digitando" role="status" aria-label="A IA está respondendo">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          <form className="chat-form" onSubmit={aoEnviar}>
            <input
              placeholder="Digite sua pergunta técnica..."
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              disabled={enviando}
            />
            <button type="submit" className="btn btn--primary btn--icon" disabled={enviando || !pergunta.trim()}>
              {enviando ? <span className="spinner" role="status" aria-label="Enviando" /> : <IconSend />}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default ConsultaTecnicaPage;
