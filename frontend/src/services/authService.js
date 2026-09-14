import { api } from "./api";
import { salvarSessao, obterToken, obterUsuario, limparSessao } from "./authStorage";

async function login(login, senha) {
  const { data } = await api.post("/auth/login", { login, senha });
  salvarSessao(data.token, data.usuario);
  return data.usuario;
}

// RF02 — fluxo alternativo A1 (Logout). Avisa o backend para invalidar a
// sessão (jti) imediatamente antes de limpar os dados locais; se a chamada
// falhar (ex.: sem conexão), ainda assim limpamos a sessão local.
async function logout() {
  try {
    await api.post("/auth/logout");
  } finally {
    limparSessao();
  }
}

function estaAutenticado() {
  return Boolean(obterToken());
}

// RF03 — Recuperar Senha (fluxo básico + exceção E1, tratados no backend).
// O backend sempre responde com a mesma mensagem genérica.
async function solicitarRecuperacaoSenha(login, email) {
  const { data } = await api.post("/auth/recuperar-senha", { login, email });
  return data.mensagem;
}

// RF04 — fluxo alternativo A1 (Redefinir Senha via link do RF03).
async function redefinirSenha(token, novaSenha, confirmarNovaSenha) {
  const { data } = await api.post("/auth/redefinir-senha", { token, novaSenha, confirmarNovaSenha });
  return data.mensagem;
}

// RF04 — fluxo básico (Alterar Senha), usuário já autenticado.
async function alterarSenha(senhaAtual, novaSenha, confirmarNovaSenha) {
  const { data } = await api.post("/auth/alterar-senha", { senhaAtual, novaSenha, confirmarNovaSenha });
  return data.mensagem;
}

export {
  login,
  logout,
  estaAutenticado,
  obterUsuario,
  solicitarRecuperacaoSenha,
  redefinirSenha,
  alterarSenha,
};
