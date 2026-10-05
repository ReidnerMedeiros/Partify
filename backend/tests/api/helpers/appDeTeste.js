/**
 * Harness dos testes de API (backend/tests/api/). Diferente dos testes
 * unitários (que injetam fakes diretamente nos Use Cases), aqui o alvo é a
 * camada HTTP de verdade — Express, rotas, middlewares — usando `supertest`
 * contra o `app` real (`src/app.js`).
 *
 * Como o composition root (`src/main/factories/index.js`) monta os
 * repositórios/serviços concretos (Prisma, Gemini, Brevo/SMTP, Supabase
 * Storage) direto no `require`, sem nenhum ponto de injeção externo, não dá
 * pra simplesmente importar `app` e testar contra um banco real sem a
 * infraestrutura do item de Integração (Postgres via Docker/service
 * container, ainda não implementada). A alternativa usada aqui, até essa
 * infra existir: `jest.doMock` substitui cada classe concreta de
 * infra/agentesIA pelo dublê equivalente já usado nos testes unitários
 * (`tests/fakes/`), e `jest.resetModules()` garante que cada teste receba uma
 * instância nova do `app` (e do estado em memória por trás dela) — sem isso,
 * o composition root é montado uma única vez (singleton) e o estado vazaria
 * de um teste para o outro.
 *
 * `prepararApp()` retorna `{ app, factories }`: `app` é o Express app pronto
 * pra usar com `supertest(app)`; `factories` é o composition root já
 * remontado com os fakes, útil pra popular dados diretamente (sem precisar
 * fazer 3 requisições HTTP em sequência só pra chegar a um estado de teste)
 * ou inspecionar o que ficou registrado (ex.: `factories.logAuditoriaRepository.registros`).
 */
function prepararApp() {
  process.env.JWT_SECRET = "segredo-de-teste-api";
  process.env.JWT_EXPIRES_IN = "1h";
  process.env.FRONTEND_URL = "http://localhost:5173";
  // Garante a implementação padrão (ConsoleEmailService, mockada abaixo para
  // FakeEmailService) e evita que um .env local com chaves reais influencie
  // qual implementação concreta o composition root escolhe.
  delete process.env.BREVO_API_KEY;
  delete process.env.SMTP_HOST;
  delete process.env.SUPABASE_URL;

  jest.resetModules();

  jest.doMock("../../../src/infra/database/prismaClient", () => ({
    // Só usado diretamente pela rota /health — nenhum repositório mockado
    // abaixo chega a tocar este objeto.
    prisma: { $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]) },
  }));

  jest.doMock("../../../src/infra/database/repositories/PrismaEmpresaRepository", () => ({
    PrismaEmpresaRepository: require("../../fakes/FakeEmpresaRepository").FakeEmpresaRepository,
  }));
  jest.doMock("../../../src/infra/database/repositories/PrismaUsuarioRepository", () => ({
    PrismaUsuarioRepository: require("../../fakes/FakeUsuarioRepository").FakeUsuarioRepository,
  }));
  jest.doMock("../../../src/infra/database/repositories/PrismaLogAuditoriaRepository", () => ({
    PrismaLogAuditoriaRepository: require("../../fakes/FakeLogAuditoriaRepository").FakeLogAuditoriaRepository,
  }));
  jest.doMock("../../../src/infra/database/repositories/PrismaSessaoRevogadaRepository", () => ({
    PrismaSessaoRevogadaRepository: require("../../fakes/FakeSessaoRevogadaRepository").FakeSessaoRevogadaRepository,
  }));
  jest.doMock("../../../src/infra/database/repositories/PrismaTokenRedefinicaoSenhaRepository", () => ({
    PrismaTokenRedefinicaoSenhaRepository: require("../../fakes/FakeTokenRedefinicaoSenhaRepository").FakeTokenRedefinicaoSenhaRepository,
  }));
  jest.doMock("../../../src/infra/database/repositories/PrismaCatalogoRepository", () => ({
    PrismaCatalogoRepository: require("../../fakes/FakeCatalogoRepository").FakeCatalogoRepository,
    // O módulo real também exporta `transacaoComRetry` (usado só internamente
    // pelo Prisma de verdade) — não é usado pelo composition root, mas mantido
    // aqui por completude caso algo mude a importar futuramente.
    transacaoComRetry: jest.fn(),
  }));
  jest.doMock("../../../src/infra/database/repositories/PrismaValidacaoRepository", () => ({
    PrismaValidacaoRepository: require("../../fakes/FakeValidacaoRepository").FakeValidacaoRepository,
  }));
  jest.doMock("../../../src/infra/database/repositories/PrismaComponenteRepository", () => ({
    PrismaComponenteRepository: require("../../fakes/FakeComponenteRepository").FakeComponenteRepository,
  }));

  jest.doMock("../../../src/infra/email/ConsoleEmailService", () => ({
    ConsoleEmailService: require("../../fakes/FakeEmailService").FakeEmailService,
  }));
  jest.doMock("../../../src/infra/storage/LocalFileStorageService", () => ({
    LocalFileStorageService: require("../../fakes/FakeFileStorageService").FakeFileStorageService,
  }));

  jest.doMock("../../../src/agentesIA/AgenteExtrator/GeminiExtractionService", () => ({
    GeminiExtractionService: require("../../fakes/FakeExtractionService").FakeExtractionService,
  }));
  jest.doMock("../../../src/agentesIA/AgenteValidador/GeminiEmbeddingService", () => ({
    GeminiEmbeddingService: require("../../fakes/FakeEmbeddingService").FakeEmbeddingService,
  }));
  jest.doMock("../../../src/agentesIA/AgenteConsulta/GeminiEmbeddingService", () => ({
    GeminiEmbeddingService: require("../../fakes/FakeEmbeddingService").FakeEmbeddingService,
  }));
  jest.doMock("../../../src/agentesIA/AgenteConsulta/GeminiRAGService", () => ({
    GeminiRAGService: require("../../fakes/FakeRAGService").FakeRAGService,
  }));

  const { app } = require("../../../src/app");
  const factories = require("../../../src/main/factories");

  // FakeEmpresaRepository.criar só grava o administrador recém-criado dentro
  // do FakeUsuarioRepository se as duas instâncias forem explicitamente
  // ligadas (mesmo padrão usado nos testes unitários de CriarEmpresaUseCase)
  // — a implementação real (PrismaEmpresaRepository) faz isso via uma única
  // transação de banco, então o dublê precisa dessa referência cruzada pra
  // replicar o mesmo efeito. Sem isso, o administrador nunca aparece nas
  // buscas por login do FakeUsuarioRepository (ex.: POST /auth/login).
  factories.empresaRepository.usuarioRepository = factories.usuarioRepository;

  return { app, factories };
}

module.exports = { prepararApp };
