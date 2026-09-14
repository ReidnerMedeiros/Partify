import axios from "axios";
import { obterToken } from "./authStorage";

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
