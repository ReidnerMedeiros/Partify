import { api } from "./api";

// RF06/RF07/RF08 — Importar Catálogo, Extração via IA e Validação (HITL).

// POST /catalogos — RF06 (upload) encadeado com RF07 (extração automática).
async function importarCatalogo({ arquivo, marca, modelo }) {
  const formData = new FormData();
  formData.append("arquivo", arquivo);
  if (marca) formData.append("marca", marca);
  if (modelo) formData.append("modelo", modelo);

  // Não define Content-Type manualmente: o axios/navegador precisa gerar o
  // boundary do multipart automaticamente a partir do FormData.
  const { data } = await api.post("/catalogos", formData);
  return data;
}

// POST /catalogos/:id/extrair — RF07/E1, nova tentativa sem reenviar o arquivo.
async function reextrairCatalogo(catalogoId, { marca, modelo } = {}) {
  const { data } = await api.post(`/catalogos/${catalogoId}/extrair`, { marca, modelo });
  return data;
}

// PUT /catalogos/:id/validar — RF08, "Validar e Salvar".
async function validarCatalogo(catalogoId, { marca, modelo, tensao, pecas, observacoes }) {
  const { data } = await api.put(`/catalogos/${catalogoId}/validar`, {
    marca,
    modelo,
    tensao,
    pecas,
    observacoes,
  });
  return data;
}

// GET /catalogos — RF09/A2, lista as peças de catálogos já validados.
async function listarPecas({ marca, modelo, codigo } = {}) {
  const { data } = await api.get("/catalogos", { params: { marca, modelo, codigo } });
  return data.pecas;
}

// GET /catalogos/:id — RF09/A3, carrega o catálogo pra tela de edição.
async function buscarCatalogo(catalogoId) {
  const { data } = await api.get(`/catalogos/${catalogoId}`);
  return data.catalogo;
}

// GET /catalogos/:id/arquivo — reexibe o PDF original na tela de edição.
async function buscarArquivoCatalogo(catalogoId) {
  const { data } = await api.get(`/catalogos/${catalogoId}/arquivo`, { responseType: "blob" });
  return URL.createObjectURL(data);
}

// PUT /catalogos/:id — RF09/A3, "Salvar Alterações".
async function atualizarCatalogo(catalogoId, { marca, modelo, tensao, pecas }) {
  const { data } = await api.put(`/catalogos/${catalogoId}`, { marca, modelo, tensao, pecas });
  return data.catalogo;
}

// DELETE /catalogos/pecas/:pecaId — RF09/A4, exclusão de um registro (peça).
async function excluirPeca(pecaId) {
  await api.delete(`/catalogos/pecas/${pecaId}`);
}

// GET /catalogos/pendentes — RF10 fluxo básico, fila de documentos IRRESOLUVEL.
async function listarDocumentosPendentes() {
  const { data } = await api.get("/catalogos/pendentes");
  return data.documentos;
}

// GET /catalogos/pendentes/:id — RF10/A1, carrega o documento pra tela de
// preenchimento (reaproveita a tela de validação do RF08).
async function buscarDocumentoPendente(catalogoId) {
  const { data } = await api.get(`/catalogos/pendentes/${catalogoId}`);
  return data.catalogo;
}

// DELETE /catalogos/pendentes/:id — RF10/A3, exclusão do documento pendente.
async function excluirDocumentoPendente(catalogoId) {
  await api.delete(`/catalogos/pendentes/${catalogoId}`);
}

export {
  importarCatalogo,
  reextrairCatalogo,
  validarCatalogo,
  listarPecas,
  buscarCatalogo,
  buscarArquivoCatalogo,
  atualizarCatalogo,
  excluirPeca,
  listarDocumentosPendentes,
  buscarDocumentoPendente,
  excluirDocumentoPendente,
};
