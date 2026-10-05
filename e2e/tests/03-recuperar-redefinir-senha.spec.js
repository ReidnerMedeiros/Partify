const { test, expect } = require("@playwright/test");
const { lerLinkRedefinicao } = require("../helpers/lerLinkRedefinicao");
const { ADMIN } = require("../helpers/seedDados");

/**
 * Jornada 3 (PLANO_TESTES_AVANCADOS.md, seção 5): Esqueci minha senha → e-mail
 * chega → redefinição → login com a senha nova.
 *
 * Usa o administrador semeado por backend/prisma/seed-e2e.js (login/e-mail
 * conhecidos). O "e-mail chega" é verificado lendo o link que o
 * ConsoleEmailService imprime no console do backend em dev — rode o backend
 * redirecionando a saída para backend/dev-server.log antes deste teste (ver
 * e2e/README.md e helpers/lerLinkRedefinicao.js). Ao final, a senha do
 * administrador de teste muda — rode o seed novamente antes de repetir esta
 * jornada, ou antes das jornadas 4/5, para restaurar a senha original.
 */
test.describe("Jornada 3 — Recuperar e redefinir senha", () => {
  test("solicita recuperação, lê o link no log do servidor, redefine e loga com a senha nova", async ({ page }) => {
    const novaSenha = "novaSenha123";

    await page.goto("/recuperar-senha");
    await page.getByLabel("LOGIN").fill(ADMIN.login);
    await page.getByLabel("E-MAIL").fill(ADMIN.email);
    await page.getByRole("button", { name: "Enviar" }).click();

    // RNF05 — mensagem sempre genérica, exista ou não a conta.
    await expect(page.getByText(/receberá um e-mail/)).toBeVisible();

    const link = await lerLinkRedefinicao({ email: ADMIN.email });

    await page.goto(link);
    await expect(page).toHaveURL(/\/redefinir-senha\?token=/);

    await page.getByLabel("NOVA SENHA").fill(novaSenha);
    await page.getByLabel("CONFIRMAR NOVA SENHA").fill(novaSenha);
    await page.getByRole("button", { name: "Salvar" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Senha redefinida com sucesso")).toBeVisible();

    await page.getByLabel("LOGIN").fill(ADMIN.login);
    await page.getByLabel("SENHA").fill(novaSenha);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/menu$/);
  });
});
