/**
 * Gera os embeddings das peças que ficaram sem vetor (coluna `embedding` nula),
 * por exemplo quando a cota por minuto da Gemini API estourou durante a validação
 * de um catálogo grande (a validação é best-effort e segue sem o vetor).
 *
 * Não altera nenhum outro dado. Pode ser executado quantas vezes for preciso:
 * só toca em peças com embedding nulo. Respeita o limite do plano gratuito
 * (100 pedidos/minuto) com um intervalo entre as chamadas.
 *
 * Uso (na pasta backend/, com o .env configurado):
 *   npm run embeddings:faltantes            (só as peças sem embedding)
 *   npm run embeddings:faltantes -- --todas (regera todas, ao trocar o modelo)
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { GeminiEmbeddingService } = require("../src/agentesIA/AgenteValidador/GeminiEmbeddingService");

const INTERVALO_MS = 700; // ~85 pedidos/minuto, abaixo do limite de 100

function aguardar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const prisma = new PrismaClient();
  const embeddingService = new GeminiEmbeddingService({
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_EMBEDDING_MODEL,
  });

  try {
    // Com --todas, regera o vetor de TODAS as peças (necessário ao trocar o modelo
    // de embedding, pois vetores de modelos diferentes não são comparáveis).
    const todas = process.argv.includes("--todas");
    const pecas = todas
      ? await prisma.$queryRaw`SELECT id, codigo, descricao FROM pecas ORDER BY "criadoEm" ASC`
      : await prisma.$queryRaw`SELECT id, codigo, descricao FROM pecas WHERE embedding IS NULL ORDER BY "criadoEm" ASC`;
    console.log(`${todas ? "Peças a regerar (todas)" : "Peças sem embedding"}: ${pecas.length}`);

    let gerados = 0;
    let falhas = 0;
    for (const [indice, peca] of pecas.entries()) {
      try {
        const texto = [peca.codigo, peca.descricao].filter(Boolean).join(" — ");
        const vetor = await embeddingService.gerarEmbedding(texto);
        const vetorLiteral = `[${vetor.join(",")}]`;
        await prisma.$executeRaw`UPDATE pecas SET embedding = ${vetorLiteral}::vector WHERE id = ${peca.id}`;
        gerados += 1;
      } catch (erro) {
        falhas += 1;
        console.error(`Falhou na peça ${peca.id}: ${String(erro.message).slice(0, 120)}`);
        if (erro.esgotouCota) {
          console.error("Cota diária da Gemini API esgotada. Pare por hoje e rode de novo depois do reset.");
          break;
        }
      }
      if ((indice + 1) % 20 === 0) console.log(`  ${indice + 1}/${pecas.length} processadas...`);
      await aguardar(INTERVALO_MS);
    }

    console.log(`Concluído. Gerados: ${gerados}. Falhas: ${falhas}.`);
    if (falhas > 0) console.log("Rode o comando de novo para tentar as que falharam.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
