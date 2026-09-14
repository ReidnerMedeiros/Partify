import { api } from "./api";

// RF11 — Consulta de Componentes (Agente de Consulta).

// GET /componentes — fluxo básico + A2 (sem filtros). `modo` é só um
// seletor de ordenação/ênfase do resultado combinado (ver CONTEXTO.md).
async function buscarComponentes({ termo, marca, tensao, modo }) {
  const { data } = await api.get("/componentes", { params: { termo, marca, tensao, modo } });
  return data;
}

// RF12 — Consulta Técnica via RAG (Agente de Consulta).

// POST /consulta-tecnica — fluxo básico + E1/E2/E3. Cada pergunta é
// independente (sem histórico mantido pelo backend — pós-condição do RF12).
async function perguntarTecnico(pergunta) {
  const { data } = await api.post("/consulta-tecnica", { pergunta });
  return data;
}

export { buscarComponentes, perguntarTecnico };
