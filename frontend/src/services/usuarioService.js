import { api } from "./api";

// RF05 — Manter Usuário (exclusivo do administrador).

async function listarUsuarios() {
  const { data } = await api.get("/usuarios");
  return data.usuarios;
}

async function criarUsuario(dados) {
  const { data } = await api.post("/usuarios", dados);
  return data.usuario;
}

async function atualizarUsuario(id, dados) {
  const { data } = await api.put(`/usuarios/${id}`, dados);
  return data.usuario;
}

async function desativarUsuario(id) {
  const { data } = await api.patch(`/usuarios/${id}/desativar`);
  return data.usuario;
}

async function reativarUsuario(id) {
  const { data } = await api.patch(`/usuarios/${id}/reativar`);
  return data.usuario;
}

export { listarUsuarios, criarUsuario, atualizarUsuario, desativarUsuario, reativarUsuario };
