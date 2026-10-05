# Testes E2E (Playwright) — item 5 de PLANO_TESTES_AVANCADOS.md

Testam as 5 jornadas ponta a ponta contra os servidores de **desenvolvimento
local** (não um build de produção, não CI) — decisão registrada em
`CONTEXTO.md`.

## Pré-requisitos

1. `backend/.env` configurado (banco, `GEMINI_API_KEY`, `GEMINI_EMBEDDING_MODEL`, `FRONTEND_URL=http://localhost:5173`).
2. Dependências instaladas na raiz do monorepo: `npm install` (agora inclui o workspace `e2e`).
3. Navegadores do Playwright instalados (uma vez): `npx playwright install --with-deps chromium` (a partir de `e2e/`, ou `npm exec --workspace e2e -- playwright install chromium` da raiz).

## Passo a passo

Em 3 terminais separados, a partir da raiz do monorepo:

```bash
# 1. Backend — redireciona a saída para um arquivo (a jornada 3 lê o link de
#    redefinição de senha ali, já que o ConsoleEmailService só imprime no console).
npm run dev:backend > backend/dev-server.log 2>&1
# PowerShell: npm run dev:backend *> backend/dev-server.log

# 2. Frontend
npm run dev:frontend

# 3. Seed dos dados usados pelas jornadas 3, 4 e 5 (idempotente — pode rodar de novo a qualquer momento)
npm run e2e:seed
```

Depois, rode os testes:

```bash
npm run e2e:test
# ou, direto na pasta e2e/: npx playwright test
# com navegador visível: npm run test:headed --workspace e2e
# relatório HTML após a execução: npm run report --workspace e2e
```

## As 5 jornadas

| # | Spec | Depende de |
|---|------|------------|
| 1 | `01-cadastro-login-logout.spec.js` | Nada (cria empresa própria) |
| 2 | `02-importar-validar-catalogo.spec.js` | Nada (cria empresa própria) — usa a Gemini API de verdade, pode ser lento e não passar 100% das vezes por variação da IA |
| 3 | `03-recuperar-redefinir-senha.spec.js` | Seed (`npm run e2e:seed`) + `backend/dev-server.log` |
| 4 | `04-consultar-componentes.spec.js` | Seed (`npm run e2e:seed`) |
| 5 | `05-consulta-tecnica-ia.spec.js` | Seed (`npm run e2e:seed`) — Gemini API de verdade |

**Atenção:** a jornada 3 muda a senha do administrador semeado. Rode
`npm run e2e:seed` de novo antes de rodar as jornadas 4/5 depois da jornada 3
(ou rode a suíte inteira do zero — a ordem numérica dos arquivos já resolve
isso, já que o Playwright roda em `workers: 1` e ordena por nome de arquivo).

## Por que não é 100% automático

- **Jornada 2** usa a Gemini API de verdade para extrair dados de um PDF real
  (mesma decisão de custo/não-determinismo do teste de acurácia da IA, RNF10)
  — a asserção verifica que o fluxo chega ao fim, não os valores exatos extraídos.
- **Jornada 3** depende de ler `backend/dev-server.log` porque este projeto não
  tem uma caixa de e-mail de teste (Mailhog ou similar) — o próprio
  `PLANO_TESTES_AVANCADOS.md` já descrevia essa etapa como "verificação manual
  do recebimento" antes deste E2E existir.
- **Jornada 5** usa a Gemini API de verdade (embedding da pergunta + geração
  via RAG) — a asserção verifica a situação da resposta e a fonte citada, não
  o texto exato gerado.
