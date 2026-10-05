// @ts-check
const { defineConfig, devices } = require("@playwright/test");

/**
 * Config do Playwright — item 5 de PLANO_TESTES_AVANCADOS.md.
 *
 * Decisão (ver CONTEXTO.md): alvo é o par de servidores de DEV LOCAL (não um
 * build de produção nem um ambiente efêmero de CI) — `npm run dev:backend` e
 * `npm run dev:frontend` na raiz do monorepo, já rodando ANTES de `npm run
 * e2e:test`. Isso é intencional: os 5 fluxos usam Gemini API de verdade
 * (extração real na jornada 2, RAG real na jornada 5), então rodar contra
 * "localhost" reaproveita o backend/.env já configurado do desenvolvedor, sem
 * duplicar segredos num serviço de CI. `webServer` do Playwright NÃO é usado
 * de propósito — não queremos que o Playwright suba/derrube os servidores,
 * porque a jornada 3 depende de ler o log do `npm run dev:backend` já em
 * execução (ver README em e2e/README.md e helpers/lerLinkRedefinicao.js).
 */
module.exports = defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // os specs compartilham o mesmo banco local — evita corrida entre eles
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_FRONTEND_URL || "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
