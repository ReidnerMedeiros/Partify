const { test, expect } = require("@playwright/test");
const { ADMIN, CATALOGO, PECA } = require("../helpers/seedDados");

/**
 * Jornada 5 (PLANO_TESTES_AVANCADOS.md, seção 5): Consulta Técnica (IA) (RF12)
 * → pergunta → resposta com fonte citada.
 *
 * Chama a Gemini API de verdade (embedding da pergunta + geração da resposta
 * via RAG) contra a peça semeada em backend/prisma/seed-e2e.js — por isso o
 * embedding da peça, no seed, também é gerado com uma chamada real (um vetor
 * aleatório provavelmente não passaria no corte de relevância do RAG). Ainda
 * assim, por depender de geração de texto da IA, a resposta exata não é
 * determinística — a asserção verifica a situação (RESPONDIDO) e a presença
 * da fonte citada, não o texto literal da resposta.
 */
test.describe("Jornada 5 — Consulta Técnica (IA)", () => {
  test("pergunta sobre a peça semeada recebe resposta com fonte citada", async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto("/login");
    await page.getByLabel("LOGIN").fill(ADMIN.login);
    await page.getByLabel("SENHA").fill(ADMIN.senha);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/menu$/);

    await page.getByRole("button", { name: "Consulta Técnica (IA)" }).click();
    await expect(page).toHaveURL(/\/consulta-tecnica$/);

    const pergunta = `Qual o induzido correto para a ${CATALOGO.marca} ${CATALOGO.modelo} ${CATALOGO.tensao}?`;
    await page.getByPlaceholder("Digite sua pergunta técnica...").fill(pergunta);
    await page.getByPlaceholder("Digite sua pergunta técnica...").press("Enter");

    // RF12 — resposta pode levar alguns segundos (chamada real à IA).
    const fonteCitada = page.getByText("Fonte citada:", { exact: false });
    await expect(fonteCitada).toBeVisible({ timeout: 30_000 });
    await expect(fonteCitada).toContainText(CATALOGO.marca);
    await expect(page.getByText(PECA.codigo)).toBeVisible();
    await expect(page.getByRole("button", { name: "Ver Vista Explodida" })).toBeVisible();
  });
});
