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

Para o RF03 (envio do e-mail de redefinição de senha), configure as variáveis `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM`. Se `SMTP_HOST` ficar em branco, o backend usa um `ConsoleEmailService` de desenvolvimento, que apenas imprime o link de redefinição no console do servidor — útil para testar o fluxo localmente sem um provedor de e-mail real.

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

- **backend-tests**: `npm test --workspace backend` (Jest, ~256 testes contra os fakes em memória — não precisa de banco nem de segredos configurados no CI).
- **frontend-build**: `npm run build --workspace frontend` (garante que o build do Vite não quebrou).

Se algum dos dois falhar, o commit/PR aparece marcado com ❌ no GitHub — é o sinal de que algo quebrou antes de ir pra produção.

## Deploy (Render + Vercel)

### Backend no Render

1. Crie um **Web Service** apontando para este repositório, com **Root Directory** `backend`.
2. Build Command: `npm install && npm run build` (o script `build` roda `prisma generate` e `prisma migrate deploy` contra o banco de produção).
3. Start Command: `npm start`.
4. Cadastre as variáveis de ambiente no painel do Render (não use o `.env` local — ele fica fora do repositório): `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_EMBEDDING_MODEL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `FRONTEND_URL` (URL do frontend no Vercel, usada pelo CORS e pelo link de redefinição de senha) e, se quiser envio real de e-mail, as `SMTP_*`.
5. Rode manualmente uma vez, direto no SQL Editor do Supabase (ou via `psql`), o script `backend/prisma/manual/immutable_audit_log.sql` — ele não é aplicado pelas migrations do Prisma.

### Frontend no Vercel

1. Importe o repositório com **Root Directory** `frontend` (o `frontend/vercel.json` já inclui o rewrite necessário para o roteamento client-side do React Router funcionar em URLs diretas, ex. dar refresh em `/menu`).
2. Framework preset: Vite (build command `npm run build`, output `dist`).
3. Cadastre a env var `VITE_API_URL` apontando para a URL pública do backend no Render.
4. Depois do primeiro deploy do frontend, volte no Render e atualize `FRONTEND_URL` com a URL definitiva do Vercel.

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
