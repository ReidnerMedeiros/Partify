import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { obterUsuario } from "../services/authService.js";
import { listarUsuarios } from "../services/usuarioService.js";
import { consultarLogAuditoria } from "../services/logAuditoriaService.js";
import { extrairErroApi } from "../services/api.js";

// RF13 — domínio do filtro "Tipo de Ação": o texto do Quadro 30 do DERS descreve
// só 4 categorias soltas ("Validação, Edição, Exclusão, Acesso"), mas o protótipo
// mostra a tabela de resultados com os valores brutos do enum TipoAcao como badges
// (CRIACAO_EMPRESA, EXTRACAO_IA, VALIDACAO_HITL, LOGIN...) — usamos o enum completo
// (confirmado com o usuário, decisão #27 em CONTEXTO.md). ARQUIVAMENTO_DOCUMENTO fica
// de fora: é um TipoAcao reservado para um requisito futuro, nenhum fluxo do sistema
// ainda o registra.
const OPCOES_TIPO_ACAO = [
  { valor: "LOGIN", rotulo: "Login" },
  { valor: "LOGOUT", rotulo: "Logout" },
  { valor: "UPLOAD_VISTA_EXPLODIDA", rotulo: "Upload de Vista Explodida" },
  { valor: "EXTRACAO_IA", rotulo: "Extração via IA" },
  { valor: "VALIDACAO_HITL", rotulo: "Validação (HITL)" },
  { valor: "CRIACAO_USUARIO", rotulo: "Criação de Usuário" },
  { valor: "EDICAO_USUARIO", rotulo: "Edição de Usuário" },
  { valor: "ATIVAR_DESATIVAR_USUARIO", rotulo: "Ativar/Desativar Usuário" },
  { valor: "ALTERACAO_SENHA", rotulo: "Alteração de Senha" },
  { valor: "EDICAO_REGISTRO", rotulo: "Edição de Registro" },
  { valor: "EXCLUSAO_REGISTRO", rotulo: "Exclusão de Registro" },
  { valor: "CRIACAO_EMPRESA", rotulo: "Criação de Empresa" },
  { valor: "ATIVAR_DESATIVAR_EMPRESA", rotulo: "Ativar/Desativar Empresa" },
  { valor: "ACESSO_NAO_AUTORIZADO", rotulo: "Acesso Não Autorizado" },
];

function formatarDataHora(iso) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * RF13 — Manter Log Sistema (ADM). Fluxo básico + E1 (nenhum registro
 * encontrado) + E2 (acesso não autorizado, bloqueado no backend por
 * exigirAdministrador — aqui replicamos só a guarda de UX, mesmo padrão do
 * UsuariosPage). Os logs são somente leitura: RNF08/RNF09 não preveem
 * nenhuma ação de editar/excluir nesta tela.
 */
function LogSistemaPage() {
  const navigate = useNavigate();
  const usuarioLogado = obterUsuario();

  const [usuarios, setUsuarios] = useState([]);
  const [usuarioId, setUsuarioId] = useState("");
  const [tipoAcao, setTipoAcao] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");

  const [buscou, setBuscou] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [mensagemErro, setMensagemErro] = useState("");
  const [erroCampos, setErroCampos] = useState({});

  useEffect(() => {
    if (usuarioLogado?.perfil !== "ADMINISTRADOR") {
      navigate("/menu", { replace: true });
      return;
    }
    listarUsuarios()
      .then(setUsuarios)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function aoConsultar() {
    setMensagemErro("");
    setErroCampos({});
    setCarregando(true);
    try {
      const dados = await consultarLogAuditoria({ usuarioId, tipoAcao, dataInicial, dataFinal });
      setRegistros(dados);
      setBuscou(true);
    } catch (erro) {
      const { mensagem, campos } = extrairErroApi(erro);
      setMensagemErro(mensagem);
      setErroCampos(campos);
    } finally {
      setCarregando(false);
    }
  }

  if (usuarioLogado?.perfil !== "ADMINISTRADOR") {
    return null;
  }

  return (
    <>
      <TopBar mostrarVoltar />

      <div className="page-content">
        <div className="page-toolbar">
          <button type="button" className="btn btn--primary" onClick={() => navigate("/usuarios")}>
            Voltar para Usuários
          </button>
        </div>

        <div className="content-card content-card--wide">
          <h2>Log do Sistema</h2>

          {mensagemErro && <div className="alert alert--error">{mensagemErro}</div>}

          <div className="form-row">
            <div className="field">
              <label htmlFor="filtro-usuario">Usuário</label>
              <select id="filtro-usuario" value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
                <option value="">Todos</option>
                {usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="filtro-tipo-acao">Tipo de Ação</label>
              <select id="filtro-tipo-acao" value={tipoAcao} onChange={(e) => setTipoAcao(e.target.value)}>
                <option value="">Todas</option>
                {OPCOES_TIPO_ACAO.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.rotulo}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="filtro-data-inicial">Data Inicial</label>
              <input
                id="filtro-data-inicial"
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                className={erroCampos.dataInicial ? "field--invalid" : ""}
              />
              {erroCampos.dataInicial && <p className="field__error">{erroCampos.dataInicial}</p>}
            </div>
            <div className="field">
              <label htmlFor="filtro-data-final">Data Final</label>
              <input
                id="filtro-data-final"
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                className={erroCampos.dataFinal ? "field--invalid" : ""}
              />
              {erroCampos.dataFinal && <p className="field__error">{erroCampos.dataFinal}</p>}
            </div>
          </div>

          <div className="consulta-acoes">
            <button type="button" className="btn btn--primary" onClick={aoConsultar} disabled={carregando}>
              {carregando ? (
                <>
                  <span className="spinner" role="status" aria-label="Consultando" />
                  Consultando...
                </>
              ) : (
                "Consultar"
              )}
            </button>
          </div>
        </div>

        <div className="content-card content-card--wide">
          {buscou && registros.length === 0 && (
            <p className="table-card__estado">
              Nenhum registro encontrado para os critérios informados. Revise os filtros e tente novamente.
            </p>
          )}

          {buscou && registros.length > 0 && (
            <div className="table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Usuário</th>
                    <th>Tipo de Ação</th>
                    <th>Registro Afetado</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((registro) => (
                    <tr key={registro.id}>
                      <td>{formatarDataHora(registro.realizadoEm)}</td>
                      <td>{registro.usuarioNome}</td>
                      <td>
                        <span className="badge badge--confianca">{registro.tipoAcao}</span>
                      </td>
                      <td>{registro.registroAfetado ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default LogSistemaPage;
