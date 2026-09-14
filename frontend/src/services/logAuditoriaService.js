import { api } from "./api";

// RF13 — Manter Log Sistema (ADM).

// GET /log-auditoria — fluxo básico + E1 (nenhum registro encontrado, tratado
// no frontend a partir de uma lista vazia). Todos os filtros são opcionais
// (Quadro 30 do DERS).
async function consultarLogAuditoria({ usuarioId, tipoAcao, dataInicial, dataFinal } = {}) {
  const { data } = await api.get("/log-auditoria", {
    params: { usuarioId: usuarioId || undefined, tipoAcao: tipoAcao || undefined, dataInicial: dataInicial || undefined, dataFinal: dataFinal || undefined },
  });
  return data.registros;
}

export { consultarLogAuditoria };
