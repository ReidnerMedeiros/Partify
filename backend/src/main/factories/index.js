/**
 * Composition root ("main", no vocabulário da Clean Architecture): é o único
 * lugar do backend que conhece simultaneamente Domain, Use Cases, Infra e HTTP.
 * Controllers e Use Cases nunca importam Prisma/bcrypt/jsonwebtoken diretamente —
 * tudo é montado aqui e injetado via construtor.
 */
const { prisma } = require("../../infra/database/prismaClient");
const { PrismaEmpresaRepository } = require("../../infra/database/repositories/PrismaEmpresaRepository");
const { PrismaUsuarioRepository } = require("../../infra/database/repositories/PrismaUsuarioRepository");
const { PrismaLogAuditoriaRepository } = require("../../infra/database/repositories/PrismaLogAuditoriaRepository");
const { PrismaSessaoRevogadaRepository } = require("../../infra/database/repositories/PrismaSessaoRevogadaRepository");
const { PrismaTokenRedefinicaoSenhaRepository } = require("../../infra/database/repositories/PrismaTokenRedefinicaoSenhaRepository");
const { PrismaCatalogoRepository } = require("../../infra/database/repositories/PrismaCatalogoRepository");
const { PrismaValidacaoRepository } = require("../../infra/database/repositories/PrismaValidacaoRepository");
const { PrismaComponenteRepository } = require("../../infra/database/repositories/PrismaComponenteRepository");
const { BcryptHashService } = require("../../infra/security/BcryptHashService");
const { JwtTokenService } = require("../../infra/security/JwtTokenService");
const { NodeRandomTokenService } = require("../../infra/security/NodeRandomTokenService");
const { ConsoleEmailService } = require("../../infra/email/ConsoleEmailService");
const { SmtpEmailService } = require("../../infra/email/SmtpEmailService");
const { BrevoEmailService } = require("../../infra/email/BrevoEmailService");
const { LocalFileStorageService } = require("../../infra/storage/LocalFileStorageService");
const { SupabaseStorageService } = require("../../infra/storage/SupabaseStorageService");
// Agentes de IA ficam isolados em src/agentesIA/, separados da infra genérica.
// Os 3 agentes descritos no DERS (Extrator, Validador, Consulta) têm cada um
// sua própria classe — inclusive quando duas delas fazem tecnicamente a mesma
// chamada de API (embedContent), pra manter a divisão de responsabilidades
// clara em vez de concentrar tudo no Agente Extrator (decisão #25 em CONTEXTO.md).
const { GeminiExtractionService } = require("../../agentesIA/AgenteExtrator/GeminiExtractionService");
const { GeminiEmbeddingService: GeminiEmbeddingServiceValidador } = require("../../agentesIA/AgenteValidador/GeminiEmbeddingService");
const { GeminiEmbeddingService: GeminiEmbeddingServiceConsulta } = require("../../agentesIA/AgenteConsulta/GeminiEmbeddingService");
const { GeminiRAGService } = require("../../agentesIA/AgenteConsulta/GeminiRAGService");

const { CriarEmpresaUseCase } = require("../../useCases/empresa/CriarEmpresaUseCase");
const { ConsultarEmpresaUseCase } = require("../../useCases/empresa/ConsultarEmpresaUseCase");
const { AtualizarEmpresaUseCase } = require("../../useCases/empresa/AtualizarEmpresaUseCase");
const { DesativarEmpresaUseCase } = require("../../useCases/empresa/DesativarEmpresaUseCase");
const { AutenticarUsuarioUseCase } = require("../../useCases/auth/AutenticarUsuarioUseCase");
const { LogoutUseCase } = require("../../useCases/auth/LogoutUseCase");
const { SolicitarRecuperacaoSenhaUseCase } = require("../../useCases/auth/SolicitarRecuperacaoSenhaUseCase");
const { RedefinirSenhaUseCase } = require("../../useCases/auth/RedefinirSenhaUseCase");
const { AlterarSenhaUseCase } = require("../../useCases/auth/AlterarSenhaUseCase");
const { CriarUsuarioUseCase } = require("../../useCases/usuario/CriarUsuarioUseCase");
const { ListarUsuariosUseCase } = require("../../useCases/usuario/ListarUsuariosUseCase");
const { AtualizarUsuarioUseCase } = require("../../useCases/usuario/AtualizarUsuarioUseCase");
const { DesativarUsuarioUseCase } = require("../../useCases/usuario/DesativarUsuarioUseCase");
const { ReativarUsuarioUseCase } = require("../../useCases/usuario/ReativarUsuarioUseCase");
const { ImportarCatalogoUseCase } = require("../../useCases/catalogo/ImportarCatalogoUseCase");
const { ExtrairDadosCatalogoUseCase } = require("../../useCases/catalogo/ExtrairDadosCatalogoUseCase");
const { ValidarCatalogoUseCase } = require("../../useCases/catalogo/ValidarCatalogoUseCase");
const { ListarPecasUseCase } = require("../../useCases/catalogo/ListarPecasUseCase");
const { BuscarCatalogoParaEdicaoUseCase } = require("../../useCases/catalogo/BuscarCatalogoParaEdicaoUseCase");
const { AtualizarCatalogoUseCase } = require("../../useCases/catalogo/AtualizarCatalogoUseCase");
const { ExcluirPecaUseCase } = require("../../useCases/catalogo/ExcluirPecaUseCase");
const { BaixarArquivoCatalogoUseCase } = require("../../useCases/catalogo/BaixarArquivoCatalogoUseCase");
const { ListarDocumentosPendentesUseCase } = require("../../useCases/catalogo/ListarDocumentosPendentesUseCase");
const { BuscarDocumentoPendenteUseCase } = require("../../useCases/catalogo/BuscarDocumentoPendenteUseCase");
const { ExcluirCatalogoUseCase } = require("../../useCases/catalogo/ExcluirCatalogoUseCase");
const { BuscarComponentesUseCase } = require("../../useCases/consulta/BuscarComponentesUseCase");
const { ConsultarViaRagUseCase } = require("../../useCases/consulta/ConsultarViaRagUseCase");
const { ConsultarLogAuditoriaUseCase } = require("../../useCases/log/ConsultarLogAuditoriaUseCase");

const { EmpresaController } = require("../../http/controllers/EmpresaController");
const { AuthController } = require("../../http/controllers/AuthController");
const { UsuarioController } = require("../../http/controllers/UsuarioController");
const { CatalogoController } = require("../../http/controllers/CatalogoController");
const { ConsultaController } = require("../../http/controllers/ConsultaController");
const { LogAuditoriaController } = require("../../http/controllers/LogAuditoriaController");
const { criarAuthMiddleware, criarExigirAdministrador } = require("../../http/middlewares/authMiddleware");

// --- Infra (adaptadores concretos) -----------------------------------------
const empresaRepository = new PrismaEmpresaRepository(prisma);
const usuarioRepository = new PrismaUsuarioRepository(prisma);
const logAuditoriaRepository = new PrismaLogAuditoriaRepository(prisma);
const sessaoRevogadaRepository = new PrismaSessaoRevogadaRepository(prisma);
const tokenRedefinicaoSenhaRepository = new PrismaTokenRedefinicaoSenhaRepository(prisma);
const catalogoRepository = new PrismaCatalogoRepository(prisma);
const validacaoRepository = new PrismaValidacaoRepository(prisma);
const componenteRepository = new PrismaComponenteRepository(prisma);

const hashService = new BcryptHashService();
const tokenService = new JwtTokenService({
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN,
});
const randomTokenService = new NodeRandomTokenService();

// Ordem de prioridade: BREVO_API_KEY (produção recomendada — API HTTP, não é
// afetada pelo bloqueio de portas SMTP que plataformas como o Render aplicam em
// planos gratuitos) > SMTP_HOST (SMTP tradicional, só funciona em plataformas/
// planos que permitem saída SMTP) > ConsoleEmailService (dev: apenas registra o
// link de redefinição no console do servidor).
const emailService = process.env.BREVO_API_KEY
  ? new BrevoEmailService({
      apiKey: process.env.BREVO_API_KEY,
      remetenteEmail: process.env.BREVO_SENDER_EMAIL,
      remetenteNome: process.env.BREVO_SENDER_NAME,
    })
  : process.env.SMTP_HOST
  ? new SmtpEmailService({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      remetente: process.env.SMTP_FROM,
    })
  : new ConsoleEmailService();

// RF06 — em produção (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY configurados) salva os
// PDFs no Supabase Storage; em dev, salva em disco dentro do próprio backend
// (backend/storage/), sem exigir um bucket configurado para testar o fluxo localmente.
const fileStorageService = process.env.SUPABASE_URL
  ? new SupabaseStorageService({
      url: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      bucket: process.env.SUPABASE_STORAGE_BUCKET,
    })
  : new LocalFileStorageService();

// RF07/RF08 — modelo configurável via .env porque os identificadores de modelo da
// Gemini API mudam com frequência; confirme o valor atual em
// https://ai.google.dev/gemini-api/docs/models antes de configurar em produção.
const extractionService = new GeminiExtractionService({
  apiKey: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_MODEL,
});
// RF08/RF09 — Agente Validador: gera o embedding só depois da confirmação
// humana (decisão #16). Instância própria, isolada do Agente de Consulta.
const embeddingServiceValidador = new GeminiEmbeddingServiceValidador({
  apiKey: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_EMBEDDING_MODEL,
});
// RF11/RF12 — Agente de Consulta: instância própria (não reaproveita a do
// Agente Validador) pra vetorizar termo de busca/pergunta — mesmo
// GEMINI_EMBEDDING_MODEL das duas, senão os vetores não seriam comparáveis
// no espaço do pgvector (decisão #25 em CONTEXTO.md).
const embeddingServiceConsulta = new GeminiEmbeddingServiceConsulta({
  apiKey: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_EMBEDDING_MODEL,
});
// RF12 — segunda capacidade do Agente de Consulta (geração de resposta via
// RAG). Reaproveita o mesmo GEMINI_MODEL do Agente Extrator (RF07), já que só
// precisa de geração de texto estruturado, sem multimodalidade.
const ragService = new GeminiRAGService({
  apiKey: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_MODEL,
});

// --- Use Cases ---------------------------------------------------------------
const criarEmpresaUseCase = new CriarEmpresaUseCase({ empresaRepository, usuarioRepository, hashService, logAuditoriaRepository });
const consultarEmpresaUseCase = new ConsultarEmpresaUseCase({ empresaRepository });
const atualizarEmpresaUseCase = new AtualizarEmpresaUseCase({ empresaRepository, logAuditoriaRepository });
const desativarEmpresaUseCase = new DesativarEmpresaUseCase({ empresaRepository, logAuditoriaRepository });

const autenticarUsuarioUseCase = new AutenticarUsuarioUseCase({
  usuarioRepository,
  empresaRepository,
  hashService,
  tokenService,
  logAuditoriaRepository,
});
const logoutUseCase = new LogoutUseCase({ sessaoRevogadaRepository, logAuditoriaRepository });
const solicitarRecuperacaoSenhaUseCase = new SolicitarRecuperacaoSenhaUseCase({
  usuarioRepository,
  tokenRedefinicaoSenhaRepository,
  randomTokenService,
  emailService,
  logAuditoriaRepository,
  frontendUrl: process.env.FRONTEND_URL,
});
const redefinirSenhaUseCase = new RedefinirSenhaUseCase({
  usuarioRepository,
  tokenRedefinicaoSenhaRepository,
  randomTokenService,
  hashService,
  logAuditoriaRepository,
});
const alterarSenhaUseCase = new AlterarSenhaUseCase({ usuarioRepository, hashService, logAuditoriaRepository });

const criarUsuarioUseCase = new CriarUsuarioUseCase({ usuarioRepository, hashService, logAuditoriaRepository });
const listarUsuariosUseCase = new ListarUsuariosUseCase({ usuarioRepository });
const atualizarUsuarioUseCase = new AtualizarUsuarioUseCase({ usuarioRepository, logAuditoriaRepository });
const desativarUsuarioUseCase = new DesativarUsuarioUseCase({ usuarioRepository, logAuditoriaRepository });
const reativarUsuarioUseCase = new ReativarUsuarioUseCase({ usuarioRepository, logAuditoriaRepository });

const importarCatalogoUseCase = new ImportarCatalogoUseCase({ catalogoRepository, fileStorageService, logAuditoriaRepository });
const extrairDadosCatalogoUseCase = new ExtrairDadosCatalogoUseCase({
  catalogoRepository,
  fileStorageService,
  extractionService,
  logAuditoriaRepository,
});
const validarCatalogoUseCase = new ValidarCatalogoUseCase({
  catalogoRepository,
  validacaoRepository,
  embeddingService: embeddingServiceValidador,
  logAuditoriaRepository,
});
const listarPecasUseCase = new ListarPecasUseCase({ catalogoRepository });
const buscarCatalogoParaEdicaoUseCase = new BuscarCatalogoParaEdicaoUseCase({ catalogoRepository });
const atualizarCatalogoUseCase = new AtualizarCatalogoUseCase({
  catalogoRepository,
  embeddingService: embeddingServiceValidador,
  logAuditoriaRepository,
});
const excluirPecaUseCase = new ExcluirPecaUseCase({ catalogoRepository, logAuditoriaRepository });
const baixarArquivoCatalogoUseCase = new BaixarArquivoCatalogoUseCase({ catalogoRepository, fileStorageService });
const listarDocumentosPendentesUseCase = new ListarDocumentosPendentesUseCase({ catalogoRepository });
const buscarDocumentoPendenteUseCase = new BuscarDocumentoPendenteUseCase({ catalogoRepository });
const excluirCatalogoUseCase = new ExcluirCatalogoUseCase({ catalogoRepository, logAuditoriaRepository });
// RF11 — usa a instância própria do Agente de Consulta (embeddingServiceConsulta),
// separada da do Agente Validador (decisão #25 em CONTEXTO.md).
const buscarComponentesUseCase = new BuscarComponentesUseCase({
  componenteRepository,
  embeddingService: embeddingServiceConsulta,
});
// RF12 — reaproveita componenteRepository.buscarPorSimilaridadeSemantica (RF11)
// pra recuperação, a mesma instância embeddingServiceConsulta do Agente de
// Consulta pra vetorizar a pergunta, e ragService (mesmo agente) pra gerar a resposta.
const consultarViaRagUseCase = new ConsultarViaRagUseCase({
  componenteRepository,
  embeddingService: embeddingServiceConsulta,
  ragService,
});
// RF13 — reaproveita usuarioRepository (mesmo repositório do RF05) só para
// resolver o nome de cada usuário responsável a partir do usuarioId bruto do log.
const consultarLogAuditoriaUseCase = new ConsultarLogAuditoriaUseCase({ logAuditoriaRepository, usuarioRepository });

// --- Controllers ---------------------------------------------------------------
const empresaController = new EmpresaController({
  criarEmpresaUseCase,
  consultarEmpresaUseCase,
  atualizarEmpresaUseCase,
  desativarEmpresaUseCase,
});
const authController = new AuthController({
  autenticarUsuarioUseCase,
  logoutUseCase,
  solicitarRecuperacaoSenhaUseCase,
  redefinirSenhaUseCase,
  alterarSenhaUseCase,
});
const usuarioController = new UsuarioController({
  criarUsuarioUseCase,
  listarUsuariosUseCase,
  atualizarUsuarioUseCase,
  desativarUsuarioUseCase,
  reativarUsuarioUseCase,
});
const catalogoController = new CatalogoController({
  importarCatalogoUseCase,
  extrairDadosCatalogoUseCase,
  validarCatalogoUseCase,
  listarPecasUseCase,
  buscarCatalogoParaEdicaoUseCase,
  atualizarCatalogoUseCase,
  excluirPecaUseCase,
  baixarArquivoCatalogoUseCase,
  listarDocumentosPendentesUseCase,
  buscarDocumentoPendenteUseCase,
  excluirCatalogoUseCase,
});
const consultaController = new ConsultaController({ buscarComponentesUseCase, consultarViaRagUseCase });
const logAuditoriaController = new LogAuditoriaController({ consultarLogAuditoriaUseCase });

// --- Middlewares ---------------------------------------------------------------
const authMiddleware = criarAuthMiddleware(tokenService, sessaoRevogadaRepository, logAuditoriaRepository);
const exigirAdministrador = criarExigirAdministrador(logAuditoriaRepository);

module.exports = {
  empresaController,
  authController,
  usuarioController,
  catalogoController,
  consultaController,
  logAuditoriaController,
  authMiddleware,
  exigirAdministrador,
};
