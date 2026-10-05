/**
 * Seed E2E — item 5 de PLANO_TESTES_AVANCADOS.md (jornadas 4 e 5).
 *
 * Popula, DIRETAMENTE no banco configurado em backend/.env (DATABASE_URL), uma
 * empresa + usuário administrador de teste e um catálogo já VALIDADO (com peça
 * e embedding reais), para que "Consultar Componentes" (RF11) e "Consulta
 * Técnica (IA)" (RF12) tenham o que buscar sem precisar rodar o fluxo real de
 * upload → extração (RF06/RF07) → validação (RF08) na hora do teste E2E — essa
 * decisão foi tomada explicitamente para evitar custo/latência/não-determinismo
 * de uma segunda chamada de extração por execução (ver CONTEXTO.md).
 *
 * O embedding da peça, porém, É gerado com uma chamada REAL à Gemini API (só
 * uma, aqui no seed) — um vetor aleatório faria a busca semântica (RF11) e o
 * RAG (RF12) provavelmente não encontrarem a peça como relevante, o que
 * quebraria as duas jornadas que mais dependem desses agentes. Isso é o único
 * uso de IA "de verdade" deste script.
 *
 * Idempotente: pode ser rodado várias vezes — se a empresa de teste já existir
 * (mesmo CNPJ fixo), ela e tudo que depende dela são apagados e recriados do
 * zero, para o E2E sempre partir de um estado limpo e conhecido.
 *
 * Uso (a partir da pasta backend/, com backend/.env configurado):
 *   npm run seed:e2e
 * ou, a partir da raiz do monorepo:
 *   npm run e2e:seed
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { GeminiEmbeddingService } = require("../src/agentesIA/AgenteValidador/GeminiEmbeddingService");

const prisma = new PrismaClient();

// CNPJ fixo e válido (mesmo algoritmo de check-digit usado em
// tests/api/helpers/cenarios.js e em src/domain/validators/documentValidator.js),
// só para este seed ser idempotente por identidade (@unique em Empresa.cnpjCpf).
const CNPJ_EMPRESA_E2E = "11222333000181";

const DADOS_EMPRESA = {
  nome: "Oficina E2E Partify",
  cnpjCpf: CNPJ_EMPRESA_E2E,
  telefone: "(64) 99999-0000",
  email: "e2e@partify.teste",
};

const DADOS_ADMIN = {
  nome: "Administrador E2E",
  email: "admin.e2e@partify.teste",
  login: "admin.e2e",
  senha: "senha12345",
};

const DADOS_CATALOGO = {
  marca: "Makita",
  modelo: "4100NH",
  tensao: "V127",
};

const DADOS_PECA = {
  codigo: "422119-0",
  descricao: "Induzido completo 127V para esmerilhadeira Makita 4100NH",
  posicaoVisual: "12",
  confianca: 96,
};

const PDF_FIXTURE_ORIGEM = path.join(__dirname, "..", "tests", "acuracia-ia", "pdfs", "makita-hr2470.pdf");
const DIRETORIO_STORAGE = path.join(__dirname, "..", "storage", "catalogos");

function copiarPdfFixture() {
  fs.mkdirSync(DIRETORIO_STORAGE, { recursive: true });
  const nomeArmazenado = `${randomUUID()}-catalogo-e2e-seed.pdf`;
  const destino = path.join(DIRETORIO_STORAGE, nomeArmazenado);

  if (fs.existsSync(PDF_FIXTURE_ORIGEM)) {
    fs.copyFileSync(PDF_FIXTURE_ORIGEM, destino);
  } else {
    // Fallback: PDF mínimo válido (cabeçalho + trailer), só para o botão
    // "Ver Vista Explodida" ter algo para abrir — não é usado por nenhuma
    // asserção do E2E, que checa apenas que a nova aba abre sem erro.
    console.warn(
      `[seed-e2e] PDF de fixture não encontrado em ${PDF_FIXTURE_ORIGEM} — usando um PDF mínimo de placeholder.`
    );
    const pdfMinimo = "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF";
    fs.writeFileSync(destino, pdfMinimo);
  }

  return `local/${nomeArmazenado}`;
}

async function removerEmpresaExistente() {
  const empresaExistente = await prisma.empresa.findUnique({ where: { cnpjCpf: CNPJ_EMPRESA_E2E } });
  if (!empresaExistente) return;

  const empresaId = empresaExistente.id;
  console.log(`[seed-e2e] Empresa de teste já existia (${empresaId}) — apagando para recriar do zero...`);

  // Ordem respeita as FKs do schema.prisma (filhos antes dos pais).
  await prisma.validacao.deleteMany({ where: { empresaId } });
  await prisma.peca.deleteMany({ where: { empresaId } });
  await prisma.catalogo.deleteMany({ where: { empresaId } });
  await prisma.versaoTensao.deleteMany({ where: { empresaId } });
  await prisma.ferramenta.deleteMany({ where: { empresaId } });
  await prisma.marca.deleteMany({ where: { empresaId } });
  await prisma.logAuditoria.deleteMany({ where: { empresaId } });
  await prisma.tokenRedefinicaoSenha.deleteMany({ where: { usuario: { empresaId } } });
  await prisma.sessaoRevogada.deleteMany({ where: { usuario: { empresaId } } });
  await prisma.usuario.deleteMany({ where: { empresaId } });
  await prisma.empresa.delete({ where: { id: empresaId } });
}

async function seed() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY não configurada em backend/.env — necessária para gerar o embedding real da peça de teste (jornadas 4 e 5 do E2E)."
    );
  }

  await removerEmpresaExistente();

  const senhaHash = await bcrypt.hash(DADOS_ADMIN.senha, 10);

  const empresa = await prisma.empresa.create({
    data: {
      ...DADOS_EMPRESA,
      usuarios: {
        create: {
          nome: DADOS_ADMIN.nome,
          email: DADOS_ADMIN.email,
          login: DADOS_ADMIN.login,
          senhaHash,
          perfil: "ADMINISTRADOR",
        },
      },
    },
    include: { usuarios: true },
  });
  const administrador = empresa.usuarios[0];
  console.log(`[seed-e2e] Empresa "${empresa.nome}" criada (${empresa.id}).`);
  console.log(`[seed-e2e] Login de teste: ${DADOS_ADMIN.login} / senha: ${DADOS_ADMIN.senha}`);

  const marca = await prisma.marca.create({ data: { nome: DADOS_CATALOGO.marca, empresaId: empresa.id } });
  const ferramenta = await prisma.ferramenta.create({
    data: { modelo: DADOS_CATALOGO.modelo, marcaId: marca.id, empresaId: empresa.id },
  });
  const versaoTensao = await prisma.versaoTensao.create({
    data: { tensao: DADOS_CATALOGO.tensao, ferramentaId: ferramenta.id, empresaId: empresa.id },
  });

  const caminhoArquivo = copiarPdfFixture();
  const catalogo = await prisma.catalogo.create({
    data: {
      empresaId: empresa.id,
      nomeArquivo: "makita-4100nh-seed-e2e.pdf",
      caminhoArquivo,
      status: "VALIDADO",
      confiancaCampos: { marca: 96, modelo: 96, tensao: 96 },
      confiancaGeral: 96,
    },
  });

  const peca = await prisma.peca.create({
    data: {
      empresaId: empresa.id,
      codigo: DADOS_PECA.codigo,
      descricao: DADOS_PECA.descricao,
      posicaoVisual: DADOS_PECA.posicaoVisual,
      confianca: DADOS_PECA.confianca,
      versaoTensaoId: versaoTensao.id,
      catalogoId: catalogo.id,
    },
  });

  await prisma.validacao.create({
    data: { empresaId: empresa.id, catalogoId: catalogo.id, usuarioId: administrador.id },
  });

  console.log("[seed-e2e] Gerando embedding real da peça via Gemini API (única chamada de IA deste script)...");
  const embeddingService = new GeminiEmbeddingService({
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_EMBEDDING_MODEL,
  });
  const textoParaEmbedding = `${DADOS_CATALOGO.marca} ${DADOS_CATALOGO.modelo} ${DADOS_PECA.codigo} ${DADOS_PECA.descricao}`;
  const vetor = await embeddingService.gerarEmbedding(textoParaEmbedding);
  const vetorLiteral = `[${vetor.join(",")}]`;
  // Mesmo padrão de PrismaCatalogoRepository.atualizarEmbeddingPeca — $executeRaw
  // com tagged template parametriza vetorLiteral/peca.id (sem concatenação crua).
  await prisma.$executeRaw`UPDATE pecas SET embedding = ${vetorLiteral}::vector WHERE id = ${peca.id}`;

  console.log("[seed-e2e] Concluído. Peça de teste:");
  console.log(`  código: ${DADOS_PECA.codigo} | marca: ${DADOS_CATALOGO.marca} | modelo: ${DADOS_CATALOGO.modelo}`);
  console.log(`  descrição: "${DADOS_PECA.descricao}"`);
}

seed()
  .catch((erro) => {
    console.error("[seed-e2e] Falhou:", erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
