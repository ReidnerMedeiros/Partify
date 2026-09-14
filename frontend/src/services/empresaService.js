import { api } from "./api";

async function cadastrarEmpresa(dados) {
  const { data } = await api.post("/empresas", dados);
  return data;
}

async function consultarMinhaEmpresa() {
  const { data } = await api.get("/empresas/me");
  return data.empresa;
}

async function atualizarMinhaEmpresa(dados) {
  const { data } = await api.put("/empresas/me", dados);
  return data.empresa;
}

async function desativarMinhaEmpresa() {
  const { data } = await api.patch("/empresas/me/desativar");
  return data.empresa;
}

export { cadastrarEmpresa, consultarMinhaEmpresa, atualizarMinhaEmpresa, desativarMinhaEmpresa };
