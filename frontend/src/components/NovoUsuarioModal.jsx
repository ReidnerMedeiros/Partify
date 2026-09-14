import { useState } from "react";
import Field from "./Field.jsx";
import { criarUsuario } from "../services/usuarioService.js";
import { extrairErroApi } from "../services/api.js";

const VALORES_INICIAIS = { nome: "", login: "", email: "", senha: "", perfil: "TECNICO" };

/**
 * RF05 — fluxo básico (Criação). Réplica da tela "Novo Usuário" do protótipo.
 * Perfil restrito a Técnico/Vendedor (domínio de valores do Quadro 19 do
 * DERS) — este formulário nunca cria um Administrador.
 */
function NovoUsuarioModal({ onCriado, onCancelar }) {
  const [valores, setValores] = useState(VALORES_INICIAIS);
  const [erros, setErros] = useState({});
  const [mensagemErro, setMensagemErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  function atualizarCampo(campo, valor) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  async function aoEnviar(evento) {
    evento.preventDefault();
    setMensagemErro("");
    setErros({});
    setSalvando(true);

    try {
      const usuario = await criarUsuario(valores);
      onCriado(usuario);
    } catch (erro) {
      const { mensagem, campos } = extrairErroApi(erro);
      setMensagemErro(mensagem);
      setErros(campos);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onCancelar}>
      <div className="modal-box modal-box--form" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>Novo Usuário</h3>

        {mensagemErro && <div className="alert alert--error">{mensagemErro}</div>}

        <form onSubmit={aoEnviar} noValidate>
          <Field
            id="nome"
            label="Nome"
            value={valores.nome}
            error={erros.nome}
            onChange={(e) => atualizarCampo("nome", e.target.value)}
          />
          <Field
            id="login"
            label="Login"
            value={valores.login}
            error={erros.login}
            onChange={(e) => atualizarCampo("login", e.target.value)}
          />
          <Field
            id="email"
            type="email"
            label="E-mail"
            value={valores.email}
            error={erros.email}
            onChange={(e) => atualizarCampo("email", e.target.value)}
          />
          <Field
            id="senha"
            type="password"
            label="Senha (mínimo 8 caracteres)"
            value={valores.senha}
            error={erros.senha}
            onChange={(e) => atualizarCampo("senha", e.target.value)}
          />

          <div className="field">
            <label htmlFor="perfil">Perfil</label>
            <select id="perfil" value={valores.perfil} onChange={(e) => atualizarCampo("perfil", e.target.value)}>
              <option value="TECNICO">Técnico</option>
              <option value="VENDEDOR">Vendedor</option>
            </select>
            {erros.perfil && <p className="field__error">{erros.perfil}</p>}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn--outline" onClick={onCancelar} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={salvando}>
              {salvando ? "Criando..." : "Criar Usuário"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NovoUsuarioModal;
