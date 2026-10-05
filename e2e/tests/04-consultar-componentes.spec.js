const { test, expect } = require("@playwright/test");
const { ADMIN, CATALOGO, PECA } = require("../helpers/seedDados");

/**
 * Jornada 4 (PLANO_TESTES_AVANCADOS.md, seção 5): Consultar Componentes (RF11)
 * → busca por código exato e por descrição semântica → abrir vista explodida.
 *
 * Depende do seed direto no banco (backend/prisma/seed-e2e.js) — decisão
 * explícita para não depender da jornada 2 (que usa dados reais e não-
 * determinísticos da IA) para popular a base consultada aqui.
 *
 * Atenção: se a jornada 3 rodou antes e mudou a senha do ADMIN.login, rode o
 * seed de novo (`npm run e2e:seed`) antes desta jornada.
 */
test.describe("Jornada 4 — Consultar Componentes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("LOGIN").fill(ADMIN.login);
    await page.getByLabel("SENHA").fill(ADMIN.senha);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/menu$/);

    await page.getByRole("button", { name: "Consultar Componentes" }).click();
    await expect(page).toHaveURL(/\/componentes$/);
  });

  test("busca por código exato encontra a peça semeada", async ({ page }) => {
    await page.getByRole("button", { name: "Busca por Código Exato" }).click();
    await page.getByLabel("Termo de busca").fill(PECA.codigo);
    await page.getByRole("button", { name: "Buscar" }).click();

    await expect(page.getByText(PECA.codigo)).toBeVisible();
    await expect(page.getByText(CATALOGO.marca)).toBeVisible();
  });

  test("busca semântica por descrição encontra a peça semeada", async ({ page }) => {
    await page.getByRole("button", { name: "Busca Semântica" }).click();
    await page.getByLabel("Termo de busca").fill(PECA.descricaoTermoBusca);
    await page.getByRole("button", { name: "Buscar" }).click();

    await expect(page.getByText(PECA.codigo)).toBeVisible();
  });

  test("abrir vista explodida abre o PDF em nova aba", async ({ page, context }) => {
    await page.getByLabel("Termo de busca").fill(PECA.codigo);
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByText(PECA.codigo)).toBeVisible();

    const [novaAba] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("button", { name: "Ver Vista Explodida" }).click(),
    ]);
    await novaAba.waitForLoadState();
    expect(novaAba.url()).toContain("http");
    await novaAba.close();
  });
});
