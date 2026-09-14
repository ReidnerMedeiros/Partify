import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Field from "../components/Field.jsx";
import { consultarMinhaEmpresa, atualizarMinhaEmpresa, desativarMinhaEmpresa } from "../services/empresaService.js";
import { extrairErroApi } from "../services/api.js";
import { logout } from "../services/authService.js";
import { mascararTelefone } from "../utils/masks.js";

/**
 * RF01 — fluxos alternativos A1 (consulta/atualização) e A2 (desativação).
 * Réplica das Figuras 6 (visualização) e 7 (edição).
 */
function DadosEmpresaPage() {
  const navigate = useNavigate();

  const [empresa, setEmpresa] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState("");

  const [modoEdicao, setModoEdicao] = useState(false);
  const [valores, setValores] = useState({ nome: "", telefone: "", email: "" });
  const [erros, setErros] = useState({});
  const [mensagemErro, setMensagemErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  const [confirmandoDesativacao, setConfirmandoDesativacao] = useState(false);
  const [desativando, setDesativando] = useState(false);

  useEffect(() => {
    carregarEmpresa();
  }, []);

  async function carregarEmpresa() {
    setCarregando(true);
    setErroCarregar("");
    try {
      const dados = await consultarMinhaEmpresa();
      setEmpresa(dados);
      setValores({ nome: dados.nome, telefone: dados.telefone, email: dados.email });
    } catch (erro) {
      setErroCarregar(extrairErroApi(erro).mensagem);
    } finally {
      setCarregando(false);
    }
  }

  function iniciarEdicao() {
    setModoEdicao(true);
    setMensagemSucesso("");
  }

  function cancelarEdicao() {
    setModoEdicao(false);
    setErros({});
    setMensagemErro("");
    setValores({ nome: empresa.nome, telefone: empresa.telefone, email: empresa.email });
  }

  async function salvarEdicao(evento) {
    evento.preventDefault();
    setMensagemErro("");
    setErros({});
    setSalvando(true);

    try {
      const empresaAtualizada = await atualizarMinhaEmpresa(valores);
      setEmpresa(empresaAtualizada);
      setModoEdicao(false);
      setMensagemSucesso("Dados da empresa atualizados com sucesso.");
    } catch (erro) {
      const { mensagem, campos } = extrairErroApi(erro);
      setMensagemErro(mensagem);
      setErros(campos);
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarDesativacao() {
    setDesativando(true);
    setMensagemErro("");
    try {
      await desativarMinhaEmpresa();
      await logout();
      navigate("/login", { state: { mensagem: "Empresa desativada. Faça login novamente quando for reativá-la." } });
    } catch (erro) {
      setMensagemErro(extrairErroApi(erro).mensagem);
      setConfirmandoDesativacao(false);
    } finally {
      setDesativando(false);
    }
  }

  if (carregando) {
    return (
      <>
        <TopBar />
        <div className="page-loading">Carregando dados da empresa...</div>
      </>
    );
  }

  if (erroCarregar) {
    return (
      <>
        <TopBar />
        <div className="page-content">
          <div className="content-card">
            <div className="alert alert--error">{erroCarregar}</div>
            <button type="button" className="btn btn--outline btn--block" onClick={carregarEmpresa}>
              Tentar novamente
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <div className="page-content">
        <div className="content-card">
          {!modoEdicao ? (
            <>
              <div className="content-card__header">
                <div>
                  <h2>Dados da Empresa</h2>
                  <p className="content-card__subtitle">Informações cadastrais da instância.</p>
                </div>
                <button type="button" className="btn btn--outline btn--sm" onClick={iniciarEdicao}>
                  Editar
                </button>
              </div>

              {mensagemSucesso && <div className="alert alert--success">{mensagemSucesso}</div>}

              <div className="data-row">
                <div className="data-row__label">Nome de Empresa</div>
                <div className="data-row__value">{empresa.nome}</div>
              </div>
              <div className="data-row">
                <div className="data-row__label">CNPJ ou CPF</div>
                <div className="data-row__value">{empresa.cnpjCpf}</div>
              </div>
              <div className="data-row">
                <div className="data-row__label">Telefone</div>
                <div className="data-row__value">{empresa.telefone}</div>
              </div>
              <div className="data-row">
                <div className="data-row__label">E-mail do Administrador</div>
                <div className="data-row__value">{empresa.email}</div>
              </div>

              {empresa.status === "INATIVA" && (
                <div className="alert alert--error" style={{ marginTop: 16 }}>
                  Esta empresa está desativada. Os usuários da instância não conseguem acessar o sistema.
                </div>
              )}

              {!confirmandoDesativacao ? (
                <button
                  type="button"
                  className="btn btn--danger-outline"
                  style={{ marginTop: 20 }}
                  onClick={() => setConfirmandoDesativacao(true)}
                  disabled={empresa.status === "INATIVA"}
                >
                  Desativar Empresa
                </button>
              ) : (
                <div className="confirm-box">
                  <p>
                    Tem certeza? Todos os usuários da instância perderão o acesso imediatamente. Os dados e o
                    histórico não serão apagados e a empresa pode ser reativada depois.
                  </p>
                  {mensagemErro && <div className="alert alert--error">{mensagemErro}</div>}
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn--outline"
                      onClick={() => setConfirmandoDesativacao(false)}
                      disabled={desativando}
                    >
                      Cancelar
                    </button>
                    <button type="button" className="btn btn--danger-outline" onClick={confirmarDesativacao} disabled={desativando}>
                      {desativando ? "Desativando..." : "Confirmar desativação"}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <h2>Dados da Empresa</h2>
              <p className="content-card__subtitle">Informações cadastrais da instância.</p>

              {mensagemErro && <div className="alert alert--error">{mensagemErro}</div>}

              <form onSubmit={salvarEdicao} noValidate>
                <Field
                  id="nome"
                  label="Nome da Empresa"
                  value={valores.nome}
                  error={erros.nome}
                  onChange={(e) => setValores((atual) => ({ ...atual, nome: e.target.value }))}
                />
                {/* CNPJ/CPF não é editável — é a chave de identificação da instância (RF01 não prevê edição deste campo) */}
                <Field id="cnpjCpf" label="CNPJ ou CPF" value={empresa.cnpjCpf} disabled />
                <Field
                  id="telefone"
                  label="Telefone"
                  value={valores.telefone}
                  error={erros.telefone}
                  onChange={(e) => setValores((atual) => ({ ...atual, telefone: mascararTelefone(e.target.value) }))}
                />
                <Field
                  id="email"
                  type="email"
                  label="E-mail do Administrador"
                  value={valores.email}
                  error={erros.email}
                  onChange={(e) => setValores((atual) => ({ ...atual, email: e.target.value }))}
                />

                <div className="form-actions">
                  <button type="button" className="btn btn--outline" onClick={cancelarEdicao} disabled={salvando}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn--primary" disabled={salvando}>
                    {salvando ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default DadosEmpresaPage;
