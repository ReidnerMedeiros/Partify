/**
 * Persistência local da sessão (token JWT emitido pelo RF02).
 * Isolado em módulo próprio para que trocar a estratégia de armazenamento no
 * futuro (ex.: cookie httpOnly) não exija tocar nos serviços/páginas.
 */
const CHAVE_TOKEN = "partify:token";
const CHAVE_USUARIO = "partify:usuario";

function salvarSessao(token, usuario) {
  localStorage.setItem(CHAVE_TOKEN, token);
  localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
}

function obterToken() {
  return localStorage.getItem(CHAVE_TOKEN);
}

function obterUsuario() {
  const bruto = localStorage.getItem(CHAVE_USUARIO);
  return bruto ? JSON.parse(bruto) : null;
}

function limparSessao() {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_USUARIO);
}

export { salvarSessao, obterToken, obterUsuario, limparSessao };
