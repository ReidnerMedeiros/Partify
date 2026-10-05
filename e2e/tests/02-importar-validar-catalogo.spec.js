const path = require("path");
const { test, expect } = require("@playwright/test");
const { gerarCnpjValido } = require("../helpers/cnpj");

/**
 * Jornada 2 (PLANO_TESTES_AVANCADOS.md, seção 5): Login → importar catálogo
 * (PDF real) → extração real via Gemini (RF07) → validação HITL (RF08) →
 * aparece em "Manter Catálogo" (RF09).
 *
 * Diferente das jornadas 4/5 (que usam dados semeados direto no banco), esta
 * jornada roda o fluxo REAL de ponta a ponta, incluindo a chamada de verdade
 * à Gemini API — é a única forma de testar RF06→RF07→RF08 como o usuário
 * realmente vive. Tem custo pequeno e não-determinismo (a IA pode não achar
 * todos os campos), então esta jornada tolera variação: valida apenas que o
 * fluxo chega ao fim e o catálogo aparece em "Manter Catálogo", não os valores
 * exatos extraídos (isso já é coberto pelo teste de acurácia da IA, RNF10).
 */
const PDF_FIXTURE = path.join(__dirname, "..", "..", "backend", "tests", "acuracia-ia", "pdfs", "makita-hr2470.pdf");

test.describe("Jornada 2 — Importar, validar e consultar catálogo", () => {
  test("importa um PDF real, extrai, valida e o catálogo aparece em Manter Catálogo", async ({ page }) => {
    test.setTimeout(120_000); // extração real via IA pode levar bem mais que os 60s padrão

    const sufixo = Date.now();
    const cnpj = gerarCnpjValido();
    const loginAdmin = `e2e.jornada2.${sufixo}`;
    const senhaAdmin = "senha12345";

    // --- Setup: empresa + login próprios, para não interferir com o seed das jornadas 3/4/5. ---
    await page.goto("/cadastro");
    await page.getByLabel("Nome da Empresa").fill(`Oficina E2E ${sufixo}`);
    await page.getByLabel("CNPJ ou CPF").fill(cnpj);
    await page.getByLabel("Telefone").fill("64999990000");
    await page.getByLabel("E-mail do Administrador").fill(`${loginAdmin}@partify.teste`);
    await page.getByLabel("Login do Administrador").fill(loginAdmin);
    await page.getByLabel(/Senha do Administrador/).fill(senhaAdmin);
    await page.getByRole("button", { name: "Cadastrar" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel("LOGIN").fill(loginAdmin);
    await page.getByLabel("SENHA").fill(senhaAdmin);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/menu$/);

    // --- RF06 — Importar Catálogo. ---
    await page.getByRole("button", { name: "Importar Catálogo" }).click();
    await expect(page).toHaveURL(/\/catalogos\/importar$/);

    await page.locator('input[type="file"]').setInputFiles(PDF_FIXTURE);
    await page.getByLabel("Marca (opcional)").fill("Makita");
    await page.getByLabel("Modelo (opcional)").fill("HR2470");

    await page.getByRole("button", { name: /Importar e Extrair/ }).click();

    // --- RF07/RF08 — chega na tela de validação (extração real concluída). ---
    await expect(page).toHaveURL(/\/catalogos\/.+\/validar$/, { timeout: 90_000 });
    await expect(page.getByText("Dados Extraídos")).toBeVisible();

    // RF08 — confirma a validação (HITL) com os dados que a IA extraiu, sem
    // exigir valores específicos — o objetivo aqui é o fluxo, não a acurácia.
    await page.getByRole("button", { name: /Validar e Salvar|Salvar/ }).click();

    await expect(page.getByText("Dados validados e salvos com sucesso.")).toBeVisible({ timeout: 20_000 });

    // --- RF09 — o catálogo validado aparece em "Manter Catálogo". ---
    await page.getByRole("button", { name: "Ir para o menu" }).click();
    await expect(page).toHaveURL(/\/menu$/);

    await page.getByRole("button", { name: "Manter Catálogo" }).click();
    await expect(page).toHaveURL(/\/catalogos$/);
    await expect(page.getByText("Makita", { exact: false }).first()).toBeVisible();
  });
});
