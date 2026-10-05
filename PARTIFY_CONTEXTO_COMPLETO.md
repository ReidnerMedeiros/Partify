# Partify — Registro completo do projeto (handoff)

> Arquivo único consolidando, na íntegra, o conteúdo de `AGENTS.md`, `README.md`, `CONTEXTO.md`, `TESTES.md`, `HISTORICO.md`, `PLANO_TESTES_AVANCADOS.md` e `LEMBRETES.md`, gerado a pedido do usuário para uso futuro com Claude Code / outras sessões, quando os arquivos individuais na raiz do projeto não estiverem disponíveis ou como referência única e completa. Cada seção abaixo reproduz o arquivo de origem por completo, sem cortes ou resumos.

---

# SEÇÃO 1 — AGENTS.md

# AGENTS.md — Partify

Contexto pra qualquer agente de codificação (Claude Code, opencode, Hermes, etc.) trabalhar neste repositório. Este arquivo é o ponto de entrada — os detalhes completos ficam nos `.md` da raiz, listados abaixo. **Leia `CONTEXTO.md` por inteiro antes de fazer qualquer mudança** — é o arquivo mais importante deste projeto.

## O que é o projeto

TFC (Trabalho de Conclusão de Curso) de graduação na UniRV — plataforma web de extração e consulta de dados técnicos (códigos de peça, vistas explodidas) de ferramentas elétricas portáteis (Bosch, Makita, DeWalt), com IA multimodal (Gemini API), validação humana obrigatória (HITL) e consulta via RAG (pgvector). A especificação completa vem de um DERS (Documento de Especificação de Requisitos de Software) — os 13 requisitos funcionais (RF01–RF13) já estão implementados.

## Onde está o quê (leia nesta ordem)

1. **`CONTEXTO.md`** — arquitetura completa, decisões tomadas (com o porquê de cada uma, numeradas), requisitos implementados, o que ainda falta, convenções obrigatórias. Sempre leia primeiro.
2. **`README.md`** — stack, como rodar o projeto (migrations, variáveis de ambiente), rotas do backend.
3. **`TESTES.md`** — o que cada teste cobre e por quê.
4. **`HISTORICO.md`** — registro cronológico de quando/em que ordem cada coisa foi feita.
5. **`LEMBRETES.md`** — pendências manuais que um agente identificou mas não conseguiu resolver sozinho (tipicamente exclusão de arquivo).

Nunca invente decisão de arquitetura sem checar se ela já foi tomada (e documentada com o porquê) em `CONTEXTO.md`.

## Stack e comandos

- Backend: Node.js + Express, Clean Architecture (`Controllers -> Use Cases -> Domain -> Agentes de IA`), Prisma ORM, PostgreSQL (Supabase) com `pgvector`.
- Frontend: React + Vite.
- Monorepo com npm workspaces (`backend/`, `frontend/`).

```bash
npm install                        # raiz — resolve os dois workspaces
npm run dev:backend                # http://localhost:3333
npm run dev:frontend               # http://localhost:5173
npm run prisma:migrate             # roda migrations do backend
cd backend && npm test             # suíte Jest (tudo em memória, sem banco)
```

## Regras de arquitetura (não violar)

- Camadas só dependem da camada mais interna: `http` → `useCases` → `domain`; `infra` implementa interfaces definidas em `domain`. Controllers e Use Cases nunca importam Prisma/bcrypt/jsonwebtoken/SDK da Gemini diretamente — só os contratos abstratos de `domain/repositories` e `domain/services`.
- Um Use Case por fluxo/operação do DERS.
- Erros sempre via `domain/errors/DomainErrors.js` (nunca `Error` genérico, nunca vazar erro de infra pro cliente).
- Toda ação relevante registra log de auditoria (`TipoAcao` + `usuarioId` + `empresaId` + `detalhes`) — `LogAuditoria` é append-only (RNF09), nunca criar update/delete nela.
- RNF11 (multi-tenant): toda entidade que precisa de isolamento por instância carrega `empresaId` **direto na coluna**, nunca inferido por JOIN. Sempre checar posse (`registro.empresaId !== empresaId` → `NotFoundError`) antes de retornar/alterar qualquer coisa.
- Os 3 agentes de IA (Extrator, Validador, Consulta) ficam isolados em `backend/src/agentesIA/`, cada um com sua própria classe, mesmo repetindo a mesma chamada de API entre si (ver decisão #25 em `CONTEXTO.md`).
- Ações destrutivas/impactantes usam confirmação de duas etapas (`ConfirmModal`) no frontend.

## Testes

- Jest, tudo em memória via fakes (`backend/tests/fakes/`) — nunca chama a Gemini API real nem toca um banco de verdade.
- Escreva um teste unitário (Use Case + fakes) pra cada caso de uso novo, seguindo o padrão já existente em `backend/tests/unit/useCases/`.
- Atualize `TESTES.md` descrevendo o que cada teste novo cobre e por quê.

## Ao terminar qualquer tarefa

Atualize `CONTEXTO.md`, `README.md`, `TESTES.md` e `HISTORICO.md` com o que foi feito — é assim que o próximo agente (ou você mesmo, numa sessão futura) recupera o contexto sem reconstruir tudo do zero. Se uma decisão for tomada fora do texto original do DERS, documente isso explicitamente como tal (ver decisão #26 em `CONTEXTO.md` como exemplo do padrão).

Se precisar apagar um arquivo e não tiver como fazer isso diretamente, registre em `LEMBRETES.md` (caminho completo + motivo) em vez de só mencionar no chat.

---

# SEÇÃO 2 — README.md

# Partify

Sistema de extração e consulta de dados técnicos de ferramentas elétricas (Bosch, Makita, DeWalt), com apoio de IA multimodal (Gemini API), validação humana obrigatória (HITL) e consulta via RAG (pgvector).

## Stack

- **Backend:** Node.js + Express, em Clean Architecture (`Controllers -> Use Cases -> Domain -> Agentes de IA`), Prisma ORM, PostgreSQL (Supabase) com extensão `pgvector`.
- **Frontend:** React + Vite, consumindo o backend via REST.

## Status atual

Implementado ponta a ponta:

- **RF01 — Manter Empresa**: cadastro público, consulta, edição e desativação da instância.
- **RF02 — Realizar Login**: login com JWT e logout com invalidação imediata da sessão (denylist por `jti`).
- **RF03 — Recuperar Senha**: solicitação de link de redefinição por login + e-mail (mensagem sempre genérica, RNF05).
- **RF04 — Alterar Senha**: fluxo básico (usuário autenticado troca a própria senha, confirmando a senha atual) e fluxo alternativo A1 (redefinição via link do RF03, sem sessão ativa).
- **RF05 — Manter Usuário**: exclusivo do Administrador — criação, listagem, edição, desativação e reativação de contas de Técnico/Vendedor da própria instância.
- **RF06 — Importar Catálogo**: upload de PDF (vista explodida), com marca/modelo opcionais como contexto auxiliar para a IA.
- **RF07 — Extração Multimodal via IA**: Agente Extrator (Gemini API) lê o PDF e retorna marca/modelo/tensão/peças com índice de confiança por campo.
- **RF08 — Interface de Validação (HITL)**: tela dividida (documento x formulário) para o validador humano confirmar/corrigir os dados antes de persistir; gera os embeddings (pgvector) das peças validadas.
- **RF09 — Manter Catálogo**: consulta de peças já validadas (com filtros por marca/modelo/código), edição do catálogo (marca/modelo/tensão/peças, tela dividida reaproveitando o padrão do RF08) e exclusão de peça, ambas com o mesmo rigor de isolamento por empresa (RNF11).
- **RF10 — Manter Documentos Pendentes**: fila dos documentos `IRRESOLUVEL` (extração parcial ou malsucedida do RF07) — preencher manualmente (reaproveita a tela do RF08), reenviar para nova tentativa de extração (reaproveita o endpoint do RF07/E1) ou excluir o documento por completo.
- **RF11 — Consulta de Componentes**: busca de peças por código exato e por descrição técnica (busca semântica via pgvector), com filtros de marca/tensão e acesso ao documento original da vista explodida por resultado.
- **RF12 — Consulta Técnica via RAG**: chat de perguntas técnicas em linguagem natural, respondidas pelo Agente de Consulta (Gemini) fundamentado exclusivamente no contexto recuperado dos catálogos validados (RN01) — nunca com conhecimento externo do modelo. Cada pergunta é independente (sem histórico mantido no backend), com citação da fonte (marca/modelo/data de validação/código) e acesso à vista explodida quando a resposta é encontrada.
- **RF13 — Manter Log Sistema (ADM)**: exclusivo do Administrador — consulta do histórico completo de auditoria da instância, com filtros opcionais de Usuário, Tipo de Ação, Data Inicial e Data Final; os logs são somente leitura (RNF08/RNF09), sem nenhuma ação de editar/excluir.

RF06/RF07/RF08 rodam de forma **síncrona** (sem fila/worker assíncrono) — ver "Decisões de projeto" abaixo.

## Estrutura do monorepo

```
Partify/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # modelo de dados completo (dicionário de dados do DERS)
│   │   └── manual/               # scripts SQL que o Prisma não modela (trigger de imutabilidade)
│   └── src/
│       ├── domain/               # entidades, enums, validadores, contratos de repositório/serviço — sem dependência de framework
│       ├── useCases/             # regras de aplicação (1 caso de uso por operação do DERS), inclui useCases/catalogo (RF06-RF10)
│       │                          # e useCases/consulta (RF11/RF12), useCases/log (RF13)
│       ├── infra/                # implementações concretas genéricas: Prisma, bcrypt, JWT, storage (Local/Supabase)
│       ├── agentesIA/            # camada isolada dos agentes de IA (Gemini) — ver agentesIA/README.md
│       │   ├── AgenteExtrator/   # GeminiExtractionService (RF07 — só extração + comparação), prompts/
│       │   ├── AgenteValidador/  # GeminiEmbeddingService (RF08/RF09 — embeddings pós-validação)
│       │   └── AgenteConsulta/   # GeminiEmbeddingService (RF11/RF12 — vetoriza termo/pergunta),
│       │                          # GeminiRAGService (RF12 — geração fundamentada em contexto), prompts/
│       ├── http/                 # controllers, rotas e middlewares (Express)
│       ├── main/factories/       # composition root — única camada que conhece tudo
│       ├── app.js
│       └── server.js
└── frontend/
    └── src/
        ├── pages/                 # CadastrarEmpresaPage, LoginPage, RecuperarSenhaPage, RedefinirSenhaPage, AlterarSenhaPage,
        │                          # MenuPrincipalPage, DadosEmpresaPage, UsuariosPage, ImportarCatalogoPage, ValidarCatalogoPage,
        │                          # CatalogoPage, EditarCatalogoPage, DocumentosPendentesPage,
        │                          # ConsultarComponentesPage, ConsultaTecnicaPage, LogSistemaPage
        ├── components/            # Field, TopBar, ConfirmModal, NovoUsuarioModal, EditarUsuarioModal, PartifyLogo, ProtectedRoute
        ├── services/              # api.js (axios), empresaService.js, authService.js, usuarioService.js, catalogoService.js, consultaService.js,
        │                          # logAuditoriaService.js
        └── styles/global.css
```

## Como rodar

### 1. Pré-requisitos

- Node.js 18+
- Uma instância Postgres com a extensão `pgvector` disponível (recomendado: um projeto Supabase gratuito)

### 2. Instalar dependências

Na raiz do projeto:

```bash
npm install
```

(o `npm install` na raiz resolve as dependências de `backend/` e `frontend/` via npm workspaces)

### 3. Configurar variáveis de ambiente

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edite `backend/.env` com a `DATABASE_URL`/`DIRECT_URL` do seu projeto Supabase e um `JWT_SECRET` forte.

Para o RF03 (envio do e-mail de redefinição de senha), configure `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` e `BREVO_SENDER_NAME` (recomendado — API HTTP do Brevo, não afetada pelo bloqueio de portas SMTP que plataformas como o Render aplicam em planos gratuitos; gere a chave em https://app.brevo.com/settings/keys/api e verifique o remetente em https://app.brevo.com/senders/list) ou, alternativamente, `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` (SMTP tradicional). Se nenhuma das duas estiver configurada, o backend usa um `ConsoleEmailService` de desenvolvimento, que apenas imprime o link de redefinição no console do servidor.

Para o RF07/RF08 (Agente Extrator e embeddings) e o RF12 (Agente de Consulta — RAG), configure `GEMINI_API_KEY` (gere em https://aistudio.google.com/apikey — **nunca compartilhe essa chave**) e confira se `GEMINI_MODEL`/`GEMINI_EMBEDDING_MODEL` apontam para identificadores de modelo válidos no momento (nomes de modelo da Gemini API mudam com frequência — confirme em https://ai.google.dev/gemini-api/docs/models). Sem `GEMINI_API_KEY`, as rotas `/catalogos*` e `/consulta-tecnica` retornam erro ao chamar a IA.

Para o RF06 (armazenamento do PDF importado), `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` são opcionais: se ficarem em branco, o backend salva os arquivos localmente em `backend/storage/` (pasta ignorada no git).

### 4. Rodar as migrations

```bash
cd backend
npx prisma migrate dev --name init
```

Se o schema já tiver sido migrado antes do RF06/RF07/RF08, rode também:

```bash
npx prisma migrate dev --name rf06_07_08_catalogo
```

Se o Supabase recusar a criação automática da extensão `vector` (permissões), habilite-a manualmente pelo SQL Editor do Supabase: `create extension if not exists vector;` — e rode a migration novamente.

**Se você já tinha testado o RF06/RF07/RF08 antes desta correção**, o catálogo técnico passou a ser isolado por empresa (`empresaId`, ver decisão #19 no `CONTEXTO.md` — correção do RNF11). Como a coluna é obrigatória e os dados de teste anteriores não têm empresa associada, limpe as 6 tabelas do domínio técnico **antes** de rodar a nova migration (não afeta `empresas`/`usuarios`/`logs_auditoria`):

```sql
-- via psql, ou colando no SQL Editor do Supabase
TRUNCATE TABLE validacoes, pecas, versoes_tensao, ferramentas, marcas, catalogos CASCADE;
```

Depois rode:

```bash
npx prisma migrate dev --name rf09_isolamento_catalogo_por_empresa
```

Se o schema já tiver sido migrado antes do RF13, rode também (adiciona `empresaId` — nullable — em `logs_auditoria`; não exige truncar nenhuma tabela, os logs antigos ficam com `empresaId = null`):

```bash
npx prisma migrate dev --name rf13_log_auditoria_empresa_id
```

Depois, aplique o script de imutabilidade dos logs de auditoria (RNF09), que o Prisma não modela:

```bash
# via psql, ou colando o conteúdo do arquivo no SQL Editor do Supabase
psql "$DATABASE_URL" -f prisma/manual/immutable_audit_log.sql
```

### 5. Subir backend e frontend

Em dois terminais, a partir da raiz:

```bash
npm run dev:backend   # http://localhost:3333
npm run dev:frontend  # http://localhost:5173
```

### 6. Testar os fluxos RF01–RF13

1. Acesse `http://localhost:5173/cadastro` e cadastre uma empresa.
2. Você será redirecionado para `/login` — entre com o login e a senha do administrador informados no cadastro. Ao autenticar, você cai no Menu Principal (`/menu`).
3. Em `/menu`, acesse "Dados da Empresa" para consultar, editar e (se quiser testar) desativar a instância.
4. No topo, clique no ícone de usuário (👤) e em "Sair" para testar o logout (RF02-A1) — a sessão é invalidada imediatamente no backend.
5. Em `/login`, clique em "Esqueci minha senha" para ir a `/recuperar-senha` (RF03); informe login e e-mail cadastrados. Como não há envio real de e-mail sem `SMTP_HOST` configurado, veja o link de redefinição impresso no console do backend.
6. Acesse o link impresso (`/redefinir-senha?token=...`) para definir uma nova senha (RF04-A1) e faça login novamente com ela.
7. Já logado, clique no ícone de usuário (👤) e em "Alterar Senha" (RF04, fluxo básico) para trocar a senha informando a senha atual + a nova senha.
8. Como administrador, acesse "Manter Usuários" no Menu Principal (`/usuarios`) para criar contas de Técnico/Vendedor, editá-las, desativá-las e reativá-las (RF05). Faça login com uma dessas contas para confirmar que ela não vê "Manter Usuários" como um link ativo.
9. Em `/menu`, acesse "Importar Catálogo" (RF06) e envie um PDF de vista explodida (ex.: um dos catálogos de exemplo Bosch/Makita/DeWalt). Aguarde o processamento (RF07) — a tela navega automaticamente para a validação (RF08), com o PDF original à esquerda e os dados extraídos (com barras de confiança por campo) à direita. Corrija o que for necessário e clique em "Validar e Salvar".
10. Em `/menu`, acesse "Manter Catálogo" (RF09) para ver a peça recém-validada na listagem (filtre por marca/modelo/código se quiser). Clique no ícone de editar para abrir a tela dividida de edição (marca/modelo/tensão/peças do catálogo inteiro) e salve alguma alteração; clique no ícone de excluir para remover uma peça específica (confirmação em duas etapas).
11. Para testar o RF10, importe um PDF que a IA não consiga extrair por completo (ex.: um documento sem marca/modelo claros, ou um arquivo qualquer em PDF sem padrão técnico) — o catálogo fica `IRRESOLUVEL` e some da tela de validação se você sair sem salvar. Em `/menu`, acesse "Documentos Pendentes" (RF10) para vê-lo na fila, com o badge "Pendente" ou "Irresolúvel", a confiança e os campos ausentes. Teste os três botões: "Preencher" (abre a mesma tela do RF08 pra completar e salvar manualmente), "Reenviar para IA" (confirma e reprocessa o mesmo arquivo do zero) e "Excluir" (confirma e remove o documento da fila).
12. Em `/menu`, acesse "Consultar Componentes" (RF11) e busque pelo código exato de uma peça já validada (ex.: `1600A004GD`) ou por uma descrição em linguagem simplificada (ex.: "escova de carvão da esmerilhadeira") — filtre por marca/tensão se quiser, alterne entre "Busca Semântica"/"Busca por Código Exato" (afeta só a ordenação, os dois motores sempre rodam juntos) e clique em "Buscar". Clique em "Ver Vista Explodida" numa linha de resultado para abrir o PDF original numa nova aba.
13. Em `/menu`, acesse "Consulta Técnica (IA)" (RF12) e faça uma pergunta em linguagem natural sobre uma peça já validada (ex.: "Qual o código do induzido da GWS 9-125S 127V?"). A resposta vem com a "Fonte citada" (marca/modelo/data de validação) e o código da peça, com um botão "Ver Vista Explodida". Teste também uma pergunta totalmente fora do domínio (ex.: "qual a previsão do tempo?") para ver a exceção E3, e uma pergunta técnica sobre uma peça que a instância não tem cadastrada para ver a E1 (sugestão de importar catálogo).
14. Como administrador, acesse "Manter Usuários" (`/usuarios`) e clique em "Log do Sistema" (RF13, `/log-sistema`) para ver o histórico de auditoria da instância — todas as ações registradas até aqui (login, criação de usuário, upload/extração/validação de catálogo etc.) já aparecem na tabela. Teste os filtros (Usuário, Tipo de Ação, Data Inicial/Final) e clique em "Consultar"; um filtro sem correspondência mostra a mensagem de "nenhum registro encontrado" (E1). Faça login com uma conta Técnico/Vendedor e tente acessar `/log-sistema` diretamente pela URL — a tela redireciona de volta ao menu (E2), e a rota `GET /log-auditoria` no backend rejeita com 403 e registra `ACESSO_NAO_AUTORIZADO`.

## Testes automatizados

O backend tem testes unitários (Jest) para os Use Cases já implementados e para os validadores de domínio. Eles rodam contra implementações em memória dos repositórios/serviços (`backend/tests/fakes`), então não precisam de banco de dados nem de `.env` configurado.

```bash
cd backend
npm test
```

Cobertura atual:

- **RF01**: criar, consultar, atualizar e desativar empresa (fluxo básico + exceções E1/E2 + conflitos).
- **RF02**: login (fluxo básico + exceções E1/E2 + checagem de empresa desativada) e logout (invalidação de sessão).
- **RF03**: solicitação de recuperação de senha, incluindo a regra de nunca revelar se a conta existe (RNF05).
- **RF04**: alteração de senha autenticada (fluxo básico, com checagem da senha atual) e redefinição via link (fluxo A1), incluindo token expirado, já usado ou inexistente.
- **RF05**: criação, listagem, edição, desativação e reativação de usuários (fluxo básico + A1/A2/A3), incluindo a regra E2 (não desativar o único administrador ativo).
- **RF06/RF07/RF08**: importação de catálogo (validação de PDF), extração via IA (fluxo básico, A1 parcial, E1 falha de comunicação, E2 documento ilegível, guarda-corpo de domínio — rejeita e exclui documentos fora do escopo de ferramentas elétricas suportado) e validação HITL (edição, campos obrigatórios — incluindo a posição visual, agora obrigatória por RN04 — e geração de embeddings). A Gemini API real **nunca** é chamada nos testes — um `FakeExtractionService`/`FakeEmbeddingService` a substitui, então a acurácia real do modelo (RNF10) precisa ser conferida manualmente.
- **RF09**: consulta de peças validadas (filtros, isolamento por empresa), edição de catálogo (marca/modelo/tensão/peças — atualiza/cria/exclui, reprocessamento seletivo de embeddings) e exclusão de peça (com o embedding associado).
- **RF10**: listagem da fila de pendentes (classificação Pendente/Irresolúvel derivada dos campos ausentes), carregamento de um documento pendente para preenchimento manual e exclusão do documento — todos isolados por empresa (RNF11).
- **RF11**: busca combinada (código exato + similaridade semântica), filtros de marca/tensão, ordenação por modo, exceção E1 (nenhum resultado) e E2 (base sem registros validados), best-effort quando a geração do embedding do termo falha, isolamento por empresa (RNF11).
- **RF12**: fluxo básico (resposta fundamentada com fonte citada), exceção E1 (base sem registros validados, e Agente de Consulta classificando o contexto como insuficiente), exceção E3 (Agente de Consulta classificando a pergunta como sem contexto relevante, inclusive o caso defensivo de peças validadas sem embedding), exceção E2 (falha de comunicação com a Gemini API tanto na geração do embedding quanto na geração da resposta), fallback de segurança quando o `pecaCitadaId` devolvido não corresponde a nenhuma peça do contexto enviado, isolamento por empresa (RNF11). A Gemini API real **nunca** é chamada nos testes — um `FakeRAGService` a substitui.
- **RF13**: consulta filtrada do log de auditoria (Usuário, Tipo de Ação, Data Inicial/Final — todos opcionais), resolução do nome do usuário responsável (inclusive o rótulo "sistema" para logs sem `usuarioId`), exceção E1 (nenhum registro encontrado), validação de datas inválidas, ordenação cronológica, isolamento por empresa (RNF11). A exceção E2 (acesso não autorizado) é coberta pelo `exigirAdministrador` já existente, sem teste específico novo.
- Validadores de CPF/CNPJ (dígito verificador) e e-mail.
- Testes de integração cruzando requisitos (cadastro → login → desativação bloqueia login; recuperar → redefinir → login com senha nova; login → alterar senha → login com senha nova).

```
backend/tests/
├── fakes/          # repositórios e serviços em memória (dublês de teste)
├── unit/
│   ├── domain/validators/
│   └── useCases/
│       ├── empresa/
│       ├── auth/
│       ├── usuario/
│       ├── catalogo/
│       ├── consulta/
│       └── log/
└── integration/    # vários Use Cases reais cruzando requisitos
```

## Integração contínua (GitHub Actions)

O workflow `.github/workflows/ci.yml` roda automaticamente a cada push/PR na branch `main`, com dois jobs em paralelo:

- **backend-tests**: `npm test --workspace backend` (Jest, ~257 testes contra os fakes em memória — não precisa de banco nem de segredos configurados no CI).
- **frontend-build**: `npm run build --workspace frontend` (garante que o build do Vite não quebrou).

Se algum dos dois falhar, o commit/PR aparece marcado com ❌ no GitHub — é o sinal de que algo quebrou antes de ir pra produção.

## Keepalive do Supabase (evitar pause por inatividade)

Planos gratuitos do Supabase pausam o projeto inteiro após 7 dias sem nenhuma consulta real ao banco (visitar o dashboard ou só bater na API não conta — precisa ser uma query de verdade). O workflow `.github/workflows/keepalive.yml` chama `GET /health` (que faz um `SELECT 1` no Postgres) 3x por semana, bem abaixo do limite, só pra manter o projeto ativo.

Pra funcionar, cadastre uma variável de repositório no GitHub: **Settings → Secrets and variables → Actions → aba "Variables" → "New repository variable"**, com `BACKEND_URL` = a URL do backend no Render (ex. `https://partify-backend-l1ye.onrender.com`, sem barra no final).

Esse workflow não tenta manter o Render acordado o tempo todo — o cold start ocasional (~1 min) do plano gratuito do Render é aceito como trade-off; ele acorda sozinho na primeira requisição real (ex. o login).

## Deploy (Render + Vercel)

### Backend no Render

1. Crie um **Web Service** apontando para este repositório, com **Root Directory** `backend`.
2. Build Command: `npm install && npm run build` (o script `build` roda `prisma generate` e `prisma migrate deploy` contra o banco de produção).
3. Start Command: `npm start`.
4. Cadastre as variáveis de ambiente no painel do Render (não use o `.env` local — ele fica fora do repositório): `DATABASE_URL`, `DIRECT_URL` (ver observação abaixo sobre IPv6), `JWT_SECRET`, `JWT_EXPIRES_IN`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_EMBEDDING_MODEL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `FRONTEND_URL` (URL do frontend no Vercel, usada pelo CORS e pelo link de redefinição de senha) e `BREVO_API_KEY`/`BREVO_SENDER_EMAIL`/`BREVO_SENDER_NAME` (envio real do e-mail de redefinição — **não use `SMTP_*` no Render**, planos gratuitos bloqueiam portas SMTP de saída, ver observação abaixo).
5. Rode manualmente uma vez, direto no SQL Editor do Supabase (ou via `psql`), o script `backend/prisma/manual/immutable_audit_log.sql` — ele não é aplicado pelas migrations do Prisma.

### Frontend no Vercel

1. Importe o repositório com **Root Directory** `frontend` (o `frontend/vercel.json` já inclui o rewrite necessário para o roteamento client-side do React Router funcionar em URLs diretas, ex. dar refresh em `/menu`).
2. Framework preset: Vite (build command `npm run build`, output `dist`).
3. Cadastre a env var `VITE_API_URL` apontando para a URL pública do backend no Render.
4. Depois do primeiro deploy do frontend, volte no Render e atualize `FRONTEND_URL` com a URL definitiva do Vercel.

### Problema conhecido: `DIRECT_URL` e IPv6 (Render/Vercel)

O endereço de conexão direta do Supabase (`db.<referencia>.supabase.co:5432`) só resolve por **IPv6**. Plataformas como Render e Vercel não têm saída IPv6 por padrão, então `prisma migrate deploy` falha com `P1001: Can't reach database server` mesmo com a URL/senha corretas. Solução: use o mesmo endereço do **Session pooler** (o mesmo valor de `DATABASE_URL`, formato `aws-0-<regiao>.pooler.supabase.com:5432`, IPv4-compatível) também em `DIRECT_URL` nas variáveis de ambiente de produção — localmente isso não costuma dar problema porque muitos provedores de internet residenciais já suportam IPv6.

### Problema conhecido: portas SMTP bloqueadas em planos gratuitos (Render)

Planos gratuitos do Render (e de outras plataformas de deploy) bloqueiam conexões de saída para as portas SMTP tradicionais (25/465/587), então qualquer envio via `SmtpEmailService` (Gmail, Outlook etc.) falha com `ETIMEDOUT` em produção — não é erro de credencial. A solução usada neste projeto foi implementar `BrevoEmailService`, que envia e-mails via API HTTP (porta 443) em vez de SMTP, contornando esse bloqueio. Use sempre `BREVO_API_KEY` em produção; `SMTP_*` continua funcionando normalmente em ambiente local (a maioria das redes residenciais não bloqueia essas portas).

### Observação de segurança

Credenciais reais (senha do banco, `JWT_SECRET`, chave Gemini, service role key do Supabase) não devem ser as mesmas usadas em desenvolvimento se elas já tiverem sido expostas em algum momento (chat, log, commit) — gere valores novos antes de configurá-las em produção.

## Rotas do backend

| Método | Rota | Autenticado | Requisito |
| --- | --- | --- | --- |
| POST | `/auth/login` | não | RF02 |
| POST | `/auth/logout` | sim | RF02 (A1) |
| POST | `/auth/recuperar-senha` | não | RF03 |
| POST | `/auth/redefinir-senha` | não | RF04 (A1) |
| POST | `/auth/alterar-senha` | sim | RF04 (fluxo básico) |
| POST | `/empresas` | não | RF01 |
| GET | `/empresas/me` | sim | RF01 (A1) |
| PUT | `/empresas/me` | sim | RF01 (A1) |
| PATCH | `/empresas/me/desativar` | sim (admin) | RF01 (A2) |
| POST | `/usuarios` | sim (admin) | RF05 (básico) |
| GET | `/usuarios` | sim (admin) | RF05 (A1 — listar) |
| PUT | `/usuarios/:id` | sim (admin) | RF05 (A1 — editar) |
| PATCH | `/usuarios/:id/desativar` | sim (admin) | RF05 (A2) |
| PATCH | `/usuarios/:id/reativar` | sim (admin) | RF05 (A3) |
| POST | `/catalogos` | sim | RF06 (básico) + RF07 (básico, encadeado na mesma requisição) |
| POST | `/catalogos/:id/extrair` | sim | RF07 (nova tentativa após falha de comunicação, E1) |
| PUT | `/catalogos/:id/validar` | sim | RF08 (básico + A1) |
| GET | `/catalogos` | sim | RF09 (A2 — consulta com filtros) |
| GET | `/catalogos/:id` | sim | RF09 (A3 — carrega a tela de edição) |
| GET | `/catalogos/:id/arquivo` | sim | RF09 (reexibe o PDF original) |
| PUT | `/catalogos/:id` | sim | RF09 (A3 — salvar edição) |
| DELETE | `/catalogos/pecas/:pecaId` | sim | RF09 (A4 — exclusão de peça) |
| GET | `/catalogos/pendentes` | sim | RF10 (básico — fila de pendentes) |
| GET | `/catalogos/pendentes/:id` | sim | RF10 (A1 — carrega pra preenchimento) |
| DELETE | `/catalogos/pendentes/:id` | sim | RF10 (A3 — exclusão do documento) |
| GET | `/componentes` | sim | RF11 (básico + A2 — busca combinada) |
| POST | `/consulta-tecnica` | sim | RF12 (básico + E1/E2/E3 — Agente de Consulta) |
| GET | `/log-auditoria` | sim (admin) | RF13 (básico — consulta filtrada do log) |

## Decisões de projeto registradas em comentário no código

- O login (RF02) é único **globalmente**, não por empresa — a tela de login (Quadro 16 do DERS) não tem seletor de instância, então é o próprio login que identifica a que empresa o usuário pertence (ver `backend/prisma/schema.prisma`).
- O formulário de cadastro da empresa (Quadro 15) não coleta um "nome" separado para o administrador; o campo `nome` do usuário administrador é inicializado com o login (a edição de administradores em si não é coberta pela tela do RF05, que trabalha só com Técnico/Vendedor).
- O RF05 (Manter Usuário) nunca cria nem reatribui o perfil Administrador — o domínio de valores do campo Perfil (Quadro 19 do DERS) é restrito a Técnico/Vendedor tanto na criação quanto na edição.
- Logout (RF02-A1) usa uma tabela de denylist (`sessoes_revogadas`, chaveada pelo `jti` do JWT) para simular invalidação imediata de sessão, já que um JWT puro é stateless e não pode ser revogado no servidor sem esse estado extra.
- O envio do link de redefinição de senha (RF03) usa SMTP genérico via `nodemailer`, em vez do Supabase Auth mencionado no DERS — o projeto já usa autenticação própria (bcrypt + JWT) desde o RF01/RF02, então não há usuário gerenciado pelo GoTrue para acionar o e-mail nativo do Supabase (ver comentário em `backend/src/infra/email/SmtpEmailService.js`). O banco Postgres continua hospedado no Supabase.
- RF06/RF07 (importar + extrair) rodam de forma **síncrona**, numa única requisição HTTP — o projeto não tem infraestrutura de fila/worker assíncrono, então `POST /catalogos` já devolve o resultado da extração pronto para a tela de validação (ver comentário em `backend/src/http/controllers/CatalogoController.js` e decisão #11 no `CONTEXTO.md`).
- O catálogo técnico (Marca/Ferramenta/VersaoTensao/Catalogo/Peca/Validacao) é **isolado por instância** (`empresaId` direto em cada entidade) — o RNF11 exige segregação total entre empresas, "em nenhum cenário de teste". Duas empresas que importam o catálogo do mesmo fabricante/modelo têm cada uma seu próprio registro, sem reaproveitamento entre instâncias (decisão #19 no `CONTEXTO.md`, corrigindo a decisão #12 original).
- O Agente Extrator (RF07) recebe uma instrução de sistema explícita para tratar todo o conteúdo do PDF como dado, nunca como comando — defesa contra prompt injection, exigida pelo usuário (ver `backend/src/agentesIA/AgenteExtrator/prompts/extracaoPrompt.js`).
- Os agentes de IA (Gemini) ficam isolados em `backend/src/agentesIA/`, separados da infra genérica (`backend/src/infra/`) — decisão explícita do usuário, para refletir o fluxo `Controllers -> Use Cases -> Domain -> Agentes de IA` descrito desde o início do projeto.
- Cada chamada à Gemini API (extração e embeddings) loga no console do backend quantos tokens foram consumidos (`resposta.usageMetadata`), para acompanhar custo.
- O catálogo técnico (Marca/Ferramenta/VersaoTensao/Catalogo/Peca/Validacao) é **isolado por instância** (`empresaId` direto em cada entidade), não compartilhado entre empresas — correção da decisão original, feita pra atender ao RNF11 (ver decisão #19 no `CONTEXTO.md`).
- RF09 (Manter Catálogo) trabalha em nível de **peça**, não de catálogo inteiro: a listagem e a exclusão (A2/A4) são por peça, mas editar (A3) abre a tela dividida do catálogo inteiro (marca/modelo/tensão + todas as peças), já que esses três campos são compartilhados entre as peças do mesmo catálogo.
- RN04 (código + posição visual como binômio obrigatório) e RNF07 (log de acesso não autorizado) foram corrigidos junto com o ciclo do RF09 — ver decisão #20 no `CONTEXTO.md`.
- RF10 (Documentos Pendentes) não introduziu nenhum status novo: a distinção "Pendente"/"Irresolúvel" exibida na fila é calculada a partir do `camposAusentes` já persistido, sem alterar o enum `StatusCatalogo` — ver decisão #22 no `CONTEXTO.md`. As ações "Preencher" e "Reenviar para IA" reaproveitam, respectivamente, a tela do RF08 e o endpoint de nova tentativa do RF07/E1, sem nenhum Use Case novo de gravação.
- RF11 (Consulta de Componentes) sempre roda os dois motores de busca (SQL exato + pgvector) juntos, como o DERS descreve — os botões "Busca Semântica"/"Busca por Código Exato" do protótipo só decidem a ORDENAÇÃO do resultado combinado, confirmado com o usuário antes de implementar (decisão #23 no `CONTEXTO.md`). "Ver Vista Explodida" abre o PDF numa nova aba do navegador (visualizador nativo, com zoom/paginação de fábrica), em vez de um visualizador customizado.
- RF12 (Consulta Técnica via RAG) é onde o Agente de Consulta ganha sua capacidade de geração de resposta (`GeminiRAGService`, em `agentesIA/AgenteConsulta/`), já que gerar uma resposta em linguagem natural fundamentada em contexto é uma capacidade nova. A distinção entre as exceções E1 (contexto insuficiente) e E3 (pergunta sem contexto identificável) — que o DERS não define por um critério numérico — foi resolvida assim: nenhum registro validado na empresa mapeia direto para E1 (a ação sugerida, "importe um catálogo", resolve exatamente esse caso); com a base populada, a classificação entre RESPONDIDO/E1/E3 fica a cargo do próprio Gemini, que tem condições reais de avaliar se o contexto recuperado responde à pergunta específica feita (decisão #24 no `CONTEXTO.md`). Por segurança, o código da peça citada na resposta nunca é gerado pelo modelo: o Gemini só devolve o `id` de uma das peças já recuperadas pela busca vetorial (RF11), e o backend confere que esse id realmente veio no contexto enviado antes de usar seus dados — evita citar um código inventado.
- **Cada um dos 3 agentes do DERS (Extrator, Validador, Consulta) tem sua própria classe de IA**, a pedido explícito do usuário, para não concentrar tudo no Agente Extrator — mesmo quando duas classes de agentes diferentes fazem tecnicamente a mesma chamada de API (`embedContent`). O Agente Extrator (RF07) só extrai dados e compara com o documento original. O Agente Validador (RF08/RF09) gera os embeddings das peças, só depois da confirmação humana (`agentesIA/AgenteValidador/GeminiEmbeddingService.js`). O Agente de Consulta (RF11/RF12) tem sua própria instância de embedding pra vetorizar termo de busca/pergunta (`agentesIA/AgenteConsulta/GeminiEmbeddingService.js`, separada da instância do Agente Validador) e a geração de resposta do RF12 (`GeminiRAGService.js`) — decisão #25 no `CONTEXTO.md`, corrigindo as decisões #16/#23/#24, que compartilhavam uma única instância entre agentes.
- **Guarda-corpo de domínio no Agente Extrator (RF07)**, fora do texto do DERS, a pedido explícito do usuário: o sistema só aceita vistas explodidas de ferramentas elétricas portáteis de um conjunto fechado de categorias (furar/parafusar, demolição, corte, lixamento, desbaste/polimento, madeira, fixação, limpeza, jardinagem, medição, iluminação, construção), das marcas Bosch/Makita/DeWalt. Quando o Agente Extrator identifica com confiança que o documento enviado é de outro domínio (ex.: uma peça automotiva), a importação é REJEITADA por completo — o catálogo é excluído e a operação falha com 422, sem passar pela fila de pendentes (RF10) nem permitir preenchimento manual (RF08), já que não faz sentido dar essa chance a um documento comprovadamente fora do escopo — decisão #26 no `CONTEXTO.md`.
- **`LogAuditoria` ganhou `empresaId` direto** (coluna nullable, migration `20260724090000_rf13_log_auditoria_empresa_id`) — lacuna descoberta ao investigar o RF13: sem essa coluna, filtrar "o log da instância" (RNF11) dependeria de um `JOIN` via `usuario.empresaId`, que quebraria para os registros com `usuarioId` nulo (ex.: `CRIACAO_EMPRESA`). Os 19 pontos de chamada de `logAuditoriaRepository.registrar` no backend foram todos retrofitados para passar `empresaId` — decisão #27 no `CONTEXTO.md`.
- **RF13 — filtro "Tipo de Ação" usa o enum completo `TipoAcao`**, não as 4 categorias soltas do texto do Quadro 30 do DERS ("Validação, Edição, Exclusão, Acesso") — o protótipo mostra a tabela de resultados com os valores brutos do enum como badges, então seguimos o mesmo precedente de priorizar o comportamento do protótipo (decisões #21/#23), confirmado com o usuário — decisão #28 no `CONTEXTO.md`.

---

# SEÇÃO 3 — CONTEXTO.md

# Contexto do projeto Partify

> Este arquivo existe para dar contexto completo do projeto em conversas futuras, sem precisar reconstruir tudo do zero. Sempre que retomarmos o trabalho, leia este arquivo primeiro (além do `README.md` e do `TESTES.md`, que também estão na raiz).

## O que é o Partify

TFC (Trabalho de Conclusão de Curso) de graduação na UniRV. É uma plataforma web semi-automatizada para extração e consulta de dados técnicos (códigos de peça, vistas explodidas) de ferramentas elétricas portáteis (Bosch, Makita, DeWalt), com:

- Upload de catálogos/manuais em PDF.
- Extração de dados via IA multimodal (Gemini API), com arquitetura de 3 agentes: **Extrator**, **Validador** e **Consulta**.
- Validação humana obrigatória (HITL — Human in the Loop) antes de qualquer dado extraído ser considerado confiável.
- Consulta via RAG (Retrieval-Augmented Generation) usando embeddings vetoriais (pgvector no Postgres/Supabase).
- Multi-tenant: cada empresa/estabelecimento (loja de ferramentas, assistência técnica) é uma instância isolada (`Empresa`), com seus próprios usuários e catálogos.

**Status de deploy (desde 16/09/2026):** projeto publicado e funcional em produção — backend no Render (`https://partify-backend-l1ye.onrender.com`), frontend no Vercel (`https://partify-frontend-gamma.vercel.app`), banco/storage no Supabase, e-mail transacional (RF03) via Brevo, CI (testes + build) no GitHub Actions a cada push/PR na `main`. Detalhes completos nas decisões #32-#37 abaixo.

A especificação completa vem de um documento DERS (Documento de Especificação de Requisitos de Software) de 143 páginas, já extraído e usado como fonte de verdade para cada requisito implementado. **Este `CONTEXTO.md` não substitui o DERS** — quando formos implementar RF09 em diante, o ideal é reconsultar o PDF original pra pegar o texto exato do requisito (igual fizemos até aqui), porque este arquivo só resume o que já foi decidido/construído.

## Decisões macro (definidas pelo usuário no início do projeto)

- **Backend:** JavaScript puro (Node.js) + Express.
- **Frontend:** React + Vite.
- **Arquitetura:** Clean Architecture em camadas: `Frontend -> Backend (Controllers -> Use Cases -> Domain -> Agentes de IA) -> Supabase Storage / Gemini API`.
- **Monorepo** com npm workspaces (`backend/` e `frontend/` na raiz, um `package.json` raiz orquestrando os dois).
- **Banco de dados:** PostgreSQL hospedado no Supabase, com a extensão `pgvector` habilitada, acessado via **Prisma ORM**.

## Arquitetura do backend (Clean Architecture)

```
backend/src/
├── domain/         # entidades, enums, validadores, contratos (interfaces) de repositório/serviço
│                    # — ZERO dependência de framework, banco ou HTTP. É a camada mais interna.
├── useCases/        # regras de aplicação — 1 Use Case por operação/fluxo do DERS
├── infra/           # implementações concretas: Prisma, bcrypt, JWT, nodemailer, crypto
├── http/            # controllers, rotas e middlewares (Express) — adapta HTTP para Use Cases
├── main/factories/  # composition root — ÚNICO lugar que conhece Domain + Use Cases + Infra + HTTP
│                     # ao mesmo tempo; monta tudo via injeção de dependência no construtor
├── agentesIA/       # reservado para os agentes Extrator/Validador/Consulta (RF06+, ainda não implementado)
├── app.js           # configuração do Express (middlewares globais, rotas, errorHandler)
└── server.js        # inicialização do servidor HTTP
```

**Regra de dependência:** cada camada só pode depender da camada mais interna (`http` → `useCases` → `domain`; `infra` implementa interfaces definidas em `domain`). Controllers e Use Cases nunca importam Prisma/bcrypt/jsonwebtoken diretamente — só os contratos abstratos de `domain/repositories` e `domain/services`. Isso é o que torna possível testar os Use Cases sem banco de dados (ver seção de Testes).

### Frontend

```
frontend/src/
├── pages/        # uma página por tela do protótipo
├── components/   # componentes reutilizáveis entre páginas
├── services/      # camada de acesso à API (axios) + lógica de sessão local
└── styles/global.css  # todo o CSS do projeto, centralizado, com variáveis (:root) pra cor/raio/sombra
```

Ponto importante pra futuras mudanças estéticas: a lógica (chamadas de API, estado, validação) está sempre separada da apresentação (classes CSS, JSX). Redesenhar visualmente não deveria exigir tocar em `services/` nem nos handlers das páginas.

## Decisões arquiteturais importantes (com o porquê)

Estas decisões já foram tomadas e **devem ser mantidas** nos próximos requisitos, pra não gerar inconsistência com o que já existe:

1. **Autenticação própria (bcrypt + JWT), não Supabase Auth.** O DERS menciona "Supabase" em alguns pontos (ex.: RF03 fala em enviar e-mail "via Supabase"), mas o projeto usa uma tabela `usuarios` própria no Prisma, senha com hash bcrypt, e sessão via JWT assinado pelo backend. O banco em si continua hospedado no Supabase — só a *autenticação/autorização* é própria, não o GoTrue/Supabase Auth. Essa decisão foi tomada no RF01/RF02 e reafirmada explicitamente pelo usuário ao pedir o RF02/RF03 ("seguindo já as restrições propostas no requisito 01").

2. **Login é único globalmente**, não por empresa. A tela de login (Quadro 16 do DERS) não tem seletor de instância — então o campo `login` do `Usuario` tem `@unique` global no schema Prisma, e é ele (não o par login+empresa) que identifica a conta e, transitivamente, a empresa dela.

3. **Invalidação de sessão (logout) via denylist**, não via JWT stateless puro. Cada JWT emitido carrega um `jti` (UUID). A tabela `sessoes_revogadas` guarda os `jti` invalidados; o `authMiddleware` checa essa tabela em toda requisição autenticada. Isso é necessário porque JWT sozinho não pode ser "cancelado" no servidor, e o RF02-A1 exige invalidação imediata no logout.

4. **Envio de e-mail via SMTP genérico (`nodemailer`)**, não Supabase Auth nativo — pela mesma razão do item 1 (não há um usuário gerenciado pelo GoTrue pra acionar o e-mail nativo do Supabase). Há duas implementações trocáveis de `EmailService`: `ConsoleEmailService` (dev — só imprime o link no console) e `SmtpEmailService` (produção — usa SMTP de verdade). A escolha entre as duas é automática em `factories/index.js`, baseada em `process.env.SMTP_HOST` estar ou não configurado.

5. **Token de redefinição de senha:** gerado com `crypto.randomBytes`, só o hash SHA-256 é persistido no banco (nunca o token bruto), validade de 30 minutos, uso único (campo `usadoEm`). O link enviado por e-mail carrega o token bruto; ele nunca é reconstruível a partir do que está no banco.

6. **RNF05 (mensagens de erro compreensíveis) e prevenção de enumeração de contas (RF03/RNF05):** o endpoint de recuperação de senha *sempre* responde com a mesma mensagem genérica de sucesso, não importa se o login/e-mail batem com uma conta real ou não. Essa é uma regra sensível — qualquer mudança nesse fluxo precisa preservar esse comportamento.

7. **Log de auditoria é append-only (RNF09).** A interface `LogAuditoriaRepository` só expõe `registrar` (nunca update/delete). Há também um trigger SQL manual (`backend/prisma/manual/immutable_audit_log.sql`, precisa ser aplicado manualmente no Supabase pois o Prisma não modela triggers) que bloqueia UPDATE/DELETE na tabela `logs_auditoria` a nível de banco.

8. **Desativar uma empresa bloqueia o login de TODOS os usuários da instância** (RF01-A2), não só o `Usuario.ativo` individual. Isso foi um bug real encontrado durante o desenvolvimento do RF02 e corrigido — ver seção de bugs abaixo.

9. **Padrão de erros de domínio** (`backend/src/domain/errors/DomainErrors.js`): `ValidationError` (422, com `fieldErrors` por campo — usado em formulários), `NotFoundError` (404), `ConflictError` (409), `UnauthorizedError` (401), `ForbiddenError` (403). O `errorHandler` (middleware HTTP) traduz esses erros pra JSON `{ erro, campos? }`, nunca vaza stack trace nem detalhe interno.

10. **Confirmação em duas etapas (RNF03)** pra ações impactantes/irreversíveis-na-percepção-do-usuário: usado hoje na desativação de empresa e no logout, via componente `ConfirmModal.jsx` reutilizável.

11. **RF06/RF07 processam de forma síncrona, numa única requisição HTTP.** O DERS descreve o RF06 como "registra o arquivo na fila de extração" e o RF07 como iniciando "automaticamente" depois — uma linguagem que sugere fila/worker assíncrono. Este projeto não tem infraestrutura de fila/job (Redis, Bull, etc.), então `POST /catalogos` chama `ImportarCatalogoUseCase` (RF06) e, na mesma requisição, `ExtrairDadosCatalogoUseCase` (RF07) em seguida, devolvendo o resultado já pronto para a tela de validação (RF08). O RNF04 (indicador de progresso para operações >2s) cobre a experiência do usuário durante essa espera. Se o projeto crescer, migrar para uma fila real exigiria separar essas duas chamadas — a divisão em dois Use Cases distintos (em vez de um só) foi feita propositalmente para facilitar essa extração futura.

12. ~~Catálogo técnico compartilhado entre todas as empresas~~ **[REVERTIDA — ver decisão #19].** Esta decisão original (RF06/07/08) tratava Marca/Ferramenta/VersaoTensao/Peca como uma base de conhecimento pública, sem `empresaId`, pra evitar reprocessamento de IA duplicado entre empresas. Na revisão de RN/RNF que antecedeu o RF09, o **RNF11** apareceu como texto explícito e inequívoco: "os dados técnicos cadastrados, incluindo catálogos, peças, ferramentas e histórico de validações, [devem ser] completamente segregados dos dados de qualquer outra instância... não deve ser possível recuperar, listar ou modificar registros de uma instância a partir de qualquer outra... em nenhum cenário de teste." Isso deixou claro que a interpretação original estava errada — mantida aqui, riscada, só como registro histórico da decisão e do motivo da correção.

13. **Defesa contra prompt injection no Agente Extrator**, exigida explicitamente pelo usuário: a instrução de sistema enviada à Gemini API (`backend/src/agentesIA/AgenteExtrator/prompts/extracaoPrompt.js`) instrui o modelo a tratar todo o conteúdo do PDF exclusivamente como dado a extrair, nunca como comando a obedecer, mesmo que o documento contenha algo que pareça uma instrução. O retorno da IA também nunca é reinterpretado como código/comando em nenhuma camada do sistema (nunca há `eval`, nunca é usado para montar SQL dinâmico — tudo passa pelo Prisma parametrizado).

14. **Modelo Gemini configurável via `.env` (`GEMINI_MODEL`/`GEMINI_EMBEDDING_MODEL`), sem valor fixo no código.** Os identificadores de modelo da Gemini API mudam com frequência (confirmado em pesquisa: Gemini 2.5 Flash já tem descontinuação anunciada, novos modelos 3.x lançados em 2026); fixar um nome no código arriscaria quebrar em produção sem aviso. O usuário inicialmente pediu o tier pago (Pro), mas decidiu usar **Gemini 2.5 Flash "por enquanto"** (mais barato/rápido) e **`gemini-embedding-2`** para os embeddings — já configurado em `backend/.env`. Se a acurácia (RNF10, ≥75%) não for suficiente com o Flash, trocar para um modelo Pro é só mudar essa variável, sem tocar em código. **Atenção:** não tenho certeza absoluta de que `gemini-embedding-2` é o identificador exato aceito pela API (nomenclatura recente, pouco documentada no momento) — se a chamada de embedding falhar com erro de "modelo não encontrado", esse é o primeiro lugar a conferir em https://ai.google.dev/gemini-api/docs/models.

15. **Armazenamento de arquivo (RF06) trocável via `.env`, mesmo padrão do `EmailService`.** `LocalFileStorageService` (salva em `backend/storage/`, pasta ignorada no git) é usado quando `SUPABASE_URL` não está configurada — permite testar o fluxo localmente sem precisar criar um bucket. `SupabaseStorageService` é usado em produção. A troca é automática em `factories/index.js`.

16. **Geração de embeddings (RNF04/pgvector) acontece no RF08 (após validação humana), não no RF07 (extração bruta).** Embora o RNF04 mencione "geração de embeddings vetoriais pelo Agente Extrator via RF07", optamos por gerar o vetor só depois que o humano confirma os dados (RF08) — vetorizar uma descrição de peça que a IA errou (e que o validador ainda vai corrigir) desperdiçaria uma chamada de API e poluiria a futura busca semântica (RF11/RF12) com dados não confiáveis. É best-effort (uma falha na geração não impede a validação de ser salva). **Atualização (decisão #25):** a classe que gera o embedding não fica mais na pasta do Agente Extrator — foi movida para `agentesIA/AgenteValidador/`, já que é o Agente Validador (não o Extrator) quem aciona essa geração.

17. **Agentes de IA isolados numa camada própria (`backend/src/agentesIA/`), separada da infra genérica.** Inicialmente `GeminiExtractionService`/`GeminiEmbeddingService` foram colocados em `infra/ai/` (mesmo padrão de `infra/email`, `infra/storage`); a pedido explícito do usuário, foram movidos para `agentesIA/`, honrando o fluxo descrito desde o início do projeto (`Controllers -> Use Cases -> Domain -> Agentes de IA`, ver `README.md`) como uma camada própria, e não apenas "mais um serviço de infra". `Use Cases` continuam só dependendo das interfaces abstratas de `domain/services/` — só o composition root (`main/factories/index.js`) sabe que a implementação concreta agora mora em `agentesIA/` (e, desde a decisão #25, em qual subpasta de agente especificamente).

18. **Log de consumo de tokens no console do backend**, a pedido do usuário (para acompanhar custo, já que a Gemini API é paga). `GeminiExtractionService` e `GeminiEmbeddingService` leem `resposta.usageMetadata` (campo padrão da Gemini API) e imprimem `entrada/saída/total` a cada chamada — só isso, sem persistir em nenhuma tabela nem expor pela API. Se o SDK não devolver esse campo (acontece mais com embeddings), a chamada simplesmente não loga nada, sem quebrar o fluxo.

19. **Catálogo técnico isolado por instância (`empresaId` direto em `Marca`, `Ferramenta`, `VersaoTensao`, `Catalogo`, `Peca` e `Validacao`), corrigindo a decisão #12.** Antes de começar o RF09, revisamos as Regras de Negócio (RN01-RN05) e os Requisitos Não Funcionais (RNF01-RNF11) do DERS contra o que já estava implementado — e o RNF11 contradisse diretamente a decisão #12. A correção: toda a cadeia relacional do catálogo técnico agora carrega `empresaId` (mesmo padrão do `Usuario`), com find-or-create de Marca/Ferramenta/VersaoTensao escopado por empresa em `resolverVersaoTensaoId` (`PrismaCatalogoRepository`/`FakeCatalogoRepository`) — duas empresas que importem o catálogo do mesmo fabricante/modelo agora têm cada uma seu próprio registro, sem reaproveitamento entre instâncias. `Peca` e `Validacao` carregam `empresaId` diretamente (mesmo sendo alcançáveis via `catalogoId`), pensando na futura busca vetorial do RF12: o filtro por instância precisa valer no `WHERE` do SQL bruto contra `pecas.embedding`, sem depender de um `JOIN` correto — o RNF11 exige isolamento "em nenhum cenário de teste". `ImportarCatalogoUseCase`/`ExtrairDadosCatalogoUseCase`/`ValidarCatalogoUseCase` passaram a receber `empresaId` e checam posse do catálogo (`catalogo.empresaId !== empresaId` → `NotFoundError`), mesmo padrão já usado em `AtualizarUsuarioUseCase` (RF05). **Impacto para quem já testou RF06/07/08 manualmente:** os dados de teste (catálogos Bosch/Makita/DeWalt) foram criados sem `empresaId` — a migration desta correção exige resetar essas tabelas (`marcas`, `ferramentas`, `versoes_tensao`, `catalogos`, `pecas`, `validacoes`) antes de aplicar, já que a coluna é obrigatória. Ver instrução exata no `README.md`.

**Conflito confirmado contra o Dicionário de Dados (Quadros 34-39 do DERS) — decisão final do usuário:** ao conferir o modelo de dados completo antes de rodar a migration, veio à tona que o Dicionário de Dados oficial **não lista `empresaId`** em nenhuma entidade do catálogo técnico (Marca/Ferramenta/VersaoTensao/Catalogo/Peca/Validacao) — e a descrição de MARCA até reforça o modelo compartilhado ("cadastrada uma única vez"). Ou seja, o Dicionário de Dados contradiz o texto prosa do RNF11 que motivou esta correção. Perguntado sobre qual fonte prevalece, o usuário decidiu **manter o isolamento por empresa** (RNF11), com uma justificativa de negócio concreta: se o catálogo fosse compartilhado, uma empresa que só atende Bosch e Makita acabaria com peças da DeWalt "contaminando" sua base (importadas por outra instância), o que traria risco real de o futuro Agente de Consulta (RF12, busca semântica/RAG) retornar peças de marcas irrelevantes para aquele estabelecimento. Essa decisão fica registrada como definitiva — o Dicionário de Dados do DERS está desatualizado/incompleto nesse ponto em relação ao RNF11, não o contrário.

20. **Lacunas RN04/RNF07/RNF04 corrigidas junto com o ciclo do RF09** (eram pendência da revisão de RN/RNF acima, resolvidas todas de uma vez):
    - **RN04** (binômio código + posição visual obrigatório): `posicaoVisual` agora é campo obrigatório em `ValidarCatalogoUseCase` (RF08) e `AtualizarCatalogoUseCase` (RF09) — um código de peça sem posição no diagrama passou a ser rejeitado (`fieldErrors`), igual ao `codigo`.
    - **RNF07** (log de acesso não autorizado): `authMiddleware`/`exigirAdministrador` deixaram de ser funções simples e viraram fábricas (`criarAuthMiddleware`/`criarExigirAdministrador`) que recebem `logAuditoriaRepository` e registram `TipoAcao.ACESSO_NAO_AUTORIZADO` em toda rejeição — token ausente, token inválido/expirado, sessão revogada, ou perfil sem permissão (`exigirAdministrador`). O log é best-effort (uma falha ao gravar nunca impede a rejeição em si de acontecer).
    - **RNF04** (indicador de progresso dinâmico): `ImportarCatalogoPage` ganhou um spinner CSS de verdade (classe `.spinner`, girando via `@keyframes`) no botão "Importar e Extrair", em vez de só trocar o texto.
    - **RNF03** (confirmado pelo próprio texto do RF09): a exclusão de peça (RF09/A4) usa `ConfirmModal`, mesmo padrão de confirmação em duas etapas já usado em RF01/RF05.

21. **RF09 — decisões de escopo tomadas com o usuário antes de implementar:**
    - A lista de "Manter Catálogo" mostra **só peças de catálogos já `VALIDADO`** — o trecho "todo documento não validado vai parar aguardando validação" pertence ao RF10 (Documentos Pendentes), não ao RF09 (o usuário corrigiu uma contradição própria durante a especificação).
    - A granularidade da listagem e das ações (A2/A4) é **por Peça**, não por Catalogo — o texto do DERS já lista "código da peça" e "descrição" como campos do registro exibido, e o protótipo tem um ícone de excluir por linha de peça. Editar (A3), porém, abre a tela split-screen do **Catalogo inteiro** (marca/modelo/tensão + todas as peças), já que esses três campos pertencem à cadeia Marca/Ferramenta/VersaoTensao compartilhada entre as peças do mesmo catálogo — reaproveita a mesma estrutura de tela do RF08 (`ValidarCatalogoPage`), sem as barras de confiança da IA (dado já validado por humano) e carregando os dados via `GET /catalogos/:id` em vez de navegação com state.
    - Excluir uma peça (A4) **não** exclui em cascata o Catalogo/Ferramenta/Marca/VersaoTensao associados, mesmo que fique sem nenhuma peça — decisão interpretativa (o DERS não especifica cascata), evitando apagar dados que outras peças da mesma empresa ainda possam referenciar.
    - Os filtros da tela seguem o **protótipo** (Marca/Modelo/Código da Peça), não o texto do DERS (que cita "tensão" em vez de "código da peça") — mesma prioridade já dada ao protótipo em requisitos anteriores quando havia pequena divergência com o texto.
    - Reprocessamento de embeddings na edição (RF09/A3) é **seletivo**: só peças novas ou cujo texto (código + descrição) mudou geram uma nova chamada à Gemini API — evita gasto desnecessário em peças que o ator não tocou na edição.
    - Reexibir o documento original na tela de edição exigiu um endpoint novo, `GET /catalogos/:id/arquivo` (stream do PDF via `FileStorageService.obterBuffer`) — diferente do RF08, aqui o arquivo não está mais em memória no navegador (a sessão de upload já terminou há muito tempo), então precisa ser buscado do servidor.

22. **RF10 — decisões de escopo tomadas antes de implementar:**
    - A pré-condição do próprio DERS ("o documento deve ter sido encaminhado para a fila de pendentes pelo RF07 por extração incompleta ou malsucedida") escopa o RF10 estritamente aos catálogos `IRRESOLUVEL` — não inclui catálogos `PENDENTE_VALIDACAO` esquecidos (esse é um gap diferente, já documentado, que continua em aberto).
    - O Quadro 25 do DERS descreve três valores de status na fila — "Pendente", "Em edição", "Irresolúvel" — mas isso **não virou um segundo valor no enum `StatusCatalogo`**: o schema continua com um único `IRRESOLUVEL` (decisão já tomada no RF07). "Pendente" vs. "Irresolúvel" é um rótulo de **apresentação**, calculado em `ListarDocumentosPendentesUseCase` a partir do `camposAusentes` já persistido (se nenhum dos três campos do documento — marca/modelo/tensão — foi identificado, é "Irresolúvel"; se ao menos um foi, é "Pendente"). "Em edição" não foi modelado: não há edição colaborativa/concorrente no sistema, então não existe um estado intermediário real para representar — a ação "Preencher" simplesmente navega para outra tela.
    - O protótipo mostra "Campos ausentes" com granularidade por peça (ex.: "Código da peça (3 itens)") — a extração atual (RF07) só rastreia ausência nos três campos de nível de documento (marca/modelo/tensão); um catálogo `IRRESOLUVEL` nunca chega a gravar peças (a resolução de `versaoTensaoId` exige os três campos, então nenhuma peça é persistida quando falta um deles). Reproduzir a granularidade por peça do protótipo exigiria repensar como a extração parcial persiste dados — decisão que não foi tomada agora; os "campos ausentes" exibidos no RF10 ficam restritos a marca/modelo/tensão, uma divergência de fidelidade em relação ao mock do protótipo que fica registrada aqui.
    - "Preencher" (A1) **reaproveita a tela de validação do RF08** (`ValidarCatalogoPage`) em vez de criar uma tela nova — o protótipo do RF10 não mostra uma tela de edição própria, só a fila. A tela busca o documento (`GET /catalogos/pendentes/:id`) e o PDF (`GET /catalogos/:id/arquivo`, endpoint do RF09) e navega com esses dados via `state` de navegação, no mesmo formato que RF06/07 já usam. `ValidarCatalogoPage` ganhou suporte a receber uma URL de PDF já pronta via `state.pdfUrl` (além do `state.arquivo`, um `File` cru, usado no fluxo RF06/07/08 original).
    - "Reenviar para IA" (A2) **não precisou de nenhum endpoint novo** — reaproveita `POST /catalogos/:id/extrair`, o mesmo endpoint de nova tentativa já criado no RF07/E1. A confirmação em duas etapas (RNF03) e a mensagem de aviso ("será reprocessado do zero") ficam só no frontend.
    - "Excluir" (A3) é uma exclusão de granularidade diferente do RF09/A4: aqui o `Catalogo` inteiro é removido (não uma peça), já que o documento nunca chegou a ser validado. O arquivo físico no `FileStorageService` **não é apagado** — o DERS não pede isso e a interface do serviço de armazenamento ainda não tem um método de exclusão; ficou registrado como decisão interpretativa, não como pendência de implementação.

23. **RF11 — decisões de escopo tomadas antes de implementar:**
    - **Conflito entre o texto do DERS e o protótipo, perguntado ao usuário antes de codar:** o fluxo básico diz que o Agente de Consulta "executa simultaneamente" a busca SQL exata e a busca vetorial semântica — sempre as duas juntas. Mas o protótipo mostra dois botões, "Busca Semântica" e "Busca por Código Exato", que parecem um seletor de modo (só um dos dois destacado por vez). O usuário confirmou, via pergunta direta: **os dois motores sempre rodam juntos** (fiel ao texto formal); os botões só controlam a **ordenação** do resultado combinado (`modo: "semantica" | "codigo_exato"`, parâmetro `modo` da query) — em `modo=codigo_exato`, resultados com correspondência exata aparecem primeiro; em `modo=semantica` (padrão), a ordenação é pela distância vetorial (pgvector, menor = mais relevante).
    - ~~O "Agente de Consulta" citado no texto do DERS não ganhou uma classe de IA própria — reaproveita a mesma instância de `GeminiEmbeddingService` já usada pelo RF08/RF09~~ **[CORRIGIDA — ver decisão #25].** A única chamada de IA do RF11 é gerar o embedding do termo de busca — hoje feita por uma instância própria do Agente de Consulta (`agentesIA/AgenteConsulta/GeminiEmbeddingService.js`), separada da instância do Agente Validador, ambas configuradas com o mesmo `GEMINI_EMBEDDING_MODEL` pros vetores serem comparáveis no espaço do pgvector.
    - A busca semântica (geração do embedding do termo) é **best-effort**: se a Gemini API falhar, a busca não é abortada — só a correspondência exata continua funcionando, já que ela não depende de IA. Comportamento não especificado explicitamente pelo DERS, mas consistente com o mesmo espírito best-effort já usado em RF08/RF09 (uma falha de IA secundária não pode travar a funcionalidade principal).
    - A exceção E2 (base sem registros validados) é checada **antes** de gerar o embedding do termo — evita gastar uma chamada à Gemini API numa busca que já sabemos não vai retornar nada (a instância simplesmente não tem peças validadas ainda).
    - "Ver Vista Explodida" (A1) abre o PDF (mesmo endpoint `GET /catalogos/:id/arquivo` do RF09) **numa nova aba do navegador**, em vez de um visualizador customizado — o visualizador nativo de PDF do navegador já atende ao requisito ("permitindo zoom e navegação pelo documento") sem precisar de uma dependência extra (ex.: pdf.js) só pra esse fim.
    - Os domínios de valores de Marca (Bosch/Makita/DeWalt) e Tensão (127V/220V/Bivolt) da tela seguem literalmente o Quadro 26 do DERS — diferente do RF09, aqui não há uma opção "Não informado" de tensão nem uma derivação dinâmica das marcas disponíveis a partir dos dados.

24. **RF12 — decisões de escopo tomadas antes de implementar (o usuário pediu explicitamente pra responder "onde está o Agente Validador e o Agente de Consulta" antes de começar):**
    - ~~Agente Validador nunca existiu como classe de IA — quem valida é o usuário, não há uma IA "validando" nada~~ **[Resposta parcialmente corrigida logo em seguida pelo usuário — ver decisão #25].** A parte de HITL continua verdadeira (quem confirma/corrige os dados extraídos é sempre o humano, nunca uma IA), mas o usuário pediu explicitamente que o Agente Validador também ganhasse sua própria classe de IA — a responsabilidade de gerar os embeddings das peças, que antes ficava dentro da pasta do Agente Extrator.
    - **RF12 é onde o Agente de Consulta ganha sua capacidade de geração de texto**, `GeminiRAGService` (`agentesIA/AgenteConsulta/`). Até o RF11 a única chamada de IA do Agente de Consulta era embedding, sem geração de texto; RF12 exige geração de linguagem natural fundamentada em contexto (RN01), uma capacidade nova. (A questão de que classe gera o embedding usado pelo RF11/RF12 foi revisada na decisão #25, logo abaixo.)
    - **Recuperação de contexto reaproveita o RF11 por completo**: `ConsultarViaRagUseCase` chama o mesmo `ComponenteRepository.buscarPorSimilaridadeSemantica` (sem filtro de marca/tensão, limite de 8 candidatos) pra montar o contexto enviado ao Gemini — nenhum método de repositório novo foi criado só pro RF12. `buscarPorSimilaridadeSemantica` ganhou um campo novo no retorno, `validadoEm` (via `LEFT JOIN LATERAL` na tabela `validacoes`, pegando a validação mais recente do catálogo), usado só pelo RF12 pra compor a citação de fonte — o RF11 ignora esse campo extra sem quebrar nada.
    - **Distinção entre as exceções E1 (contexto insuficiente) e E3 (pergunta sem contexto identificável)**, que o DERS não define por um critério numérico: nenhum registro validado na empresa (pré-condição 4.2) mapeia direto pra E1, porque a ação sugerida do E1 ("importe um catálogo") resolve exatamente esse caso; com a base populada, a classificação entre RESPONDIDO/CONTEXTO_INSUFICIENTE/SEM_CONTEXTO_RELEVANTE fica a cargo do próprio Gemini (campo `situacao` no `responseSchema`), porque só o modelo tem condições reais de avaliar se o contexto recuperado por similaridade vetorial realmente responde à pergunta específica feita — um corte por distância de cosseno fixa seria frágil demais pra essa nuance. Um terceiro caso defensivo (existe registro validado na empresa, mas nenhum tem embedding — não deveria ocorrer em uso normal) também mapeia pra E3, por segurança.
    - **E2 (falha de comunicação com a Gemini API) cobre os dois pontos de contato com a IA**, não só a geração final: tanto uma falha ao gerar o embedding da pergunta quanto uma falha na geração da resposta acionam a mesma exceção — o DERS descreve E2 especificamente "no passo 6" (geração), mas estender a mesma resposta pra qualquer falha de IA é mais seguro e consistente com o RNF05 (o usuário não teria uma ação diferente a tomar dependendo de qual chamada falhou).
    - **O código da peça citada nunca é gerado pela IA.** O Gemini só devolve o `id` (UUID interno) de uma das peças já recuperadas pela busca vetorial — nunca o código/marca/modelo em texto livre —, e tanto o `GeminiRAGService` quanto o `ConsultarViaRagUseCase` conferem que esse id realmente veio no contexto enviado antes de usar seus dados (com fallback pra peça mais relevante se o id vier inválido). Isso elimina o risco de o modelo "alucinar" um código de peça que não existe.
    - **Sem manutenção de histórico entre perguntas** (pós-condição explícita do DERS): o backend trata cada requisição de forma totalmente independente — não existe nenhuma tabela/sessão de conversa. A transcrição exibida na tela (`ConsultaTecnicaPage`) é só estado local do React, puramente visual; o backend nunca recebe nem depende de mensagens anteriores.
    - "Ver Vista Explodida" reaproveita o mesmo padrão do RF11/A1 — mesmo endpoint `GET /catalogos/:id/arquivo`, aberto numa nova aba do navegador.

25. **Correção pedida logo depois do RF12: cada um dos 3 agentes do DERS (Extrator, Validador, Consulta) precisa ter sua própria classe de IA — mesmo quando duas fazem tecnicamente a mesma chamada de API.** Depois de ver a resposta da decisão #24, o usuário pediu explicitamente essa correção, com a justificativa: não deixar tudo concentrado no Agente Extrator, dividindo as tarefas entre os três agentes como o DERS descreveu desde o início ("arquitetura de 3 agentes: Extrator, Validador e Consulta"). O desenho final:
    - **Agente Extrator** (`agentesIA/AgenteExtrator/GeminiExtractionService.js`): responsabilidade única — extrai os dados do PDF e compara com o documento original pra calcular a confiança por campo. Não gera embedding, não gera resposta.
    - **Agente Validador** (`agentesIA/AgenteValidador/GeminiEmbeddingService.js`, NOVO): recebe os dados extraídos e aguarda a validação humana (HITL, inalterado); só DEPOIS que o usuário confirma é que este agente gera os embeddings das peças (`ValidarCatalogoUseCase`/RF08 e `AtualizarCatalogoUseCase`/RF09 acionam-no, e então persistem tudo). É uma classe movida de `agentesIA/AgenteExtrator/GeminiEmbeddingService.js` — o arquivo antigo fica órfão (anotado em `LEMBRETES.md` pra exclusão manual, mesma limitação de sempre: sandbox de shell indisponível).
    - **Agente de Consulta** (`agentesIA/AgenteConsulta/`): responsável por TODA a atividade de consulta, tanto RF11 quanto RF12. Ganhou uma instância PRÓPRIA de embedding (`GeminiEmbeddingService.js`, novo arquivo, não reaproveitado do Agente Validador) pra vetorizar o termo de busca (RF11) e a pergunta (RF12), além da já existente `GeminiRAGService.js` (geração da resposta, RF12).
    - As duas classes `GeminiEmbeddingService` (Validador e Consulta) são quase idênticas em código — mesma chamada `embedContent`, mesmas 768 dimensões — mas isso é intencional: o ponto da separação não é evitar duplicação de código, é manter a responsabilidade de cada agente isolada e explícita, como o DERS pede. As duas continuam precisando do mesmo `GEMINI_EMBEDDING_MODEL` (mesma variável de ambiente) pra os vetores serem comparáveis no espaço do pgvector — isso não muda, só a classe/instância dona de cada chamada.
    - Nenhuma mudança na assinatura dos Use Cases: `ValidarCatalogoUseCase`, `AtualizarCatalogoUseCase`, `BuscarComponentesUseCase` e `ConsultarViaRagUseCase` continuam recebendo um parâmetro genérico `embeddingService` (a interface `domain/services/EmbeddingService.js`, inalterada) — só qual instância concreta é injetada em cada um mudou, em `main/factories/index.js`. Por isso nenhum teste unitário precisou ser alterado (os `Fakes` continuam substituindo a interface, não uma classe concreta específica).
    - Esta decisão corrige/complementa as decisões #16 (local da classe de embedding), #23 (RF11 reaproveitando a instância do RF08/RF09) e #24 (RF12 reaproveitando a mesma instância) — o texto original de cada uma foi riscado/anotado, mantido só como registro histórico.

26. **Guarda-corpo de domínio no Agente Extrator (RF07) — fora do texto do DERS, pedido explícito do usuário.** Preocupação levantada pelo usuário: nada no fluxo original impede que um PDF completamente fora do domínio (ex.: uma peça automotiva) seja enviado e, mesmo que o Agente Extrator marque `documentoCompreendido = false` (rota de exceção E2, hoje existente), o documento vira `IRRESOLUVEL` e continua acessível pela fila do RF10 — de onde um humano poderia, na tela de validação (RF08), digitar manualmente qualquer marca/modelo/peça e "forçar" o documento a `VALIDADO`, mesmo sendo dados completamente inventados. Ou seja: o guarda-corpo que já existia (E2) era só um sinal fraco ("não consegui ler"), não uma barreira de fato contra conteúdo fora do domínio.
    - Solução: um novo campo booleano na saída do Agente Extrator, `dominioReconhecido`, ortogonal a `documentoCompreendido`. Um documento pode estar perfeitamente legível/compreendido pela IA e ainda assim ser `dominioReconhecido: false` — é exatamente o caso de uma peça automotiva bem escaneada, que a IA entende perfeitamente do que se trata, só que não é uma ferramenta elétrica. A instrução de sistema do Agente Extrator (`extracaoPrompt.js`) recebeu a lista fechada de categorias fornecida pelo usuário (furar/parafusar, demolição/concreto, corte, lixamento/acabamento, desbaste/polimento, madeira, fixação, limpeza, jardinagem, medição, iluminação, construção) e a instrução explícita de ser rigoroso, sem dar benefício da dúvida, e de só marcar `dominioReconhecido: true` quando o documento for claramente uma vista explodida de uma dessas categorias, fabricada por Bosch, Makita ou DeWalt.
    - `dominioReconhecido` só é avaliado quando `documentoCompreendido` é `true` — um documento ilegível continua caindo no fluxo E2 já existente (IRRESOLUVEL, benefício da dúvida, preenchimento manual permitido), já que não dá pra afirmar que algo ilegível está fora do domínio. A checagem defensiva (`dominioReconhecido = documentoCompreendido && dominioReconhecido`) é feita tanto no prompt quanto no código (`GeminiExtractionService`), pra não depender só da IA obedecer a instrução.
    - Quando `documentoCompreendido = true` e `dominioReconhecido = false`, `ExtrairDadosCatalogoUseCase` REJEITA a importação por completo: exclui o `Catalogo` recém-criado pelo RF06 (`catalogoRepository.excluirCatalogo`, mesmo método já usado pelo RF10/A3), registra `EXCLUSAO_REGISTRO` no log de auditoria (rastreabilidade/segurança) e lança `ValidationError` (422, `fieldErrors.arquivo`) — a mesma família de erro/UX já usada pelo RF06/E1 (formato inválido), então o frontend (`ImportarCatalogoPage`) já exibe a mensagem e destaca o campo do arquivo sem precisar de nenhuma mudança de código. Diferente do E2, aqui NÃO existe fila de pendentes nem preenchimento manual — o documento nunca chega a existir de fato no sistema.
    - Este guarda-corpo vale em qualquer ponto de entrada que aciona `ExtrairDadosCatalogoUseCase`: upload inicial (RF06/RF07 encadeados), nova tentativa após falha de comunicação (RF07/E1) e "Reenviar para IA" (RF10/A2) — é o mesmo Use Case nos três casos.
    - Decisão interpretativa (não é uma regra explícita do DERS): a rigor, isso é uma extensão de RNF06 ("aceita exclusivamente arquivos em formato PDF") para o nível de CONTEÚDO, não só de formato/extensão — o objetivo de negócio é o mesmo (impedir lixo no sistema), só que verificado depois da leitura do PDF em vez de antes.

27. **`LogAuditoria` ganhou `empresaId` direto (RNF11), lacuna descoberta ao investigar o RF13 antes de implementar.** A tabela `logs_auditoria` nunca teve `empresaId` — só `usuarioId` (nullable, usado por logs "de sistema" como `CRIACAO_EMPRESA`, registrado antes de existir qualquer sessão). Isso inviabilizava filtrar corretamente "o log da instância" (RF13) sem depender de um `JOIN` via `usuario.empresaId`, que quebraria justamente nesses registros com `usuarioId` nulo. Perguntado, o usuário escolheu adicionar a coluna (mesmo padrão já usado pela decisão #19 pra Marca/Ferramenta/VersaoTensao/Catalogo/Peca/Validacao — coluna direta, nunca inferida por JOIN). Consequências:
    - Nova migration (`20260724090000_rf13_log_auditoria_empresa_id`) adiciona `empresaId` como `TEXT` **nullable** (diferente das entidades da decisão #19, que são `NOT NULL`) — os raríssimos casos em que a empresa genuinamente não é identificável no momento do log (ex.: `ACESSO_NAO_AUTORIZADO` com token ausente/malformado, sem nada pra decodificar) continuam gravando `null`, mesmo tratamento já aceito pra `usuarioId`.
    - Todos os **19 pontos de chamada** de `logAuditoriaRepository.registrar` no backend foram retrofitados pra passar `empresaId` — a grande maioria já recebia `empresaId` no escopo do próprio Use Case (RNF11 já exigia isso pra outras finalidades); alguns precisaram de tratamento específico: `CriarEmpresaUseCase` usa o id da própria empresa recém-criada (`empresa.id`); `RedefinirSenhaUseCase` (fluxo via link, sem sessão) busca o usuário por id só pra obter o `empresaId` antes de logar; `authMiddleware` usa `payload.empresaId` quando o token foi decodificado com sucesso (caso `sessao_revogada`/`perfil_sem_permissao`) e `null` quando não foi possível decodificar nada (`token_ausente`/`token_invalido_ou_expirado`).
    - `LogAuditoriaRepository` (domain) ganhou um segundo método, `consultar(filtros)` — além do `registrar` já existente —, único ponto de leitura da interface (a imutabilidade dos logs, RNF09, continua garantida: não existe update/delete em nenhum dos dois métodos).

28. **RF13 — filtro "Tipo de Ação" usa o enum completo `TipoAcao`, não as 4 categorias soltas do texto do Quadro 30 do DERS ("Validação, Edição, Exclusão, Acesso").** O protótipo da tela mostra a tabela de resultados com os valores brutos do enum como badges (`CRIACAO_EMPRESA`, `EXTRACAO_IA`, `VALIDACAO_HITL`, `LOGIN`...) — um deles, "UPLOAD_CATALOGO", nem bate exatamente com o valor real do enum (`UPLOAD_VISTA_EXPLODIDA`), sinal de que o mockup usou dados ilustrativos, não uma cópia literal do enum. Perguntado sobre como resolver essa divergência (DERS textual vs. comportamento do protótipo — mesmo tipo de conflito já resolvido nas decisões #21/#23), o usuário confirmou usar o enum completo, seguindo o mesmo precedente de priorizar o protótipo. `ARQUIVAMENTO_DOCUMENTO` fica de fora da lista de opções do filtro no frontend — é um `TipoAcao` reservado pra um requisito futuro ainda não especificado, nenhum fluxo do sistema o registra hoje.

29. **Troca do modelo principal (`GEMINI_MODEL`) de `gemini-2.5-flash` para `gemini-3.5-flash`.** Motivo: instabilidades `503 UNAVAILABLE` ("alta demanda") observadas no Free Tier durante a extração (RF07); confirmado que a chave do usuário está classificada como gratuita mesmo com a assinatura paga do "Google AI Pro" (produto de consumidor, sem relação com a cobrança da API — só ativar billing no projeto do Google Cloud vinculado à chave muda o tier real da API). Optou-se por migrar de geração (2.5 → 3.5, ambas família Flash, multimodal, suportam `responseSchema`) em vez de só trocar de fila de fallback, na expectativa de infraestrutura de serving mais nova ter menos pressão de fila no momento. Mudança só no `.env`/`.env.example` (`GEMINI_MODEL`), sem nenhum código hardcoded a alterar (decisão #14 já garantia isso). Pendente de confirmação: se a instabilidade de alta demanda persistir mesmo no 3.5, avaliar fallback automático pra um segundo modelo, ou ativar billing na chave.

30. **Responsividade mobile (RNF02 — funcional a partir de 360px), feita só com CSS, sem tocar em nenhum componente/lógica JS.** Antes desta correção, `global.css` só tinha um breakpoint (900px, criado ao aumentar o preview de PDF do RF08). Mudanças em `frontend/src/styles/global.css`:
    - `.table-card` (RF05/RF09/RF13 — telas de tabela) passou de `overflow: hidden` para `overflow-x: auto` (+ `-webkit-overflow-scrolling: touch`), e `.data-table` ganhou `min-width: 560px` — em telas estreitas a tabela rola horizontalmente em vez de espremer colunas até ficar ilegível.
    - Novo breakpoint `@media (max-width: 640px)`: `.form-row` (RF01/RF06), `.filtros-row` (RF09/RF13) e `.peca-row__campos` (RF08/RF09) passam de `flex-direction: row` para `column` (campos empilhados, mais fáceis de tocar/digitar); `.filtros-row .btn` vira `width: 100%`; `.page-toolbar` ganha `flex-wrap: wrap`; `.page-content` reduz o padding de `48px 24px` para `24px 16px`; `.icon-btn` (ações de tabela) cresce de 30×30px para 40×40px, mais perto do alvo de toque recomendado.
    - Telas que já eram naturalmente flexíveis (cards centralizados de autenticação/menu, modais, fila de pendentes do RF10, chat do RF12) não precisaram de nenhuma mudança — já se adaptavam por usarem `max-width` + `width: 100%` desde o início.

31. **Retentativa automática para `P2028` de queda de conexão (diferente do `P2028` de timeout já corrigido) + redução de round-trips em `PrismaCatalogoRepository.js`.** Observado em produção: `registrarValidacao` (RF08) falhando com `Transaction not found... refers to an old closed transaction` — a conexão que segurava a transação caiu no meio do caminho (blip de rede/pooler contra o Supabase), diferente do timeout excedido já resolvido antes. Como essa transação fazia até ~20 round-trips sequenciais pra catálogos com muitas peças (um `update`/`create` por peça, um por um), a exposição a esse tipo de instabilidade era alta. Duas correções, aplicadas em `registrarValidacao` e `atualizarCatalogo` (mesma estrutura de loop):
    - Peças novas (sem `id`) passaram a ser gravadas num único `tx.peca.createMany()` em vez de um `create` por peça — reduz o número de idas e voltas na transação (peças com `id` continuam em `update` individual, já que o Prisma não tem um "updateMany com valor por linha").
    - Nova função `transacaoComRetry` (substitui a chamada direta a `this.prisma.$transaction` nas 3 transações do arquivo) — captura especificamente o erro `P2028` com mensagem "transaction not found" e tenta de novo até 3 vezes (com pequeno intervalo crescente) antes de propagar o erro. Não interfere no `P2028` de timeout (esse já falha de propósito depois de 15s, sem correlação com essa mensagem específica).

32. **Preparação de deploy (Render + Vercel) — dois ajustes de configuração, nenhuma mudança de lógica.** O usuário perguntou se o projeto, como estava, já dava pra colocar em produção. Dois gaps reais de configuração foram encontrados:
    - `backend/package.json` não tinha nenhum script de build — sem isso, o Render rodaria só `npm install` e nunca geraria o Prisma Client nem aplicaria as migrations em produção. Adicionado `"build": "prisma generate && prisma migrate deploy"`. Confirmado que `schema.prisma` já define `directUrl = env("DIRECT_URL")` no datasource (necessário pro `migrate deploy` funcionar contra o pooler do Supabase), então nenhuma mudança de schema foi necessária.
    - Não existia `vercel.json` no frontend — sem um rewrite, qualquer rota do React Router acessada direto por URL (ex.: dar refresh em `/menu`) retornaria 404 no Vercel (SPA sem fallback configurado). Criado `frontend/vercel.json` com rewrite catch-all (`"/(.*)"` → `/index.html`).
    - Adicionada a seção "Deploy (Render + Vercel)" no `README.md`: build/start command do backend, lista completa de env vars a cadastrar manualmente nos dois painéis (não vêm do `.env`, que é git-ignored), lembrete de rodar `backend/prisma/manual/immutable_audit_log.sql` manualmente contra o banco de produção (não é aplicado por migration), e de atualizar `FRONTEND_URL` no Render depois do primeiro deploy do Vercel (para o CORS e o link de redefinição de senha funcionarem). Também reforçada a recomendação de rotacionar credenciais antes de configurá-las em produção, já que várias foram expostas em texto puro no chat ao longo do desenvolvimento (ver `LEMBRETES.md`).

33. **Bug de deploy: `DIRECT_URL` do Supabase (conexão direta) só resolve por IPv6 — quebra `prisma migrate deploy` no Render.** Ao rodar o primeiro deploy do backend no Render, o build falhou em `prisma migrate deploy` com `P1001: Can't reach database server at db.cwkxwmoymcmlswrvpruy.supabase.co:5432`, mesmo com a URL e a senha corretas — causa: esse host de conexão direta do Supabase só responde por IPv6, e o ambiente de build do Render (assim como o do Vercel) não tem saída IPv6 por padrão. Como `DATABASE_URL` já apontava pro Session pooler (`aws-0-ca-central-1.pooler.supabase.com:5432`, IPv4-compatível, é por isso que funcionava em runtime/local), a correção foi usar esse MESMO endereço também em `DIRECT_URL`, só nas variáveis de ambiente de produção (o `.env` local continua com a conexão direta original, já que a maioria das redes residenciais suporta IPv6 e não há motivo pra mudar localmente). Nenhuma mudança de código ou de `schema.prisma` — é puramente configuração de env var. Documentado no `README.md` como "Problema conhecido".

34. **Bug de deploy: portas SMTP bloqueadas pelo Render (plano Free) — RF03 falhava com `ETIMEDOUT` mesmo com credenciais corretas.** Ao configurar `SmtpEmailService` com Gmail (senha de app) em produção, toda solicitação de redefinição de senha falhava com `Error: Connection timeout` / `code: ETIMEDOUT` no `nodemailer`. Investigação confirmou que o Render passou a bloquear tráfego de saída pras portas SMTP (25/465/587) em serviços web do plano Free desde setembro de 2025, especificamente pra evitar abuso de spam — não é específico do Gmail, aconteceria com qualquer provedor SMTP tradicional (inclusive foi cogitado usar Outlook/Hotmail, que também seria bloqueado pelo Render, além de ter descontinuado autenticação básica via senha de app desde abril de 2026). Duas opções foram avaliadas com o usuário: upgrade pago do Render (sem mudança de código) ou trocar pra um provedor com API HTTP (sem custo, mas exige nova implementação). Optou-se pela segunda.
    - Avaliado inicialmente o Resend, mas descartado: sem verificar um domínio próprio, o endereço de testes deles (`onboarding@resend.dev`) só entrega e-mails pro dono da conta Resend, inviabilizando o teste com usuários externos reais (relevante pro SUS planejado em `doc2-testes-avaliacao.md`). Escolhido o **Brevo**, que permite verificar só um único e-mail remetente (sem precisar de domínio/DNS) e já enviar pra qualquer destinatário — 300 e-mails/dia grátis.
    - Implementação: nova classe `backend/src/infra/email/BrevoEmailService.js` (implementa `EmailService`, chama a API REST do Brevo via `fetch` nativo do Node — sem dependência nova) e nova ordem de prioridade em `main/factories/index.js`: `BREVO_API_KEY` (produção recomendada) > `SMTP_HOST` (SMTP tradicional, só funciona em ambientes sem bloqueio de porta, ex. local) > `ConsoleEmailService` (dev). Variáveis novas: `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, adicionadas em `.env`/`.env.example`. Nenhuma mudança em `SolicitarRecuperacaoSenhaUseCase` ou no restante do fluxo do RF03 — só a implementação concreta de `EmailService` injetada mudou, mesma interface (`domain/services/EmailService.js`) de sempre.
    - Remetente configurado: `reidner.s.medeiros@gmail.com` (verificado no Brevo via confirmação por e-mail).

35. **Template visual do e-mail de redefinição de senha (RF03).** Antes, `SmtpEmailService`/`BrevoEmailService` montavam o HTML do e-mail inline, com `<p>` puro sem nenhum estilo. Extraído pra um módulo compartilhado, `backend/src/infra/email/templates/redefinicaoSenhaTemplate.js`, com um template HTML de e-mail de verdade (tabelas em vez de flexbox/grid — e-mail HTML tem suporte limitado a CSS moderno, principalmente no Outlook desktop, que renderiza com o motor do Word) e estilos inline, usando as mesmas cores da marca (`--partify-blue`/`--partify-blue-dark` do `global.css`, replicadas aqui já que CSS externo/variáveis CSS não funcionam de forma confiável em e-mail). Decisão de escopo: usar só o nome "Partify" estilizado em texto no cabeçalho, não a logo de verdade (`PartifyLogo.jsx`) — embutir a logo real exigiria hospedá-la publicamente (ex. Supabase Storage) só pra essa finalidade, custo não justificado pro ganho visual. O texto puro (fallback `text/plain`) continua existindo, gerado pela mesma função de dados (`montarTextoRedefinicaoSenha`). `ConsoleEmailService` (modo dev) não foi alterado — continua só imprimindo o link cru no console.

36. **Keepalive do Supabase via GitHub Actions — evita o pause automático por inatividade.** Usuário identificou que o Supabase pausa projetos do plano gratuito após um período de inatividade e perguntou como contornar. Pesquisa confirmou o mecanismo exato: o Supabase pausa após **7 dias sem nenhuma consulta real ao banco** (visita ao dashboard ou requisição HTTP à API não reseta esse contador — precisa ser uma query de verdade contra o Postgres). Diferente disso, o Render (hospedagem do backend) hiberna por um motivo separado — 15 minutos sem tráfego HTTP — e a própria documentação oficial do Render diz que usar ping externo pra evitar essa hibernação **não é um método suportado/confiável** (a alternativa oficial deles é upgrade pago). Perguntado, o usuário optou por resolver só o problema do Supabase, aceitando o cold start ocasional do Render como comportamento normal do plano gratuito (ele acorda sozinho na primeira requisição real, ex. o login).
    - Rota `GET /health` (`backend/src/http/routes/index.js`), que antes só respondia `{status: "ok"}` sem tocar o banco, passou a rodar `prisma.$queryRaw\`SELECT 1\`` — é essa consulta real que conta como atividade pro Supabase não pausar. Em caso de falha de conexão, responde 503 em vez de derrubar a aplicação.
    - Novo workflow `.github/workflows/keepalive.yml`, agendado via `cron` pra rodar 3x por semana (segunda/quarta/sexta, 06:00 UTC) — folga confortável em relação ao limite de 7 dias. Chama `GET /health` via `curl`, usando a URL do backend guardada como variável de repositório do GitHub (`vars.BACKEND_URL`, não é segredo — é só a URL pública do Render), não uma secret.
    - Também inclui `workflow_dispatch`, pra poder disparar manualmente pelo GitHub caso quisesse testar sem esperar o agendamento.

37. **CI (GitHub Actions) — `.github/workflows/ci.yml`, roda a cada push/PR na `main`.** Dois jobs independentes: `backend-tests` (`npm test --workspace backend`, os ~256 testes Jest já existentes, que rodam 100% contra fakes em memória — confirmado que nenhum teste instancia `PrismaClient` nem depende de `.env`, então o CI não precisa de nenhum segredo configurado) e `frontend-build` (`npm run build --workspace frontend`, garante que o build do Vite não quebrou). Usa `npm ci` (não `npm install`) pra instalação determinística a partir do `package-lock.json` já versionado na raiz do monorepo. Objetivo explícito do usuário: ter um sinal automático (✅/❌ no GitHub) de que o essencial continua funcionando a cada commit, antes de se preocupar com deploy contínuo de fato.

38. **Novo teste unitário no RF03 — cobertura do `empresaId` no log de auditoria (RNF11).** Usuário pediu a distribuição de testes por requisito; RF03 era o mais enxuto (9). Identificado gap real: nenhum teste confirmava que `SolicitarRecuperacaoSenhaUseCase` grava o `empresaId` certo no log — relevante porque RF03 é um dos poucos fluxos do sistema sem sessão/JWT (o `empresaId` vem só da busca por login, não de um token decodificado), então essa checagem de isolamento multi-tenant nunca tinha sido feita explicitamente aqui, diferente do resto do sistema. Adicionado o teste em `SolicitarRecuperacaoSenhaUseCase.test.js` e documentado em `TESTES.md`. RF03: 9 → 10 testes; total do projeto: 256 → 257.

39. **Teste de acurácia da IA (RNF10, meta ≥75%) implementado.** Usuário mandou 3 PDFs reais (Makita HR2470, DeWalt D28496MBR, Bosch GWS 6-115). Lidos e transcritos manualmente pra montar os gabaritos (`backend/tests/acuracia-ia/gabaritos/*.json` — marca/modelo/tensão + lista completa de peças com código e posição visual). Criado `backend/scripts/testeAcuraciaIA.js` (`npm run teste:acuracia`), que chama a `GeminiExtractionService` de verdade (não o fake usado nos testes unitários) pra cada PDF e compara peça por peça com o gabarito via algoritmo guloso: primeiro tenta casar código+posição exatos ("correta"); se só o código bater, marca "código certo, posição errada"; peça do gabarito sem nenhum código correspondente na extração vira "não encontrada"; peça extraída que sobra sem casar com nada do gabarito vira "alucinação" (o erro mais grave, distinto de simplesmente não achar uma peça real). Normalização aplicada antes de comparar: código sem espaços/maiúsculo (o catálogo Bosch original usa códigos com espaços internos, ex. "F 000 600 044"); campos gerais (marca/modelo/tensão) comparados sem diferenciar maiúsculas/espaços.
    - Ambiguidades reais encontradas ao montar os gabaritos, documentadas no campo `"notas"` de cada JSON: o catálogo Makita HR2470 lista variantes 127V e 220V lado a lado pro rotor/estator (gabarito usa só a variante 127V, ignorando as linhas "A" de 220V); o catálogo DeWalt tem duas peças alternativas na mesma posição 4 (carvão com/sem limite de desgaste — ambas mantidas no gabarito); o catálogo Bosch tem 3 variantes de arruela de espessura diferente todas na posição 35 (mesmo tratamento).
    - PDFs reais colocados em `backend/tests/acuracia-ia/pdfs/` (git-ignorado — direitos do fabricante); só os gabaritos (dados transcritos, sem o PDF em si) são versionados. Script não roda no CI — é manual/sob demanda, já que chama a Gemini API de verdade (custo pequeno, não determinístico).
    - Documentado em `doc2-testes-avaliacao.md` e num novo `backend/tests/acuracia-ia/README.md` com instruções de uso e como adicionar mais catálogos ao teste no futuro.

40. **Primeira execução real do teste de acurácia da IA — meta do RNF10 atingida.** Rodado `npm run teste:acuracia` pela primeira vez com os 3 PDFs reais e `GEMINI_API_KEY` de verdade. Resultado agregado: **184/186 peças corretas (98,9%)**, bem acima do mínimo de 75% do RNF10. Campos gerais (marca/modelo/tensão) ficaram em 66,7% (6/9), mas as divergências identificadas são majoritariamente imprecisão do gabarito manual, não erro da IA: o código Bosch do gabarito ficou sem o dígito inicial "2" (formato real é `2 916 660 009`); a tensão/modelo do DeWalt no gabarito (`V120`/`"D28496MBR"`) provavelmente deveria ser `V127`/`"D28496MBR TIPO 3"`, já que o sufixo "MBR" indica variante brasileira; a tensão do Makita não é um campo explícito no PDF (é inferida a partir de qual variante de rotor/estator é escolhida), então a IA respondeu corretamente "não informado". Das 6 peças marcadas como "alucinação", a maioria também é limitação do gabarito, não da IA: linhas de sub-item `C10` e variantes 220V (`063A`/`070A`) do Makita que o gabarito excluiu de propósito mas que a IA extraiu corretamente por estarem de fato impressas no catálogo; e um bug de normalização no script (código `681652-2.` com ponto final não era equiparado a `681652-2`), corrigido depois (`normalizarCodigo` agora também remove pontuação final). Decisão do usuário: não vale a pena perseguir 100% no gabarito — o resultado de 98,9% já demonstra a meta do RNF10 atingida com folga, e as imprecisões identificadas ficam documentadas como limitação conhecida da metodologia (gabarito manual, não erro do modelo).

41. **Teste de recuperação (parte automatizável) implementado — item 1 do `PLANO_TESTES_AVANCADOS.md`.** `transacaoComRetry` (`PrismaCatalogoRepository.js`) — a lógica que corrigiu o bug real de produção de queda de conexão em transação longa contra o Supabase — nunca tinha sido testada automaticamente. Exportada a função (antes só usada internamente no módulo) e criado `backend/tests/unit/infra/transacaoComRetry.test.js` com 5 testes usando um Prisma falso (`{ $transaction: jest.fn() }`) injetado diretamente, sem precisar de banco real: sucesso na 3ª tentativa após 2 quedas de conexão (P2028 "transaction not found"); esgotamento das 3 tentativas propagando o erro; NÃO retry em P2028 de timeout (mensagem diferente, já tem tratamento próprio via `{ timeout }`); NÃO retry em outros códigos de erro (ex. P2002); sucesso de primeira sem nenhuma retentativa. Também estendido `ExtrairDadosCatalogoUseCase.test.js` com o teste de recuperação previsto no plano: depois de uma falha E1 (nada persistido) seguida de nova tentativa bem-sucedida, confirma que não sobra nenhum resíduo (peça duplicada) da tentativa que falhou. Total de testes: 257 → 274 (verificado via `npm test`, todos passando).

42. **Teste de regressão — item 4 do `PLANO_TESTES_AVANCADOS.md`.** Diferente dos outros itens do plano, regressão não é uma suíte nova pra escrever — é a prática de reexecutar tudo a cada mudança. Isso já estava parcialmente resolvido: `ci.yml` roda os 274 testes automaticamente a cada push/PR na `main`. O que faltava era só o checklist manual pra regressão visual/UX (coisas que o CI não pega por serem visuais, não lógicas) — criado no `PLANO_TESTES_AVANCADOS.md`, seção 6, com 8 itens que reaproveitam os pontos já cobertos pela responsividade mobile (decisão #30, RNF02): layout em 360px, tabelas com scroll horizontal, formulários empilhados abaixo de 640px, alvo de toque dos botões de ação, consistência de cor entre app e e-mail, textos/botões não cortados em 3 larguras de referência, estados vazios com mensagem clara, erros de validação no campo certo. Expandir `ci.yml` com jobs de integração/API real fica pendente até os itens 2 e 3 do plano serem implementados (as suítes em si ainda não existem).

43. **Testes de API (HTTP) implementados — item 3 do `PLANO_TESTES_AVANCADOS.md`, adiantado sem esperar o item 2 (Integração real).** O composition root (`src/main/factories/index.js`) monta os repositórios/serviços concretos (Prisma, Gemini, e-mail, storage) direto no `require`, sem ponto de injeção externo — testar `app` de verdade via `supertest` exigiria banco de teste real (infra do item 2, ainda não implementada) se seguisse o plano original à risca. Solução adotada: `backend/tests/api/helpers/appDeTeste.js` usa `jest.doMock` pra trocar cada `PrismaXRepository`/`GeminiXService`/`ConsoleEmailService`/`LocalFileStorageService` pelo dublê equivalente já usado nos testes unitários (`tests/fakes/`), e `jest.resetModules()` garante um `app` (e um estado em memória) novo a cada teste — sem isso, o composition root é um singleton e o estado vazaria entre testes. `BcryptHashService`/`JwtTokenService`/`NodeRandomTokenService` continuam reais (não mockados), então login/JWT são testados de verdade, não com um stub. `src/main/factories/index.js` passou a exportar também os repositórios/serviços internos (antes só os controllers eram exportados), pra que os testes possam popular/inspecionar o estado por trás do `app` sob teste sem precisar de várias requisições HTTP em sequência.
    - Criadas as 7 suítes previstas no plano em `backend/tests/api/` (authRoutes, empresaRoutes, usuarioRoutes, catalogoRoutes, consultaRoutes, logAuditoriaRoutes, middlewares) — cerca de 50 testes novos, cobrindo status code, formato JSON de resposta/erro, autenticação/autorização reais (não simuladas), upload multipart de verdade, ordenação de rotas do Express (`/catalogos/pendentes` vs `/catalogos/:id`), e isolamento multi-tenant (RNF11) também pela camada HTTP.
    - `supertest` adicionado como devDependency em `backend/package.json`.
    - **Bug real encontrado e corrigido na primeira rodada:** `FakeEmpresaRepository.criar` só grava o administrador dentro do `FakeUsuarioRepository` se as duas instâncias forem explicitamente ligadas (`empresaRepository.usuarioRepository = usuarioRepository`, mesmo padrão usado nos testes unitários de `CriarEmpresaUseCase`) — a implementação real faz isso via uma única transação de banco. Sem essa ligação no harness (`appDeTeste.js`), todo teste que fazia cadastro+login falhava com 401 (o administrador nunca aparecia pra busca por login). Corrigido adicionando essa ligação logo após montar `factories`. Confirmado via `npm test` (suíte completa): 41 suítes, 326 testes, todos passando (274 anteriores + 52 novos de API).

44. **Testes E2E (Playwright) implementados — item 5 do `PLANO_TESTES_AVANCADOS.md`, adiantado sem esperar os itens 2 (Integração real) e 6 (Exploratório), a pedido do usuário.** Novo workspace npm `e2e/` na raiz (`package.json` da raiz ganhou `"e2e"` em `workspaces` e os scripts `e2e:seed`/`e2e:test`; `backend/package.json` ganhou `seed:e2e`).
    - **Decisões de escopo, confirmadas com o usuário via pergunta direta antes de implementar:** (1) alvo é o par de servidores de **desenvolvimento local** (`npm run dev:backend`/`dev:frontend`), não um build de produção nem um ambiente efêmero de CI — `e2e/playwright.config.js` não usa a opção `webServer` do Playwright de propósito, pra não subir/derrubar os servidores sozinho; (2) os dados usados pelas jornadas 4 e 5 (Consultar Componentes/RF11 e Consulta Técnica IA/RF12) são **semeados direto no banco** (`backend/prisma/seed-e2e.js`, idempotente — apaga e recria a empresa de teste a cada execução), em vez de rodar o fluxo real de upload→extração→validação (RF06→RF07→RF08) a cada execução do E2E, pra evitar custo/latência/não-determinismo de uma segunda chamada de extração por execução.
    - **Ressalva técnica que o seed teve que resolver:** um embedding aleatório na peça semeada provavelmente faria a busca semântica (RF11) e o RAG (RF12) não considerarem a peça relevante — por isso `seed-e2e.js` faz uma única chamada REAL à Gemini API (`GeminiEmbeddingService`, mesma classe usada em produção) pra gerar o embedding de verdade da peça de teste. É o único uso de IA "de verdade" do script; o resto (empresa, usuário administrador com senha conhecida, marca/ferramenta/versão de tensão, catálogo já `VALIDADO`, peça, registro de validação, PDF copiado de `backend/tests/acuracia-ia/pdfs/makita-hr2470.pdf` para `backend/storage/catalogos/`) é escrito direto via Prisma.
    - **5 specs criadas em `e2e/tests/`**, uma por jornada do plano (seção 5): (1) cadastro→login→logout, autocontida (cria empresa própria a cada execução, CNPJ gerado com o mesmo algoritmo de check-digit de `cenarios.js`); (2) importar→extrair→validar→aparece em Manter Catálogo, também autocontida, mas **chama a Gemini API de verdade** (mesma ressalva de custo/não-determinismo do teste de acurácia da IA, RNF10) — a asserção verifica que o fluxo chega ao fim, não os valores exatos extraídos; (3) recuperar/redefinir senha, usando o administrador semeado — como este projeto não tem caixa de e-mail de teste (nem Mailhog), o "e-mail chega" é verificado lendo o link que o `ConsoleEmailService` imprime no console do backend em dev, através de um novo helper (`e2e/helpers/lerLinkRedefinicao.js`) que lê um arquivo de log (`backend/dev-server.log`) pro qual o usuário precisa redirecionar a saída do `npm run dev:backend` antes de rodar essa jornada — mesmo workaround de redirecionar output a arquivo já usado nesta sessão pra ler resultado de `npm test`; (4) consultar componentes — busca por código exato, busca semântica e abrir vista explodida, usando a peça semeada; (5) consulta técnica IA — pergunta real via RAG sobre a peça semeada, verificando a situação `RESPONDIDO` e a fonte citada (não o texto exato gerado pela IA, que não é determinístico).
    - **Status: IMPLEMENTADO, PENDENTE DE VERIFICAÇÃO** — nenhuma execução real foi feita ainda (o sandbox de execução deste agente ficou indisponível nesta sessão, igual em sessões anteriores). O usuário precisa: `npm install` na raiz (agora inclui o workspace `e2e`), `npx playwright install chromium`, configurar `backend/.env`, rodar backend+frontend localmente (backend com saída redirecionada a `backend/dev-server.log`), rodar `npm run e2e:seed`, e então `npm run e2e:test` — passo a passo completo em `e2e/README.md`. Só depois de rodar de verdade saberemos se os seletores (`getByLabel`/`getByRole` levantados lendo cada página do frontend) e os tempos de espera (extração/RAG reais podem ser lentos) estão corretos.

## Requisitos implementados até agora

### RF01 — Manter Empresa
- Fluxo básico: cadastro público da empresa + criação automática do usuário `ADMINISTRADOR`.
- Fluxo A1: consultar e editar dados da empresa (`/empresa`).
- Fluxo A2: desativar a empresa (soft, reversível — não apaga nada).
- Telas: `CadastrarEmpresaPage`, `DadosEmpresaPage` (visualização + edição inline).

### RF02 — Realizar Login
- Fluxo básico: login com `login` + `senha`, emite JWT.
- Fluxo A1: logout (invalida a sessão imediatamente via denylist).
- Exceção E1: credenciais inválidas. Exceção E2: usuário inativo. Mais a checagem adicional de empresa desativada (decorrência do RF01-A2).
- Telas: `LoginPage`, `MenuPrincipalPage` (destino pós-login), `TopBar` (com o menu do usuário — Alterar Senha / Sair).

### RF03 — Recuperar Senha
- Fluxo básico: usuário informa login + e-mail; se conferem, gera token e "envia" o link (console em dev, SMTP em produção).
- Exceção E1: login e e-mail não correspondem à mesma conta — mesma resposta genérica de sucesso (RNF05).
- Tela: `RecuperarSenhaPage`.

### RF04 — Alterar Senha
- **Fluxo básico** (autenticado): usuário logado troca a própria senha informando a senha atual + nova senha + confirmação. Acessível pelo menu do usuário (ícone 👤 no `TopBar`) → "Alterar Senha".
- **Fluxo alternativo A1** (via link do RF03, não autenticado): destino do link de recuperação — só pede nova senha + confirmação, sem senha atual.
- Exceção E1: senha atual incorreta (fluxo básico) / token inválido-expirado-usado (fluxo A1). Exceção E2: nova senha e confirmação não coincidem (ambos os fluxos).
- Telas: `AlterarSenhaPage` (fluxo básico), `RedefinirSenhaPage` (fluxo A1).

### RF05 — Manter Usuário
- Exclusivo do Administrador (`exigirAdministrador` em todas as rotas `/usuarios`). CRUD de contas de Técnico/Vendedor da própria instância — nunca cria/reatribui outro Administrador (domínio de valores do Quadro 19 do DERS restrito a Técnico/Vendedor tanto na criação quanto na edição).
- Fluxo básico: criação de usuário (nome, login, e-mail, senha ≥ 8 caracteres, perfil Técnico/Vendedor).
- Fluxo alternativo A1: listar/editar (nome, login, e-mail, perfil).
- Fluxo alternativo A2: desativar um usuário (soft, reversível).
- Fluxo alternativo A3: reativar um usuário.
- Exceção E1: e-mail em formato inválido. Exceção E2: bloqueia desativar o único administrador ativo da instância (`usuarioRepository.contarAdministradoresAtivos`).
- Tela: `UsuariosPage` (tabela com Nome/Login/E-mail/Perfil/Status/Criado em/Ações), modais `NovoUsuarioModal` e `EditarUsuarioModal`. Ao editar um usuário Administrador, o campo Perfil fica bloqueado/somente leitura no frontend (o payload de edição simplesmente omite `perfil` nesse caso) — não existe uma regra de backend específica para isso, é só uma decisão de UI para não expor uma opção que o domínio de valores desta tela não cobre.
- O botão "Log do Sistema" aparece no toolbar da tela (fiel ao protótipo) mas fica desabilitado — não fazia parte do texto do RF05, então não foi implementado, seguindo a mesma lógica dos demais itens do Menu Principal ainda não construídos.
- Acesso ao item "Manter Usuários" no Menu Principal agora é condicional: só vira um link navegável (`/usuarios`) quando `obterUsuario()?.perfil === "ADMINISTRADOR"`; para os demais perfis, o botão continua aparecendo desabilitado, igual aos outros RFs ainda não implementados.

### RF06 — Importar Catálogo
- Fluxo básico: o ator seleciona um PDF (drag&drop ou clique), opcionalmente informa marca/modelo, aciona "Importar e Extrair". O sistema valida o formato (E1), salva o arquivo e registra o Catalogo (status `PENDENTE_EXTRACAO`).
- Exceção E1: formato diferente de PDF — bloqueado tanto no `<input accept="application/pdf">` do frontend quanto no `ImportarCatalogoUseCase` (RNF06).
- **Encadeado automaticamente com o RF07** na mesma requisição HTTP (`POST /catalogos`) — ver decisão #11 abaixo.
- Tela: `ImportarCatalogoPage`.

### RF07 — Extração Multimodal via IA
- Fluxo básico: o Agente Extrator (`GeminiExtractionService`) recebe o PDF, monta um prompt com instrução de sistema (inclui defesa contra prompt injection — ver decisão #13) e retorna JSON estruturado (`responseSchema`) com marca/modelo/tensão/peças e um índice de confiança 0-100 por campo, calculado pela própria IA ao comparar sua extração com o documento original.
- Fluxo alternativo A1 (extração parcial) e exceção E2 (documento ilegível) levam o Catalogo a `IRRESOLUVEL`, com `motivoPendencia` e `camposAusentes` preenchidos. Logo após o upload (mesma requisição), o próprio RF08 (tela de validação) já exibe esses casos, com os campos vazios para preenchimento manual; se o ator sair sem salvar, o documento continua acessível depois pela fila do RF10 (Documentos Pendentes).
- Exceção E1 (falha de comunicação com a Gemini API): o Catalogo permanece em `PENDENTE_EXTRACAO`; o endpoint `POST /catalogos/:id/extrair` permite nova tentativa sem reenviar o arquivo.
- Guarda-corpo de domínio (fora do DERS — decisão #26): quando o documento é compreendido mas identificado com confiança como fora do domínio de ferramentas elétricas suportado (`dominioReconhecido: false`), a importação é rejeitada por completo — o `Catalogo` é excluído, nada fica pendente nem editável manualmente.
- Não há endpoint/tela dedicados — é acionado pelo controller logo após o RF06.

### RF08 — Interface de Validação (HITL)
- Fluxo básico: tela dividida (split-screen) — documento original (preview client-side do PDF, via `URL.createObjectURL`, sem endpoint de download) à esquerda, formulário editável com os dados extraídos à direita, com barra de confiança colorida por campo/peça (verde ≥75%, amarelo 50-74%, vermelho <50%).
- Fluxo alternativo A1 (edição): qualquer campo pode ser corrigido antes de salvar; peças podem ser adicionadas/removidas manualmente.
- Fluxo alternativo A2 (cancelar): **sem endpoint correspondente** — como nada é persistido antes do "Validar e Salvar" (o resultado do RF07 só existe na resposta HTTP), cancelar é só descartar o estado local e voltar para `/catalogos/importar`.
- Exceção E1 (campos obrigatórios vazios): validado tanto no frontend quanto no `ValidarCatalogoUseCase`.
- Exceção E2 (falha ao persistir): tratada genericamente pelo `errorHandler` (RNF05); o frontend não limpa o formulário em caso de erro.
- Ao salvar com sucesso, aciona o Agente Validador (`agentesIA/AgenteValidador/GeminiEmbeddingService`, 768 dimensões) para gerar o embedding de cada peça validada, de forma best-effort — preparação para a busca semântica do RF11/RF12.
- Tela: `ValidarCatalogoPage`.

### RF09 — Manter Catálogo
- Fluxo básico (persistência): já coberto pelo `ValidarCatalogoUseCase` do RF08 — o texto do RF09 descreve a mesma gravação (Marca/Ferramenta/VersaoTensao/Peca/Catalogo + embeddings + log de auditoria), então não há um Use Case novo pra isso.
- Fluxo alternativo A1 (reaproveitar marca/modelo existente): já coberto pelo find-or-create em `resolverVersaoTensaoId` (escopado por empresa desde a decisão #19).
- Fluxo alternativo A2 (consulta): `ListarPecasUseCase` — lista peças de catálogos `VALIDADO` da empresa, com filtros opcionais de marca/modelo/código (query string).
- Fluxo alternativo A3 (atualização): `BuscarCatalogoParaEdicaoUseCase` (carrega o catálogo pra tela) + `AtualizarCatalogoUseCase` (aplica marca/modelo/tensão/peças — atualiza existentes, cria novas, exclui as removidas pelo ator; reprocessa embeddings só de peças novas/alteradas).
- Fluxo alternativo A4 (exclusão): `ExcluirPecaUseCase` — exclui uma peça (granularidade por peça, não por catálogo — ver decisão #21) e o embedding associado (mesma linha).
- Exceção E1 (falha na geração de embeddings): best-effort, igual ao RF08 — uma falha não impede a atualização/validação de ser salva.
- Exceção E2 (falha na transação): tratada genericamente pelo `errorHandler` (RNF05), igual aos demais requisitos.
- Telas: `CatalogoPage` (listagem + filtros + exclusão com `ConfirmModal`), `EditarCatalogoPage` (split-screen, reaproveitando a estrutura do RF08 sem as barras de confiança).
- Rotas: `GET /catalogos`, `GET /catalogos/:id`, `GET /catalogos/:id/arquivo`, `PUT /catalogos/:id`, `DELETE /catalogos/pecas/:pecaId`.
- Item "Manter Catálogo" do Menu Principal agora navega para `/catalogos` (disponível pra todos os perfis, mesma pré-condição do RF06/07/08).

### RF10 — Manter Documentos Pendentes
- Fluxo básico (fila de pendentes): `ListarDocumentosPendentesUseCase` — lista os catálogos `IRRESOLUVEL` da empresa, mais recentes primeiro, com a classificação de apresentação "PENDENTE"/"IRRESOLUVEL" derivada dos `camposAusentes` (ver decisão #22).
- Fluxo alternativo A1 (preenchimento manual): `BuscarDocumentoPendenteUseCase` carrega o documento; o frontend reaproveita a tela de validação do RF08 (`ValidarCatalogoPage`) pra editar e salvar (via `ValidarCatalogoUseCase`, já existente — nenhum Use Case novo de gravação foi necessário).
- Fluxo alternativo A2 (nova tentativa de extração): reaproveita `ExtrairDadosCatalogoUseCase`/`POST /catalogos/:id/extrair`, já criado no RF07/E1 — nenhum backend novo. Confirmação em duas etapas (RNF03) no frontend antes de disparar.
- Fluxo alternativo A3 (exclusão do documento): `ExcluirCatalogoUseCase` — remove o `Catalogo` inteiro (e quaisquer peças que a extração parcial tenha chegado a gravar), diferente da exclusão por peça do RF09/A4. Confirmação em duas etapas (RNF03).
- Exceção E1 (campos ainda ausentes após reenvio): o documento simplesmente continua na fila com o `motivoPendencia`/`camposAusentes` atualizados — sem tratamento especial além de recarregar a lista.
- Nenhuma migration foi necessária — o RF10 reaproveita o `StatusCatalogo.IRRESOLUVEL` já existente desde o RF07, sem novo valor de enum nem nova coluna.
- Tela: `DocumentosPendentesPage` (fila em cards, fiel ao protótipo — badges de situação/confiança, tags de campos ausentes, botões "Preencher"/"Reenviar para IA"/"Excluir").
- Rotas: `GET /catalogos/pendentes`, `GET /catalogos/pendentes/:id`, `DELETE /catalogos/pendentes/:id` (registradas ANTES de `GET/PUT/DELETE /catalogos/:id...` do RF09 em `catalogoRoutes.js` — rota literal precisa vir antes da dinâmica no Express, senão "pendentes" seria capturado como `:id`).
- Item "Documentos Pendentes" do Menu Principal agora navega para `/catalogos/pendentes`.

### RF11 — Consulta de Componentes
- Fluxo básico + A2 (busca sem filtros): `BuscarComponentesUseCase` — roda `ComponenteRepository.buscarPorCodigoExato` (SQL comum, Prisma) e `ComponenteRepository.buscarPorSimilaridadeSemantica` (SQL bruto, pgvector, distância de cosseno) sempre juntos, combina e deduplica por id, ordena conforme `modo` (ver decisão #23).
- Fluxo alternativo A1 (visualização da vista explodida): reaproveita `GET /catalogos/:id/arquivo` (endpoint do RF09) — sem Use Case novo; o frontend abre o PDF numa nova aba.
- Exceção E1 (nenhum resultado): resultado vazio, com mensagem sugerindo reformular a busca (menciona o RF12, ainda não implementado, sem link funcional).
- Exceção E2 (base sem registros validados): checado via `ComponenteRepository.existeRegistroValidado` **antes** de gastar uma chamada de embedding; mensagem orienta a importar/validar catálogos (RF06).
- Nenhuma migration foi necessária — reaproveita a coluna `Peca.embedding` (pgvector) já existente desde o RF08/RF09.
- Tela: `ConsultarComponentesPage` (busca + filtros + toggle de modo + tabela de resultados + "Ver Vista Explodida").
- Rota: `GET /componentes`.
- Item "Consultar Componentes" do Menu Principal agora navega para `/componentes`.

### RF12 — Consulta Técnica via RAG
- Fluxo básico: `ConsultarViaRagUseCase` — checa se existe algum registro validado na empresa (pré-condição 4.2), gera o embedding da pergunta, recupera até 8 peças candidatas por similaridade semântica (reaproveita `ComponenteRepository.buscarPorSimilaridadeSemantica` do RF11) e envia pergunta + contexto ao Agente de Consulta (`GeminiRAGService`) pra gerar uma resposta fundamentada, com a peça citada como fonte.
- Exceção E1 (contexto insuficiente): nenhum registro validado na empresa, OU o Agente de Consulta classifica o contexto recuperado como insuficiente pra responder com confiança — mensagem sugere importar catálogo (RF06).
- Exceção E2 (falha de comunicação com a Gemini API): cobre tanto a geração do embedding da pergunta quanto a geração da resposta — mensagem sugere usar a busca de componentes (RF11) como alternativa.
- Exceção E3 (pergunta sem contexto técnico identificável): o Agente de Consulta classifica a pergunta como sem relação com o contexto recuperado (ou, defensivamente, nenhuma peça validada da empresa tem embedding) — mensagem sugere reformular incluindo marca/modelo/nome da peça.
- Pós-condição: cada pergunta é tratada de forma independente — nenhum histórico de conversa é mantido pelo backend (ver decisão #24).
- Nenhuma migration foi necessária — reaproveita a coluna `Peca.embedding` (pgvector) já existente; o campo novo `validadoEm` no retorno de `buscarPorSimilaridadeSemantica` vem de um `LEFT JOIN LATERAL` na tabela `validacoes` já existente, sem alterar o schema.
- Tela: `ConsultaTecnicaPage` (chat — transcrição local, campo de pergunta, bolhas de usuário/IA, card "Fonte citada" com código da peça, botão "Ver Vista Explodida").
- Rota: `POST /consulta-tecnica`.
- Item "Consulta Técnica (IA)" do Menu Principal agora navega para `/consulta-tecnica`.

### RF13 — Manter Log Sistema (ADM)
- Fluxo básico: `ConsultarLogAuditoriaUseCase` — busca os registros de `logs_auditoria` da própria empresa (`LogAuditoriaRepository.consultar`, RNF11), filtrados opcionalmente por Usuário/Tipo de Ação/Data Inicial/Data Final (Quadro 30 do DERS, todos os campos opcionais), ordenados do mais antigo para o mais recente (mesma ordem do protótipo). O nome de cada usuário responsável é resolvido em memória, cruzando `usuarioId` com a lista completa de usuários da empresa (`usuarioRepository.listarPorEmpresa`, mesmo repositório do RF05) — registros com `usuarioId` nulo (ex.: `CRIACAO_EMPRESA`) aparecem como "sistema", igual ao protótipo.
- Exceção E1 (nenhum registro encontrado): lista vazia, sem lançar erro — o frontend mostra uma mensagem sugerindo revisar os filtros.
- Exceção E2 (acesso não autorizado — perfil Técnico/Vendedor tentando acessar diretamente): **não precisou de nenhum código novo** — já era coberto pelo `exigirAdministrador` existente desde a decisão #20 (RNF07), que bloqueia a rota e registra `ACESSO_NAO_AUTORIZADO` automaticamente. `LogSistemaPage` também replica a mesma guarda de UX client-side já usada em `UsuariosPage` (perfil não-administrador é redirecionado pra `/menu`).
- "Tipo de Ação" usa o enum completo `TipoAcao` (não as 4 categorias do texto do DERS) — ver decisão #28. A dependência de `LogAuditoria.empresaId` (coluna que não existia) foi resolvida antes de implementar o RF13 — ver decisão #27.
- Nenhuma ação de editar/excluir é oferecida na tela (RNF08/RNF09 — logs são somente leitura).
- Tela: `LogSistemaPage` (filtros em linha + tabela Data/Hora, Usuário, Tipo de Ação, Registro Afetado + botão "Voltar para Usuários"). O botão "Log do Sistema", que já existia desabilitado no toolbar de `UsuariosPage` desde o RF05, foi habilitado e agora navega para `/log-sistema`.
- Rota: `GET /log-auditoria` (admin-only).

**Navegação entre as telas de autenticação**, já implementada: Login → "Esqueci minha senha" → Recuperar Senha → (e-mail) → Redefinir Senha → volta pro Login. Login → "Cadastrar empresa" → Cadastro. Menu → ícone usuário (👤) → Alterar Senha (único item do dropdown do `TopBar` hoje). Os botões "Dados da Empresa" e "Sair" não ficam mais no `TopBar` (removidos o ícone de engrenagem e a opção "Sair" do dropdown) — ambos são botões dedicados no Menu Principal, seguindo o protótipo mais recente do menu completo (Importar Catálogo, Consultar Componentes, Consulta Técnica IA, Documentos Pendentes, Manter Catálogo, Manter Usuários, Dados da Empresa, Sair). "Manter Usuários" agora navega para `/usuarios` (só para administradores); os demais itens do topo (Importar Catálogo, Consultar Componentes, Consulta Técnica IA, Documentos Pendentes, Manter Catálogo) continuam desabilitados, pois os RFs correspondentes não foram implementados.

## O que ainda NÃO foi implementado

Todos os 13 requisitos funcionais (RF01–RF13) do DERS já foram implementados. O que resta é trabalho transversal de qualidade/robustez, não um RF novo:

- Testes automatizados do frontend (React) e da camada HTTP/Prisma real do backend (os testes atuais são só de Use Cases + validadores, em memória — ver `TESTES.md`), incluindo a busca vetorial real dos RF11/RF12 (`PrismaComponenteRepository.buscarPorSimilaridadeSemantica`, SQL bruto contra pgvector, só exercitada pelo `FakeComponenteRepository` nos testes) e a geração de resposta real do RF12 (`GeminiRAGService`, só exercitada pelo `FakeRAGService`).
- Teste de integração cruzando RF06 → RF07 → RF08/RF10 → RF09 → RF11 → RF12 (hoje só há cobertura unitária isolada de cada um).
- Descoberta de catálogos `PENDENTE_VALIDACAO` esquecidos (extração completa, mas o ator fechou a tela do RF08 antes de salvar) — diferente do RF10, que cobre só `IRRESOLUVEL` (pré-condição explícita do próprio DERS). Continua um gap conhecido, sem tela dedicada.
- O enum `TipoAcao` (log de auditoria) agora tem todos os valores originalmente reservados em uso, exceto `ARQUIVAMENTO_DOCUMENTO` (reservado para um requisito futuro ainda não especificado). Nem o RF11 nem o RF12 registram log de auditoria — são consultas de leitura, sem efeito colateral no banco, então não há uma ação a auditar (mesma lógica já aplicada ao RF09/A2 e ao carregamento de telas em geral).

## Estrutura completa de arquivos (backend)

```
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/ (20260721084326_init, ..., 20260724090000_rf13_log_auditoria_empresa_id)
│   └── manual/immutable_audit_log.sql
├── src/
│   ├── domain/
│   │   ├── enums/ (StatusEmpresa, Perfil, TipoAcao)
│   │   ├── errors/DomainErrors.js
│   │   ├── entities/ (Empresa, Usuario, LogAuditoria, Catalogo, Peca)
│   │   ├── validators/ (documentValidator — CPF/CNPJ, emailValidator)
│   │   ├── services/ (HashService, TokenService, EmailService, RandomTokenService,
│   │   │               FileStorageService, ExtractionService, EmbeddingService, RAGService — interfaces)
│   │   └── repositories/ (EmpresaRepository, UsuarioRepository, LogAuditoriaRepository,
│   │                       SessaoRevogadaRepository, TokenRedefinicaoSenhaRepository,
│   │                       CatalogoRepository, ValidacaoRepository, ComponenteRepository — interfaces)
│   ├── useCases/
│   │   ├── empresa/ (Criar, Consultar, Atualizar, Desativar)EmpresaUseCase.js
│   │   ├── auth/ (Autenticar, Logout, SolicitarRecuperacaoSenha, RedefinirSenha, AlterarSenha)UseCase.js
│   │   ├── usuario/ (Criar, Listar, Atualizar, Desativar, Reativar)UsuarioUseCase.js
│   │   ├── catalogo/ (Importar, ExtrairDados, Validar, ListarPecas, BuscarCatalogoParaEdicao,
│   │   │                Atualizar, ExcluirPeca, BaixarArquivo, ListarDocumentosPendentes,
│   │   │                BuscarDocumentoPendente, ExcluirCatalogo)CatalogoUseCase.js
│   │   ├── consulta/ BuscarComponentesUseCase.js (RF11), ConsultarViaRagUseCase.js (RF12)
│   │   └── log/ ConsultarLogAuditoriaUseCase.js (RF13)
│   ├── infra/
│   │   ├── database/ (prismaClient.js, repositories/Prisma*Repository.js — implementações concretas)
│   │   ├── security/ (BcryptHashService, JwtTokenService, NodeRandomTokenService)
│   │   ├── email/ (ConsoleEmailService, SmtpEmailService)
│   │   └── storage/ (LocalFileStorageService, SupabaseStorageService)
│   ├── agentesIA/ (camada isolada, própria — não é "infra" genérica; 3 agentes, cada um com sua
│   │   │            própria classe, mesmo repetindo a mesma chamada de API — decisão #25)
│   │   ├── README.md
│   │   ├── AgenteExtrator/ (GeminiExtractionService — só extração + comparação, prompts/extracaoPrompt.js)
│   │   ├── AgenteValidador/ (GeminiEmbeddingService — embeddings pós-validação, RF08/RF09)
│   │   └── AgenteConsulta/ (GeminiEmbeddingService — vetoriza termo/pergunta, RF11/RF12;
│   │                         GeminiRAGService — geração da resposta, RF12; prompts/consultaPrompt.js)
│   ├── http/
│   │   ├── controllers/ (EmpresaController, AuthController, UsuarioController, CatalogoController,
│   │   │                  ConsultaController, LogAuditoriaController)
│   │   ├── routes/ (empresaRoutes, authRoutes, usuarioRoutes, catalogoRoutes, consultaRoutes,
│   │   │             logAuditoriaRoutes, index.js)
│   │   └── middlewares/ (asyncHandler, errorHandler, authMiddleware — criarAuthMiddleware +
│   │                       criarExigirAdministrador, ambas fábricas que logam ACESSO_NAO_AUTORIZADO,
│   │                       uploadMiddleware — multer)
│   ├── main/factories/index.js   # composition root
│   ├── app.js / server.js
├── tests/
│   ├── fakes/          # 15 dublês em memória (ver TESTES.md)
│   ├── unit/
│   │   ├── domain/validators/
│   │   └── useCases/{empresa,auth,usuario,catalogo,consulta,log}/
│   └── integration/     # 3 arquivos, cruzando requisitos
├── jest.config.js
├── .env (não versionado — já configurado com credenciais do Supabase do usuário)
└── .env.example
```

## Estrutura completa de arquivos (frontend)

```
frontend/src/
├── pages/
│   ├── CadastrarEmpresaPage.jsx    (RF01)
│   ├── LoginPage.jsx                (RF02)
│   ├── RecuperarSenhaPage.jsx       (RF03)
│   ├── RedefinirSenhaPage.jsx       (RF04-A1)
│   ├── AlterarSenhaPage.jsx         (RF04 básico)
│   ├── MenuPrincipalPage.jsx        (home pós-login)
│   ├── DadosEmpresaPage.jsx         (RF01-A1/A2)
│   ├── UsuariosPage.jsx             (RF05 — tabela + modais)
│   ├── ImportarCatalogoPage.jsx     (RF06 — dropzone de upload)
│   ├── ValidarCatalogoPage.jsx      (RF08 — tela dividida HITL)
│   ├── CatalogoPage.jsx             (RF09/A2 — listagem + filtros + exclusão)
│   ├── EditarCatalogoPage.jsx       (RF09/A3 — tela dividida de edição)
│   ├── DocumentosPendentesPage.jsx  (RF10 — fila em cards + ações)
│   ├── ConsultarComponentesPage.jsx (RF11 — busca + filtros + resultados)
│   ├── ConsultaTecnicaPage.jsx      (RF12 — chat do Agente de Consulta/RAG)
│   └── LogSistemaPage.jsx           (RF13 — filtros + tabela do log de auditoria)
├── components/
│   ├── Field.jsx          (input + label + erro, padrão de formulário)
│   ├── TopBar.jsx          (barra superior autenticada, com menu do usuário)
│   ├── ConfirmModal.jsx    (confirmação de duas etapas — RNF03)
│   ├── NovoUsuarioModal.jsx    (RF05 — criação)
│   ├── EditarUsuarioModal.jsx  (RF05 — edição)
│   ├── PartifyLogo.jsx
│   └── ProtectedRoute.jsx  (guarda de rota — RNF07)
├── services/
│   ├── api.js              (instância axios + extração padronizada de erro)
│   ├── authStorage.js       (persistência do token/usuário no localStorage)
│   ├── authService.js       (login, logout, recuperar/redefinir/alterar senha)
│   ├── empresaService.js    (CRUD de empresa)
│   ├── usuarioService.js    (RF05 — CRUD de usuário)
│   ├── catalogoService.js   (RF06-RF10 — importar, reextrair, validar, listar, buscar,
│   │                           buscar arquivo, atualizar, excluir peça, listar/buscar/excluir
│   │                           documento pendente)
│   ├── consultaService.js   (RF11 — buscar componentes; RF12 — perguntarTecnico)
│   └── logAuditoriaService.js (RF13 — consultarLogAuditoria)
├── utils/masks.js           (máscaras de CNPJ/CPF/telefone)
├── styles/global.css
└── App.jsx                  (rotas)
```

## Rotas do backend (estado atual)

| Método | Rota | Autenticado | Requisito |
| --- | --- | --- | --- |
| POST | `/auth/login` | não | RF02 |
| POST | `/auth/logout` | sim | RF02 (A1) |
| POST | `/auth/recuperar-senha` | não | RF03 |
| POST | `/auth/redefinir-senha` | não | RF04 (A1) |
| POST | `/auth/alterar-senha` | sim | RF04 (fluxo básico) |
| POST | `/empresas` | não | RF01 |
| GET | `/empresas/me` | sim | RF01 (A1) |
| PUT | `/empresas/me` | sim | RF01 (A1) |
| PATCH | `/empresas/me/desativar` | sim (admin) | RF01 (A2) |
| POST | `/usuarios` | sim (admin) | RF05 (básico) |
| GET | `/usuarios` | sim (admin) | RF05 (A1 — listar) |
| PUT | `/usuarios/:id` | sim (admin) | RF05 (A1 — editar) |
| PATCH | `/usuarios/:id/desativar` | sim (admin) | RF05 (A2) |
| PATCH | `/usuarios/:id/reativar` | sim (admin) | RF05 (A3) |
| POST | `/catalogos` | sim | RF06 (básico) + RF07 (básico, encadeado) |
| POST | `/catalogos/:id/extrair` | sim | RF07 (nova tentativa após E1) |
| PUT | `/catalogos/:id/validar` | sim | RF08 (básico + A1) |
| GET | `/catalogos` | sim | RF09 (A2 — consulta, com filtros de marca/modelo/código) |
| GET | `/catalogos/:id` | sim | RF09 (A3 — carrega a tela de edição) |
| GET | `/catalogos/:id/arquivo` | sim | RF09 (reexibe o PDF original na edição) |
| PUT | `/catalogos/:id` | sim | RF09 (A3 — salvar edição) |
| DELETE | `/catalogos/pecas/:pecaId` | sim | RF09 (A4 — exclusão de peça) |
| GET | `/catalogos/pendentes` | sim | RF10 (básico — fila de pendentes) |
| GET | `/catalogos/pendentes/:id` | sim | RF10 (A1 — carrega pra preenchimento) |
| DELETE | `/catalogos/pendentes/:id` | sim | RF10 (A3 — exclusão do documento) |
| GET | `/componentes` | sim | RF11 (básico + A2 — busca combinada) |
| POST | `/consulta-tecnica` | sim | RF12 (básico + E1/E2/E3 — Agente de Consulta/RAG) |
| GET | `/log-auditoria` | sim (admin) | RF13 (básico — consulta filtrada do log) |

## Bugs reais encontrados e corrigidos durante o desenvolvimento

1. **Login não bloqueado após empresa desativada (RF01-A2 x RF02).** `AutenticarUsuarioUseCase` só checava `Usuario.ativo`, nunca `Empresa.status`. Corrigido injetando `empresaRepository` no Use Case. Hoje há teste unitário e de integração cobrindo especificamente esse cenário.
2. **Log de auditoria da edição de empresa capturava o "anterior" errado.** `AtualizarEmpresaUseCase` calculava o snapshot "antes" depois de já ter chamado `atualizar()` no repositório — só não quebrava em produção porque o Prisma sempre devolve uma instância nova a cada consulta. Corrigido pra capturar o snapshot antes de chamar o repositório, sem depender desse detalhe de implementação.
3. **Comentários de bloco `/** ... */` no `schema.prisma` quebravam `prisma generate`/`migrate`** (Prisma só aceita `//`). Corrigido trocando por `//` nos comentários que eu tinha adicionado.
4. **`P2028 Transaction already closed` no RF07 (extração)** — `registrarResultadoExtracao` faz vários round-trips sequenciais ao Supabase (upserts de marca/ferramenta/versão em `resolverVersaoTensaoId`, `peca.createMany`, `catalogo.update`, `#buscarComPecas`) dentro de uma `$transaction`; contra um banco remoto, a soma da latência às vezes passava do timeout padrão de transação interativa do Prisma (5000 ms). Corrigido passando `{ timeout: 15000 }` como segunda opção nas 3 transações de `PrismaCatalogoRepository.js` (`registrarResultadoExtracao`, `registrarValidacao`, `atualizarCatalogo`). Não é um problema de lógica/schema — é latência de rede acumulada; se voltar a ocorrer mesmo com 15s, o próximo passo seria reduzir round-trips (ex.: substituir os upserts sequenciais por uma query combinada).

## Testes automatizados

Cobertura completa documentada em **[`TESTES.md`](./TESTES.md)** (o que cada teste faz e por quê). Resumo:

- Framework: Jest, tudo em memória (fakes em `backend/tests/fakes/`), roda sem banco de dados — inclusive a Gemini API é substituída por fakes, nunca chamada de verdade nos testes.
- 274 testes (confirmado via `npm test` — Test Suites: 34, Tests: 274, todos passando), incluindo os 28 Use Cases de RF01–RF13, os validadores de CPF/CNPJ/e-mail, 3 suítes de integração cruzando requisitos, e a nova suíte de recuperação `tests/unit/infra/transacaoComRetry.test.js` (5 testes) + 1 teste adicional de não-resíduo pós-falha em `ExtrairDadosCatalogoUseCase.test.js` (ver decisão #41). A distribuição fina por requisito documentada na decisão #38 (232 + 24 transversais = 256, antes do RF03 passar a 257) ficou desatualizada com os acréscimos desta e de sessões anteriores — o número de referência a partir de agora é o total real reportado pelo `npm test`, não a soma manual por requisito.

  **Nota de atualização (sessão posterior):** este número (274) ficou defasado após a implementação dos testes de API (decisão #43) — o total real, verificado via `npm test`, é **326 testes em 41 suítes** (266 unitários + 8 de integração + 52 de API/HTTP). Ver detalhamento completo por requisito e por tipo de teste no `TESTES.md` e no histórico desta sessão.
- Comando: `cd backend && npm test`.
- Ponto de atenção já documentado no `TESTES.md`: múltiplas solicitações de recuperação de senha em sequência geram múltiplos tokens válidos simultaneamente (nenhum invalida o anterior) — comportamento atual, não necessariamente um bug, mas vale revisão de segurança no futuro se quisermos invalidar tokens antigos ao gerar um novo.

## Ambiente / como rodar

Detalhes completos em **[`README.md`](./README.md)**. Resumo do que já está pronto:

- `backend/.env` **já está configurado** com as credenciais do projeto Supabase do usuário (`DATABASE_URL` via session pooler, `DIRECT_URL` direto, `JWT_SECRET`). **Atenção:** a senha do banco foi compartilhada em texto puro no chat em algum momento — se ainda não foi trocada, recomendar ao usuário trocá-la em Project Settings → Database no Supabase.
- `frontend/.env` configurado com `VITE_API_URL`.
- Migration inicial já foi rodada (`20260721084326_init`) — o banco tinha um schema antigo de uma versão anterior do projeto, que foi resetado com autorização do usuário.
- Trigger de imutabilidade do log de auditoria: aplicar manualmente via SQL Editor do Supabase (arquivo `backend/prisma/manual/immutable_audit_log.sql`) — confirmar se já foi aplicado, se não, aplicar antes de continuar.
- Ambiente de execução (sandbox) deste agente Claude ficou indisponível durante todo o desenvolvimento — nada foi rodado localmente pelo agente; todo o `npm install`/`npm test`/`prisma migrate` foi rodado pelo próprio usuário no terminal dele, reportando erros de volta pro agente corrigir.
- **RF06/RF07/RF08 — status:** schema migrado, dependências instaladas, `GEMINI_API_KEY` já configurada em `backend/.env` com `GEMINI_MODEL="gemini-2.5-flash"` (posteriormente trocado para `gemini-3.5-flash`, ver decisão #29) e `GEMINI_EMBEDDING_MODEL="gemini-embedding-2"`. `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` continuam em branco (opcional) — os PDFs estão sendo salvos localmente em `backend/storage/`. O fluxo já foi testado manualmente pelo usuário (upload → extração → validação) e o log de consumo de tokens (decisão #18) já está ativo.
- **Pendência de limpeza:** a pasta antiga `backend/src/infra/ai/` (3 arquivos órfãos, de antes da mudança para `agentesIA/` — decisão #17) foi apontada para o usuário apagar manualmente, já que o agente não tem uma ferramenta de exclusão de arquivos e o sandbox de execução está indisponível. Confirmar em conversas futuras se essa pasta ainda existe (se existir, não é usada por nada — pode apagar com segurança). Toda pendência de exclusão de arquivo fica registrada em `LEMBRETES.md` na raiz do projeto (regra permanente — ver convenção #8 mais abaixo).
- **Pendência de migration — isolamento do catálogo por empresa (decisão #19, RNF11):** o schema já foi ajustado, mas a migration ainda não foi rodada. Como as tabelas `marcas`/`ferramentas`/`versoes_tensao`/`catalogos`/`pecas`/`validacoes` já têm dados de teste (sem `empresaId`, criados antes desta correção) e a nova coluna é obrigatória, é preciso **truncar essas 6 tabelas antes de migrar** (não afeta `empresas`/`usuarios`/`logs_auditoria`, que continuam intactos). Ver o passo a passo em `README.md`.
- **RF09 — status:** implementado (backend + frontend + testes), ainda não testado manualmente pelo usuário — depende da mesma migration pendente do item acima (não foi criada uma migration separada; a correção do RNF11 e o RF09 saem juntos na mesma `prisma migrate dev`).
- **RF10 — status:** implementado (backend + frontend + testes). Diferente do RF09, **não depende de nenhuma migration nova** — reaproveita o `StatusCatalogo.IRRESOLUVEL` já existente desde o RF07, sem alterar o schema. Ainda não testado manualmente pelo usuário.
- **RF11 — status:** implementado (backend + frontend + testes). Também **não depende de nenhuma migration nova** — reaproveita a coluna `Peca.embedding` (pgvector) já existente desde o RF08/RF09. Ainda não testado manualmente pelo usuário; a busca semântica só funciona de fato para peças que já têm embedding gerado (ou seja, validadas depois que o RF08 passou a gerar embeddings — dados de teste muito antigos, se ainda existirem, podem não ter esse vetor).
- **RF13 — status:** implementado (backend + frontend + testes), ainda não testado manualmente pelo usuário. **Depende de uma migration nova** (`20260724090000_rf13_log_auditoria_empresa_id`, adiciona `empresaId` nullable em `logs_auditoria` — ver decisão #27) — diferente da migration do RF09, esta não exige truncar nenhuma tabela antes (a coluna é opcional, então `prisma migrate dev` aplica direto sobre os logs já existentes, que ficam com `empresaId = null`; só passam a aparecer numa consulta filtrada por empresa os logs registrados a partir de agora).
- **RF12 — status:** implementado (backend + frontend + testes). **Não depende de nenhuma migration nova** — reaproveita a coluna `Peca.embedding` e a tabela `validacoes` já existentes; o campo `validadoEm` retornado pela busca semântica vem de um `LEFT JOIN LATERAL`, sem alterar o schema. É o primeiro requisito a chamar `generateContent` da Gemini API pra geração de texto fora do RF07 — usa o mesmo `GEMINI_MODEL` já configurado. Ainda não testado manualmente pelo usuário; assim como o RF11, só responde bem sobre peças que já têm embedding gerado.
- **Atenção — chave da Gemini API foi exposta:** o usuário colou a chave de API em texto puro nesta conversa, e uma chave antiga (diferente) foi encontrada escrita dentro de `backend/.env.example` (arquivo normalmente versionado no git, diferente do `.env`). O `.env.example` já foi corrigido (voltou a ter só `""`), mas **ambas as chaves devem ser consideradas potencialmente comprometidas** — o usuário foi orientado a revogá-las em https://aistudio.google.com/apikey e gerar uma nova, e a checar `git log --all -p -- backend/.env.example` para confirmar se a chave antiga chegou a ser commitada. Confirmar em conversas futuras se isso já foi feito. Mesma cautela já aplicada ao vazamento da senha do banco (RF01/RF02): nunca repetir o valor da chave em nenhum arquivo `.md` ou resposta.

## Convenções a seguir nos próximos requisitos

Pra manter consistência com o que já existe, ao implementar RF09 em diante:

1. Seguir a mesma ordem de camadas: `domain` (entidade/validador/interface) → `useCases` → `infra` (implementação concreta) → `http` (controller/rota) → `main/factories` (wiring).
2. Um Use Case por fluxo/operação do DERS (não amontoar fluxo básico + todos os alternativos num único Use Case gigante, exceto quando forem triviais como Consultar).
3. Erros sempre via `DomainErrors` (nunca lançar `Error` genérico ou vazar erro de infra pro cliente).
4. Toda ação relevante registra log de auditoria (`TipoAcao` + `usuarioId` + `detalhes`).
5. Ações destrutivas/impactantes usam confirmação de duas etapas (`ConfirmModal`) no frontend.
6. Escrever testes unitários (Use Case com fakes) pra cada novo caso de uso, seguindo o padrão de `backend/tests/`, e atualizar o `TESTES.md`.
7. Ao final de cada requisito, atualizar este `CONTEXTO.md`, o `README.md` (status/rotas) e o `TESTES.md`.
8. **Regra permanente do usuário:** sempre que um arquivo precisar ser apagado e o agente não conseguir fazer isso sozinho (hoje depende do sandbox de shell, que está indisponível), anotar o caminho completo do arquivo em `LEMBRETES.md` (raiz do projeto), junto com o motivo. Não basta avisar só no chat — o registro tem que ficar no arquivo.

---

# SEÇÃO 4 — TESTES.md

# Testes automatizados do Partify

Este documento descreve os testes automatizados do backend: onde ficam, como rodar, e o propósito de cada teste. Cobre os 13 requisitos funcionais do DERS — RF01 (Manter Empresa), RF02 (Realizar Login), RF03 (Recuperar Senha), RF04 (Alterar Senha — fluxo básico, autenticado — e Redefinir Senha — fluxo alternativo A1, via link do RF03), RF05 (Manter Usuário), RF06/RF07/RF08 (Importar Catálogo, Extração via IA e Validação HITL), RF09 (Manter Catálogo — consulta, edição e exclusão de peça), RF10 (Manter Documentos Pendentes — fila de pendentes, preenchimento manual e exclusão de documento), RF11 (Consulta de Componentes — busca combinada por código exato e similaridade semântica), RF12 (Consulta Técnica via RAG — resposta em linguagem natural fundamentada no contexto recuperado) e RF13 (Manter Log Sistema — consulta filtrada do log de auditoria).

> **Importante sobre RF06/RF07/RF08:** os testes automatizados usam um `FakeExtractionService`/`FakeEmbeddingService` em memória — a Gemini API real **nunca** é chamada nos testes. Isso significa que a suíte cobre a lógica do Partify (validações, persistência, roteamento por status, logs) mas **não** verifica a acurácia real do modelo de IA exigida pela RNF10 (≥75% nos catálogos de Bosch/Makita/DeWalt). Essa verificação só é possível manualmente, com uma chave de API real configurada e os PDFs de exemplo.

## Como rodar

```bash
cd backend
npm install
npm test
```

Todos os testes são unitários/de integração **em memória** — nenhum toca o Prisma ou um banco de dados real, então rodam sem precisar de `DATABASE_URL` configurada. Isso é possível porque a Clean Architecture do projeto injeta os repositórios e serviços (Prisma, bcrypt, JWT, SMTP...) como dependências abstratas nos Use Cases; nos testes, essas dependências são substituídas por implementações falsas ("fakes"), guardadas em `backend/tests/fakes/`.

## Estrutura

```
backend/tests/
├── fakes/                          # repositórios e serviços em memória (dublês de teste)
├── unit/
│   ├── domain/validators/          # testes puros dos validadores de CPF/CNPJ/e-mail
│   └── useCases/
│       ├── empresa/                # RF01: criar, consultar, atualizar, desativar
│       ├── auth/                   # RF02/RF03/RF04: login, logout, recuperar/redefinir/alterar senha
│       ├── usuario/                # RF05: criar, listar, atualizar, desativar, reativar
│       ├── catalogo/                # RF06-RF10: importar, extrair (IA), validar (HITL),
│       │                            # listar/buscar/atualizar/excluir peça, baixar arquivo,
│       │                            # listar/buscar/excluir documento pendente
│       ├── consulta/                # RF11: buscar componentes (código exato + semântica);
│       │                            # RF12: consulta via RAG (Agente de Consulta)
│       └── log/                     # RF13: consultar log de auditoria (filtros + resolução de nome)
└── integration/                    # vários Use Cases reais rodando juntos, cruzando requisitos
```

## Os fakes (dublês de teste)

Cada dependência abstrata do domínio (`domain/repositories`, `domain/services`) tem uma implementação falsa correspondente, usada só nos testes:

| Fake | Substitui | Comportamento |
| --- | --- | --- |
| `FakeEmpresaRepository` | `EmpresaRepository` (Prisma) | Guarda empresas num array em memória; ao `criar`, também persiste o administrador no `FakeUsuarioRepository` associado, replicando a transação atômica do repositório real. |
| `FakeUsuarioRepository` | `UsuarioRepository` (Prisma) | Guarda usuários num array em memória; suporta `criar`, `listarPorEmpresa`, `atualizar` e `atualizarStatus` (RF05), além de `contarAdministradoresAtivos` (usado na regra E2 de desativação). |
| `FakeCatalogoRepository` | `CatalogoRepository` (Prisma) | Replica em memória a cadeia relacional Marca → Ferramenta → VersaoTensao → Peça (find-or-create), escopada por `empresaId` (RNF11) — reaproveita registros entre catálogos da mesma empresa, mas nunca entre empresas diferentes. Também simula `listarPecasValidadas`/`atualizarCatalogo`/`excluirPeca` (RF09) e `listarPendentes`/`excluirCatalogo` (RF10); mantém um array `validacoes` próprio e simplificado (não compartilhado com `FakeValidacaoRepository`) só pra alimentar o campo "validado por" nos testes de listagem. |
| `FakeValidacaoRepository` | `ValidacaoRepository` (Prisma) | Guarda os registros de validação (RF08) num array, para inspecionar quem validou cada catálogo. |
| `FakeComponenteRepository` | `ComponenteRepository` (Prisma) | Guarda peças "achatadas" (marca/modelo/tensão já como string, sem a cadeia relacional) num array, populado via o helper de teste `seedComponente`. Simula a busca exata (comparação de string) e a busca semântica (distância euclidiana entre vetores, no lugar da distância de cosseno do pgvector — suficiente pra testar ordenação/combinação sem precisar de um banco real). |
| `FakeFileStorageService` | `FileStorageService` (Local/Supabase Storage) | Guarda os arquivos num `Map` em memória, sem tocar o disco nem um bucket externo. |
| `FakeExtractionService` | `ExtractionService` (Gemini API) | Devolve a resposta configurada pelo teste em `proximaResposta`; `deveFalhar = true` simula a exceção E1 (falha de comunicação) do RF07. **Nunca chama a Gemini API de verdade.** |
| `FakeEmbeddingService` | `EmbeddingService` (Gemini API) | Devolve um vetor fictício; `deveFalhar = true` simula falha na geração de embedding (RF08/RF09, best-effort). Substitui a interface `EmbeddingService`, então serve tanto para os testes que simulam o Agente Validador (RF08/RF09) quanto o Agente de Consulta (RF11/RF12) — são duas classes concretas diferentes em produção (`agentesIA/AgenteValidador/GeminiEmbeddingService` e `agentesIA/AgenteConsulta/GeminiEmbeddingService`, decisão #25 no CONTEXTO.md), mas o mesmo fake genérico cobre as duas nos testes. **Nunca chama a Gemini API de verdade.** |
| `FakeRAGService` | `RAGService` (Gemini API — Agente de Consulta, RF12) | Por padrão devolve `situacao: "RESPONDIDO"` citando a primeira peça do contexto recebido; cada teste pode sobrescrever `proximaResposta` (pra simular E1/E3) ou `deveFalhar = true` (pra simular E2). **Nunca chama a Gemini API de verdade.** |
| `FakeLogAuditoriaRepository` | `LogAuditoriaRepository` (Prisma) | Guarda os logs registrados num array (com `id`/`realizadoEm` atribuídos automaticamente), pra inspecionar nos asserts o que cada Use Case gravou. Também implementa `consultar` (RF13) com os mesmos filtros do repositório real — empresaId, usuarioId, tipoAcao, intervalo de datas —, ordenando do mais antigo para o mais recente. |
| `FakeSessaoRevogadaRepository` | `SessaoRevogadaRepository` (Prisma) | Simula a denylist de sessões (JWT) revogadas no logout. |
| `FakeTokenRedefinicaoSenhaRepository` | `TokenRedefinicaoSenhaRepository` (Prisma) | Simula a tabela de tokens de redefinição de senha. |
| `FakeHashService` | `HashService` (bcrypt) | Hash determinístico (`hash:<valor>`) — não é seguro, só serve pra comparar em teste. |
| `FakeTokenService` | `TokenService` (JWT) | Em vez de assinar um JWT de verdade, serializa o payload em JSON (permite inspecionar `sub`, `jti`, `exp` etc. nos testes). |
| `FakeRandomTokenService` | `RandomTokenService` (crypto) | Gera tokens/hashes previsíveis (`token-bruto-1`, `token-bruto-2`...) em vez de aleatórios. |
| `FakeEmailService` | `EmailService` (SMTP) | Não envia e-mail nenhum — só guarda cada chamada num array (`enviados`) pra inspecionar o link gerado. |

---

## Validadores de domínio

### `tests/unit/domain/validators/documentValidator.test.js`

Testa a lógica de dígito verificador de CPF/CNPJ (`RF01`, fluxo de exceção E1), usada no cadastro da empresa. Usa números sintéticos calculados manualmente com o mesmo algoritmo do código (não pertencem a ninguém).

| Teste | Propósito |
| --- | --- |
| `apenasDigitos` — remove qualquer caractere que não seja dígito | Garante que a máscara (pontos, barra, traço) é sempre limpa antes de validar. |
| `validarCpf` — aceita um CPF com dígitos verificadores corretos | Caso feliz: CPF matematicamente válido é aceito. |
| `validarCpf` — aceita o mesmo CPF formatado com máscara | O usuário pode digitar com ou sem máscara — ambos devem funcionar. |
| `validarCpf` — rejeita CPF com o último dígito verificador errado | Detecta erro de digitação (dígito verificador não bate). |
| `validarCpf` — rejeita CPF com todos os dígitos iguais | Números como `111.111.111-11` passam no cálculo de dígito verificador mas não são CPFs reais — precisam de checagem explícita. |
| `validarCpf` — rejeita CPF com quantidade de dígitos diferente de 11 | Protege contra entradas incompletas ou incorretas. |
| `validarCnpj` — (mesmos 5 casos acima, para CNPJ de 14 dígitos) | Mesma cobertura da lógica de CNPJ, que usa pesos e fórmula diferentes do CPF. |
| `validarCnpjOuCpf` — aceita CPF válido de 11 dígitos / CNPJ válido de 14 dígitos | Confirma que o campo único "CNPJ ou CPF" da tela de cadastro decide corretamente qual algoritmo aplicar pela quantidade de dígitos. |
| `validarCnpjOuCpf` — rejeita quantidade de dígitos que não é nem CPF nem CNPJ | Ex.: 12 dígitos — nem um nem outro. |
| `validarCnpjOuCpf` — rejeita valor vazio | Campo obrigatório não preenchido. |

### `tests/unit/domain/validators/emailValidator.test.js`

Testa a validação de formato de e-mail (`RF01`, fluxo de exceção E2), usada no cadastro do administrador.

| Teste | Propósito |
| --- | --- |
| Aceita e-mails válidos (`admin@partify.com`, com subdomínio, formato curto) | Cobre formatos comuns de e-mail real. |
| Rejeita e-mails inválidos (vazio, sem `@`, sem domínio, sem usuário, com espaço, `null`, `undefined`, número) | Cobre as principais formas de entrada malformada, incluindo tipos que não são string. |
| Ignora espaços nas extremidades | O usuário pode colar um e-mail com espaço acidental sem que isso seja tratado como inválido. |

---

## RF01 — Manter Empresa

### `tests/unit/useCases/empresa/CriarEmpresaUseCase.test.js`

Fluxo básico de cadastro público da empresa + administrador.

| Teste | Propósito |
| --- | --- |
| Cria a empresa e o administrador com sucesso | Caso feliz do fluxo básico do RF01. |
| Nunca persiste a senha do administrador em texto puro | Garante que `hashService.hash` é sempre usado antes de salvar — nunca a senha crua. |
| Registra `CRIACAO_EMPRESA` no log de auditoria (RNF09) | Toda criação de empresa deve deixar rastro auditável. |
| Rejeita CNPJ/CPF já cadastrado (`ConflictError`) | Regra de unicidade da instância. |
| Rejeita login de administrador já em uso (`ConflictError`) | Login é único globalmente no sistema (decisão documentada no schema). |
| Rejeita CNPJ/CPF inválido (exceção E1) | Usa o validador de dígito verificador antes de aceitar o cadastro. |
| Rejeita e-mail em formato inválido (exceção E2) | Idem, para e-mail. |
| Rejeita senha com menos de 8 caracteres | Regra mínima de segurança de senha. |
| Rejeita cadastro com campos obrigatórios ausentes, listando todos em `fieldErrors` | Confirma que **todos** os campos inválidos são reportados de uma vez (não só o primeiro), pra o formulário poder destacar todos ao mesmo tempo. |
| Rejeita nome contendo apenas espaços em branco | `"   "` teoricamente passa num check `!nome` ingênuo — o teste confirma que o `trim()` é aplicado antes de validar. |
| Aceita CNPJ/CPF formatado com máscara | O usuário pode digitar com máscara; o valor é validado corretamente (mas persistido como veio, sem stripping — documentado no próprio teste). |
| Remove espaços das extremidades de nome, telefone, e-mail e login | Evita que espaços acidentais no formulário virem sujeira nos dados persistidos. |
| Normaliza o e-mail para minúsculas | Evita duplicidade de cadastro por diferença de caixa (`Admin@X.com` vs `admin@x.com`). |
| O administrador criado é sempre `ADMINISTRADOR` e começa ativo | Garante o perfil e o estado inicial corretos do usuário criado junto da empresa. |

### `tests/unit/useCases/empresa/ConsultarEmpresaUseCase.test.js`

Fluxo alternativo A1 (parte de consulta) — tela "Dados da Empresa".

| Teste | Propósito |
| --- | --- |
| Retorna os dados da empresa quando ela existe | Caso feliz. |
| Lança `NotFoundError` quando a empresa não existe | Protege contra `empresaId` inválido/inexistente (ex.: token de outra instância). |

### `tests/unit/useCases/empresa/AtualizarEmpresaUseCase.test.js`

Fluxo alternativo A1 (parte de edição) — tela "Editar Dados da Empresa".

| Teste | Propósito |
| --- | --- |
| Atualiza nome, telefone e e-mail com sucesso | Caso feliz com todos os campos editáveis de uma vez. |
| Permite atualizar apenas um campo, mantendo os demais | Confirma que a atualização é parcial (PATCH-like), não sobrescreve o resto com `undefined`. |
| Lança `NotFoundError` quando a empresa não existe | Mesma proteção da consulta. |
| Rejeita e-mail em formato inválido | Reaplica a mesma validação do cadastro na edição. |
| Rejeita nome em branco | Não permite esvaziar um campo obrigatório via edição. |
| Registra `EDICAO_REGISTRO` no log de auditoria com valores anterior/novo | RNF09 — o log precisa mostrar o que mudou, não só que mudou algo. |
| O log de auditoria registra anterior/novo de **todos** os campos alterados simultaneamente | Garante que a captura do "antes" funciona também quando múltiplos campos mudam juntos, não só um. |
| Remove espaços das extremidades e normaliza o e-mail para minúsculas | Mesma normalização do cadastro, agora na edição. |
| Quando nenhum campo é informado, não altera nada e não quebra | Caso de borda: uma requisição de edição vazia não deve gerar erro nem apagar dados. |
| Não permite editar o CNPJ/CPF | O CNPJ/CPF é a chave de identificação da instância — confirma que passar esse campo na edição é simplesmente ignorado. |

> **Nota:** esta suíte pegou um bug real durante o desenvolvimento — o cálculo do "valor anterior" pro log de auditoria era feito *depois* de chamar `atualizar()` no repositório, o que só não quebrava em produção porque o `PrismaEmpresaRepository` sempre devolve uma instância nova a cada consulta. O `FakeEmpresaRepository` (que reaproveita a mesma referência de objeto) expôs essa fragilidade, e o Use Case foi corrigido para capturar o "antes" old antes de chamar o repositório — sem depender desse detalhe de implementação.

### `tests/unit/useCases/empresa/DesativarEmpresaUseCase.test.js`

Fluxo alternativo A2 — desativação da instância.

| Teste | Propósito |
| --- | --- |
| Desativa a empresa com sucesso, sem apagar nenhum dado | Confirma que a desativação é reversível (soft state, não exclusão). |
| Lança `NotFoundError` quando a empresa não existe | Mesma proteção dos demais casos de uso de empresa. |
| Lança `ConflictError` quando a empresa já está desativada | Evita desativar duas vezes / mensagem de erro clara em vez de um "sucesso" enganoso. |
| Registra `ATIVAR_DESATIVAR_EMPRESA` no log de auditoria | RNF09 — ação sensível precisa ficar auditada. |
| O log registra o id do usuário (administrador) que solicitou a desativação | Rastreabilidade: quem fez a ação, não só o que mudou. |
| Preserva o CNPJ/CPF e demais dados cadastrais após a desativação | Reforça que "desativar" não é "apagar" — os dados continuam intactos pra uma eventual reativação. |

---

## RF02 — Realizar Login (login + logout)

### `tests/unit/useCases/auth/AutenticarUsuarioUseCase.test.js`

| Teste | Propósito |
| --- | --- |
| Autentica com sucesso e retorna token + dados do usuário sem a senha | Caso feliz — e confirma que o hash da senha nunca vaza na resposta. |
| Registra `LOGIN` no log de auditoria em caso de sucesso | RNF09. |
| Rejeita login inexistente (exceção E1) | Usuário não encontrado deve dar erro genérico ("login ou senha inválidos"), sem revelar qual dos dois está errado. |
| Rejeita senha incorreta (exceção E1) | Mesma mensagem genérica, agora pro caso de senha errada. |
| Rejeita usuário inativo (exceção E2) | Usuário desativado individualmente (RF05) não pode logar. |
| Rejeita login quando a empresa/instância está desativada (decorrência do RF01-A2) | **Bug real encontrado e corrigido durante o desenvolvimento**: o Use Case originalmente só checava `Usuario.ativo`, nunca o status da empresa — violando a regra do RF01-A2 de que desativar a empresa "suspende o acesso de TODOS os usuários da instância". Este teste é a rede de segurança contra essa regressão específica. |
| Rejeita login quando o usuário aponta para uma empresa inexistente | Cenário de inconsistência de dados (deveria ser impossível, mas o código trata defensivamente) — mesmo branch de erro do teste anterior. |
| Remove espaços das extremidades do login antes de buscar o usuário | Evita falha de login por espaço acidental copiado/colado. |
| O token gerado carrega o id do usuário, a empresa e o perfil | Confirma que o payload do JWT tem tudo que o `authMiddleware` e o front precisam (`sub`, `empresaId`, `perfil`). |
| Cada tentativa de login com credenciais inválidas gera um novo registro de auditoria | Garante que tentativas repetidas ficam todas registradas (útil pra detectar força bruta), não só a primeira. |

### `tests/unit/useCases/auth/LogoutUseCase.test.js`

| Teste | Propósito |
| --- | --- |
| Revoga o `jti` da sessão atual e registra `LOGOUT` no log de auditoria | Caso feliz do RF02-A1: o token corrente vira inválido imediatamente. |
| Não invalida uma sessão (`jti`) diferente da que foi encerrada | Garante que o logout é específico da sessão atual, não afeta outros dispositivos/sessões do mesmo usuário. |
| Usa o `exp` do JWT (segundos Unix) como data de expiração do registro de revogação | A entrada na denylist não precisa viver pra sempre — expira junto com o token que ela invalida. |
| Usa um fallback de ~24h quando o `exp` não é informado | Caso de borda: se por algum motivo o middleware não repassar o `exp`, a revogação ainda tem um teto razoável em vez de ficar "para sempre" ou undefined. |
| A sessão revogada fica associada ao usuário correto | Confirma que o `usuarioId` é propagado corretamente pro registro de revogação e pro log. |

### `tests/unit/useCases/auth/SolicitarRecuperacaoSenhaUseCase.test.js`

RF03 — fluxo básico + exceção E1.

| Teste | Propósito |
| --- | --- |
| Gera token, persiste apenas o hash e envia o e-mail quando login e e-mail conferem | Caso feliz. |
| Registra `ALTERACAO_SENHA` (etapa de envio) no log de auditoria | RNF09. |
| O link enviado usa o token bruto, nunca o hash persistido no banco | Segurança: se o banco vazar, o hash sozinho não é suficiente pra redefinir a senha de ninguém — só o token bruto (que só existe no e-mail do usuário) funciona. |
| Não envia e-mail nem lança erro quando o e-mail não confere com o login (exceção E1) | RNF05: mesmo quando os dados não batem, a resposta não pode diferenciar visivelmente esse caso de um sucesso real. |
| Não lança erro nem revela se o login existe (RNF05) | Idem, para login completamente inexistente — previne enumeração de contas cadastradas. |
| O token gerado expira em aproximadamente 30 minutos | Confirma a janela de validade documentada no código (`VALIDADE_TOKEN_MINUTOS`). |
| Cada solicitação gera um novo token, sem invalidar os anteriores | Documenta o comportamento atual (múltiplos links pedidos em sequência continuam todos válidos até expirar/serem usados) — um ponto que pode valer revisão de segurança no futuro. |
| O log de auditoria não guarda o token bruto nem o hash em texto explorável | Confirma que os detalhes do log não viram um vazamento indireto do segredo. |
| A comparação de e-mail ignora maiúsculas/minúsculas e espaços | Evita falso-negativo (usuário real sendo tratado como "não confere") por diferença de caixa ou espaço digitado. |
| Registra o `empresaId` do usuário no log de auditoria | RNF11: confirma que o log de uma solicitação de recuperação fica corretamente associado à instância do usuário, mesmo esse sendo um dos poucos fluxos do sistema sem sessão autenticada (o `empresaId` vem só da busca por login, não de um token JWT). |

### `tests/unit/useCases/auth/RedefinirSenhaUseCase.test.js`

RF04, fluxo alternativo A1 — destino do link do RF03.

| Teste | Propósito |
| --- | --- |
| Redefine a senha com um token válido, marcando-o como usado | Caso feliz. |
| Rejeita senha com menos de 8 caracteres | Mesma regra mínima de segurança do cadastro. |
| Rejeita quando a confirmação de senha não coincide | Validação de formulário de duas etapas (nova senha / confirmar nova senha). |
| Rejeita um token que não existe | Link forjado ou copiado errado. |
| Rejeita um token expirado | Janela de 30 minutos expirada — token não pode mais ser usado. |
| Rejeita um token que já foi usado (uso único) | Um link de redefinição só pode ser usado uma vez, mesmo que ainda esteja dentro da validade. |
| Um token usado com sucesso não pode ser reaproveitado numa segunda tentativa | Fecha o ciclo completo do teste anterior: usa o token de verdade, confirma que funcionou, e tenta de novo — garantindo que a senha da primeira tentativa não é sobrescrita por uma segunda tentativa maliciosa/acidental. |
| Rejeita quando nenhum token é informado | Requisição malformada (sem o parâmetro `token`) não deve derrubar o servidor, só retornar erro de autorização. |
| Não altera a senha de outro usuário quando o token pertence a outra conta | Garante que o token de redefinição está corretamente amarrado a um único `usuarioId` — nenhuma "vizinhança" entre contas. |

---

## RF04 — Alterar Senha (fluxo básico, usuário autenticado)

### `tests/unit/useCases/auth/AlterarSenhaUseCase.test.js`

Diferente do RF04-A1 (link de e-mail, sem sessão), este é o fluxo em que o próprio usuário já logado troca a senha pelo menu do sistema, confirmando a senha atual.

| Teste | Propósito |
| --- | --- |
| Altera a senha com sucesso quando a senha atual está correta | Caso feliz do fluxo básico. |
| Registra `ALTERACAO_SENHA` no log de auditoria identificando o usuário | RNF09 — a pós-condição do RF04 exige usuário, data e hora registrados. |
| Rejeita quando a senha atual informada está incorreta (exceção E1) | Confirma a identidade antes de trocar a senha — e que a senha antiga **permanece intacta** quando essa checagem falha. |
| Rejeita nova senha com menos de 8 caracteres | Mesma regra mínima de segurança usada no cadastro e na redefinição via link. |
| Rejeita quando a nova senha e a confirmação não coincidem (exceção E2) | Mesma checagem de formulário de duas etapas do RF04-A1. |
| Lança `NotFoundError` quando o usuário não existe | Proteção defensiva — o `usuarioId` vem do JWT autenticado, mas o Use Case não assume isso sem checar. |
| Não altera a senha de outro usuário | Garante que a troca está corretamente amarrada ao `usuarioId` de quem fez a requisição, não a qualquer usuário do sistema. |

---

## RF05 — Manter Usuário

O administrador cria, lista, edita, desativa e reativa contas de Técnico/Vendedor da própria instância. O campo Perfil desta tela sempre trabalha com o domínio de valores do Quadro 19 do DERS (Técnico/Vendedor) — nunca cria/reatribui um Administrador.

### `tests/unit/useCases/usuario/CriarUsuarioUseCase.test.js`

Fluxo básico (Criação).

| Teste | Propósito |
| --- | --- |
| Cria um usuário Técnico com sucesso | Caso feliz. |
| Cria um usuário Vendedor com sucesso | Confirma que os dois perfis do domínio de valores funcionam. |
| A senha é armazenada como hash, nunca em texto puro | Mesma garantia do `CriarEmpresaUseCase`, agora para usuários criados via RF05. |
| Rejeita perfil Administrador | O domínio de valores do Quadro 19 só cobre Técnico/Vendedor — esta tela nunca cria outro Administrador. |
| Rejeita perfil inexistente/inválido | Ex.: `"GERENTE"` — valor fora do enum. |
| Rejeita quando nenhum perfil é informado | Campo obrigatório. |
| Rejeita nome em branco / login em branco | Mesma validação de campos obrigatórios do restante do sistema. |
| Rejeita e-mail em formato inválido (exceção E1) | Reaplica o validador de e-mail já usado no RF01. |
| Rejeita senha com menos de 8 caracteres | Mesma regra mínima de segurança do cadastro da empresa. |
| Aceita senha com exatamente 8 caracteres (limite) | Confirma que o limite é `>= 8`, não `> 8`. |
| Acumula todos os erros de campo simultaneamente | Confirma que o formulário pode destacar todos os campos inválidos de uma vez, não só o primeiro. |
| Lança `ConflictError` quando o login já está em uso | Login é único globalmente no sistema (mesma regra do RF01). |
| Normaliza espaços e caixa do e-mail | Mesma normalização usada em todo o sistema. |
| Registra `CRIACAO_USUARIO` no log de auditoria | RNF09 — identifica o administrador que criou a conta e os dados criados. |
| O novo usuário fica vinculado à empresa do administrador que o criou | Garante o isolamento multi-tenant desde a criação. |

### `tests/unit/useCases/usuario/ListarUsuariosUseCase.test.js`

Parte de consulta do fluxo alternativo A1 — tela "Manter Usuários".

| Teste | Propósito |
| --- | --- |
| Lista todos os usuários da empresa informada | Caso feliz. |
| Não retorna usuários de outras empresas | Isolamento multi-tenant — um administrador nunca vê usuários de outra instância. |
| Inclui usuários de qualquer perfil, inclusive Administrador | A tela mostra todos os usuários, já que a regra E2 (não desativar o único admin) pressupõe que administradores também aparecem/podem ser acionados aqui. |
| Inclui usuários ativos e inativos | A listagem não filtra por status — o administrador precisa ver e poder reativar contas inativas. |
| Retorna lista vazia quando a empresa não tem usuários | Caso de borda, não deve lançar erro. |

### `tests/unit/useCases/usuario/AtualizarUsuarioUseCase.test.js`

Parte de edição do fluxo alternativo A1 — modal "Editar Usuário".

| Teste | Propósito |
| --- | --- |
| Atualiza nome, login, e-mail e perfil com sucesso | Caso feliz com todos os campos editáveis de uma vez. |
| Permite atualizar apenas um campo, mantendo os demais | Atualização parcial (PATCH-like), igual ao `AtualizarEmpresaUseCase`. |
| Lança `NotFoundError` quando o usuário não existe / pertence a outra empresa | Mesma proteção multi-tenant usada nos demais Use Cases. |
| Rejeita nome/login em branco, e-mail inválido (E1), perfil fora do domínio de valores | Reaplica as mesmas validações da criação, agora na edição. |
| Lança `ConflictError` ao trocar para um login já usado por outro usuário | Preserva a unicidade global do login. |
| Permite salvar mantendo o mesmo login | Confirma que a checagem de conflito não dispara contra o próprio usuário sendo editado. |
| Quando nenhum campo é informado, não altera nada e não quebra | Caso de borda: edição vazia é inofensiva. |
| Registra `EDICAO_USUARIO` no log de auditoria com anterior/novo apenas dos campos alterados | RNF09, replicando o mesmo padrão do `AtualizarEmpresaUseCase` (inclusive a captura do "antes" **antes** de chamar o repositório, para não depender de o repositório devolver uma instância nova a cada consulta). |
| O log de auditoria registra anterior/novo de todos os campos alterados simultaneamente | Garante a captura correta mesmo quando múltiplos campos mudam juntos. |
| Normaliza espaços e caixa do e-mail | Mesma normalização usada em todo o sistema. |

### `tests/unit/useCases/usuario/DesativarUsuarioUseCase.test.js`

Fluxo alternativo A2 — desativação de um usuário.

| Teste | Propósito |
| --- | --- |
| Desativa um usuário Técnico/Vendedor com sucesso, sem apagar dados | Confirma que é reversível (soft state), igual à desativação de empresa do RF01. |
| Lança `NotFoundError` quando o usuário não existe / pertence a outra empresa | Mesma proteção multi-tenant. |
| Lança `ConflictError` quando o usuário já está inativo | Evita desativar duas vezes. |
| Fluxo de exceção E2: bloqueia desativar o único administrador ativo da instância | Regra central deste Use Case — usa `contarAdministradoresAtivos` para impedir que a instância fique sem nenhum administrador. |
| Permite desativar um administrador quando existe outro administrador ativo | Confirma que a checagem E2 é sobre a contagem, não uma proibição geral de desativar administradores. |
| A checagem E2 não se aplica a Técnico/Vendedor | Só administradores entram nessa regra especial. |
| Registra `ATIVAR_DESATIVAR_USUARIO` no log de auditoria | RNF09, com `statusAnterior`/`statusNovo`. |

### `tests/unit/useCases/usuario/ReativarUsuarioUseCase.test.js`

Fluxo alternativo A3 — reativação de um usuário previamente desativado.

| Teste | Propósito |
| --- | --- |
| Reativa um usuário inativo com sucesso | Caso feliz. |
| Lança `NotFoundError` quando o usuário não existe / pertence a outra empresa | Mesma proteção multi-tenant. |
| Lança `ConflictError` quando o usuário já está ativo | Evita reativar duas vezes. |
| Reativar não exige a checagem E2 | A regra do único administrador ativo é exclusiva da desativação — reativar nunca reduz a contagem de administradores ativos. |
| Registra `ATIVAR_DESATIVAR_USUARIO` no log de auditoria | RNF09, com `statusAnterior`/`statusNovo` invertidos em relação à desativação. |

---

## RF06 — Importar Catálogo

### `tests/unit/useCases/catalogo/ImportarCatalogoUseCase.test.js`

Fluxo básico + A1 (marca/modelo opcionais) + E1 (formato inválido).

| Teste | Propósito |
| --- | --- |
| Importa um PDF válido com sucesso, registrado como PENDENTE_EXTRACAO | Caso feliz. |
| Salva o conteúdo do arquivo através do FileStorageService | Confirma que o Use Case delega a persistência do binário ao serviço de storage (Local em dev, Supabase em produção), sem se importar com qual implementação está por trás. |
| Rejeita quando nenhum arquivo é enviado | Campo obrigatório (Quadro 20 do DERS). |
| Rejeita formato diferente de PDF (fluxo de exceção E1) | RNF06 — só PDF é aceito. |
| A mensagem de erro do E1 é a especificada no DERS | Confirma a mensagem exata ("O sistema aceita exclusivamente arquivos em formato PDF"), não uma genérica. |
| Rejeita arquivo maior que 50MB | Limite documentado no protótipo da tela de importação. |
| Aceita marca e modelo opcionais (fluxo alternativo A1) e retorna trimados | Confirma a normalização de espaços nos campos auxiliares. |
| Retorna marcaSugerida/modeloSugerido como null quando não informados | Caso de borda — não quebra quando os campos opcionais ficam vazios. |
| Registra UPLOAD_VISTA_EXPLODIDA no log de auditoria | RNF09. |
| O catálogo criado fica vinculado à empresa de quem fez o upload (RNF11) | Confirma que `empresaId` é persistido no Catalogo — base do isolamento multi-tenant corrigido antes do RF09 (ver CONTEXTO.md, decisão #19). |

## RF07 — Extração Multimodal via IA

### `tests/unit/useCases/catalogo/ExtrairDadosCatalogoUseCase.test.js`

Fluxo básico + A1 (extração parcial) + E1 (falha na Gemini API) + E2 (documento ilegível) + guarda-corpo de domínio (decisão #26 no CONTEXTO.md, fora do texto do DERS).

| Teste | Propósito |
| --- | --- |
| Extração completa: marca/modelo/tensão e peças persistidos, status PENDENTE_VALIDACAO | Caso feliz — documento totalmente compreendido, pronto para a validação humana (RF08). |
| Passa marcaSugerida/modeloSugerido (RF06-A1) para o ExtractionService | Confirma que o contexto auxiliar do upload realmente chega até o prompt da IA. |
| Lança NotFoundError quando o catálogo não existe | Proteção defensiva (ex.: retry com um id inválido). |
| Fluxo de exceção E1: falha de comunicação lança ServiceUnavailableError e não altera o catálogo | O catálogo permanece em PENDENTE_EXTRACAO para permitir nova tentativa (`POST /catalogos/:id/extrair`), sem exigir novo upload. |
| Fluxo alternativo A1: extração parcial (modelo ausente) fica IRRESOLUVEL com camposAusentes | Confirma que campos obrigatórios faltantes são listados individualmente, não só um "falhou" genérico. |
| Fluxo de exceção E2: nada identificável fica IRRESOLUVEL sem criar peças | Documento ilegível/sem padrão técnico — nenhuma Peça é criada (não há VersaoTensao pra vincular), e os 3 campos aparecem em camposAusentes. |
| Guarda-corpo de domínio: rejeita e exclui o catálogo quando o documento é compreendido mas não é do domínio suportado | Ex.: uma peça automotiva bem escaneada — a IA entende do que se trata, mas `dominioReconhecido: false` bloqueia a importação por completo (catálogo excluído, `EXCLUSAO_REGISTRO` no log, `ValidationError`), sem passar pela fila de pendentes. |
| Guarda-corpo de domínio: documento ilegível (não compreendido) NÃO é rejeitado como fora do domínio — cai no fluxo E2 normal | Confirma que a checagem de domínio só é aplicada quando o documento foi de fato compreendido — um documento apenas malformado continua recebendo o benefício da dúvida do E2 (IRRESOLUVEL, preenchimento manual). |
| Registra EXTRACAO_IA no log de auditoria, sem o texto bruto extraído | RNF09 — só metadados agregados (contagem de peças, confiança geral) vão para o log, nunca o conteúdo extraído do documento. |
| Duas extrações da mesma marca/modelo/tensão, na mesma empresa, reaproveitam a mesma VersaoTensao (find-or-create) | Confirma que o find-or-create funciona normalmente *dentro* de uma mesma instância: duas importações da mesma empresa não duplicam Marca/Ferramenta/VersaoTensao. |
| RNF11: lança NotFoundError quando o catálogo pertence a outra empresa | Mesmo padrão de isolamento multi-tenant do RF05 — reprocessar um catálogo de outra instância deve falhar como se ele não existisse. |
| RNF11: duas empresas com marca/modelo/tensão idênticos NÃO reaproveitam Marca/Ferramenta/VersaoTensao entre si | O oposto do teste de reaproveitamento acima — confirma a correção da decisão #12 (catálogo compartilhado) feita antes do RF09: cada empresa tem sua própria cadeia relacional, mesmo para o mesmo fabricante/modelo. |
| Teste de recuperação: depois de uma falha E1, uma nova tentativa bem-sucedida não deixa resíduo (peças duplicadas) do estado anterior | Confirma que o "tentar de novo" do usuário após uma falha de comunicação é seguro — a tentativa que falhou não persiste nada, então a tentativa seguinte não duplica peças. |

## RF08 — Interface de Validação (HITL)

### `tests/unit/useCases/catalogo/ValidarCatalogoUseCase.test.js`

Fluxo básico ("Validar e Salvar") + A1 (edição) + E1 (campos obrigatórios vazios).

| Teste | Propósito |
| --- | --- |
| Valida e salva com sucesso, marcando o catálogo como VALIDADO | Caso feliz. |
| Fluxo alternativo A1: aplica edições do validador aos campos | Confirma que a correção humana (modelo, descrição da peça...) prevalece sobre o valor original da IA. |
| Permite adicionar uma peça nova (sem id) além das já extraídas | Cobre o caso em que a IA não identificou todas as peças e o validador completa manualmente. |
| Lança NotFoundError quando o catálogo não existe | Proteção defensiva. |
| RNF11: lança NotFoundError quando o catálogo pertence a outra empresa | Mesmo padrão de isolamento multi-tenant do RF05 — validar um catálogo de outra instância deve falhar como se ele não existisse. |
| Fluxo de exceção E1: rejeita quando marca está vazia / tensão não é selecionada / nenhuma peça é informada / uma peça está sem código | Reaplica, na validação humana, as mesmas obrigatoriedades de campo do Quadro 23 do DERS. |
| RN04: rejeita quando uma peça está sem posição visual | Código e posição visual são um binômio obrigatório — um sem o outro é considerado informação tecnicamente incompleta. Corrigido junto com o ciclo do RF09 (ver CONTEXTO.md, decisão #20). |
| Registra VALIDACAO_HITL no log de auditoria | RNF09. |
| Cria um registro em Validacao identificando o usuário responsável | Pós-condição explícita do RF08 (distinto do LogAuditoria — Validacao é o registro formal da confirmação). |
| Gera embeddings para cada peça validada | RNF04 — prepara a base para a busca semântica do futuro RF12. |
| Uma falha ao gerar embedding não impede a validação de ser concluída com sucesso | O embedding é best-effort: a persistência dos dados validados (a pós-condição que realmente importa ao usuário) não pode depender de um serviço de IA secundário funcionar. |

---

## RF09 — Manter Catálogo

### `tests/unit/useCases/catalogo/ListarPecasUseCase.test.js`

Fluxo alternativo A2 (Consulta de registros).

| Teste | Propósito |
| --- | --- |
| Lista peças de catálogos VALIDADO da empresa | Caso feliz. |
| Não lista peças de catálogos ainda não validados (PENDENTE_VALIDACAO/IRRESOLUVEL) | Confirma o recorte de escopo decidido com o usuário: só catálogos validados aparecem no RF09 — o "documento não validado" é escopo do RF10 (fila de pendentes). |
| RNF11: não lista peças validadas de outra empresa | Isolamento multi-tenant, mesmo padrão do RF05/RF06-08. |
| Filtra por marca, modelo e código | Cobre os três filtros do protótipo da tela (que diverge do texto do DERS — ver decisão #21 no CONTEXTO.md). |

### `tests/unit/useCases/catalogo/BuscarCatalogoParaEdicaoUseCase.test.js`

Carregamento da tela de edição (parte inicial do fluxo alternativo A3).

| Teste | Propósito |
| --- | --- |
| Retorna o catálogo VALIDADO com marca/modelo/tensão/peças | Caso feliz. |
| Lança NotFoundError quando o catálogo não existe | Proteção defensiva. |
| Lança NotFoundError quando o catálogo ainda não foi validado | Reforça o mesmo recorte de escopo do `ListarPecasUseCase` — RF09 não edita catálogos pendentes/irresolúveis. |
| RNF11: lança NotFoundError quando o catálogo pertence a outra empresa | Isolamento multi-tenant. |

### `tests/unit/useCases/catalogo/AtualizarCatalogoUseCase.test.js`

Fluxo alternativo A3 (Atualização de registro).

| Teste | Propósito |
| --- | --- |
| Aplica edições aos campos e mantém o catálogo VALIDADO | Caso feliz. |
| Permite adicionar uma peça nova | O ator pode completar peças que não vieram na extração original. |
| Permite remover uma peça existente (ela não é mais retornada nem listada) | Confirma a exclusão por diferença: peças que saem da lista enviada pelo ator são apagadas do banco, não só ignoradas. |
| Lança NotFoundError quando o catálogo não existe | Proteção defensiva. |
| RNF11: lança NotFoundError quando o catálogo pertence a outra empresa | Isolamento multi-tenant. |
| Rejeita quando marca está vazia | Reaplica a mesma validação de campos obrigatórios do RF08. |
| RN04: rejeita quando uma peça está sem posição visual | Mesma regra do binômio código+posição aplicada na edição. |
| Registra EDICAO_REGISTRO no log de auditoria com anterior/novo | RNF09, mesmo padrão do AtualizarEmpresaUseCase/AtualizarUsuarioUseCase (captura o "antes" antes de chamar o repositório). |
| Só reprocessa o embedding de peças novas ou cujo texto mudou | Otimização de custo: evita gastar chamadas à Gemini API em peças que o ator não tocou nesta edição. |
| Uma falha ao reprocessar embedding não impede a atualização de ser concluída | Best-effort, mesmo espírito do RF08. |

### `tests/unit/useCases/catalogo/ExcluirPecaUseCase.test.js`

Fluxo alternativo A4 (Exclusão de registro).

| Teste | Propósito |
| --- | --- |
| Exclui a peça com sucesso | Caso feliz. |
| Remove também o embedding associado (mesma linha) | Confirma que excluir a peça remove o embedding junto — não sobra um vetor órfão no pgvector. |
| Lança NotFoundError quando a peça não existe | Proteção defensiva. |
| RNF11: lança NotFoundError quando a peça pertence a outra empresa | Isolamento multi-tenant, agora na granularidade de peça (não de catálogo). |
| Registra EXCLUSAO_REGISTRO no log de auditoria | RNF09. |

### `tests/unit/useCases/catalogo/BaixarArquivoCatalogoUseCase.test.js`

Reexibição do documento original na tela de edição (RNF01).

| Teste | Propósito |
| --- | --- |
| Retorna o buffer e o nome do arquivo do catálogo | Caso feliz. |
| Lança NotFoundError quando o catálogo não existe | Proteção defensiva. |
| RNF11: lança NotFoundError quando o catálogo pertence a outra empresa | Isolamento multi-tenant. |

---

## RF10 — Manter Documentos Pendentes

### `tests/unit/useCases/catalogo/ListarDocumentosPendentesUseCase.test.js`

Fluxo básico (fila de pendentes).

| Teste | Propósito |
| --- | --- |
| Lista documentos IRRESOLUVEL da empresa, mais recentes primeiro | Caso feliz. |
| Classifica como PENDENTE quando ao menos um campo do documento foi identificado | Confirma o rótulo de apresentação derivado (ver decisão #22 no CONTEXTO.md) — não é um status novo no schema. |
| Classifica como IRRESOLUVEL quando nada do documento foi identificado | Mesmo cálculo, caso mais severo (documento ilegível, E2 do RF07). |
| Não lista catálogos PENDENTE_VALIDACAO nem VALIDADO | Reforça a pré-condição do próprio DERS: só documentos encaminhados por extração incompleta/malsucedida entram nesta fila. |
| RNF11: não lista documentos pendentes de outra empresa | Isolamento multi-tenant, mesmo padrão dos demais Use Cases de catálogo. |

### `tests/unit/useCases/catalogo/BuscarDocumentoPendenteUseCase.test.js`

Carregamento de um documento pendente para a tela de preenchimento (fluxo alternativo A1).

| Teste | Propósito |
| --- | --- |
| Retorna o documento IRRESOLUVEL com motivoPendencia e camposAusentes | Caso feliz — mesmo formato de retorno usado pelo RF07/RF08, pra a tela de validação poder ser reaproveitada sem adaptação. |
| Lança NotFoundError quando o catálogo não existe | Proteção defensiva. |
| Lança NotFoundError quando o catálogo já foi validado | Este endpoint é específico para documentos ainda IRRESOLUVEL — um catálogo já VALIDADO pertence ao RF09, não ao RF10. |
| RNF11: lança NotFoundError quando o catálogo pertence a outra empresa | Isolamento multi-tenant. |

### `tests/unit/useCases/catalogo/ExcluirCatalogoUseCase.test.js`

Fluxo alternativo A3 (Exclusão do documento).

| Teste | Propósito |
| --- | --- |
| Exclui o catálogo IRRESOLUVEL da fila de pendentes | Caso feliz. |
| Exclui também as peças que a extração parcial tenha chegado a gravar | Robustez: mesmo que hoje a extração real nunca persista peças de um catálogo IRRESOLUVEL (versaoTensaoId exige os 3 campos do documento), a exclusão limpa qualquer peça remanescente antes de apagar o Catalogo, evitando erro de constraint. |
| Lança NotFoundError quando o catálogo não existe | Proteção defensiva. |
| Lança NotFoundError quando o catálogo já foi validado (fora do escopo do RF10) | Um catálogo VALIDADO se exclui pela granularidade de peça do RF09, não por aqui. |
| RNF11: lança NotFoundError quando o catálogo pertence a outra empresa | Isolamento multi-tenant. |
| Registra EXCLUSAO_REGISTRO no log de auditoria | RNF09. |

> **Nota:** RF10/A2 ("Reenviar para IA") e a persistência do RF10/A1 ("Preencher") não têm Use Case próprio — reaproveitam, respectivamente, `ExtrairDadosCatalogoUseCase` (já testado na seção do RF07 acima) e `ValidarCatalogoUseCase` (já testado na seção do RF08 acima). Não há duplicação de teste para eles aqui.

---

## RF11 — Consulta de Componentes

### `tests/unit/useCases/consulta/BuscarComponentesUseCase.test.js`

Fluxo básico + A2 (busca sem filtros) + E1 (nenhum resultado) + E2 (base sem registros validados).

| Teste | Propósito |
| --- | --- |
| Fluxo básico: retorna correspondência exata pelo código | Caso feliz — busca por um código conhecido. |
| Fluxo básico: os dois motores sempre rodam juntos — busca por descrição também aciona a busca semântica | Confirma a decisão #23 (CONTEXTO.md): o `embeddingService` é sempre chamado, independente do `modo` escolhido pelo ator. |
| Não duplica um resultado que bate tanto na busca exata quanto na semântica | O merge por id evita mostrar a mesma peça duas vezes na tabela quando ambos os motores encontram o mesmo registro. |
| A2: busca sem filtros de marca/tensão percorre todos os registros da empresa | Confirma que marca/tensão são realmente opcionais. |
| Filtra por marca e tensão quando informados | Cobre os dois filtros do Quadro 26 do DERS. |
| Exceção E1: nenhum resultado encontrado para o termo, mas a base não está vazia | Distingue de E2 — aqui `semRegistrosNaBase` é `false`, só a lista de resultados vem vazia. |
| Exceção E2: nenhum registro validado na base da empresa | `semRegistrosNaBase: true` — checado antes de gerar qualquer embedding (evita gasto de API numa busca sem chance de retornar algo). |
| Rejeita busca sem termo | Quadro 26 — termo de busca é obrigatório. |
| RNF11: não retorna componentes validados de outra empresa | Isolamento multi-tenant, mesmo padrão dos demais Use Cases de catálogo. |
| RNF11: base vazia numa empresa não é afetada por registros validados de outra | Reforça que a checagem E2 também é escopada por empresa. |
| Modo `codigo_exato` prioriza correspondências exatas na ordenação | Cobre a interpretação do toggle do protótipo confirmada com o usuário (decisão #23). |
| Modo `semantica` (padrão) ordena pela relevância semântica | Idem, pro outro modo — ordena por distância vetorial ascendente. |
| Uma falha ao gerar o embedding não impede a busca — cai para só correspondência exata (best-effort) | A busca semântica depende da Gemini API; uma falha nela não pode derrubar a busca inteira, já que a correspondência exata não depende de IA. |

> **Nota:** o RF11/A1 ("Ver Vista Explodida") não tem Use Case próprio — reaproveita `BaixarArquivoCatalogoUseCase`, já testado na seção do RF09 acima.

---

## RF12 — Consulta Técnica via RAG

### `tests/unit/useCases/consulta/ConsultarViaRagUseCase.test.js`

Fluxo básico + E1 (contexto insuficiente) + E2 (falha de comunicação com a Gemini API) + E3 (pergunta sem contexto identificável).

| Teste | Propósito |
| --- | --- |
| Fluxo básico: retorna resposta fundamentada com fonte citada | Caso feliz — recupera contexto por similaridade semântica (reaproveitando o método do RF11) e devolve a resposta gerada pelo Agente de Consulta, com marca/modelo/tensão/código/catalogoId/validadoEm da peça citada. |
| Rejeita pergunta vazia | Campo obrigatório (Quadro 28 do DERS). |
| Exceção E1 (pré-condição 4.2): nenhum registro validado na empresa — nem chama a Gemini | Otimização de custo, mesmo espírito da checagem E2 do RF11: evita gastar chamadas de IA numa consulta que já sabemos não vai ter contexto algum. |
| Exceção E1: Agente de Consulta classifica o contexto recuperado como insuficiente | Existe alguma peça relacionada ao assunto, mas não o bastante pra responder com confiança — classificação delegada ao próprio Gemini (decisão #24 no CONTEXTO.md). |
| Exceção E3: Agente de Consulta classifica a pergunta como sem contexto relevante | A pergunta não tem relação perceptível com nenhuma peça do contexto recuperado — também delegado ao Gemini. |
| Exceção E3 (defensiva): existe registro validado mas nenhum tem embedding — não chega a chamar o Agente de Consulta | Caso de borda que não deveria ocorrer em uso normal (RF08 gera embeddings ao validar), coberto por segurança. |
| Exceção E2: falha ao gerar o embedding da pergunta vira `ServiceUnavailableError` | Cobre o primeiro ponto de contato com a Gemini API (recuperação de contexto). |
| Exceção E2: falha na geração da resposta (Agente de Consulta) vira `ServiceUnavailableError` | Cobre o segundo ponto de contato (geração) — o DERS descreve E2 só "no passo 6", mas a mesma resposta cobre qualquer falha de IA (ver decisão #24). |
| Ignora um `pecaCitadaId` que não veio no contexto enviado e usa a peça mais relevante como fallback | Defesa contra o Agente de Consulta citar um id que não fazia parte do contexto desta requisição — nunca confia cegamente no que a IA devolve. |
| RNF11: base sem registros validados de uma empresa não é afetada por registros de outra | Isolamento multi-tenant, mesmo padrão dos demais Use Cases de consulta/catálogo. |

> **Nota:** o RF12 reaproveita `ComponenteRepository.buscarPorSimilaridadeSemantica` (mesmo método do RF11) pra recuperar o contexto — não há um teste de repositório separado; a cobertura do método em si já está na seção do RF11 acima. O campo novo `validadoEm` devolvido por esse método é exercitado pelos testes desta seção.

---

## RF13 — Manter Log Sistema (ADM)

### `tests/unit/useCases/log/ConsultarLogAuditoriaUseCase.test.js`

Fluxo básico + E1 (nenhum registro encontrado). A exceção E2 (acesso não autorizado) não tem teste próprio aqui — é coberta genericamente pelo `exigirAdministrador` já existente desde o RF09 (RNF07), sem nenhum código novo no RF13 (ver "O que ainda não está coberto" abaixo).

| Teste | Propósito |
| --- | --- |
| Retorna os registros da empresa, com o nome do usuário responsável resolvido | Caso feliz — confirma o merge entre o log "cru" (`usuarioId`) e a lista de usuários da empresa (`usuarioRepository.listarPorEmpresa`), igual ao protótipo (coluna "Usuário"). |
| Registros com usuarioId nulo (ex.: CRIACAO_EMPRESA) aparecem como "sistema" | Mesmo rótulo usado no protótipo pra logs registrados antes de existir qualquer sessão. |
| RNF11: nunca retorna registros de outra empresa | Isolamento multi-tenant — mesmo padrão dos demais Use Cases de consulta. |
| Filtra por usuário | Cobre o filtro "Usuário" do Quadro 30 do DERS. |
| Filtra por tipo de ação | Cobre o filtro "Tipo de Ação", usando o enum completo `TipoAcao` (ver decisão #28 no CONTEXTO.md). |
| Filtra por intervalo de datas (inclusive, dia inteiro) | Confirma que "Data Inicial"/"Data Final" (campos de data, sem hora) cobrem o dia inteiro (00:00:00 até 23:59:59.999), não só o instante exato informado. |
| Fluxo de exceção E1: nenhum registro encontrado retorna lista vazia (sem lançar erro) | O frontend decide a mensagem "nenhum registro encontrado" a partir de uma lista vazia — o Use Case nunca trata isso como erro. |
| Rejeita data inicial inválida / rejeita data final inválida | Quadro 30 — quando informadas, as datas precisam ser válidas (`ValidationError`, `fieldErrors`). |
| Retorna os registros ordenados do mais antigo para o mais recente | Confirma a ordenação usada no protótipo (`ORDER BY realizadoEm ASC`). |
| Registro cujo usuarioId não pertence mais à lista de usuários da empresa aparece como "Usuário removido" | Caso defensivo — na prática não deveria ocorrer (usuários são desativados, nunca excluídos), mas o Use Case não quebra se acontecer. |

> **Nota:** o RF13 não tem uma tela/endpoint de escrita — é só consulta, então não há nada a testar além da lógica de filtragem/enriquecimento acima. A exceção E2 (Técnico/Vendedor tentando acessar diretamente) é responsabilidade do middleware `exigirAdministrador`, reaproveitado sem alteração desde a decisão #20 (RF09) — ver "O que ainda não está coberto".

---

## Testes E2E (Playwright) — jornadas ponta a ponta

> **Status: implementado, pendente de verificação** (ver decisão #44 em `CONTEXTO.md`) — nenhuma execução real foi feita ainda; o sandbox de execução deste agente ficou indisponível nesta sessão. Diferente de tudo mais neste documento (que roda em memória, sem servidor/navegador reais), estes testes ficam fora de `backend/`/`frontend/`, num workspace próprio (`e2e/`), e rodam contra os servidores de **desenvolvimento local de verdade** (`npm run dev:backend`/`dev:frontend`), dirigindo um Chromium real via Playwright — a única forma de testar o sistema como o usuário realmente vive (navegação, formulários, upload de arquivo real, nova aba do navegador), coisa que nenhuma das camadas de teste acima cobre. Passo a passo completo (instalação, seed, como rodar) em `e2e/README.md`.

| Arquivo | Jornada | Observações |
|---|---|---|
| `e2e/tests/01-cadastro-login-logout.spec.js` | Cadastro de empresa → login → logout | Autocontida — cria empresa própria (CNPJ gerado a cada execução) |
| `e2e/tests/02-importar-validar-catalogo.spec.js` | Importar catálogo (PDF real) → extração (RF07) → validação HITL (RF08) → aparece em Manter Catálogo (RF09) | Autocontida; chama a Gemini API de verdade — asserção verifica que o fluxo chega ao fim, não os valores exatos extraídos (isso é papel do teste de acurácia da IA, RNF10) |
| `e2e/tests/03-recuperar-redefinir-senha.spec.js` | Esqueci a senha → e-mail chega → redefinição → login com senha nova | Usa o administrador semeado (`backend/prisma/seed-e2e.js`); lê o link de redefinição em `backend/dev-server.log` (o `ConsoleEmailService` só imprime no console em dev — não há caixa de e-mail de teste real neste projeto) |
| `e2e/tests/04-consultar-componentes.spec.js` | Consultar Componentes (RF11) — busca exata, busca semântica, vista explodida | Usa a peça semeada por `seed-e2e.js` |
| `e2e/tests/05-consulta-tecnica-ia.spec.js` | Consulta Técnica IA (RF12) — pergunta → resposta com fonte citada | Usa a peça semeada; chama a Gemini API de verdade (RAG) — asserção verifica a situação `RESPONDIDO` e a fonte citada, não o texto exato gerado |

**Seed (`backend/prisma/seed-e2e.js`):** popula direto no banco (sem passar pela UI) uma empresa + administrador de teste e um catálogo já `VALIDADO` com uma peça — necessário pras jornadas 4 e 5, que dependem de dados já validados existirem na base. Idempotente (apaga e recria a empresa de teste a cada execução). Faz uma única chamada real à Gemini API para gerar o embedding de verdade da peça — um vetor aleatório provavelmente faria a busca semântica/RAG não considerar a peça relevante, quebrando as duas jornadas que mais dependem desses agentes.

---

## Testes de API (HTTP) — supertest

> **52 testes, todos passando** (verificado via `npm test`, junto com o resto da suíte: 326 testes/41 suítes no total). **Diferente de todo o resto deste documento**, estes testes NÃO usam fakes injetados diretamente nos Use Cases — eles sobem o `app` Express de verdade (`backend/src/app.js`) e batem nas rotas via `supertest`, testando a camada HTTP que os testes unitários pulam por completo (rotas, middlewares, códigos de status, formato de resposta JSON). Como o composition root (`src/main/factories/index.js`) monta os repositórios/serviços concretos direto no `require`, `backend/tests/api/helpers/appDeTeste.js` usa `jest.doMock` pra trocar cada `PrismaXRepository`/`GeminiXService`/e-mail/storage pelo mesmo dublê usado nos testes unitários — `BcryptHashService`/`JwtTokenService` continuam reais, então login/JWT são testados de verdade. `jest.resetModules()` garante um `app` novo a cada teste (`beforeEach`), evitando que o estado em memória vaze de um teste para o outro.

### `tests/api/authRoutes.test.js` — RF02/RF03/RF04

Login retorna um JWT de verdade (3 segmentos) + 200; credenciais erradas (login inexistente ou senha errada) retornam 401 com mensagem genérica (RNF05); logout invalida o token — a mesma sessão não funciona mais numa rota protegida depois; recuperar-senha sempre responde 200 (RNF05), mas só envia e-mail (via `FakeEmailService`, inspecionável em `factories.emailService.enviados`) quando login+e-mail conferem; redefinir-senha com o token do link funciona e a senha antiga para de valer; alterar-senha com a senha atual errada não muda nada (login com a senha original continua funcionando).

### `tests/api/empresaRoutes.test.js` — RF01

Cadastro público funciona sem nenhum token e retorna 201; dados incompletos retornam 422 com o formato `{ erro, campos }`; CNPJ/CPF já cadastrado retorna 409; `GET`/`PUT /empresas/me` exigem token; desativar a empresa bloqueia o login de todos os usuários dela.

### `tests/api/usuarioRoutes.test.js` — RF05

Perfil Técnico/Vendedor recebe 403 em `POST`/`GET /usuarios` — testado pela rota HTTP de verdade (`authMiddleware` + `exigirAdministrador` reais), não só pela lógica do Use Case. Fluxo completo criar → listar → desativar → reativar via HTTP, confirmando que desativar bloqueia login e reativar libera de novo.

### `tests/api/catalogoRoutes.test.js` — RF06/RF07/RF08/RF09/RF10

Upload multipart via `.attach()` com um PDF de verdade extrai os dados (usando `factories.extractionService.proximaResposta` pra controlar a resposta simulada da IA) e retorna 201; arquivo que não é PDF e requisição sem nenhum arquivo retornam 422; `GET /catalogos/pendentes` não é capturada pela rota dinâmica `/catalogos/:id` (confirma a ordenação de rotas do Express registrada no arquivo de rotas); validação HITL via `PUT /catalogos/:id/validar`; RNF11 — catálogo de uma empresa retorna 404 com o token de outra.

### `tests/api/consultaRoutes.test.js` — RF11/RF12

Base sem nenhum registro validado retorna `semRegistrosNaBase: true` / `CONTEXTO_INSUFICIENTE`; busca exata e semântica combinadas sem duplicar o mesmo componente (usando `factories.componenteRepository.seedComponente` pra popular a base); filtro por marca via query string; termo/pergunta vazios retornam 422.

### `tests/api/logAuditoriaRoutes.test.js` — RF13

Perfil Técnico/Vendedor recebe 403; filtra por `tipoAcao` via query string; RNF11 — log de uma empresa não aparece na consulta de outra.

### `tests/api/middlewares.test.js`

CORS: o header `Access-Control-Allow-Origin` é sempre a URL fixa configurada em `FRONTEND_URL`, nunca reflete a origem da requisição recebida (é essa fixidez que faz o navegador de um site não autorizado bloquear a resposta do lado do cliente); rota inexistente retorna 404; `errorHandler` formata `DomainError` (só `{ erro }`) e `ValidationError` (`{ erro, campos }`) de forma diferente, no mesmo padrão JSON; `authMiddleware` bloqueia sem token/com token inválido e libera com token válido; `exigirAdministrador` bloqueia perfil sem permissão (403).

---

## Teste de recuperação (automatizável) — retry de transação

### `tests/unit/infra/transacaoComRetry.test.js`

Cobre `transacaoComRetry` (`backend/src/infra/database/repositories/PrismaCatalogoRepository.js`), a lógica de retentativa automática que corrigiu um bug real de produção nesta sessão (queda de conexão no meio de uma transação de escrita mais longa contra o Supabase, via pooler). É o primeiro item do `PLANO_TESTES_AVANCADOS.md` a sair do papel — usa um Prisma falso (`{ $transaction: jest.fn() }`) injetado diretamente na função, sem precisar de banco real.

| Teste | Propósito |
| --- | --- |
| Sucede na 3ª tentativa depois de 2 quedas de conexão (P2028 "transaction not found") | Confirma que o retry realmente funciona — nunca tinha sido testado automaticamente, só validado manualmente em produção. |
| Esgota as 3 tentativas e propaga o último erro se a queda de conexão persistir sempre | Garante que o retry não vira um loop infinito nem esconde uma falha real de banco. |
| NÃO tenta de novo quando o P2028 é de timeout (mensagem diferente de "transaction not found") | O timeout de transação (`{ timeout: 15000 }`) já tem tratamento próprio — não deve acionar o retry de queda de conexão, que assumiria erroneamente que vale a pena tentar de novo mais rápido. |
| NÃO tenta de novo para erros que não são de queda de conexão (ex.: P2002 de unicidade) | O retry é específico para o sintoma de conexão caindo — outros erros de banco (violação de constraint, etc.) devem propagar imediatamente. |
| Sucesso de primeira (sem nenhuma queda de conexão) não aciona nenhuma retentativa | Caso feliz — confirma que o retry não introduz overhead/comportamento estranho quando tudo funciona normalmente. |

---

## Testes de integração (cruzando requisitos)

Os testes unitários acima isolam **um** Use Case por vez, com todas as dependências dele controladas manualmente. Isso é rápido e preciso, mas não pega bugs que só aparecem quando vários Use Cases reais rodam em sequência, compartilhando o mesmo estado — foi exatamente assim que o bug do "login não bloqueado após empresa desativada" apareceria em produção. Os testes de integração cobrem esse tipo de cenário.

### `tests/integration/fluxoCadastroLoginDesativacao.test.js`

Cruza RF01 (cadastro/desativação) com RF02 (login/logout), usando os Use Cases reais (`CriarEmpresaUseCase`, `DesativarEmpresaUseCase`, `AutenticarUsuarioUseCase`, `LogoutUseCase`) sobre os mesmos repositórios fake.

| Teste | Propósito |
| --- | --- |
| O administrador consegue logar imediatamente após o cadastro da empresa | Confirma que a senha hasheada no `CriarEmpresaUseCase` é compatível com a comparação feita no `AutenticarUsuarioUseCase` — ou seja, que o cadastro realmente "prepara" uma conta utilizável. |
| Depois do logout, a sessão emitida no login fica marcada como revogada | Fecha o ciclo login → logout de ponta a ponta, usando o `jti` real emitido pelo login. |
| Depois de desativar a empresa, o administrador não consegue mais logar (RF01-A2) | O teste de regressão mais importante desta suíte: reproduz o cenário exato do bug encontrado (cadastra → loga com sucesso → desativa a empresa → tenta logar de novo → deve falhar), sem depender de estado seedado manualmente como nos testes unitários. |
| Desativar uma empresa não afeta o login de administradores de outra empresa | Garante que a checagem de "empresa desativada" está corretamente escopada por instância — multi-tenancy não vaza entre empresas diferentes. |

### `tests/integration/fluxoRecuperarRedefinirSenha.test.js`

Cruza RF02 (login) com RF03 (recuperar senha) e RF04 (redefinir senha).

| Teste | Propósito |
| --- | --- |
| Depois de redefinir a senha pelo link recebido, só a senha nova funciona no login | Simula o fluxo completo do usuário: login com a senha antiga funciona → pede recuperação → extrai o token do link "enviado" (via `FakeEmailService`) → redefine a senha → confirma que a senha antiga para de funcionar e a nova passa a funcionar. É o teste que mais se aproxima de "o usuário realmente conseguiria recuperar o acesso". |
| Um link de recuperação solicitado com e-mail errado não gera token nem permite redefinir nada | Confirma, no nível de integração, que a proteção contra dados inconsistentes (RNF05) realmente impede qualquer redefinição, não só que ela retorna a mensagem genérica. |

### `tests/integration/fluxoAlterarSenha.test.js`

Cruza RF01 (cadastro) + RF02 (login) + RF04 (alterar senha, autenticado).

| Teste | Propósito |
| --- | --- |
| Depois de alterar a senha, só a senha nova funciona no login | Fecha o ciclo cadastro → login → troca de senha pelo menu → login de novo, confirmando ponta a ponta que a senha hasheada pelo `AlterarSenhaUseCase` é a mesma que o `AutenticarUsuarioUseCase` compara depois. |
| Informar a senha atual errada não altera nada — o login com a senha original continua funcionando | Reforça, agora de ponta a ponta, que uma tentativa de troca de senha rejeitada (E1) não deixa o usuário sem acesso nem corrompe a senha existente. |

---

## O que ainda não está coberto

- Testes automatizados da camada HTTP (controllers/rotas/middlewares) e dos repositórios Prisma reais (esses exigiriam um banco de teste, hoje fora do escopo por rodarem só em memória) — inclui o log de `ACESSO_NAO_AUTORIZADO` do `authMiddleware`/`exigirAdministrador` (RNF07), que só é validável manualmente ou com um teste de integração HTTP real. Isso também cobre a exceção E2 do RF13 (Técnico/Vendedor tentando acessar `/log-auditoria` diretamente) — reaproveita o mesmo `exigirAdministrador`, sem nenhum teste específico novo.
- `PrismaLogAuditoriaRepository.consultar` (RF13 — filtros `WHERE`/`ORDER BY` reais contra a tabela `logs_auditoria`) só é exercitado pelo `FakeLogAuditoriaRepository` nos testes, mesma limitação já documentada para `PrismaComponenteRepository.buscarPorSimilaridadeSemantica`.
- Testes de frontend (React).
- Teste de integração cruzando RF05 com login/permissão de administrador (hoje o RF05 só tem cobertura unitária, seguindo o mesmo padrão de granularidade usado nos demais requisitos).
- Teste de integração cruzando RF06 → RF07 → RF08/RF10 → RF09 → RF11 → RF12 (importar → extrair → validar (ou cair em pendente e reprocessar/preencher) → editar/excluir → buscar → perguntar) usando os Use Cases reais em sequência, como já existe para outros requisitos — hoje cada um só tem cobertura unitária isolada.
- Verificação real da acurácia da Gemini API (RNF10, ≥75% nos catálogos de Bosch/Makita/DeWalt) — os testes automatizados usam um `FakeExtractionService` e nunca chamam a IA de verdade (ver aviso no topo deste documento). Essa verificação precisa ser manual, com uma chave de API configurada.
- Confiabilidade real do guarda-corpo de domínio (decisão #26) contra documentos "de fronteira" (ex.: uma ferramenta manual não-elétrica, uma ferramenta elétrica de bancada/estacionária em vez de portátil, um acessório sem ser a ferramenta em si) — os testes automatizados só confirmam que o `ExtrairDadosCatalogoUseCase` reage corretamente ao valor de `dominioReconhecido` devolvido pelo `FakeExtractionService`; o quão bem a Gemini API real classifica esses casos-limite só pode ser avaliado manualmente.
- `PrismaCatalogoRepository.atualizarEmbeddingPeca` e `PrismaComponenteRepository.buscarPorSimilaridadeSemantica` (SQL bruto para o pgvector, usado tanto pelo RF11 quanto pelo RF12) só são exercitados pelos fakes nos testes — o comportamento real do `$queryRaw`/`$executeRaw` contra o Postgres/pgvector não é coberto por teste automatizado. A `FakeComponenteRepository` usa distância euclidiana em vez da distância de cosseno (`<=>`) que o pgvector usa de verdade — suficiente pra testar ordenação/combinação, mas não é bit-a-bit idêntico ao comportamento em produção.
- `GeminiRAGService` (RF12 — geração de texto via Gemini `generateContent`, incluindo o `responseSchema` e a filtragem do `pecaCitadaId`) só é exercitado pelo `FakeRAGService` nos testes — o comportamento real da chamada à Gemini API (incluindo a qualidade da classificação RESPONDIDO/CONTEXTO_INSUFICIENTE/SEM_CONTEXTO_RELEVANTE) precisa ser verificado manualmente.
- Descoberta de catálogos PENDENTE_VALIDACAO esquecidos (extração completa, mas o ator saiu sem salvar na tela do RF08) — fora do escopo do RF10, que cobre só IRRESOLUVEL (pré-condição explícita do próprio DERS).

---

# SEÇÃO 5 — HISTORICO.md

# Histórico de desenvolvimento — Partify

> Registro cronológico do que foi feito em cada dia de trabalho no projeto. Complementa o `CONTEXTO.md` (estado atual consolidado) e o `TESTES.md` (cobertura de testes) — aqui o foco é *quando* e *em que ordem* cada coisa foi feita.

## 21/07/2026 (terça-feira)

- Extração e leitura completa do DERS (Documento de Especificação de Requisitos de Software) do Partify, para entendimento do projeto antes de qualquer código.
- Definição da arquitetura do projeto: monorepo (npm workspaces), backend em Node.js/Express, frontend em React/Vite, Clean Architecture (`Controllers -> Use Cases -> Domain -> Agentes de IA`), banco Postgres via Supabase com Prisma ORM.
- Scaffold completo do monorepo: estrutura de pastas, configuração do Express, configuração do Vite/React, README inicial.
- Implementação do **RF01 — Manter Empresa** (backend e frontend): cadastro público da empresa + administrador, consulta e edição dos dados, desativação da instância. Réplica das 3 telas do protótipo (Cadastrar Empresa, Dados da Empresa, Editar Dados da Empresa).
- Implementação do **RF02 — Realizar Login** (backend e frontend): login com JWT e logout com invalidação imediata de sessão (denylist por `jti`). Réplica da tela de login.
- Implementação do **RF03 — Recuperar Senha** (backend e frontend): solicitação de link de redefinição por login + e-mail, com proteção contra enumeração de contas (RNF05). Réplica da tela de recuperação.
- Implementação do **RF04 — fluxo alternativo A1 (Redefinir Senha via link)** (backend e frontend): destino do link do RF03, definição de nova senha sem sessão ativa. Réplica da tela de redefinição.
- Wiring completo da camada HTTP (controllers, rotas, middlewares) e do composition root (`main/factories`) para RF02/RF03/RF04-A1.
- Configuração do ambiente: criação do banco no Supabase, preenchimento das variáveis de ambiente (`.env`), e correção de erros de setup — comentários de bloco (`/** */`) inválidos no `schema.prisma`, reset do schema do banco para sincronizar com as migrations, geração do Prisma Client.
- Diagnóstico e explicação do `ConsoleEmailService` (e-mail de recuperação de senha "simulado" no console do backend quando `SMTP_HOST` não está configurado).
- Configuração da infraestrutura de testes automatizados (Jest) no backend.
- Implementação dos testes unitários de todos os Use Cases do RF01, RF02 e RF03/RF04-A1, e dos validadores de domínio (CPF/CNPJ, e-mail).
- Correção de um bug real apontado pelos testes: o `AtualizarEmpresaUseCase` calculava o valor "anterior" do log de auditoria depois de já ter sobrescrito o dado no repositório.
- Elaboração de testes adicionais: casos de borda (normalização de campos, fallback de expiração, empresa/usuário inexistente) e testes de integração cruzando requisitos (cadastro → login → desativação bloqueia login; recuperar → redefinir → login com a senha nova).
- Criação do `TESTES.md`, documentando o propósito de cada teste escrito até então.
- Implementação do **RF04 — fluxo básico (Alterar Senha)** (backend e frontend): troca de senha pelo próprio usuário autenticado, com confirmação da senha atual, acessível pelo menu do usuário (ícone 👤) no `TopBar`.
- Implementação dos testes unitários e de integração do RF04 (fluxo básico), e atualização do `TESTES.md` e do `README.md` com a nova rota e cobertura.
- Criação do `CONTEXTO.md`, documentando o estado completo do projeto (arquitetura, decisões, requisitos prontos, pendências) para continuidade em conversas futuras.
- Criação deste `HISTORICO.md`.
- Implementação do **RF05 — Manter Usuário** (backend): domínio (extensão de `UsuarioRepository` com `criar`/`listarPorEmpresa`/`atualizar`/`atualizarStatus`), 5 Use Cases (`CriarUsuarioUseCase`, `ListarUsuariosUseCase`, `AtualizarUsuarioUseCase`, `DesativarUsuarioUseCase`, `ReativarUsuarioUseCase`), `UsuarioController`, rotas `/usuarios` (todas exclusivas de administrador via `exigirAdministrador`) e wiring no composition root.
- Implementação do **RF05** (frontend): `usuarioService.js`, tela `UsuariosPage` (tabela com Nome/Login/E-mail/Perfil/Status/Criado em/Ações), modais `NovoUsuarioModal` e `EditarUsuarioModal` (com o campo Perfil bloqueado ao editar um Administrador), CSS de tabela/badges/botões de ícone, e liberação condicional do item "Manter Usuários" no Menu Principal para administradores.
- Implementação dos testes unitários do RF05 (49 testes cobrindo os 5 Use Cases, incluindo a regra de exceção E2 — não desativar o único administrador ativo) e atualização do `TESTES.md`, `README.md` e `CONTEXTO.md` com a nova cobertura, rotas e estrutura de arquivos.
- Ajuste no `schema.prisma`: adicionados `Catalogo.confiancaCampos`/`confiancaGeral` e `Peca.confianca` (índices de confiança calculados pela IA, exigidos pelo RF07/RF08 mas ausentes na modelagem original).
- Implementação do **RF06 — Importar Catálogo** (backend): `FileStorageService` (interface) com `LocalFileStorageService` (dev, salva em disco) e `SupabaseStorageService` (produção); `ImportarCatalogoUseCase` (validação de PDF/tamanho, exceção E1).
- Implementação do **RF07 — Extração Multimodal via IA** (backend): `ExtractionService`/`GeminiExtractionService` (Gemini API, multimodal, JSON estruturado com índice de confiança por campo calculado pela própria IA por comparação com o documento original — conforme especificado pelo usuário), com instrução de sistema explícita de defesa contra prompt injection; `ExtrairDadosCatalogoUseCase` (fluxo básico + A1 extração parcial + E1 falha de comunicação + E2 documento ilegível), find-or-create de Marca/Ferramenta/VersaoTensao.
- Implementação do **RF08 — Interface de Validação (HITL)** (backend): `ValidarCatalogoUseCase` (persistência final, criação de `Validacao` + log de auditoria, geração best-effort de embeddings via `GeminiEmbeddingService` para o futuro RF12); decisão de não haver endpoint de cancelamento (A2), já que nada é persistido antes do "Validar e Salvar".
- Wiring HTTP completo do RF06/RF07/RF08: `CatalogoController`, rotas `/catalogos*`, `uploadMiddleware` (multer, upload em memória), novo `ServiceUnavailableError` em `DomainErrors.js`, e composição no `factories/index.js` (incluindo a troca automática Local/Supabase Storage).
- Implementação do frontend do RF06/RF07/RF08: `catalogoService.js`, `ImportarCatalogoPage` (dropzone de upload, drag&drop, validação de PDF client-side) e `ValidarCatalogoPage` (tela dividida HITL, preview do PDF via `URL.createObjectURL`, barras de confiança coloridas por campo/peça, edição/adição/remoção de peças); liberação do item "Importar Catálogo" no Menu Principal para todos os perfis.
- Implementação dos testes unitários do RF06/RF07/RF08 (5 novos dublês de teste — `FakeCatalogoRepository`, `FakeValidacaoRepository`, `FakeFileStorageService`, `FakeExtractionService`, `FakeEmbeddingService` — e ~30 testes cobrindo os 3 Use Cases, incluindo o reaproveitamento de Marca/Ferramenta/VersaoTensao entre catálogos diferentes) e atualização do `TESTES.md`, `README.md` e `CONTEXTO.md`, com destaque para o aviso de que a Gemini API real nunca é chamada pelos testes automatizados.
- Diagnóstico de erros reportados pelo usuário ao testar RF06/RF07/RF08 pela primeira vez: script `dev:backend` rodado do diretório errado (raiz vs `backend/`); violação de foreign key no log de auditoria (token JWT antigo, com `usuarioId` que não existia mais no banco — resolvido com novo login); e falha 503 na extração (E1 do RF07) — corrigido um bug real: o motivo verdadeiro da falha da Gemini API estava sendo descartado silenciosamente (`catch (_erro)`), sem nenhum log; agora `ExtrairDadosCatalogoUseCase` registra o erro real no console do backend antes de devolver a mensagem genérica (RNF05) ao usuário.
- Atualização do `agentesIA/README.md` (estava desatualizado, apontando pra uma estrutura que nunca foi criada) para refletir onde cada agente realmente está implementado.
- **Incidente de segurança**: o usuário colou a chave de API da Gemini em texto puro no chat; adicionalmente, uma chave antiga (diferente) foi encontrada já escrita em `backend/.env.example` (arquivo normalmente versionado no git). Corrigido o `.env.example` (voltou a ter só `""`) e orientado o usuário a revogar ambas as chaves e verificar o histórico do git.
- Configuração da chave nova em `backend/.env`, com `GEMINI_MODEL="gemini-2.5-flash"` e `GEMINI_EMBEDDING_MODEL="gemini-embedding-2"` (o usuário mudou de ideia do tier Pro para o Flash "por enquanto").
- **Refatoração a pedido do usuário**: os agentes de IA (`GeminiExtractionService`, `GeminiEmbeddingService`, `extracaoPrompt.js`) foram movidos de `backend/src/infra/ai/` para uma camada isolada própria, `backend/src/agentesIA/AgenteExtrator/`, honrando o fluxo arquitetural descrito desde o início do projeto (`Controllers -> Use Cases -> Domain -> Agentes de IA`). `factories/index.js` e os comentários de `domain/services/ExtractionService.js`/`EmbeddingService.js` atualizados; pasta antiga marcada para o usuário apagar manualmente (o agente não tem ferramenta de exclusão de arquivo).
- Adicionado log de consumo de tokens no console do backend a pedido do usuário: `GeminiExtractionService` e `GeminiEmbeddingService` agora imprimem `entrada/saída/total` de tokens a cada chamada à Gemini API, lendo `resposta.usageMetadata`.
- Atualização final do `CONTEXTO.md`, `README.md` e deste `HISTORICO.md` consolidando todo o progresso do dia.

## 22/07/2026 (quarta-feira)

- Tentativa de reenvio do DERS (PDF) para releitura antes do RF09 — bloqueada por falta do `pdftoppm`/poppler no ambiente de renderização de PDF, combinada com o sandbox de shell indisponível (impossível instalar a dependência). Ficou pendente uma releitura futura ou colagem manual do texto pelo usuário.
- Tentativa de apagar a pasta órfã `backend/src/infra/ai/` a pedido do usuário: a permissão de exclusão foi concedida via `allow_cowork_file_delete`, mas a exclusão em si depende do shell (que segue indisponível) — segue pendente, agora registrada em `LEMBRETES.md`.
- Criado `LEMBRETES.md` na raiz do projeto — arquivo de pendências manuais (itens que o agente identificou mas não conseguiu resolver sozinho, tipicamente exclusões de arquivo). Estabelecida como **regra permanente** (convenção #8 do `CONTEXTO.md`): toda pendência de exclusão de arquivo passa a ser registrada nesse arquivo, não só mencionada no chat.
- Diagnóstico do erro `HYPERVISOR_VIRT_DISABLED` (sandbox de shell) — pesquisa nas fontes oficiais do Claude Cowork confirmou que é um problema de VM local (Hyper-V no Windows) do lado do usuário, não algo remediável pelo agente; passadas orientações de troubleshooting (reiniciar app/Windows, checar BIOS/recursos do Windows).
- **Revisão de RN/RNF antes do RF09**: o usuário pediu para ler as Regras de Negócio (RN01-RN05) e os Requisitos Não Funcionais (RNF01-RNF11) do DERS e cruzar com o que já estava implementado, antes de prosseguir. Achado principal: o **RNF11** ("os dados técnicos... completamente segregados dos dados de qualquer outra instância") contradiz diretamente a decisão #12 (catálogo técnico compartilhado entre empresas, tomada no RF06/07/08). Achados secundários: RN04 (posição visual da peça deveria ser obrigatória, hoje é opcional), RNF07 (log de acesso não autorizado só cobre falha de login, não cobre token inválido/perfil sem permissão), RNF04 (indicador de progresso do RF06/07 é só texto no botão, não um indicador visual dinâmico), RNF03 (confirma que o RF09 precisa incluir exclusão de catálogo com dupla confirmação).
- **Correção da decisão #12 (isolamento do catálogo por empresa, RNF11)**: adicionado `empresaId` a `Marca`, `Ferramenta`, `VersaoTensao`, `Catalogo`, `Peca` e `Validacao` no `schema.prisma` (com `Marca` agora `@@unique([empresaId, nome])`); atualizadas as entidades de domínio (`Catalogo`, `Peca`); `CatalogoRepository`/`PrismaCatalogoRepository`/`FakeCatalogoRepository` — o find-or-create de Marca/Ferramenta/VersaoTensao (`resolverVersaoTensaoId`) passou a ser escopado por `empresaId`; `ImportarCatalogoUseCase`/`ExtrairDadosCatalogoUseCase`/`ValidarCatalogoUseCase` passaram a receber `empresaId` e checar posse do catálogo (mesmo padrão do `AtualizarUsuarioUseCase`, RF05); `CatalogoController` passou a repassar `req.auth.empresaId`. Testes unitários existentes do RF06/07/08 atualizados para incluir `empresaId`, e adicionados testes novos de isolamento multi-tenant (catálogo de outra empresa não é acessível; duas empresas com o mesmo fabricante/modelo não reaproveitam Marca/Ferramenta/VersaoTensao entre si). Documentada em `CONTEXTO.md` como decisão #19 (com a #12 riscada, mantida só como registro histórico), e adicionada instrução de migration no `README.md` alertando que os dados de teste anteriores (sem `empresaId`) precisam ser truncados antes de aplicar a nova migration. RN04/RNF07/RNF04/RNF03 ficaram registrados como pendência pro ciclo do RF09.
- Usuário pediu pra conferir o Dicionário de Dados completo do DERS (Quadros 32-40) antes de rodar a migration — nele apareceu um conflito: as entidades do catálogo técnico (Marca/Ferramenta/VersaoTensao/Catalogo/Peca/Validacao) não listam `empresaId`, contradizendo o RNF11 que motivou a correção de hoje de manhã (a descrição de MARCA até reforça "cadastrada uma única vez", sugerindo o modelo compartilhado original). Perguntado sobre qual fonte prevalece, o usuário decidiu manter o isolamento por empresa (RNF11), justificando com um cenário concreto de negócio: catálogo compartilhado faria uma empresa que só atende Bosch/Makita acumular peças de DeWalt importadas por outra instância, contaminando a base e arriscando retornos indesejados do futuro Agente de Consulta (RF12, busca semântica). Decisão registrada como definitiva no `CONTEXTO.md` — nenhuma mudança de código necessária, já que a implementação de hoje de manhã já seguia essa linha.
- Também identificado no Dicionário de Dados: o campo `Peca.embedding` é especificado como gerado pelo modelo **text-embedding-004** da Gemini API (768 dimensões) — diferente do `gemini-embedding-2` configurado hoje mais cedo (decisão #14). Ainda não resolvido; fica como ponto em aberto pro usuário decidir se troca o `.env`.
- Implementação do **RF09 — Manter Catálogo** (backend): `ListarPecasUseCase` (A2, consulta com filtros de marca/modelo/código, só catálogos VALIDADO), `BuscarCatalogoParaEdicaoUseCase` (carrega a tela de edição), `AtualizarCatalogoUseCase` (A3, edita marca/modelo/tensão/peças — atualiza/cria/exclui por diferença, reprocessa embeddings só de peças novas/alteradas), `ExcluirPecaUseCase` (A4, exclusão por peça, não por catálogo) e `BaixarArquivoCatalogoUseCase` (reexibe o PDF original na edição, via novo endpoint `GET /catalogos/:id/arquivo`). `CatalogoRepository` ganhou `listarPecasValidadas`/`atualizarCatalogo`/`excluirPeca`, implementados em `PrismaCatalogoRepository` e `FakeCatalogoRepository`.
- Antes de implementar, o usuário pediu uma correção de escopo: o trecho "todo documento não validado vai parar aguardando validação" (que ele mesmo tinha colado junto com o texto do RF09) na verdade pertence ao RF10, não ao RF09 — a lista de "Manter Catálogo" mostra só peças já validadas, por enquanto.
- Corrigidas junto as 3 lacunas pendentes da revisão de RN/RNF: **RN04** (posição visual da peça agora é obrigatória em `ValidarCatalogoUseCase` e `AtualizarCatalogoUseCase`), **RNF07** (`authMiddleware`/`exigirAdministrador` viraram fábricas que recebem `logAuditoriaRepository` e registram `ACESSO_NAO_AUTORIZADO` em toda rejeição — token ausente/inválido/expirado, sessão revogada, perfil sem permissão) e **RNF04** (spinner CSS de verdade no botão de importação, substituindo o texto estático).
- Implementação do RF09 (frontend): `CatalogoPage` (listagem com filtros marca/modelo/código, tabela com ações de editar/excluir, `ConfirmModal` na exclusão) e `EditarCatalogoPage` (tela dividida reaproveitando a estrutura do RF08, sem barras de confiança, carregando os dados via API em vez de navegação com state); `catalogoService.js` ganhou `listarPecas`/`buscarCatalogo`/`buscarArquivoCatalogo`/`atualizarCatalogo`/`excluirPeca`; item "Manter Catálogo" do Menu Principal passou a navegar para `/catalogos`.
- Implementação dos testes unitários do RF09 (5 novos arquivos de teste — Listar/BuscarParaEdicao/Atualizar/Excluir/BaixarArquivo — cobrindo os fluxos A2/A3/A4, isolamento multi-tenant e a otimização de custo do reprocessamento seletivo de embeddings) e ajuste dos testes existentes do RF08 pra nova obrigatoriedade da posição visual (RN04). Atualização de `README.md`, `TESTES.md` e `CONTEXTO.md` com as novas rotas, decisões (#20 e #21) e estrutura de arquivos.
- Implementação do **RF10 — Manter Documentos Pendentes** (backend): `ListarDocumentosPendentesUseCase` (fluxo básico — fila dos catálogos `IRRESOLUVEL` da empresa, com uma classificação de apresentação "PENDENTE"/"IRRESOLUVEL" derivada dos `camposAusentes` já persistidos, sem criar um status novo no schema), `BuscarDocumentoPendenteUseCase` (A1 — carrega o documento pra tela de preenchimento) e `ExcluirCatalogoUseCase` (A3 — exclui o Catalogo inteiro, diferente da exclusão por peça do RF09/A4). O fluxo A2 (Reenviar para IA) e a própria persistência do preenchimento manual (A1) não precisaram de Use Case novo: reaproveitam `ExtrairDadosCatalogoUseCase`/`POST /catalogos/:id/extrair` (já existente desde o RF07/E1) e `ValidarCatalogoUseCase`/`PUT /catalogos/:id/validar` (já existente desde o RF08), respectivamente. `CatalogoRepository` ganhou `listarPendentes`/`excluirCatalogo`, implementados em `PrismaCatalogoRepository` e `FakeCatalogoRepository` — nenhuma migration nova foi necessária.
- Novas rotas registradas com cuidado de ordenação no Express: `GET /catalogos/pendentes`, `GET /catalogos/pendentes/:id` e `DELETE /catalogos/pendentes/:id` foram colocadas ANTES das rotas dinâmicas `GET/PUT/DELETE /catalogos/:id...` do RF09 em `catalogoRoutes.js`, pra "pendentes" não ser capturado como valor de `:id`.
- Implementação do RF10 (frontend): `DocumentosPendentesPage` (fila em cards, fiel ao protótipo — badges de situação/confiança, tags de campos ausentes, botões "Preencher"/"Reenviar para IA"/"Excluir", os dois últimos com `ConfirmModal`); `ValidarCatalogoPage` (RF08) ganhou suporte a receber uma URL de PDF já pronta via `state.pdfUrl` (além do `File` cru usado no fluxo original RF06/07/08), pra poder ser reaproveitada como tela de "Preencher" do RF10 sem duplicar a interface de edição; `catalogoService.js` ganhou `listarDocumentosPendentes`/`buscarDocumentoPendente`/`excluirDocumentoPendente`; item "Documentos Pendentes" do Menu Principal passou a navegar para `/catalogos/pendentes`.
- Registradas como decisões interpretativas (decisão #22 no `CONTEXTO.md`): a fila do RF10 cobre só catálogos `IRRESOLUVEL` (pré-condição explícita do próprio DERS, não `PENDENTE_VALIDACAO` esquecido); "Pendente"/"Irresolúvel"/"Em edição" (Quadro 25 do DERS) não viraram três status persistidos — só um rótulo de apresentação calculado, e "Em edição" nem chegou a ser modelado (não há edição colaborativa no sistema); os "campos ausentes" exibidos ficam restritos a marca/modelo/tensão (o protótipo mostra granularidade por peça, que a extração atual não rastreia); o arquivo físico do documento excluído não é apagado do `FileStorageService` (a interface ainda não tem um método de exclusão, e o DERS não pede isso).
- Implementação dos testes unitários do RF10 (3 novos arquivos de teste — ListarDocumentosPendentes/BuscarDocumentoPendente/ExcluirCatalogo — cobrindo o fluxo básico, A1, A3, a classificação Pendente/Irresolúvel e isolamento multi-tenant). Atualização de `README.md`, `TESTES.md` e `CONTEXTO.md` com as novas rotas, a decisão #22 e a estrutura de arquivos.

## 24/07/2026 (sexta-feira)

- Retomada do projeto após uma pausa: releitura completa de `README.md`, `CONTEXTO.md`, `TESTES.md` e `HISTORICO.md` a pedido do usuário, pra recarregar o contexto antes de continuar.
- Usuário trouxe o texto do DERS + 2 protótipos (tela de resultados preenchida e tela de estado vazio) do **RF11 — Consulta de Componentes**.
- Antes de implementar, identificado um conflito entre o texto do DERS (as duas técnicas de busca — SQL exato e vetorial semântica — sempre rodam "simultaneamente") e o protótipo (dois botões, "Busca Semântica"/"Busca por Código Exato", que parecem um seletor de modo exclusivo). Perguntado ao usuário via pergunta direta; resposta: **sempre busca combinada**, fiel ao DERS — os botões só controlam a ordenação do resultado. Decisão registrada como #23 no `CONTEXTO.md`.
- Implementação do **RF11 — Consulta de Componentes** (backend): novo domínio `ComponenteRepository` (interface) + `PrismaComponenteRepository` (busca exata via Prisma comum, busca semântica via SQL bruto contra o pgvector com `<=>`, checagem de "existe algum registro validado"); `BuscarComponentesUseCase` (combina os dois resultados, deduplica por id, ordena conforme o `modo`, trata E1 — nenhum resultado — e E2 — base vazia, checada antes de gastar uma chamada de embedding). O "Agente de Consulta" citado no DERS não ganhou uma classe de IA própria — reaproveita a mesma instância de `GeminiEmbeddingService` já usada pelo RF08/RF09, já que o termo de busca precisa ser vetorizado com o mesmo modelo das peças pra ser comparável no espaço do pgvector. A busca semântica é best-effort (uma falha na geração do embedding não derruba a busca — só a correspondência exata continua funcionando).
- Wiring HTTP do RF11: `ConsultaController`, rota `GET /componentes` (novo arquivo `consultaRoutes.js`), composição em `factories/index.js`. Nenhuma migration foi necessária — reaproveita a coluna `Peca.embedding` (pgvector) já existente desde o RF08.
- Implementação do RF11 (frontend): `consultaService.js`, `ConsultarComponentesPage` (fiel aos dois protótipos — busca + filtros de marca/tensão + toggle de modo + estado vazio + tabela de resultados). "Ver Vista Explodida" reaproveita o endpoint `GET /catalogos/:id/arquivo` do RF09, abrindo o PDF numa nova aba do navegador (visualizador nativo, com zoom/paginação de fábrica) em vez de um visualizador customizado — decisão interpretativa pra não precisar de uma dependência extra (ex.: pdf.js) só pra esse fim. Item "Consultar Componentes" do Menu Principal passou a navegar para `/componentes`.
- Implementação dos testes unitários do RF11 (novo dublê `FakeComponenteRepository`, usando distância euclidiana no lugar da distância de cosseno do pgvector — suficiente pra testar ordenação/combinação; 13 testes cobrindo fluxo básico, A2, E1, E2, os dois modos de ordenação, isolamento multi-tenant e o comportamento best-effort da busca semântica). Atualização de `README.md`, `TESTES.md` e `CONTEXTO.md` com a nova rota, a decisão #23 e a estrutura de arquivos.
- Usuário trouxe o texto do DERS + 2 protótipos (estado vazio e chat preenchido, com "Fonte citada" e botão "Ver Vista Explodida") do **RF12 — Consulta Técnica via RAG**, pedindo pra responder antes de tudo: "onde está o Agente Validador e o Agente de Consulta?". Respondido: o Agente Validador nunca existiu como IA (RF08 é HITL — validação é humana, por design); o Agente de Consulta também não tinha classe própria até aqui, só reaproveitava o `GeminiEmbeddingService` do Agente Extrator (decisão #23) — o RF12 é o ponto natural pra ele ganhar sua primeira classe de IA dedicada, já que precisa gerar texto (não só embeddings).
- Implementação do **RF12 — Consulta Técnica via RAG** (backend): novo `domain/services/RAGService.js` (interface) + `agentesIA/AgenteConsulta/GeminiRAGService.js` (primeira classe própria do Agente de Consulta, `generateContent` da Gemini com `responseSchema` e instrução de sistema com defesa contra prompt injection + RN01); `ConsultarViaRagUseCase` (checa registro validado, gera embedding da pergunta, recupera contexto reaproveitando `ComponenteRepository.buscarPorSimilaridadeSemantica` do RF11, envia ao Agente de Consulta e monta a resposta com fonte citada). `buscarPorSimilaridadeSemantica` ganhou um campo novo, `validadoEm` (via `LEFT JOIN LATERAL` na tabela `validacoes`), usado só pelo RF12. Decisão registrada como #24 no `CONTEXTO.md`: distinção entre as exceções E1 (contexto insuficiente) e E3 (sem contexto identificável) delegada ao próprio Gemini quando há base populada, com o caso "nenhum registro validado" mapeado direto pra E1 (economia de chamada de IA); o código da peça citada nunca é gerado pela IA — o Gemini só devolve o id de uma peça já recuperada pela busca vetorial, conferido contra o contexto enviado antes de usar.
- Wiring HTTP do RF12: método `perguntar` no `ConsultaController`, rota `POST /consulta-tecnica`, composição em `factories/index.js` (`GeminiRAGService` reaproveitando o `GEMINI_MODEL` já configurado). Nenhuma migration foi necessária.
- Implementação do RF12 (frontend): `consultaService.perguntarTecnico`, `ConsultaTecnicaPage` (chat — transcrição local em estado do React, sem histórico enviado ao backend por pós-condição do DERS, bolhas de usuário/IA, card "Fonte citada" com badge de código, botão "Ver Vista Explodida" reaproveitando o endpoint do RF09). Item "Consulta Técnica (IA)" do Menu Principal passou a navegar para `/consulta-tecnica`.
- Implementação dos testes unitários do RF12 (novo dublê `FakeRAGService`; 10 testes cobrindo fluxo básico, validação, E1 — pré-condição e classificação do Gemini —, E2 — falha em ambos os pontos de contato com a IA —, E3 — classificação do Gemini e caso defensivo —, fallback de `pecaCitadaId` inválido, e isolamento multi-tenant). Atualização de `README.md`, `TESTES.md` e `CONTEXTO.md` com a nova rota, a decisão #24 e a estrutura de arquivos — todos os 12 requisitos funcionais do DERS estão implementados.
- Usuário pediu uma correção logo em seguida: cada um dos 3 agentes do DERS (Extrator, Validador, Consulta) precisa ter sua própria classe de IA, não só o Extrator e o Consulta — justificativa: não deixar tudo concentrado no Agente Extrator, dividindo as tarefas entre os três agentes como o DERS descreveu desde o início. Desenho combinado com o usuário: Agente Extrator só extrai e compara com o original; Agente Validador recebe os dados, aguarda a validação humana e só então gera os embeddings; Agente de Consulta fica responsável por toda a atividade de consulta (RF11 e RF12).
- Implementação da correção (decisão #25 no `CONTEXTO.md`): a classe `GeminiEmbeddingService` que gerava embeddings foi movida de `agentesIA/AgenteExtrator/` para `agentesIA/AgenteValidador/GeminiEmbeddingService.js` (usada só por `ValidarCatalogoUseCase`/RF08 e `AtualizarCatalogoUseCase`/RF09); uma SEGUNDA classe `GeminiEmbeddingService`, própria e separada, foi criada em `agentesIA/AgenteConsulta/GeminiEmbeddingService.js` (usada por `BuscarComponentesUseCase`/RF11 e `ConsultarViaRagUseCase`/RF12), reunindo as duas capacidades do Agente de Consulta (embedding + geração via `GeminiRAGService`, já existente) na mesma pasta. `factories/index.js` passou a instanciar `embeddingServiceValidador` e `embeddingServiceConsulta` separadamente, ambas configuradas com o mesmo `GEMINI_EMBEDDING_MODEL` (necessário pros vetores continuarem comparáveis no espaço do pgvector). Nenhuma assinatura de Use Case mudou (todos continuam recebendo o parâmetro genérico `embeddingService`), então nenhum teste unitário precisou ser alterado. Arquivo órfão (`agentesIA/AgenteExtrator/GeminiEmbeddingService.js`) anotado em `LEMBRETES.md` pra exclusão manual. Atualização de `README.md`, `CONTEXTO.md`, `TESTES.md` e `agentesIA/README.md` com a nova estrutura de 3 agentes.
- Usuário perguntou se fazia sentido um quarto agente orquestrador — respondido que não, já que cada agente é acionado em pontos fixos e determinísticos do fluxo (os próprios Use Cases já fazem esse "roteamento" como código comum, sem nenhuma decisão dinâmica que justificasse uma camada de IA a mais). Também questionou se um banco de dados compartilhado entre empresas seria mais eficiente em tokens; respondido que essa opção já tinha sido avaliada e descartada (decisão #19, RNF11) com o mesmo exemplo (contaminação de marca irrelevante) que o usuário deu agora — e que, na implementação atual, esse cenário já é estruturalmente impossível, já que toda busca do RF11/RF12 já filtra por `empresaId` antes mesmo de calcular a distância vetorial. A única redundância real identificada foi na extração (RF07) de documentos idênticos importados por empresas diferentes — usuário optou por não implementar cache por hash agora, mantendo o isolamento total como está.
- Usuário pediu um guarda-corpo de domínio para o Agente Extrator (RF07): impedir que um PDF que não seja uma ferramenta elétrica portátil das categorias/marcas suportadas (Bosch/Makita/DeWalt) seja inserido no sistema — cenário de exemplo dado: alguém enviar um PDF de peça automotiva e conseguir salvá-lo na base. Implementado como decisão #26 no `CONTEXTO.md` (fora do texto do DERS): novo campo `dominioReconhecido` na saída do Agente Extrator (`extracaoPrompt.js` recebeu a lista fechada de categorias fornecida pelo usuário; `ESQUEMA_RESPOSTA` e `GeminiExtractionService` atualizados), ortogonal ao `documentoCompreendido` já existente — um documento pode estar perfeitamente legível e ainda assim estar fora do domínio. Quando `documentoCompreendido && !dominioReconhecido`, `ExtrairDadosCatalogoUseCase` exclui o `Catalogo` recém-criado (reaproveitando `catalogoRepository.excluirCatalogo`, já usado pelo RF10/A3), registra `EXCLUSAO_REGISTRO` no log de auditoria e lança `ValidationError` (422, mesma família de erro do RF06/E1 — o frontend já exibe a mensagem sem nenhuma mudança de código). Diferente da exceção E2 (documento ilegível), aqui não existe fila de pendentes nem preenchimento manual — o documento nunca chega a existir de fato no sistema. Testes unitários novos cobrindo a rejeição (com exclusão + log) e a não-regressão do E2 (documento ilegível continua recebendo benefício da dúvida). Atualização de `README.md`, `CONTEXTO.md` e `TESTES.md`.
- Usuário trouxe o texto do DERS + 1 protótipo do **RF13 — Manter Log Sistema (ADM)**, pedindo pra seguir o mesmo rigor dos requisitos anteriores. Antes de implementar, investigação encontrou uma lacuna bloqueante: a tabela `logs_auditoria` nunca teve `empresaId` — só `usuarioId` (nullable, usado por logs "de sistema" como `CRIACAO_EMPRESA`, registrados antes de existir qualquer sessão). Sem essa coluna, filtrar "o log da instância" (RNF11) dependeria de um `JOIN` via `usuario.empresaId`, que quebraria justamente nesses registros com `usuarioId` nulo. Perguntado, via `AskUserQuestion`, sobre como resolver, o usuário escolheu **adicionar `empresaId` à tabela** (mesmo padrão já usado pela decisão #19 — coluna direta, nunca inferida por JOIN).
- Implementação da correção (decisão #27 no `CONTEXTO.md`): nova migration `20260724090000_rf13_log_auditoria_empresa_id` adicionando `empresaId` **nullable** ao `LogAuditoria` (schema.prisma), com índice e relação com `Empresa`. `LogAuditoriaRepository` (domain) ganhou o método `consultar(filtros)`; `PrismaLogAuditoriaRepository`/`FakeLogAuditoriaRepository` implementados/atualizados (o `registrar` de ambos passou a persistir `empresaId`; o `consultar` filtra por empresaId/usuarioId/tipoAcao/intervalo de datas, ordenando do mais antigo para o mais recente). Os **19 pontos de chamada** de `logAuditoriaRepository.registrar` no backend foram retrofitados um a um pra passar `empresaId` — a maioria já recebia o valor no escopo do próprio Use Case; casos especiais: `CriarEmpresaUseCase` usa o id da própria empresa recém-criada; `RedefinirSenhaUseCase` busca o usuário por id só pra obter o `empresaId` (fluxo via link, sem sessão); `authMiddleware` usa `payload.empresaId` quando o token foi decodificado com sucesso (sessão revogada/perfil sem permissão) e `null` quando não foi possível decodificar nada (token ausente/inválido/expirado).
- Antes de montar a tela, uma segunda divergência DERS-vs-protótipo foi identificada e perguntada ao usuário: o texto do Quadro 30 descreve o filtro "Tipo de Ação" com só 4 categorias soltas ("Validação, Edição, Exclusão, Acesso"), mas o protótipo mostra a tabela de resultados com os valores brutos do enum `TipoAcao` como badges (um deles, "UPLOAD_CATALOGO", nem batendo exatamente com o valor real do enum, `UPLOAD_VISTA_EXPLODIDA`, sinal de dado ilustrativo no mockup). O usuário confirmou usar o **enum completo** — decisão #28 no `CONTEXTO.md`, mesmo precedente das decisões #21/#23 de priorizar o protótipo.
- Implementação do **RF13 — Manter Log Sistema** (backend): `ConsultarLogAuditoriaUseCase` (busca os logs da empresa via `LogAuditoriaRepository.consultar`, com filtros opcionais de usuário/tipo de ação/data inicial/data final, e resolve o nome de cada usuário responsável cruzando com `usuarioRepository.listarPorEmpresa` — registros com `usuarioId` nulo aparecem como "sistema", igual ao protótipo); `LogAuditoriaController` + rota `GET /log-auditoria` (protegida por `authMiddleware` + `exigirAdministrador`, já existente desde o RF09 — cobre a exceção E2 sem nenhum código novo); wiring em `factories/index.js`.
- Implementação do RF13 (frontend): `logAuditoriaService.js`, `LogSistemaPage` (filtros em linha — Usuário/Tipo de Ação/Data Inicial/Data Final —, tabela de resultados Data/Hora-Usuário-Tipo de Ação-Registro Afetado, mensagem de "nenhum registro encontrado" pra E1, botão "Voltar para Usuários", mesma guarda de UX client-side do `UsuariosPage` pra perfis não-administradores). O botão "Log do Sistema", que já existia desabilitado no toolbar do `UsuariosPage` desde o RF05, foi habilitado e passou a navegar para `/log-sistema`; rota nova adicionada em `App.jsx`.
- Implementação dos testes unitários do RF13 (`ConsultarLogAuditoriaUseCase.test.js`, 11 testes cobrindo fluxo básico, resolução de nome/"sistema"/"Usuário removido", isolamento multi-tenant, os três filtros, validação de datas inválidas, ordenação cronológica e a exceção E1). Atualização de `README.md`, `CONTEXTO.md` e `TESTES.md` com as decisões #27/#28, a nova rota, a nova estrutura de arquivos e a cobertura de testes (256 testes no total) — todos os 13 requisitos funcionais do DERS estão implementados.

## 23/08/2026 (domingo)

- Retomada do projeto: criados `AGENTS.md` (contexto universal pra qualquer agente de codificação) e `CLAUDE.md` (específico do Claude Code, importando `@AGENTS.md`), a pedido do usuário, que passou a usar o Orca (múltiplos agentes de codificação em paralelo). Criados também 3 prompts de personalidade em `prompts/` (`testador-hermes.md`, `escritor-claude.md`, `revisor-opencode.md`), mapeando Hermes/Claude/opencode aos papéis de Testador/Escritor/Revisor.
- Usuário rodou o backend e reportou um `PrismaClientValidationError: Unknown argument 'usuarioId'` em `PrismaLogAuditoriaRepository.js`, derrubando login e recuperação de senha. Diagnosticado como Prisma Client dessincronizado do `schema.prisma` (sintoma clássico de regeneração incompleta no Windows quando o `prisma generate`/`migrate dev` roda com o servidor de dev ainda de pé, prendendo o arquivo do client). Orientado o usuário a parar o servidor, rodar `npx prisma migrate dev`/`npx prisma generate` e só então subir o backend de novo — sem alteração de código, já que o `PrismaLogAuditoriaRepository.js` já estava correto.
- Usuário reportou um segundo erro em produção: `PrismaClientKnownRequestError P2028 — Transaction already closed` em `#buscarComPecas` (RF07/extração), com a transação de `registrarResultadoExtracao` estourando o timeout padrão de 5000 ms do Prisma (5189 ms decorridos) contra o Supabase remoto. Causa: vários round-trips sequenciais dentro da mesma `$transaction` (`resolverVersaoTensaoId` faz até 4 upserts/finds, mais `peca.createMany`, `catalogo.update` e `#buscarComPecas`). Corrigido aumentando o timeout pra 15000 ms (`{ timeout: 15000 }`) nas 3 transações de `PrismaCatalogoRepository.js` (`registrarResultadoExtracao`, `registrarValidacao`, `atualizarCatalogo`). Registrado como item 4 em "Bugs reais encontrados e corrigidos" no `CONTEXTO.md`.

## 14/09/2026 (segunda-feira)

- Usuário pediu pra aumentar o campo de preview do PDF na tela de validação (RF08). Ajustado `global.css`: painel do documento ganhou mais largura que o formulário (`flex: 1.4` vs `1`, classes `.split-panel--documento`/`.split-panel--dados`) e a altura do iframe passou de fixa (480px) para `calc(100vh - 220px)` em telas maiores, com fallback fixo de 480px abaixo de 900px (onde os painéis empilham em coluna).
- Discussão conceitual (sem implementação): o que aconteceria se o Agente Extrator recebesse um PDF de ferramenta real, mas sem vista explodida (sem peças pra extrair). Investigação encontrou uma lacuna real: `ExtrairDadosCatalogoUseCase#classificarResultado` nunca checa `pecas.length === 0` — só marca/modelo/tensão ausentes levam a `IRRESOLUVEL`. Um documento com marca/modelo/tensão identificados mas zero peças é marcado `PENDENTE_VALIDACAO` (extração "completa") e persistido no banco; como esse status não aparece na fila do RF10 (só lista `IRRESOLUVEL`) nem no RF09 (só lista catálogos `VALIDADO`), se o validador fechar a tela sem salvar (não existe endpoint de cancelamento), o catálogo fica órfão no banco, sem nenhuma tela que permita reencontrá-lo. Confirmado que isso é uma instância concreta do gap já documentado em "O que ainda NÃO foi implementado" (catálogos `PENDENTE_VALIDACAO` esquecidos). Não implementado — usuário optou por não mexer por hora.
- Discussão conceitual: comparativo sobre usar IA (Gemini) vs. um filtro determinístico/clássico pra detectar documentos fora do domínio suportado (guarda-corpo do RF07, decisão #26). Conclusão: pro contexto de TCC/dev solo, usar a IA foi o facilitador certo — reaproveita uma chamada que já ia ser feita, generaliza bem sem enumerar casos, e é consistente com a abordagem central do projeto; um filtro na mão (palavras-chave ou classificador clássico) exigiria trabalho considerável (pipeline de extração de texto, dataset rotulado) pra generalizar pior.
- Discussão conceitual: se converter o PDF em Markdown antes de mandar pro Agente Extrator economizaria tokens. Conclusão: economia real seria irrisória (o custo por extração já é uma fração de centavo, e boa parte do custo de entrada é o prompt de sistema, não o PDF), com risco real de perder a correspondência visual entre posição no diagrama e peça (RN04), prejudicando a acurácia (RNF10). Também descartada a ideia de persistir/exibir o Markdown no lugar do PDF original — quebraria o split-screen do RF08 (HITL) e o "Ver Vista Explodida" do RF09/RF11/RF12, que dependem do documento visual original. Nada implementado.
- Confirmado ao usuário que mudanças visuais futuras (cores, espaçamento, layout) têm baixo risco de impacto — lógica (services/) e apresentação (CSS/JSX) já são bem separadas desde o início do projeto (documentado na seção "Arquitetura do backend"/frontend do `CONTEXTO.md`).
- Planejada e implementada a **responsividade mobile (RNF02, funcional a partir de 360px)** — decisão #30 no `CONTEXTO.md`. Mudanças só em `global.css`: `.table-card` com `overflow-x: auto` + `.data-table` com `min-width: 560px` (tabelas do RF05/RF09/RF13 rolam horizontalmente em vez de espremer); novo breakpoint `@media (max-width: 640px)` empilhando `.form-row`/`.filtros-row`/`.peca-row__campos` em coluna, `.page-toolbar` com `flex-wrap`, `.page-content` com padding reduzido, e `.icon-btn` maior (40×40px) pra alvo de toque. Nenhuma mudança em componentes/JS.
- Usuário reportou `503 UNAVAILABLE` ("alta demanda") da Gemini API durante a extração (RF07). Diagnosticado como o Free Tier tendo prioridade mais baixa na fila do modelo — confirmado que a assinatura "Google AI Pro" do usuário não afeta isso, por ser um produto de consumidor (app do Gemini) separado da cobrança da API (a chave continua classificada como gratuita no AI Studio). Discutidas opções de contorno (retry com backoff, modelo alternativo como fallback, ativar billing); usuário optou por trocar de geração de modelo direto, em vez de fallback. Pesquisada a lista atual de modelos Gemini (setembro/2026): família Gemini 3 já estável (`gemini-3.5-flash` até `gemini-3.8-flash`), `gemini-2.5-flash` ainda não descontinuado. **Decisão #29 no `CONTEXTO.md`:** `GEMINI_MODEL` trocado de `gemini-2.5-flash` para `gemini-3.5-flash` em `backend/.env` e `backend/.env.example` — sem nenhum código hardcoded a alterar. Achado colateral (ainda não corrigido): a documentação oficial lista o embedding como `gemini-embedding-2-preview`, diferente do `gemini-embedding-2` configurado hoje — mesma incerteza já registrada na decisão #14, agora com uma pista concreta de qual seria o identificador correto.
- Preparado o repositório pra subir no GitHub (`https://github.com/ReidnerMedeiros/Partify.git`): auditoria completa de pastas/arquivos em busca de segredos e material que não deveria ir junto (`.env`s, PDFs de teste em `backend/storage/`, documentação de uso pessoal — `CONTEXTO.md`, `TESTES.MD`, `historico.md`, `lembretes.md`, `AGENTS.md`, `CLAUDE.md`, `partify_contexto_desenvolvimento.md`, `AUDITORIA_TESTES.md`, `CLICKUP_PROMPT.md`, `PLANO_CORRECAO_TESTES.md`, `prompts/`, config local do Claude Code em `.claude/`, saída de ferramenta de análise de grafo em `graphify-out/`). `.gitignore` reescrito cobrindo tudo isso (com variantes de capitalização, já que os nomes reais no disco divergiam da grafia usada nas minhas respostas). Identificado e apagado manualmente pelo usuário o código órfão pendente desde julho (`backend/src/infra/ai/` e `agentesIA/AgenteExtrator/GeminiEmbeddingService.js`, já registrados em `LEMBRETES.md`). `README.md` da raiz ajustado (removida referência a `TESTES.md`, que ficou de fora do repositório). Confirmado que `backend/src/agentesIA/README.md` é documentação de código (não pessoal) e continua indo.
- Configurado o Supabase Storage pra substituir o `LocalFileStorageService` em uso (nenhuma mudança de código necessária — `SupabaseStorageService` já existia pronto desde o RF06, a troca é automática via `.env`). Usuário criou o bucket `Partify` no painel do Supabase (privado, com limite de tamanho de arquivo e restrição de MIME type pra PDF, ambos recomendados dada a média de ~120KB por catálogo). Ajustado `SUPABASE_STORAGE_BUCKET="Partify"` no `.env` pra bater com o nome real do bucket. Localizada e configurada a `service_role`/`secret` key (`SUPABASE_SERVICE_ROLE_KEY`) via Settings → API Keys do Supabase. Explicado que a separação de arquivos por empresa não acontece no Storage (bucket único pra todas as instâncias) — é garantida pela checagem de posse já existente em `BaixarArquivoCatalogoUseCase` (`catalogo.empresaId !== empresaId`), mesmo padrão do resto do sistema (RNF11).
- **Incidente de segurança (recorrente):** usuário colou o `.env` inteiro (senha do banco, `JWT_SECRET`, chave da Gemini) e, em mensagem separada, a `SUPABASE_SERVICE_ROLE_KEY` real em texto puro no chat. Nada disso chegou a ir pro git (já protegido pelo `.gitignore`), mas ficou registrado na conversa — orientado a rotacionar a senha do Postgres, gerar novo `JWT_SECRET` e regenerar a `service_role`/`secret` key do Supabase.
- Usuário reportou um novo erro de produção durante a validação HITL (RF08): `PrismaClientKnownRequestError P2028` em `tx.peca.update()`, mas com mensagem diferente do P2028 anterior — `Transaction not found... refers to an old closed transaction`, indicando queda de conexão no meio da transação (não timeout). Diagnosticado: `registrarValidacao` fazia até ~20 round-trips sequenciais numa única transação (um `update`/`create` por peça, um por um), ampliando a exposição a instabilidades de rede/pooler contra o Supabase. **Decisão #31 no `CONTEXTO.md`:** implementada `transacaoComRetry` em `PrismaCatalogoRepository.js` (retentativa automática, até 3 tentativas, só para esse `P2028` específico de queda de conexão — não interfere no `P2028` de timeout já tratado antes) e agrupamento das peças novas em `createMany` (em vez de um `create` por peça) em `registrarValidacao` e `atualizarCatalogo`, reduzindo o número de round-trips dentro da transação.
- Usuário perguntou se o projeto, do jeito que está, já dá pra colocar no Render (backend) e no Vercel (frontend). Identificados dois ajustes de configuração faltando (nenhum bug de código): (1) `backend/package.json` não tinha um script de build que rodasse `prisma generate`/`prisma migrate deploy` — sem isso, o Render nunca geraria o Prisma Client nem aplicaria as migrations em produção; (2) não existia `vercel.json` no frontend, então rotas do React Router acessadas direto por URL (ex. refresh em `/menu`) dariam 404 no Vercel. **Decisão #32 no `CONTEXTO.md`:** adicionado o script `"build": "prisma generate && prisma migrate deploy"` em `backend/package.json`; criado `frontend/vercel.json` com rewrite catch-all para `index.html`; adicionada seção "Deploy (Render + Vercel)" no `README.md` com o passo a passo completo (build/start command, lista de env vars a cadastrar manualmente nos painéis, lembrete de rodar `immutable_audit_log.sql` manualmente contra o banco de produção, e de atualizar `FRONTEND_URL` depois do primeiro deploy do Vercel). Confirmado que `directUrl` já está configurado no `schema.prisma` (usado pelo `migrate deploy`), então nenhuma mudança de schema foi necessária.
- Guiado o usuário passo a passo em como criar o Web Service no Render (root directory `backend`, build/start command, cadastro das env vars) e o projeto no Vercel (root directory `frontend`, `VITE_API_URL`), incluindo o passo de fechar o ciclo atualizando `FRONTEND_URL` no Render com a URL definitiva do Vercel.
- Usuário fez o primeiro deploy de teste do backend no Render e reportou falha no build: `prisma migrate deploy` com `Error: P1001: Can't reach database server at db.cwkxwmoymcmlswrvpruy.supabase.co:5432`. Diagnosticado como incompatibilidade de rede, não erro de configuração: esse host de conexão direta do Supabase só resolve por IPv6, e o Render (como a maioria das plataformas de deploy) não tem saída IPv6 por padrão. **Decisão #33 no `CONTEXTO.md`:** orientado o usuário a trocar o valor de `DIRECT_URL` nas env vars do Render pelo mesmo endereço já usado em `DATABASE_URL` (Session pooler, IPv4-compatível) — sem mudar nada no `.env` local nem no código. Documentado como "Problema conhecido" no `README.md`.
- Usuário perguntou como o RF03 (recuperar senha) está se comportando em produção — investigação confirmou que, com `SMTP_HOST` vazio (copiado do `.env` local), o backend em produção estava usando `ConsoleEmailService` (não envia e-mail real, só loga no Render). Configurado Gmail com senha de app via `SMTP_*` no Render; ao testar, apareceu `Error: Connection timeout (ETIMEDOUT)`. Também investigado, a pedido do usuário, se um e-mail de destino Hotmail/Outlook funcionaria — confirmado que sim como destinatário (a deprecação de autenticação básica da Microsoft, com bloqueio total desde abril/2026, afeta só quem tenta ENVIAR autenticando como conta Outlook, não afeta recebimento). **Decisão #34 no `CONTEXTO.md`:** pesquisa confirmou que o timeout era causado pelo Render bloqueando portas SMTP de saída (25/465/587) em serviços do plano Free desde setembro/2025 — problema de rede da plataforma, não de credencial, e afetaria qualquer provedor SMTP tradicional. Avaliado Resend (descartado — sandbox sem domínio verificado só entrega pro próprio dono da conta, inviável pros testes com usuários externos do SUS) e escolhido o Brevo (verificação de remetente único, sem precisar de domínio, 300 e-mails/dia grátis). Implementada nova classe `BrevoEmailService.js` (API HTTP via `fetch` nativo, sem dependência nova) com prioridade sobre `SmtpEmailService`/`ConsoleEmailService` em `main/factories/index.js`; remetente verificado: `reidner.s.medeiros@gmail.com`.
- Usuário pediu um workflow de CI (GitHub Actions) pra rodar os testes principais a cada commit, antes de mandar as mudanças de deploy pro GitHub. **Decisão #33 no `CONTEXTO.md`:** criado `.github/workflows/ci.yml` com dois jobs paralelos — `backend-tests` (`npm test --workspace backend`, roda os ~256 testes Jest já existentes contra os fakes em memória, sem precisar de banco/segredos) e `frontend-build` (`npm run build --workspace frontend`, valida que o build do Vite não quebrou). Usa `npm ci` a partir do `package-lock.json` da raiz (workspaces). Documentado no `README.md`.
- **Primeiro deploy real do projeto, guiado passo a passo com o usuário.** Backend criado no Render (`partify-backend`, root `backend`, build/start commands já configurados nas decisões #32/#34) — primeiro build falhou com `P1001: Can't reach database server at db.cwkxwmoymcmlswrvpruy.supabase.co:5432` (decisão #33, IPv6), corrigido trocando `DIRECT_URL` pro mesmo endereço do Session pooler já usado em `DATABASE_URL`; segundo build passou, migrations já estavam em dia, serviço ficou "Live" em `https://partify-backend-l1ye.onrender.com`. Frontend criado no Vercel (`frontend`, framework Vite detectado automaticamente, `VITE_API_URL` apontando pro Render) — a tela de import inicial da Vercel tentou detectar os dois workspaces do monorepo como "serviços" separados (recurso novo deles); orientado o usuário a manter só o serviço do `frontend`, ignorando a sugestão de subir o backend junto. Deploy do frontend concluído em `https://partify-frontend-gamma.vercel.app`; `FRONTEND_URL` atualizado no Render pra fechar o CORS. Discutido também como personalizar a URL da Vercel (renomear o projeto em Settings → General, ou domínio próprio via Settings → Domains).
- Verificado o funcionamento real do RF03 (recuperar senha) em produção — confirmado que `SMTP_HOST` vazio fazia o backend usar `ConsoleEmailService` (não envia e-mail de verdade). Toda a investigação/implementação do envio real está registrada no bullet da decisão #34 acima. **Confirmado pelo usuário que o envio funcionou** depois de configurar `BREVO_API_KEY`/`BREVO_SENDER_EMAIL`/`BREVO_SENDER_NAME` no Render — RF03 agora envia e-mail real em produção via Brevo.
- Usuário perguntou se dava pra melhorar visualmente o e-mail de redefinição de senha (RF03), que até então era só texto puro em tags `<p>` sem estilo. **Decisão #35 no `CONTEXTO.md`:** criado `backend/src/infra/email/templates/redefinicaoSenhaTemplate.js`, um template HTML de e-mail de verdade (estrutura em tabelas + estilos inline, pela limitação de suporte a CSS moderno em clientes como Outlook desktop), usando as cores da marca (`--partify-blue`) e um botão de call-to-action em vez de link cru. Optado por usar só o nome "Partify" estilizado em texto no lugar da logo real, pra não precisar hospedar a imagem publicamente só pra esse fim. Módulo compartilhado entre `BrevoEmailService` e `SmtpEmailService` (`ConsoleEmailService` não muda, continua modo dev). Nenhum teste unitário quebrou (nenhum dependia do HTML literal anterior).
- Exploração inicial do **Impeccable** (skill de design para IA — `github.com/pbakaus/impeccable`) pelo usuário, no Claude Code, pra tentar melhorar visualmente a tela de login. Orientado sobre instalação (`npx impeccable install`, hook automático via hospedagem de binário próprio — não instalado nesta sessão do Cowork por indisponibilidade recorrente do sandbox de shell, `HYPERVISOR_VIRT_DISABLED`; o usuário seguiu instalando via Claude Code diretamente). Passado um prompt de exploração de contexto (README/CONTEXTO/AGENTS/CLAUDE.md + estrutura de pastas) pra rodar antes do `/impeccable init`, e orientação de fluxo (`init` → `document` → `polish login`), já que o Impeccable identificou corretamente uma identidade visual existente (nome "Partify", `PartifyLogo.jsx`, paleta azul) a preservar, não substituir. `.gitignore` atualizado com o bloco de arquivos efêmeros do Impeccable (recomendação oficial da ferramenta) — trabalho de polish em si ainda em andamento no Claude Code, fora desta sessão.
- Ao revisar o `git status` antes do commit do template de e-mail, o usuário notou que o `.impeccable/` (config/produto/design da ferramenta), `frontend/PRODUCT.md`, `frontend/DESIGN.md` e os artefatos instalados nas ferramentas de IA (`.github/agents/`, `.github/hooks/impeccable.json`, `.github/skills/impeccable/`) tinham entrado no staging — nenhum desses é necessário pra rodar o projeto, mesma categoria dos arquivos de contexto pessoal já excluídos. `.gitignore` corrigido (`.impeccable/`, `PRODUCT.md`, `DESIGN.md`, `/.github/agents/`, `/.github/hooks/`, `/.github/skills/` — com cuidado pra não afetar `/.github/workflows/ci.yml`, que precisa continuar versionado). Usuário rodou `git reset && git add .` pra tirar esses arquivos do staging antes de commitar.
- O `/impeccable polish login`, rodado no Claude Code em paralelo a esta sessão, alterou `frontend/src/pages/LoginPage.jsx` e `frontend/src/styles/global.css`, mas o resultado visual ficou sutil (usuário relatou que "a tela não mudou muito") — mudança de baixo risco, aceita como parte do commit do dia junto com o template de e-mail.
- **Sessão encerrada com o projeto publicamente acessível pela primeira vez:** backend em `https://partify-backend-l1ye.onrender.com` (Render), frontend em `https://partify-frontend-gamma.vercel.app` (Vercel), banco/storage no Supabase, e-mail transacional com template visual via Brevo, CI rodando no GitHub Actions a cada push/PR na `main`.

## 26/09/2026 (sábado)

- Usuário pediu a distribuição de quantos testes unitários cada um dos 13 requisitos tem. Contagem feita direto nos arquivos de teste (bate com o total de 256 já documentado): RF01=32, RF02=15, RF03=9, RF04=16, RF05=49, RF06=10, RF07=12, RF08=14, RF09=26, RF10=15, RF11=13, RF12=10, RF13=11 (subtotal 232) + 24 testes transversais (16 de validadores de domínio CPF/CNPJ/e-mail, 8 de integração cruzando requisitos) = 256.
- Usuário pediu mais um teste pro RF03 (o mais enxuto, com só 9). Identificado um gap real: nenhum teste confirmava que `SolicitarRecuperacaoSenhaUseCase` registra o `empresaId` correto no log de auditoria — relevante porque é um dos poucos fluxos do sistema sem sessão autenticada (RF03 não tem JWT, o `empresaId` vem só da busca por login), então essa checagem de RNF11 nunca tinha sido feita explicitamente aqui. Adicionado o teste "registra o empresaId do usuário no log de auditoria (RNF11)" em `SolicitarRecuperacaoSenhaUseCase.test.js`, documentado em `TESTES.md`. RF03 passa de 9 para 10 testes; total do projeto passa de 256 para 257.

- Usuário pediu planejamento de 7 tipos de teste ainda não implementados (integração, API, funcional, E2E, regressão, exploratório, recuperação): avaliar viabilidade de cada um e detalhar um plano antes de escrever qualquer teste. Criado `PLANO_TESTES_AVANCADOS.md` (git-ignored, documentação de apoio pessoal) com: tabela de viabilidade por tipo; plano de suítes de integração real (banco Postgres+pgvector real via Docker local/service container no CI — único jeito de testar de verdade o `transacaoComRetry`, a busca vetorial real e o trigger de imutabilidade do log); plano de testes de API via `supertest`; esclarecimento de que "teste funcional" reaproveita a infra de API mas adiciona a primeira cobertura de testes do frontend (zero hoje — proposto Vitest + React Testing Library); plano de E2E via Playwright (poucas jornadas críticas, dado o custo/determinismo de tocar a Gemini API de verdade); esclarecimento de que "regressão" não é uma suíte nova, é a prática de reexecutar tudo via o `ci.yml` já existente; charters de teste exploratório (é manual por natureza, não dá pra automatizar); e teste de recuperação dividido em parte automatizável (retry de conexão com um Prisma falso, nunca testado apesar de já ter corrigido um bug real) e parte manual/checklist (reinício do servidor, pause do Supabase). Documento termina com ordem de implementação sugerida e lista de dependências novas necessárias por seção. Nenhum teste foi implementado ainda — só o plano.
- Usuário pediu pra atualizar a seção de teste exploratório do plano, definindo que a execução principal seria feita pelo **Google Antigravity** (agente de IA navegando a aplicação publicada), usando um prompt específico fornecido pelo usuário (só deve rodar dentro do Antigravity, não nesta sessão). Documentado no `PLANO_TESTES_AVANCADOS.md`: o prompt foi transcrito por referência; sinalizada uma ressalva técnica — o prompt pede "porcentagem de cobertura de código (statements/branches/functions)", que não é algo que navegação exploratória produz, é saída do `npm run test:coverage` (Jest) já existente no backend; se o Antigravity não tiver como rodar esse comando, esse número não deve ser inventado. Os charters manuais de apoio (arquivos hostis, isolamento multi-tenant, uso "errado") foram mantidos como complemento pros pontos que exigem manipulação de arquivo/DevTools, melhor feitos por humano.
- Usuário pediu ajuda pra estruturar o "teste de acurácia da IA" (RNF10, meta ≥75%) já mencionado no `doc2-testes-avaliacao.md`, mas nunca detalhado. Definida a metodologia: gabarito manual (dados corretos anotados a partir do PDF real) comparado com a extração de verdade da Gemini API, medindo acerto em dois níveis — campos gerais (marca/modelo/tensão) e peças (código + posição visual, o binômio do RN04) — com 4 categorias de resultado por peça (correta, código certo mas posição errada, não encontrada, alucinada). Usuário enviou 3 PDFs reais (Makita HR2470, DeWalt D28496MBR, Bosch GWS 6-115). **Decisão #39 no `CONTEXTO.md`:** lidos os 3 PDFs e transcritos manualmente os gabaritos completos (`backend/tests/acuracia-ia/gabaritos/*.json`), documentando no campo `"notas"` de cada um as ambiguidades reais encontradas (variantes de tensão do Makita, peças alternativas na mesma posição no DeWalt, variantes de espessura na mesma posição no Bosch). Criado `backend/scripts/testeAcuraciaIA.js` (`npm run teste:acuracia`), que chama a `GeminiExtractionService` de verdade e compara com o gabarito via algoritmo guloso de matching por código+posição, normalizando espaços/maiúsculas antes de comparar (o catálogo Bosch usa códigos com espaços internos). PDFs reais colocados em `backend/tests/acuracia-ia/pdfs/`, git-ignorado por serem material com direitos do fabricante — só os gabaritos (dados transcritos) ficam versionados. Documentado em `doc2-testes-avaliacao.md` e num novo README da pasta. Script não roda no CI (chama a API real, tem custo e não é determinístico) — é manual, sob demanda. Falta o usuário rodar `npm run teste:acuracia` de fato (precisa antes salvar os 3 PDFs na pasta `pdfs/`, já que eles chegaram só como upload no chat, não no disco do projeto).

## 24/09/2026 (quinta-feira)

- Usuário perguntou como evitar que o Supabase "durma" por inatividade. Pesquisa confirmou o mecanismo exato: pause automático após **7 dias sem consulta real ao banco** (não conta visita ao dashboard nem só requisição HTTP à API) — diferente da hibernação do Render (15 min sem tráfego HTTP), que a documentação oficial do Render diz não ser seguro/suportado contornar via ping externo. Perguntado sobre o que priorizar, o usuário optou por resolver só o Supabase, aceitando o cold start ocasional do Render (acorda sozinho no login). **Decisão #36 no `CONTEXTO.md`:** rota `GET /health` (`backend/src/http/routes/index.js`) passou a rodar `prisma.$queryRaw` (`SELECT 1`) em vez de só responder `{status: "ok"}` sem tocar o banco — é essa consulta real que conta como atividade pro Supabase. Criado `.github/workflows/keepalive.yml`, agendado 3x/semana (segunda/quarta/sexta) via `cron`, chamando `GET /health` por `curl`, com a URL do backend guardada como variável de repositório do GitHub (`vars.BACKEND_URL`, pública, não é segredo). Documentado no `README.md`, incluindo o passo de cadastrar essa variável no GitHub antes do workflow funcionar.

## 27/09/2026 (domingo)

- Primeira execução real do `npm run teste:acuracia` (RNF10). No caminho, dois obstáculos de ambiente resolvidos: os PDFs salvos pelo usuário foram parar em `backend/tests/pdfs/` em vez de `backend/tests/acuracia-ia/pdfs/` (corrigido apontando o script pro lugar certo, depois revertido quando o usuário reorganizou os arquivos de volta pra pasta original); e a Gemini API retornou `503 UNAVAILABLE` (alta demanda) na primeira tentativa em 2 dos 3 catálogos — resolvido adicionando retry automático com espera crescente (`extrairComRetry`, até 3 tentativas) e trocando `process.exit(1)` por `process.exitCode = 1` no tratamento de erro do script, evitando um crash do libuv que estava mascarando o erro real no Windows. **Decisão #40 no `CONTEXTO.md`:** resultado agregado real — **184/186 peças corretas (98,9%)**, meta do RNF10 (≥75%) atingida com folga. Campos gerais (marca/modelo/tensão) só 66,7%, mas a análise caso a caso mostrou que a maioria das divergências é imprecisão do gabarito manual, não erro da IA: código Bosch faltando o dígito inicial "2"; tensão/modelo do DeWalt provavelmente errados no gabarito (sufixo "MBR" sugere 127V, não 120V); tensão do Makita não é campo explícito no PDF (a IA respondeu corretamente "não informado"). Das 6 "alucinações", a maioria também era limitação do gabarito (linhas de sub-item `C10` e variantes 220V do Makita excluídas de propósito na transcrição, mas realmente impressas no catálogo) mais um bug de normalização real corrigido (`normalizarCodigo` não removia ponto final, então `681652-2.` não casava com `681652-2`). Perguntado se valia a pena ajustar os gabaritos pra tentar chegar mais perto de 100%, o usuário decidiu que não — 98,9% já demonstra a meta atingida com folga, e as imprecisões identificadas ficam documentadas como limitação conhecida da metodologia (gabarito manual), não como falha do modelo.
- Usuário pediu pra implementar o item 1 do `PLANO_TESTES_AVANCADOS.md` (teste de recuperação, parte automatizável — o de menor esforço da lista). **Decisão #41 no `CONTEXTO.md`:** exportada `transacaoComRetry` de `PrismaCatalogoRepository.js` (antes só usada internamente) e criado `backend/tests/unit/infra/transacaoComRetry.test.js` com 5 testes usando um Prisma falso (`{ $transaction: jest.fn() }`) injetado diretamente, sem precisar de banco real: sucesso na 3ª tentativa após 2 quedas de conexão P2028; esgotamento das 3 tentativas propagando o erro; NÃO aciona retry em P2028 de timeout (mensagem diferente); NÃO aciona retry em outros códigos de erro (ex. P2002); sucesso de primeira sem retentativa. Também estendido `ExtrairDadosCatalogoUseCase.test.js` com o teste previsto no plano: depois de uma falha E1, uma nova tentativa bem-sucedida não deixa resíduo (peça duplicada) da tentativa anterior. Usuário rodou `npm test` e confirmou: 274 testes, todos passando (34 suítes). Documentado também no `TESTES.md` (nova seção "Teste de recuperação (automatizável) — retry de transação") e marcado como concluído no `PLANO_TESTES_AVANCADOS.md` (item 1 da ordem sugerida). Próximo da lista: integração real (banco Postgres/pgvector via Docker/service container).
- Usuário pediu pra pular pro item 4 do plano (regressão) em vez de seguir a ordem sugerida. **Decisão #42 no `CONTEXTO.md`:** esclarecido que regressão não é uma suíte nova de código — é a prática de reexecutar tudo a cada mudança, já parcialmente coberta pelo `ci.yml` (roda os 274 testes a cada push/PR). O que realmente faltava era o checklist manual de regressão visual/UX (o CI não pega layout quebrado, cor errada etc.) — criado na seção 6 do `PLANO_TESTES_AVANCADOS.md`, com 8 itens reaproveitando os pontos já cobertos pela responsividade mobile (decisão #30, RNF02: comportamento em 360px, tabelas com scroll horizontal, formulários empilhados, alvo de toque dos botões, cor consistente entre app e e-mail, textos não cortados, estados vazios, erros de validação no campo certo). Expandir o `ci.yml` com jobs de integração/API real fica pendente até esses dois itens do plano existirem de fato — marcado como próximo passo dependente, não esquecido.
- Usuário pediu pra pular o item 2 (integração real) e ir direto pro item 3 (API/HTTP via supertest). **Decisão #43 no `CONTEXTO.md`:** como o composition root (`main/factories/index.js`) monta os repositórios concretos direto no `require`, sem ponto de injeção, testar `app` de verdade contra um banco real exigiria a infra do item 2 (ainda não implementada). Resolvido com `jest.doMock`: `backend/tests/api/helpers/appDeTeste.js` troca cada `PrismaXRepository`/serviço de IA/e-mail/storage pelo mesmo dublê dos testes unitários, com `jest.resetModules()` garantindo um `app` novo por teste. `BcryptHashService`/`JwtTokenService`/`NodeRandomTokenService` continuam reais (login/JWT testados de verdade). `main/factories/index.js` passou a exportar também os repositórios/serviços (antes só os controllers), pra popular/inspecionar estado nos testes. Criadas as 7 suítes do plano (authRoutes, empresaRoutes, usuarioRoutes, catalogoRoutes, consultaRoutes, logAuditoriaRoutes, middlewares — ~50 testes), cobrindo status HTTP, formato de erro (`{erro, campos}`), auth/JWT real, upload multipart, ordenação de rotas (`/catalogos/pendentes` vs `/catalogos/:id`) e RNF11 pela camada HTTP. `supertest` adicionado ao `package.json`. Documentado em `TESTES.md` e `PLANO_TESTES_AVANCADOS.md`. **Importante:** como o sandbox de shell continua indisponível, não deu pra rodar `npm test` durante a implementação — cada rota/Use Case envolvido foi conferido manualmente lendo o código-fonte antes de escrever cada teste, mas falta o usuário rodar `npm install` (novo devDependency) + `npm test` pra confirmar que passam de verdade.
- Usuário rodou `npm test -- tests/api` e reportou 34 falhas de 52. Analisado o log completo (salvo em arquivo pelo usuário, já que o terminal não deixava copiar tudo): todas as 34 falhas eram o mesmo erro (`expected 200, got 401` bem no login dentro do helper `cadastrarEmpresaELogar`). Causa raiz identificada: `FakeEmpresaRepository.criar` só grava o administrador dentro do `FakeUsuarioRepository` se as duas instâncias forem explicitamente ligadas (`empresaRepository.usuarioRepository = usuarioRepository`) — padrão que os testes unitários de `CriarEmpresaUseCase` já usavam, mas que faltava no harness novo (`appDeTeste.js`). Corrigido adicionando essa ligação logo após montar `factories`. Usuário rodou de novo: os 52 testes de API passaram. Rodou a suíte inteira (`npm test`, sem filtro) por precaução: 41 suítes, 326 testes, todos passando (274 antigos + 52 novos). Documentação atualizada marcando o item 3 do plano como implementado e verificado (não mais "pendente").
- Usuário pediu pra pular pro item 5 do plano (E2E), escolhendo (via pergunta direta) servidores de **desenvolvimento local** como alvo e **seed direto no banco** (em vez de gerar os dados via fluxo real de extração/validação) pras jornadas 4 e 5. **Decisão #44 no `CONTEXTO.md`:** investigadas todas as páginas do frontend relevantes (`App.jsx`, `LoginPage`, `CadastrarEmpresaPage`, `RecuperarSenhaPage`, `RedefinirSenhaPage`, `MenuPrincipalPage`, `ImportarCatalogoPage`, `ValidarCatalogoPage`, `ConsultarComponentesPage`, `ConsultaTecnicaPage`, `CatalogoPage`) pra levantar os seletores (`getByLabel`/`getByRole`) usados nos testes, e o backend (`ConsoleEmailService`, `SolicitarRecuperacaoSenhaUseCase`, `LocalFileStorageService`, `GeminiEmbeddingService`, `schema.prisma`) pra desenhar o seed. Criado o workspace `e2e/` (novo em `workspaces` do `package.json` raiz), com `playwright.config.js` (sem `webServer` — não sobe/derruba os servidores de dev sozinho, de propósito), `backend/prisma/seed-e2e.js` (idempotente, cria empresa+admin+catálogo já validado+peça com embedding REAL — única chamada de IA de verdade do script, pra busca semântica/RAG funcionarem de verdade nas jornadas 4/5) e as 5 specs em `e2e/tests/`. Resolvido também como capturar o link de redefinição de senha da jornada 3 sem uma caixa de e-mail de teste: novo helper `e2e/helpers/lerLinkRedefinicao.js` lê `backend/dev-server.log`, pro qual o usuário precisa redirecionar a saída do `npm run dev:backend` antes dessa jornada — mesmo workaround de redirecionar output a arquivo já usado nesta sessão pra ler resultado de `npm test`. Documentado passo a passo em `e2e/README.md`. **Sem execução real ainda** (sandbox de shell segue indisponível nesta sessão) — pendente o usuário rodar `npm install`, `npx playwright install chromium`, subir os servidores locais, rodar o seed e então `npm run e2e:test`, reportando o resultado de volta.

---

# SEÇÃO 6 — PLANO_TESTES_AVANCADOS.md

# Plano de Testes Avançados — Partify

> Este documento avalia a viabilidade de 7 tipos de teste ainda não implementados no projeto (integração real, API, funcional, E2E, regressão, exploratório e recuperação) e detalha o plano de cada um — o que será testado, onde, e com qual ferramenta — **antes** de qualquer teste ser efetivamente escrito. Complementa o `TESTES.md` (cobertura atual dos 257 testes unitários) e o `doc2-testes-avaliacao.md` (usabilidade/SUS/heurística).

## 0. Contexto: o que já existe vs. o que falta

Os 257 testes unitários atuais (Jest) cobrem toda a lógica de negócio (Use Cases) dos 13 requisitos, mas rodam **inteiramente em memória**, com dublês (fakes) substituindo banco de dados, storage, e-mail e IA. Isso deixa 4 lacunas reais, nunca exercitadas por um teste automatizado:

1. **Nenhum teste toca um banco Postgres real** — nem o Prisma Client de verdade, nem a extensão `pgvector`, nem o trigger de imutabilidade do log de auditoria (`immutable_audit_log.sql`), nem a lógica de retry (`transacaoComRetry`) que corrigiu o bug real de produção desta sessão.
2. **Nenhum teste passa pela camada HTTP** — rotas, middlewares (`authMiddleware`, `errorHandler`, CORS), códigos de status, formato de resposta JSON. Os testes atuais chamam os Use Cases diretamente, pulando o Express inteiro.
3. **O frontend não tem nenhum teste automatizado** — zero cobertura em `frontend/src`.
4. **Nada testa o sistema pelo navegador de verdade**, nem cenários de falha/recuperação de infraestrutura.

Os 7 tipos de teste pedidos endereçam exatamente essas lacunas, em graus de esforço diferentes.

## 1. Viabilidade por tipo de teste

| Tipo | Viabilidade | Ferramenta proposta | Observação principal |
|---|---|---|---|
| Integração (banco real) | **Alta** | Jest + Postgres real (Docker `pgvector/pgvector` local, ou service container no CI) | Único jeito de testar `pgvector`, o trigger de imutabilidade e o `transacaoComRetry` de verdade. |
| API (HTTP) | **Alta** | Jest + `supertest` | Reaproveita o mesmo banco de teste da integração; testa rotas/middlewares que hoje não têm cobertura nenhuma. |
| Funcional | **Alta** | `supertest` (cenários por RF) + Vitest/React Testing Library no frontend | Menos uma ferramenta nova e mais uma forma de organizar os testes por requisito (fluxo básico/alternativo/exceção do DERS), com adição do frontend, hoje sem nenhum teste. |
| E2E | **Média** | Playwright | Viável, mas caro em tempo/infraestrutura — precisa dos dois servidores rodando e toca a Gemini API de verdade num dos passos. Recomendo só 4-5 jornadas críticas, não todos os RFs. |
| Regressão | **Alta, mas não é uma suíte nova** | O `ci.yml` já existente + checklist manual curto | "Regressão" é uma prática (reexecutar tudo a cada mudança), não uma categoria de teste nova pra escrever do zero — já está parcialmente resolvida pelo CI. |
| Exploratório | **Alta** | Google Antigravity (agente de IA navegando a aplicação publicada) + charters manuais de apoio | Execução principal delegada ao Antigravity via prompt dedicado (seção 7); charters manuais complementam pontos que exigem manipulação de arquivo/DevTools. |
| Recuperação | **Média** | Jest (parte automatizável) + checklist manual (parte não automatizável) | O retry de conexão (`transacaoComRetry`) dá pra testar de verdade com um Prisma falso. Falha de servidor/rede real precisa de teste manual documentado. |

## 2. Teste de Integração (banco real)

**Objetivo:** validar o que os fakes não conseguem simular — comportamento real do Postgres/Prisma/pgvector.

**Infraestrutura necessária:** um banco de teste real, isolado do banco de produção. Duas opções, não excludentes:
- **Local:** Docker rodando a imagem `pgvector/pgvector:pg16` (mesma extensão que o Supabase usa), migrations aplicadas contra ele antes de rodar a suíte.
- **CI (GitHub Actions):** um `services: postgres` no `ci.yml` usando a mesma imagem `pgvector/pgvector:pg16` como container auxiliar — o job sobe o banco, roda `prisma migrate deploy`, executa os testes, descarta tudo ao final. Não precisa de credenciais nem de acesso à internet além do Docker Hub.

**Suítes propostas** (pasta nova: `backend/tests/integration-db/`):

| Arquivo | O que valida |
|---|---|
| `PrismaEmpresaRepository.test.js` | CRUD real, unicidade de login/CNPJ (constraint do banco, não só validação de aplicação). |
| `PrismaUsuarioRepository.test.js` | Isolamento multi-tenant nas queries reais (`WHERE empresaId = ...`), não só na lógica do Use Case. |
| `PrismaCatalogoRepository.test.js` | **O mais importante**: testa de verdade o `transacaoComRetry` e o `createMany` batching (decisão #31) contra transações reais; confirma que o timeout de 15s configurado é respeitado. |
| `PrismaComponenteRepository.test.js` | Busca vetorial real via `pgvector` (operador `<=>`), ordenação por similaridade de cosseno — os testes unitários atuais usam distância euclidiana como aproximação (documentado no `TESTES.md`), aqui se testa o operador real. |
| `PrismaLogAuditoriaRepository.test.js` | **Só é possível com banco real**: confirma que o trigger `immutable_audit_log.sql` rejeita de fato um `UPDATE`/`DELETE` no log (RNF09) — hoje isso nunca foi verificado automaticamente, só documentado. |

**Status: IMPLEMENTADO E VERIFICADO — 326 testes passando (274 anteriores + 52 de API), ver decisão #43 no `CONTEXTO.md`.**

## 3. Teste de API (HTTP)

**Objetivo:** testar a aplicação pela mesma porta de entrada que o usuário real usa — requisições HTTP — não pelos Use Cases diretamente.

**Ferramenta:** `supertest`, chamando `app` (exportado por `backend/src/app.js`) diretamente em memória, sem precisar subir um servidor de verdade.

**Decisão de implementação (diferente do plano original):** o composition root (`src/main/factories/index.js`) monta os repositórios/serviços concretos (Prisma, Gemini, e-mail, storage) direto no `require`, sem nenhum ponto de injeção externo — não dá pra simplesmente apontar `app` pra um banco de teste sem primeiro ter a infraestrutura do item 2 (Integração real). Em vez de esperar por ela, os testes de API usam `jest.doMock` (backend/tests/api/helpers/appDeTeste.js) pra substituir cada `PrismaXRepository`/`GeminiXService`/`ConsoleEmailService`/`LocalFileStorageService` pelo dublê equivalente já usado nos testes unitários (`tests/fakes/`), e `jest.resetModules()` garante um `app` (e um estado em memória) novo a cada teste. `BcryptHashService`/`JwtTokenService`/`NodeRandomTokenService` NÃO são mockados — são usados de verdade (só precisam de `JWT_SECRET`, setado pelo harness), então os testes de auth realmente emitem/validam JWTs de verdade, não um stub. `src/main/factories/index.js` também passou a exportar os repositórios/serviços (além dos controllers já exportados), pra que os testes possam popular/inspecionar o estado por trás do `app` sob teste (ex.: configurar `factories.extractionService.proximaResposta` antes de um upload, ou ler `factories.emailService.enviados` depois de um `POST /auth/recuperar-senha`) sem precisar de 3 requisições HTTP em sequência só pra chegar a um estado de teste.

**Suítes implementadas** (`backend/tests/api/`, 52 testes, todos passando):

| Arquivo | O que valida |
|---|---|
| ✅ `authRoutes.test.js` | Login retorna JWT de verdade (3 segmentos) + 200; credenciais erradas (login inexistente ou senha errada) retornam 401 genérico (RNF05); logout invalida o token (requisição seguinte com o mesmo token falha); recuperar-senha sempre 200 (RNF05) e envia e-mail via `FakeEmailService` só quando os dados conferem; redefinir-senha com o token do e-mail funciona e a senha antiga para de funcionar; alterar-senha com senha atual errada não muda nada. |
| ✅ `empresaRoutes.test.js` | Cadastro público (sem token) funciona e retorna 201; dados incompletos retornam 422 com `campos`; CNPJ/CPF duplicado retorna 409; `/empresas/me` (GET/PUT) exige token; desativar a empresa bloqueia login de todos os usuários dela. |
| ✅ `usuarioRoutes.test.js` | Rotas de admin retornam 403 pra perfil Técnico (testado pela rota HTTP de verdade, com `authMiddleware` + `exigirAdministrador` reais); fluxo completo criar → listar → desativar → reativar via HTTP, confirmando que desativar bloqueia login e reativar libera de novo. |
| ✅ `catalogoRoutes.test.js` | Upload multipart via `.attach()` com um PDF de verdade; rejeita arquivo que não é PDF (422) e requisição sem arquivo (422); `/catalogos/pendentes` não é capturada pela rota dinâmica `/catalogos/:id` (confirma a ordenação de rotas do Express); validação HITL (PUT `/catalogos/:id/validar`); RNF11 — catálogo de uma empresa retorna 404 com o token de outra. |
| ✅ `consultaRoutes.test.js` | Base sem registros retorna `semRegistrosNaBase`/`CONTEXTO_INSUFICIENTE`; busca exata + semântica combinadas sem duplicar; filtro por marca via query string; termo/pergunta vazios retornam 422. |
| ✅ `logAuditoriaRoutes.test.js` | Só admin acessa (403 pra Técnico); filtra por `tipoAcao` via query string; RNF11 — log de uma empresa não aparece pra outra. |
| ✅ `middlewares.test.js` | CORS: o header `Access-Control-Allow-Origin` é sempre a URL fixa de `FRONTEND_URL`, nunca reflete a origem da requisição; rota inexistente retorna 404; `errorHandler` formata `DomainError`/`ValidationError` (com `campos`) no mesmo formato JSON; `authMiddleware`/`exigirAdministrador` bloqueiam corretamente (401/403) e liberam com token/perfil válido. |

**Verificado:** `npm install` + `npm test` confirmaram os 52 testes novos passando, junto com os 274 já existentes (326 no total, 41 suítes). Na primeira rodada, 34 testes falharam por um bug real no harness (`empresaRepository`/`usuarioRepository` não ligados — ver decisão #43 no `CONTEXTO.md`), corrigido e reverificado.

**Nota sobre RF07 (extração via IA):** os testes de API do fluxo de catálogo vão até o upload (RF06) sem necessariamente disparar uma chamada real à Gemini API — a verificação da extração de verdade continua a cargo do "Teste de acurácia da IA" já planejado no `doc2-testes-avaliacao.md` (manual, com PDFs reais).

## 4. Teste Funcional

**Definição adotada:** valida se cada requisito funciona como especificado no DERS, na perspectiva de "caixa-preta" (sem olhar a implementação) — organizado por fluxo básico/alternativo/exceção de cada RF, não por classe/função testada.

**Como implementar sem duplicar esforço:** os testes de API (seção 3) já servem como a forma executável dos testes funcionais de backend — a diferença é só de organização/documentação (agrupar por RF em vez de por rota). Proposta: uma tabela de rastreabilidade (RF → cenário funcional → onde está verificado) no próprio `TESTES.md`.

**Lacuna que os testes de API não cobrem: o frontend.** Hoje não existe nenhum teste ali. Proposta de adicionar (dependências novas: `vitest` + `@testing-library/react` + `jsdom` — Vitest é o parceiro natural do Vite, já usado no projeto):

| Arquivo (`frontend/tests/`) | O que valida |
|---|---|
| `LoginPage.test.jsx` | Envio do formulário chama `authService.login`; mensagens de erro de campo aparecem; redirecionamento após sucesso. |
| `ImportarCatalogoPage.test.jsx` | Validação client-side de PDF (rejeita outros formatos antes de enviar). |
| `ValidarCatalogoPage.test.jsx` | Barras de confiança renderizam pela cor certa; adicionar/remover peça atualiza a lista. |
| `ConsultarComponentesPage.test.jsx` | Toggle de modo de busca não desabilita o outro motor (decisão #23); estado vazio aparece quando não há resultado. |
| `ProtectedRoute.test.jsx` | Redireciona pra `/login` sem token; libera acesso com token válido. |

## 5. Teste E2E (ponta a ponta, navegador real)

**Status: IMPLEMENTADO, PENDENTE DE VERIFICAÇÃO (ver decisão #44 no `CONTEXTO.md`).**

**Ferramenta:** Playwright (mais completo que Cypress para este caso, com bom suporte a CI gratuito).

**Decisão de implementação (confirmada com o usuário antes de escrever código):** alvo é o par de servidores de **desenvolvimento local** (`npm run dev:backend`/`npm run dev:frontend`), não um build de produção nem CI — `e2e/playwright.config.js` não sobe/derruba os servidores sozinho. Os dados usados pelas jornadas 4 e 5 são **semeados direto no banco** (`backend/prisma/seed-e2e.js`, idempotente), em vez de rodar o fluxo real de extração/validação a cada execução — evita custo/latência/não-determinismo de uma segunda chamada de IA por execução. O embedding da peça semeada, porém, é gerado com uma chamada REAL à Gemini API (única exceção, dentro do próprio script de seed), porque um vetor aleatório provavelmente faria a busca semântica/RAG não considerar a peça relevante.

**Ressalva de custo/determinismo:** as jornadas 2 (importação real) e 5 (consulta técnica via RAG) chamam a Gemini API de verdade — não dá pra mockar sem alterar a arquitetura de composição atual (`main/factories/index.js` sempre monta os serviços concretos). Isso é aceitável (custo por chamada é fração de centavo, já documentado), mas significa que o E2E não deve rodar a cada `git push` — só sob demanda ou antes de marcos importantes (ex.: antes da apresentação do TCC).

**Jornadas implementadas** (pasta `e2e/`, fora de `backend/`/`frontend/`, testando os servidores de dev locais):

1. Cadastro de empresa → login → logout. `e2e/tests/01-cadastro-login-logout.spec.js` — autocontida, cria empresa própria a cada execução.
2. Login → importar catálogo (PDF real de `backend/tests/acuracia-ia/pdfs/`) → validação HITL → aparece em "Manter Catálogo". `e2e/tests/02-importar-validar-catalogo.spec.js` — autocontida, mas usa a Gemini API de verdade; a asserção verifica que o fluxo chega ao fim, não os valores exatos extraídos (isso já é coberto pelo teste de acurácia da IA, RNF10).
3. Esqueci minha senha → e-mail chega → redefinição → login com a senha nova. `e2e/tests/03-recuperar-redefinir-senha.spec.js` — usa o administrador semeado; como o projeto não tem caixa de e-mail de teste, o "e-mail chega" é verificado lendo o link que o `ConsoleEmailService` imprime no console do backend, através de `backend/dev-server.log` (o usuário precisa redirecionar a saída do `npm run dev:backend` pra esse arquivo antes de rodar essa jornada — mesmo workaround de redirecionar output a arquivo já usado nesta sessão pra ler resultado de `npm test`). Esta etapa continua, na prática, "verificação semiautomática do recebimento" — não há garantia de que funcionaria contra uma caixa de e-mail real de produção.
4. Consultar Componentes → busca por código exato e por descrição semântica → abrir vista explodida. `e2e/tests/04-consultar-componentes.spec.js` — usa a peça semeada.
5. Consulta Técnica (IA) → pergunta → resposta com fonte citada. `e2e/tests/05-consulta-tecnica-ia.spec.js` — usa a peça semeada e a Gemini API de verdade (RAG); a asserção verifica a situação `RESPONDIDO` e a fonte citada, não o texto exato gerado.

**Como rodar:** passo a passo completo em `e2e/README.md` (instalar dependências/navegadores, configurar `.env`, rodar backend com saída redirecionada a arquivo, rodar o seed, rodar `npm run e2e:test`).

**Pendente:** nenhuma execução real foi feita ainda — o sandbox de execução deste agente ficou indisponível nesta sessão (mesma limitação de sessões anteriores, quando o próprio usuário rodou `npm install`/`npm test`/`prisma migrate` e reportou os resultados). Os seletores foram levantados lendo cada página do frontend (`getByLabel`/`getByRole`), mas só uma execução real confirma se estão certos e se os tempos de espera (extração/RAG reais podem ser lentos) são suficientes.

## 6. Teste de Regressão

**Status: IMPLEMENTADO dentro do que já é possível agora (ver decisão #42 no `CONTEXTO.md`).**

**Esclarecimento importante:** regressão não é uma categoria de teste nova pra escrever — é a prática de reexecutar os testes já existentes (unitários, integração, API) a cada mudança, pra garantir que nada que já funcionava quebrou. Isso **já está implementado para a parte automatizada que existe hoje**: o `.github/workflows/ci.yml` roda os 274 testes unitários/integração em memória a cada push/PR na `main` — nenhuma mudança de código é aceita na `main` sem essa suíte passar.

**Pendente pra depois** (não dá pra fazer ainda, porque as suítes em si não existem): quando os itens 2 (Integração real) e 3 (API) deste plano forem implementados, `ci.yml` precisa ganhar os jobs correspondentes (banco de teste via service container Postgres/pgvector) — hoje ele só roda a suíte 100% em memória.

**Checklist manual de regressão visual/UX** (roda antes de cada entrega/demonstração importante — coisas que o CI não pega, porque são visuais, não lógicas):

| # | Item | Onde reproduzir |
|---|---|---|
| 1 | Layout não quebra em 360px de largura (RNF02) | Cada tela do sistema, DevTools em modo responsivo ou celular real |
| 2 | Tabelas (RF05/RF09/RF13) rolam horizontalmente em vez de espremer colunas em tela estreita | `.table-card`/`.data-table`, decisão #30 |
| 3 | Formulários empilham os campos (não ficam lado a lado forçado) abaixo de 640px | `.form-row` (RF01/RF06), `.filtros-row` (RF09/RF13), `.peca-row__campos` (RF08/RF09) |
| 4 | Botões de ação em tabela têm alvo de toque adequado (≥40×40px) no mobile | `.icon-btn`, qualquer tela com ações em linha de tabela |
| 5 | Cores da marca (`--partify-blue`/`--partify-blue-dark`) consistentes entre app e e-mail de redefinição de senha | Tela de login/menu vs. e-mail recebido (RF03) |
| 6 | Nenhum texto/botão cortado ou sobreposto nas 3 larguras de referência (360px, 768px, 1440px) | Todas as telas principais |
| 7 | Estado vazio (sem resultado/sem pendências) aparece com mensagem clara, não uma tela em branco | Consultar Componentes (RF11), fila de pendentes (RF10) |
| 8 | Mensagens de erro de validação aparecem no campo certo, sem quebrar o layout do formulário | Qualquer formulário (RF01, RF05, RF06...) |

Esse checklist reaproveita os pontos já cobertos pela responsividade (decisão #30, RNF02) e não depende do Impeccable especificamente — é feito a olho, manualmente, antes de cada marco importante (ex.: antes da apresentação do TCC).

## 7. Teste Exploratório

**Natureza do teste:** é manual/não roteirizado por definição — o "roteiro" que se cria de antemão é só a missão/área de foco (charter), não um script de passos fixos. Neste projeto, a execução será feita por um agente de IA agindo como QA autônomo dentro do **Google Antigravity**, navegando a aplicação publicada e reportando os achados — em vez de (ou além de) uma pessoa humana clicando manualmente.

**Ferramenta de execução:** Google Antigravity (`antigravity.google`), usando o prompt abaixo. **Esse prompt só deve ser rodado dentro do Antigravity**, não nesta sessão — aqui fica só documentado, como registro do plano.

> Atue como um Especialista em QA e Engenheiro de Software Sênior. Sua tarefa é realizar uma auditoria completa de testes
> Realize um teste de navegação exploratório no sistema. Percorra todos os menus principais, submenus e botões de rodapé. Identifique links quebrados, telas sem botão de 'voltar' e garanta que todas as páginas carreguem corretamente. Logo após gere o documento com os resultados e os casos dos testes realizados.
> Após a execução, gere um documento técnico (PDF ou Markdown) contendo:
> Resumo Executivo: Porcentagem de cobertura de código (statements, branches, functions).
> Casos de Teste: Uma tabela detalhando o ID do teste, descrição do cenário, entradas utilizadas e o resultado esperado.
> Relatório de Falhas: Caso algum teste falhe, descreva o erro encontrado e sugira a correção.
> Logs de Execução: Status final (Pass/Fail) de cada suíte de testes.
> O documento final deve ser organizado de forma profissional, pronto para apresentação em um processo de Code Review.

**Ressalva técnica importante sobre esse prompt:** ele mistura duas coisas de natureza diferente, e vale ter isso claro na hora de ler o relatório final do Antigravity:
- A parte de **navegação exploratória** (menus, submenus, botões de rodapé, links quebrados, telas sem "voltar", páginas carregando) é genuinamente exploratória — o Antigravity precisa acessar a aplicação publicada (`https://partify-frontend-gamma.vercel.app`) de verdade pra produzir isso.
- Já a **"porcentagem de cobertura de código (statements, branches, functions)"** não é algo que navegação exploratória produz — é a saída do relatório de cobertura do Jest, já disponível via `npm run test:coverage` no backend (script já existente no `package.json`). O Antigravity não tem como calcular isso só navegando pelo navegador; se ele tentar estimar isso sem rodar a suíte de verdade, o número seria inventado. Se quiser esse dado no documento final, o caminho correto é rodar `npm run test:coverage` separadamente e colar o resultado real, ou pedir ao Antigravity pra também executar esse comando (se ele tiver acesso a terminal no seu ambiente).

**Charters de apoio, caso queira complementar com uma sessão humana também** (útil pros 2 usuários externos do SUS, que trazem uma perspectiva que um agente de IA não replica):

| Charter | Missão | Tempo |
|---|---|---|
| 1 — Arquivos hostis | Tentar importar: PDF corrompido, PDF de 0 páginas, arquivo `.pdf` que na verdade é outro formato, PDF gigante (>20MB) | 30 min |
| 2 — Só teclado | Navegar o sistema inteiro sem usar o mouse (Tab/Enter/Esc) | 20 min |
| 3 — Furar o isolamento | Tentar acessar/manipular dados de outra empresa trocando IDs manualmente na URL ou no DevTools | 30 min |
| 4 — Celular de verdade | Usar o sistema num celular real (não emulador), em rede móvel | 20 min |
| 5 — Uso "errado" | Duplo clique em botões de submit, voltar o navegador no meio de um fluxo, abrir duas abas com o mesmo catálogo | 20 min |

**Quem executa:** a navegação exploratória geral (menus/links/botões) fica a cargo do Antigravity, com o prompt acima. Os charters 1, 3 e 5 (que exigem manipular arquivos/DevTools de forma mais específica) ficam melhor com execução humana — sua ou dos usuários externos do SUS.

## 8. Teste de Recuperação

**Status: parte automatizável IMPLEMENTADA (ver decisão #41 no `CONTEXTO.md`).**

**Parte automatizável** (Jest, sem precisar de banco real — usa um Prisma falso injetado diretamente):

| Arquivo | O que valida |
|---|---|
| ✅ `backend/tests/unit/infra/transacaoComRetry.test.js` | Um Prisma falso que falha com `P2028`/"transaction not found" nas 2 primeiras tentativas e sucede na 3ª — confirma que o retry (decisão #31) realmente funciona, nunca testado até hoje apesar de já ter corrigido um bug real em produção. Também confirma que o `P2028` de timeout (mensagem diferente) NÃO aciona retry, propagando o erro imediatamente, e que outros erros (ex. P2002) também não acionam retry. 5 testes. |
| ✅ Extensão de `ExtrairDadosCatalogoUseCase.test.js` | Depois de uma falha de comunicação (E1), uma nova tentativa bem-sucedida não deixa nenhum resíduo do estado anterior (ex.: peças duplicadas). |

**Parte manual/documentada** (checklist, não código — cenários de infraestrutura real):
- Reiniciar o backend no Render durante uma requisição em andamento — confirmar erro claro pro usuário, sem estado inconsistente no banco.
- Pausar manualmente o projeto no Supabase (simulando o pause por inatividade que resolvemos) e confirmar que `/health` responde 503 de forma controlada, sem derrubar o processo Node.
- Confirmar que o cold start do Render (plano free) não causa timeout no frontend — o Vercel/Axios deveria esperar ou mostrar uma mensagem de carregamento adequada.

## 9. Ordem sugerida de implementação

Considerando esforço x valor pro TCC, nesta ordem:

1. ✅ **Recuperação (parte automatizável)** — IMPLEMENTADA (decisão #41). Menor esforço, testa um bug real já corrigido, alto valor de "história pra contar" na defesa do TCC.
2. **Integração (banco real)** — maior gap de cobertura real, viabiliza o item 3.
3. ✅ **API (HTTP)** — IMPLEMENTADA sem esperar o item 2 (decisão #43): em vez do banco de teste real planejado originalmente, os testes usam `jest.doMock` pra trocar cada repositório/serviço concreto (Prisma, Gemini, e-mail, storage) pelos mesmos dublês dos testes unitários, montando um `app` Express de verdade a cada teste. Cobre auth/empresa/usuário/catálogo/consulta/log de auditoria/middlewares via `supertest`. Quando o item 2 existir, pode-se opcionalmente ADICIONAR uma segunda suíte de API contra o banco real (mais próxima de produção), mas a cobertura de HTTP (rotas, status code, formato de resposta, autenticação/autorização) já está garantida por esta suíte.
4. ✅ **Regressão** — IMPLEMENTADA dentro do que já é possível (decisão #42): `ci.yml` já cobre a suíte atual automaticamente + checklist manual de regressão visual criado. Falta só expandir o `ci.yml` com os jobs de integração/API quando os itens 2 e 3 existirem.
5. **Funcional (frontend)** — primeira cobertura de testes do frontend, zero hoje.
6. **Exploratório** — baixo custo, só requer tempo de execução manual.
7. ✅ **E2E** — IMPLEMENTADO, pendente de verificação (decisão #44), adiantado a pedido do usuário sem esperar os itens 2 e 6. Maior esforço de setup entre os 7 itens; as 5 jornadas do plano foram todas escritas, mas nenhuma rodou de verdade ainda.

## 10. Dependências novas necessárias (resumo)

| Pacote | Onde | Para qual seção |
|---|---|---|
| `supertest` | `backend` (devDependency) | 3 |
| `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` | `frontend` (devDependency) | 4 |
| `@playwright/test` | novo workspace `e2e/` ou raiz | 5 |
| Nenhum pacote novo | — | 2 (só infra: Docker local ou service container no CI), 6, 7, 8 |

---

Nenhum teste deste plano foi implementado ainda — este documento é só o planejamento, pra aprovação antes de começar a escrever código de teste.

---

# SEÇÃO 7 — LEMBRETES.md

# Lembretes

## 16/09/2026

- [ ] **Rotacionar credenciais o quanto antes — reforçado hoje.** A senha do Postgres (`DATABASE_URL`/`DIRECT_URL`) foi colada em texto puro no chat MAIS DUAS VEZES nesta sessão (ao configurar o `DIRECT_URL` no Render), somando-se às exposições de 14/09. Nenhuma credencial nova foi exposta hoje além dessa repetição (a chave de API do Brevo, gerada hoje, não foi colada no chat — só confirmado que foi gerada). Ver item equivalente de 14/09 abaixo pra lista completa do que rotacionar. Como o projeto agora está publicado (Render + Vercel) e sendo usado de verdade, essa rotação deixou de ser só teórica — vale fazer antes de continuar usando em produção.

- [ ] `/impeccable polish login` teve efeito visual sutil na tela de login — se quiser um resultado mais perceptível, vale tentar `/impeccable craft login` (fluxo completo com iteração visual) ou `/impeccable bolder login` num momento futuro, já com o `DESIGN.md`/`PRODUCT.md` gerados nesta sessão como base.

## 14/09/2026

- [ ] **Rotacionar credenciais coladas em texto puro no chat nesta sessão:** senha do Postgres/`DATABASE_URL`/`DIRECT_URL`, `JWT_SECRET`, `GEMINI_API_KEY` (o `.env` inteiro foi colado) e a `SUPABASE_SERVICE_ROLE_KEY` (`sb_secret_...`, colada em mensagem separada). Nada disso foi commitado (protegido pelo `.gitignore`), mas ficou registrado na conversa — trocar a senha do banco no Supabase, gerar novo `JWT_SECRET`, revogar/gerar nova chave Gemini e regenerar a `service_role`/`secret` key do Supabase (Settings → API Keys → regenerate) assim que possível. **Se a senha do Postgres for trocada, lembre de atualizar `DATABASE_URL`/`DIRECT_URL` em três lugares:** `backend/.env` local, as env vars do Render, e (se usar em algum script local) qualquer conexão direta via `psql`.
- [ ] Confirmar se `GEMINI_EMBEDDING_MODEL` deveria ser `gemini-embedding-2-preview` em vez de `gemini-embedding-2` (achado ao pesquisar a lista oficial de modelos em setembro/2026 — ver decisão #14/#29 no `CONTEXTO.md`). Ainda não corrigido nem testado.
- [ ] Gap conhecido, ainda não corrigido: `ExtrairDadosCatalogoUseCase#classificarResultado` não trata o caso de um documento com marca/modelo/tensão identificados mas zero peças extraídas (ex.: ferramenta real sem vista explodida) — o catálogo fica `PENDENTE_VALIDACAO` e pode virar órfão no banco se o validador sair sem salvar (ver HISTORICO.md, 14/09/2026, e "O que ainda NÃO foi implementado" no `CONTEXTO.md`).
- [ ] Migrar/reprocessar os PDFs de teste antigos salvos em `backend/storage/catalogos/` (via `LocalFileStorageService`) agora que o projeto passou a usar `SupabaseStorageService` — os catálogos antigos no banco apontam pra arquivos que não existem no bucket do Supabase. Recomendado: truncar as tabelas do catálogo técnico e reimportar do zero, já que são só dados de teste.

## Resolvidos

- [x] RF03 (recuperar senha) enviando e-mail real em produção — configurado `BrevoEmailService` (API HTTP do Brevo, contorna o bloqueio de portas SMTP do Render) em 16/09/2026, confirmado funcionando pelo usuário.
- [x] Apagar manualmente o arquivo órfão `backend/src/agentesIA/AgenteExtrator/GeminiEmbeddingService.js` — apagado pelo usuário em 14/09/2026, confirmado via `git status` antes do commit inicial.
- [x] Apagar manualmente a pasta órfã `backend/src/infra/ai/` — apagada pelo usuário em 14/09/2026, confirmado via `git status` antes do commit inicial.
- [x] Revogar as duas chaves antigas da Gemini API expostas (uma colada no chat, outra encontrada em `backend/.env.example`) — o `.env.example` já foi corrigido faz tempo (só placeholders); a troca de modelo pra `gemini-3.5-flash` (decisão #29) foi feita sobre uma chave já nova.
- [ ] Checar `git log --all -p -- backend/.env.example` pra confirmar se a chave antiga chegou a ser commitada — só relevante se este repositório já tiver sido versionado antes da limpeza; o repositório atual (`github.com/ReidnerMedeiros/Partify`) foi iniciado do zero já sem a chave, então este item não se aplica a ele.
- [ ] Apagar este próprio arquivo, `LEMBRETES.md` — segue sem ferramenta de exclusão disponível; mantido como registro de pendências.

---

# SEÇÃO 8 — Notas finais de consolidação e correção de números de testes

Esta seção final resolve uma inconsistência entre os documentos originais: `CONTEXTO.md` e `PLANO_TESTES_AVANCADOS.md` foram escritos em momentos diferentes e citam totais de teste defasados (257, 274) em algumas passagens. O número **verificado e correto, na sessão mais recente antes desta consolidação**, é:

## Contagem final de testes (verificada via análise dos arquivos de teste + confirmação de `npm test`)

**Total: 326 testes automatizados, em 41 suítes (arquivos) — todos passando.**

### Por tipo de teste

| Tipo | Quantidade | Onde |
| --- | --- | --- |
| Unitário (Use Cases, 1 por RF) | 234 | `backend/tests/unit/useCases/**` |
| Unitário transversal — validadores (CPF/CNPJ/e-mail) | 27 | `backend/tests/unit/domain/validators/**` |
| Unitário transversal — retry/recuperação de transação | 5 | `backend/tests/unit/infra/transacaoComRetry.test.js` |
| **Subtotal unitário** | **266** | |
| Integração (cruzando requisitos) | 8 | `backend/tests/integration/**` (3 arquivos: fluxoCadastroLoginDesativacao=4, fluxoRecuperarRedefinirSenha=2, fluxoAlterarSenha=2) |
| API/HTTP (supertest) | 52 | `backend/tests/api/**` (7 arquivos: authRoutes=10, empresaRoutes=7, usuarioRoutes=4, catalogoRoutes=8, consultaRoutes=9, logAuditoriaRoutes=5, middlewares=9) |
| **Total geral (Jest, `npm test`)** | **326** | 41 suítes |

Além disso, dois conjuntos de teste ficam **fora** desse total de 326 (não rodam via `npm test`/Jest):

- **E2E (Playwright)**: 5 specs de jornada completa em `e2e/tests/`, implementadas mas **ainda não executadas de verdade** (pendente de verificação — ver decisão #44 no CONTEXTO.md). Rodam via `npm run e2e:test`, não via `npm test`.
- **Teste de acurácia da IA (RNF10)**: script manual `npm run teste:acuracia`, chama a Gemini API real. **Já executado**: resultado real de 184/186 peças corretas (98,9%), acima do mínimo de 75% exigido pelo RNF10 (decisão #40 no CONTEXTO.md).

### Por requisito funcional (testes unitários, 1:1 por RF — subtotal 234)

| RF | Descrição | Testes |
| --- | --- | --- |
| RF01 | Manter Empresa | 32 |
| RF02 | Realizar Login | 15 |
| RF03 | Recuperar Senha | 10 |
| RF04 | Alterar Senha | 16 |
| RF05 | Manter Usuário | 49 |
| RF06 | Importar Catálogo | 10 |
| RF07 | Extração Multimodal via IA | 13 |
| RF08 | Interface de Validação (HITL) | 14 |
| RF09 | Manter Catálogo | 32 |
| RF10 | Manter Documentos Pendentes | 9 |
| RF11 | Consulta de Componentes | 13 |
| RF12 | Consulta Técnica via RAG | 10 |
| RF13 | Manter Log Sistema (ADM) | 11 |
| **Subtotal RF01-RF13** | | **234** |

Este total de 234 (por RF) + 27 (validadores) + 5 (retry) = 266 unitários; + 8 integração + 52 API = **326**, confirmado por `npm test` real rodado pelo usuário.

> **Nota de proveniência dos números:** os números antigos "257" e "274" que aparecem em algumas passagens de `CONTEXTO.md`/`PLANO_TESTES_AVANCADOS.md` acima refletem o estado do projeto no momento em que cada trecho foi escrito (antes da implementação dos testes de API, decisão #43). O número autoritativo, mais recente e verificado é o 326 desta seção — em caso de conflito entre um número citado em outra seção deste arquivo e o 326 aqui, **prevaleça este**.
