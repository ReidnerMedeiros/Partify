const { test, expect } = require("@playwright/test");
const { gerarCnpjValido } = require("../helpers/cnpj");

/**
 * Jornada 1 (PLANO_TESTES_AVANCADOS.md, seção 5): Cadastro de empresa → login → logout.
 * Fluxo totalmente autocontido — cria uma empresa nova a cada execução (CNPJ
 * gerado na hora), não depende do seed de backend/prisma/seed-e2e.js.
 */
test.describe("Jornada 1 — Cadastro de empresa, login e logout", () => {
  test("cadastra uma empresa nova, faz login com o administrador criado e desloga", async ({ page }) => {
    const sufixo = Date.now();
    const cnpj = gerarCnpjValido();
    const loginAdmin = `e2e.jornada1.${sufixo}`;
    const senhaAdmin = "senha12345";

    await page.goto("/cadastro");

    await page.getByLabel("Nome da Empresa").fill(`Oficina E2E ${sufixo}`);
    await page.getByLabel("CNPJ ou CPF").fill(cnpj);
    await page.getByLabel("Telefone").fill("64999990000");
    await page.getByLabel("E-mail do Administrador").fill(`${loginAdmin}@partify.teste`);
    await page.getByLabel("Login do Administrador").fill(loginAdmin);
    await page.getByLabel(/Senha do Administrador/).fill(senhaAdmin);

    await page.getByRole("button", { name: "Cadastrar" }).click();

    // RF01 — sucesso navega para /login com mensagem de sucesso (RF01 -> RF02).
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Empresa cadastrada com sucesso")).toBeVisible();

    await page.getByLabel("LOGIN").fill(loginAdmin);
    await page.getByLabel("SENHA").fill(senhaAdmin);
    await page.getByRole("button", { name: "Entrar" }).click();

    // RF02 — login bem-sucedido navega para o Menu Principal.
    await expect(page).toHaveURL(/\/menu$/);
    await expect(page.getByText("Menu Principal")).toBeVisible();

    // RF02/A1 — logout com confirmação em duas etapas (RNF03).
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Encerrar sessão")).toBeVisible();

    await page.getByRole("dialog").getByRole("button", { name: "Sair" }).click();

    await expect(page).toHaveURL(/\/login$/);

    // Confirma que a sessão foi mesmo encerrada: rota protegida redireciona de volta.
    await page.goto("/menu");
    await expect(page).toHaveURL(/\/login$/);
  });
});
