import axios from "axios";
import { obterToken, limparSessao } from "./authStorage";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3333",
});

api.interceptors.request.use((config) => {
  const token = obterToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// RF02 — sessão expirada/revogada: o backend responde 401 numa rota protegida.
// Limpa a sessão local e devolve o usuário ao login (exceto na própria tela de
// login, onde o 401 significa credenciais inválidas).
api.interceptors.response.use(
  (resposta) => resposta,
  (error) => {
    const url = error.config?.url ?? "";
    const rotaPublica = url.startsWith("/auth/login") || url.startsWith("/auth/recuperar");
    if (error.response?.status === 401 && obterToken() && !rotaPublica) {
      limparSessao();
      window.location.assign("/login");
    }
    return Promise.reject(error);
  },
);

/**
 * Normaliza os erros vindos do backend (ver errorHandler.js) para um formato
 * único e previsível para as páginas: { mensagem, campos }.
 */
function extrairErroApi(error) {
  const resposta = error.response?.data;
  return {
    mensagem: resposta?.erro ?? "Não foi possível concluir a operação. Verifique sua conexão e tente novamente.",
    campos: resposta?.campos ?? {},
  };
}

export { api, extrairErroApi };
