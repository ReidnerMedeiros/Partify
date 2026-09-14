import { useState } from "react";
import Field from "./Field.jsx";
import { atualizarUsuario } from "../services/usuarioService.js";
import { extrairErroApi } from "../services/api.js";

/**
 * RF05 — fluxo alternativo A1 (atualização). Réplica da tela "Editar Usuário".
 * Quando o usuário editado é o Administrador, o campo Perfil fica bloqueado:
 * o domínio de valores desta tela (Quadro 19 do DERS) só cobre Técnico e
 * Vendedor, então não há uma opção válida para reatribuir esse campo aqui.
 */
function EditarUsuarioModal({ usuario, onSalvo, onCancelar }) {
  const ehAdministrador = usuario.perfil === "ADMINISTRADOR";

  const [valores, setValores] = useState({
    nome: usuario.nome,
    login: usuario.login,
    email: usuario.email,
    perfil: ehAdministrador ? "" : usuario.perfil,
  });
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
      // Para o Administrador, nunca envia "perfil" — mantém intocado.
      const payload = ehAdministrador
        ? { nome: valores.nome, login: valores.login, email: valores.email }
        : valores;
      const usuarioAtualizado = await atualizarUsuario(usuario.id, payload);
      onSalvo(usuarioAtualizado);
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
        <h3>Editar Usuário</h3>

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

          <div className="field">
            <label htmlFor="perfil">Perfil</label>
            {ehAdministrador ? (
              <input id="perfil" value="Administrador" disabled />
            ) : (
              <select id="perfil" value={valores.perfil} onChange={(e) => atualizarCampo("perfil", e.target.value)}>
                <option value="TECNICO">Técnico</option>
                <option value="VENDEDOR">Vendedor</option>
              </select>
            )}
            {erros.perfil && <p className="field__error">{erros.perfil}</p>}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn--outline" onClick={onCancelar} disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditarUsuarioModal;
