import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PartifyLogo from "../components/PartifyLogo.jsx";
import Field from "../components/Field.jsx";
import { solicitarRecuperacaoSenha } from "../services/authService.js";
import { extrairErroApi } from "../services/api.js";

/**
 * RF03 — Recuperar Senha (fluxo básico + exceção E1).
 * Réplica da tela "Recuperar Senha": LOGIN, E-MAIL, botão Enviar.
 * Por RNF05, a mensagem de resultado é sempre a mesma genérica, exista ou não
 * a conta correspondente — o backend garante isso independentemente do que
 * esta tela envie.
 */
function RecuperarSenhaPage() {
  const navigate = useNavigate();

  const [valores, setValores] = useState({ login: "", email: "" });
  const [mensagem, setMensagem] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setMensagemErro("");
    setEnviando(true);

    try {
      const resposta = await solicitarRecuperacaoSenha(valores.login, valores.email);
      setMensagem(resposta);
      setEnviado(true);
    } catch (erro) {
      const { mensagem: msg } = extrairErroApi(erro);
      setMensagemErro(msg);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-card__logo">
          <PartifyLogo />
        </div>
        <hr className="auth-card__divider" />

        <h1>Recuperar Senha</h1>
        <p className="auth-card__subtitle">
          Informe seu login e e-mail cadastrados para receber o link de redefinição de senha.
        </p>

        {mensagem && <div className="alert alert--success">{mensagem}</div>}
        {mensagemErro && <div className="alert alert--error">{mensagemErro}</div>}

        {!enviado && (
          <form onSubmit={aoEnviar} noValidate>
            <Field
              id="login"
              label="LOGIN"
              value={valores.login}
              onChange={(e) => setValores((atual) => ({ ...atual, login: e.target.value }))}
            />
            <Field
              id="email"
              type="email"
              label="E-MAIL"
              value={valores.email}
              onChange={(e) => setValores((atual) => ({ ...atual, email: e.target.value }))}
            />

            <button type="submit" className="btn btn--primary btn--block" disabled={enviando}>
              {enviando ? "Enviando..." : "Enviar"}
            </button>
          </form>
        )}

        {enviado && (
          <button type="button" className="btn btn--primary btn--block" onClick={() => navigate("/login")}>
            Voltar ao login
          </button>
        )}

        {!enviado && (
          <p className="auth-card__footer">
            Lembrou a senha? <Link to="/login">Voltar ao login</Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default RecuperarSenhaPage;
