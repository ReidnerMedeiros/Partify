/**
 * Espelha as constantes de backend/prisma/seed-e2e.js (DADOS_ADMIN, DADOS_CATALOGO,
 * DADOS_PECA) — usado pelas jornadas 3, 4 e 5, que dependem dos dados semeados
 * diretamente no banco (ver decisão em CONTEXTO.md: "seed direto no banco" em
 * vez de rodar o fluxo real de extração/validação a cada execução do E2E).
 *
 * Se os valores em backend/prisma/seed-e2e.js mudarem, atualize aqui também —
 * não há import cruzado entre os dois pacotes (workspaces separados) para
 * manter o e2e/ independente de código do backend.
 */
module.exports = {
  ADMIN: {
    login: "admin.e2e",
    senha: "senha12345",
    email: "admin.e2e@partify.teste",
  },
  CATALOGO: {
    marca: "Makita",
    modelo: "4100NH",
    tensao: "127V",
  },
  PECA: {
    codigo: "422119-0",
    descricaoTermoBusca: "induzido esmerilhadeira Makita 127V",
  },
};
