import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import Field from "../components/Field.jsx";
import { alterarSenha } from "../services/authService.js";
import { extrairErroApi } from "../services/api.js";

const VALORES_INICIAIS = { senhaAtual: "", novaSenha: "", confirmarNovaSenha: "" };

/**
 * RF04 — fluxo básico (Alterar Senha). Réplica do protótipo: acessível pelo
 * menu do usuário autenticado (ícone 👤 no TopBar), ao lado da opção "Sair".
 * Diferente do RF03/RF04-A1 (recuperação via e-mail), aqui o usuário já está
 * logado e precisa confirmar a senha atual antes de definir a nova.
 */
function AlterarSenhaPage() {
  const navigate = useNavigate();

  const [valores, setValores] = useState(VALORES_INICIAIS);
  const [erros, setErros] = useState({});
  const [mensagemErro, setMensagemErro] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);

  function atualizarCampo(campo, valor) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  async function aoSalvar(evento) {
    evento.preventDefault();
    setMensagemErro("");
    setMensagemSucesso("");
    setErros({});
    setSalvando(true);

    try {
      await alterarSenha(valores.senhaAtual, valores.novaSenha, valores.confirmarNovaSenha);
      setMensagemSucesso("Senha alterada com sucesso.");
      setValores(VALORES_INICIAIS);
    } catch (erro) {
      const { mensagem, campos } = extrairErroApi(erro);
      setMensagemErro(mensagem);
      setErros(campos);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <TopBar />
      <div className="page-content">
        <div className="content-card">
          <h2>Alterar Senha</h2>
          <p className="content-card__subtitle">Informe sua senha atual e defina a nova senha.</p>

          {mensagemSucesso && <div className="alert alert--success">{mensagemSucesso}</div>}
          {mensagemErro && <div className="alert alert--error">{mensagemErro}</div>}

          <form onSubmit={aoSalvar} noValidate>
            <Field
              id="senhaAtual"
              type="password"
              label="Senha Atual"
              value={valores.senhaAtual}
              error={erros.senhaAtual}
              onChange={(e) => atualizarCampo("senhaAtual", e.target.value)}
            />
            <Field
              id="novaSenha"
              type="password"
              label="Nova Senha (mínimo 8 caracteres)"
              value={valores.novaSenha}
              error={erros.novaSenha}
              onChange={(e) => atualizarCampo("novaSenha", e.target.value)}
            />
            <Field
              id="confirmarNovaSenha"
              type="password"
              label="Confirmar Nova Senha"
              value={valores.confirmarNovaSenha}
              error={erros.confirmarNovaSenha}
              onChange={(e) => atualizarCampo("confirmarNovaSenha", e.target.value)}
            />

            <div className="form-actions">
              <button type="button" className="btn btn--outline" onClick={() => navigate("/menu")} disabled={salvando}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default AlterarSenhaPage;
