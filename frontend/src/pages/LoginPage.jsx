import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import PartifyLogo from "../components/PartifyLogo.jsx";
import Field from "../components/Field.jsx";
import { login } from "../services/authService.js";
import { extrairErroApi } from "../services/api.js";

/**
 * RF02 — Realizar Login (implementação mínima, réplica da Figura 8).
 * Ponto de extensão do RF01: destino do redirecionamento após o cadastro da empresa.
 */
function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [valores, setValores] = useState({ login: "", senha: "" });
  const [mensagemErro, setMensagemErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const mensagemSucesso = location.state?.mensagem;

  async function aoEnviar(evento) {
    evento.preventDefault();
    setMensagemErro("");
    setEnviando(true);

    try {
      await login(valores.login, valores.senha);
      navigate("/menu", { replace: true });
    } catch (erro) {
      const { mensagem } = extrairErroApi(erro);
      setMensagemErro(mensagem);
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

        <h1>Bem-vindo</h1>
        <p className="auth-card__subtitle">Faça login para continuar</p>

        {mensagemSucesso && <div className="alert alert--success">{mensagemSucesso}</div>}
        {mensagemErro && <div className="alert alert--error">{mensagemErro}</div>}

        <form onSubmit={aoEnviar} noValidate>
          <Field
            id="login"
            label="LOGIN"
            autoComplete="username"
            autoFocus
            value={valores.login}
            onChange={(e) => setValores((atual) => ({ ...atual, login: e.target.value }))}
          />
          <Field
            id="senha"
            type="password"
            label="SENHA"
            autoComplete="current-password"
            value={valores.senha}
            onChange={(e) => setValores((atual) => ({ ...atual, senha: e.target.value }))}
          />

          <p className="auth-card__forgot">
            <Link to="/recuperar-senha">Esqueci minha senha</Link>
          </p>

          <button type="submit" className="btn btn--primary btn--block" disabled={enviando}>
            {enviando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="auth-card__footer">
          Novo estabelecimento? <Link to="/cadastro">Cadastrar empresa</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
