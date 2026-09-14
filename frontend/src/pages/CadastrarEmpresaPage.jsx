import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import PartifyLogo from "../components/PartifyLogo.jsx";
import Field from "../components/Field.jsx";
import { cadastrarEmpresa } from "../services/empresaService.js";
import { extrairErroApi } from "../services/api.js";
import { mascararCnpjOuCpf, mascararTelefone } from "../utils/masks.js";

const VALORES_INICIAIS = {
  nome: "",
  cnpjCpf: "",
  telefone: "",
  email: "",
  loginAdministrador: "",
  senhaAdministrador: "",
};

/**
 * RF01 — fluxo básico (Criação). Réplica da Figura 5 (Protótipo tela de cadastro
 * da empresa). Único ponto de entrada público do sistema.
 */
function CadastrarEmpresaPage() {
  const navigate = useNavigate();
  const [valores, setValores] = useState(VALORES_INICIAIS);
  const [erros, setErros] = useState({});
  const [mensagemErro, setMensagemErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  function atualizarCampo(campo, valor) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  async function aoEnviar(evento) {
    evento.preventDefault();
    setMensagemErro("");
    setErros({});
    setEnviando(true);

    try {
      await cadastrarEmpresa(valores);
      navigate("/login", { state: { mensagem: "Empresa cadastrada com sucesso. Faça login para continuar." } });
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

        <h1>Cadastrar Empresa</h1>
        <p className="auth-card__subtitle">
          Crie a instância do seu estabelecimento. O administrador será criado automaticamente.
        </p>

        {mensagemErro && <div className="alert alert--error">{mensagemErro}</div>}

        <form onSubmit={aoEnviar} noValidate>
          <Field
            id="nome"
            label="Nome da Empresa"
            placeholder="Ex: Oficina do João"
            value={valores.nome}
            error={erros.nome}
            onChange={(e) => atualizarCampo("nome", e.target.value)}
          />

          <Field
            id="cnpjCpf"
            label="CNPJ ou CPF"
            placeholder="Ex: 00.000.000/0001-00"
            value={valores.cnpjCpf}
            error={erros.cnpjCpf}
            onChange={(e) => atualizarCampo("cnpjCpf", mascararCnpjOuCpf(e.target.value))}
          />

          <Field
            id="telefone"
            label="Telefone"
            placeholder="Ex: (64) 99999-0000"
            value={valores.telefone}
            error={erros.telefone}
            onChange={(e) => atualizarCampo("telefone", mascararTelefone(e.target.value))}
          />

          <Field
            id="email"
            type="email"
            label="E-mail do Administrador"
            placeholder="Ex: admin@oficina.com"
            value={valores.email}
            error={erros.email}
            onChange={(e) => atualizarCampo("email", e.target.value)}
          />

          <Field
            id="loginAdministrador"
            label="Login do Administrador"
            placeholder="Ex: admin"
            value={valores.loginAdministrador}
            error={erros.loginAdministrador}
            onChange={(e) => atualizarCampo("loginAdministrador", e.target.value)}
          />

          <Field
            id="senhaAdministrador"
            type="password"
            label="Senha do Administrador (mínimo 8 caracteres)"
            value={valores.senhaAdministrador}
            error={erros.senhaAdministrador}
            onChange={(e) => atualizarCampo("senhaAdministrador", e.target.value)}
          />

          <button type="submit" className="btn btn--primary btn--block" disabled={enviando}>
            {enviando ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        <p className="auth-card__footer">
          Já possui cadastro? <Link to="/login">Fazer login</Link>
        </p>
      </div>
    </div>
  );
}

export default CadastrarEmpresaPage;
