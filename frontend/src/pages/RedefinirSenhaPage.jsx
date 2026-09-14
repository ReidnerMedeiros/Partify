import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PartifyLogo from "../components/PartifyLogo.jsx";
import Field from "../components/Field.jsx";
import { redefinirSenha } from "../services/authService.js";
import { extrairErroApi } from "../services/api.js";

/**
 * RF04 — fluxo alternativo A1 (Redefinir Senha), destino do link enviado pelo
 * RF03. Réplica da tela "Redefinir Senha": NOVA SENHA, CONFIRMAR NOVA SENHA,
 * botão Salvar. O token vem na query string do link (?token=...).
 */
function RedefinirSenhaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [valores, setValores] = useState({ novaSenha: "", confirmarNovaSenha: "" });
  const [erros, setErros] = useState({});
  const [mensagemErro, setMensagemErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setMensagemErro("");
    setErros({});
    setEnviando(true);

    try {
      await redefinirSenha(token, valores.novaSenha, valores.confirmarNovaSenha);
      navigate("/login", { state: { mensagem: "Senha redefinida com sucesso. Faça login com a nova senha." } });
    } catch (erro) {
      const { mensagem, campos } = extrairErroApi(erro);
      setMensagemErro(mensagem);
      setErros(campos);
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

        <h1>Redefinir Senha</h1>
        <p className="auth-card__subtitle">Defina uma nova senha para acessar sua conta.</p>

        {!token && (
          <div className="alert alert--error">
            Link inválido. Solicite uma nova recuperação de senha na tela anterior.
          </div>
        )}
        {mensagemErro && <div className="alert alert--error">{mensagemErro}</div>}

        <form onSubmit={aoEnviar} noValidate>
          <Field
            id="novaSenha"
            type="password"
            label="NOVA SENHA"
            value={valores.novaSenha}
            error={erros.novaSenha}
            onChange={(e) => setValores((atual) => ({ ...atual, novaSenha: e.target.value }))}
          />
          <Field
            id="confirmarNovaSenha"
            type="password"
            label="CONFIRMAR NOVA SENHA"
            value={valores.confirmarNovaSenha}
            error={erros.confirmarNovaSenha}
            onChange={(e) => setValores((atual) => ({ ...atual, confirmarNovaSenha: e.target.value }))}
          />

          <button type="submit" className="btn btn--primary btn--block" disabled={enviando || !token}>
            {enviando ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default RedefinirSenhaPage;
