import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import NovoUsuarioModal from "../components/NovoUsuarioModal.jsx";
import EditarUsuarioModal from "../components/EditarUsuarioModal.jsx";
import { obterUsuario } from "../services/authService.js";
import { listarUsuarios, desativarUsuario, reativarUsuario } from "../services/usuarioService.js";
import { extrairErroApi } from "../services/api.js";

const RGX_PERFIL = {
  ADMINISTRADOR: "Administrador",
  TECNICO: "Técnico",
  VENDEDOR: "Vendedor",
};

function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function IconUserCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <polyline points="17 11 19 13 23 9" />
    </svg>
  );
}

function IconUserX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="18" y1="8" x2="23" y2="13" />
      <line x1="23" y1="8" x2="18" y2="13" />
    </svg>
  );
}

function formatarData(iso) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function UsuariosPage() {
  const navigate = useNavigate();
  const usuarioLogado = obterUsuario();

  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagemErro, setMensagemErro] = useState("");

  const [modalNovo, setModalNovo] = useState(false);
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState(null);
  const [usuarioParaAlternarStatus, setUsuarioParaAlternarStatus] = useState(null);
  const [processandoStatus, setProcessandoStatus] = useState(false);

  useEffect(() => {
    if (usuarioLogado?.perfil !== "ADMINISTRADOR") {
      navigate("/menu", { replace: true });
      return;
    }
    carregarUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarUsuarios() {
    setCarregando(true);
    setMensagemErro("");
    try {
      const lista = await listarUsuarios();
      setUsuarios(lista);
    } catch (erro) {
      setMensagemErro(extrairErroApi(erro).mensagem);
    } finally {
      setCarregando(false);
    }
  }

  function aoCriar(usuario) {
    setUsuarios((atual) => [...atual, usuario]);
    setModalNovo(false);
  }

  function aoSalvarEdicao(usuarioAtualizado) {
    setUsuarios((atual) => atual.map((u) => (u.id === usuarioAtualizado.id ? usuarioAtualizado : u)));
    setUsuarioEmEdicao(null);
  }

  async function confirmarAlternarStatus() {
    const usuario = usuarioParaAlternarStatus;
    if (!usuario) return;

    setProcessandoStatus(true);
    setMensagemErro("");
    try {
      const usuarioAtualizado = usuario.ativo ? await desativarUsuario(usuario.id) : await reativarUsuario(usuario.id);
      setUsuarios((atual) => atual.map((u) => (u.id === usuarioAtualizado.id ? usuarioAtualizado : u)));
      setUsuarioParaAlternarStatus(null);
    } catch (erro) {
      setMensagemErro(extrairErroApi(erro).mensagem);
    } finally {
      setProcessandoStatus(false);
    }
  }

  if (usuarioLogado?.perfil !== "ADMINISTRADOR") {
    return null;
  }

  return (
    <>
      <TopBar mostrarVoltar />

      <div className="page-content">
        <div className="content-card content-card--wide">
          <h2>Manter Usuários</h2>

          {mensagemErro && <div className="alert alert--error">{mensagemErro}</div>}

          <div className="page-toolbar">
            <button type="button" className="btn btn--outline" onClick={() => navigate("/log-sistema")}>
              Log do Sistema
            </button>
            <button type="button" className="btn btn--primary" onClick={() => setModalNovo(true)}>
              Novo Usuário
            </button>
          </div>

          <div className="table-card">
            {carregando ? (
              <p className="table-card__estado">Carregando...</p>
            ) : usuarios.length === 0 ? (
              <p className="table-card__estado">Nenhum usuário cadastrado.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Login</th>
                    <th>E-mail</th>
                    <th>Perfil</th>
                    <th>Status</th>
                    <th>Criado em</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id}>
                      <td>{usuario.nome}</td>
                      <td>{usuario.login}</td>
                      <td>{usuario.email}</td>
                      <td>
                        <span className={`badge badge--perfil-${usuario.perfil.toLowerCase()}`}>
                          {RGX_PERFIL[usuario.perfil] ?? usuario.perfil}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${usuario.ativo ? "badge--ativo" : "badge--inativo"}`}>
                          {usuario.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td>{formatarData(usuario.criadoEm)}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            title="Editar"
                            onClick={() => setUsuarioEmEdicao(usuario)}
                          >
                            <IconEdit />
                          </button>
                          <button
                            type="button"
                            className={`icon-btn ${usuario.ativo ? "icon-btn--danger" : "icon-btn--success"}`}
                            title={usuario.ativo ? "Desativar" : "Reativar"}
                            onClick={() => setUsuarioParaAlternarStatus(usuario)}
                          >
                            {usuario.ativo ? <IconUserX /> : <IconUserCheck />}
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

      {modalNovo && <NovoUsuarioModal onCriado={aoCriar} onCancelar={() => setModalNovo(false)} />}

      {usuarioEmEdicao && (
        <EditarUsuarioModal
          usuario={usuarioEmEdicao}
          onSalvo={aoSalvarEdicao}
          onCancelar={() => setUsuarioEmEdicao(null)}
        />
      )}

      {usuarioParaAlternarStatus && (
        <ConfirmModal
          titulo={usuarioParaAlternarStatus.ativo ? "Desativar usuário" : "Reativar usuário"}
          mensagem={
            usuarioParaAlternarStatus.ativo
              ? `Deseja realmente desativar o usuário "${usuarioParaAlternarStatus.nome}"?`
              : `Deseja realmente reativar o usuário "${usuarioParaAlternarStatus.nome}"?`
          }
          confirmando={processandoStatus}
          onConfirmar={confirmarAlternarStatus}
          onCancelar={() => setUsuarioParaAlternarStatus(null)}
        />
      )}
    </>
  );
}

export default UsuariosPage;
