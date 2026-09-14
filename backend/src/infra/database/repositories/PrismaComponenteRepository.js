const { Prisma } = require("@prisma/client");
const { ComponenteRepository } = require("../../../domain/repositories/ComponenteRepository");

function paraComponente(registro) {
  return {
    id: registro.id,
    codigo: registro.codigo,
    descricao: registro.descricao,
    posicaoVisual: registro.posicaoVisual,
    marca: registro.versaoTensao.ferramenta.marca.nome,
    modelo: registro.versaoTensao.ferramenta.modelo,
    tensao: registro.versaoTensao.tensao,
    catalogoId: registro.catalogoId,
  };
}

/**
 * Implementação concreta de ComponenteRepository (RF11 — Agente de Consulta),
 * usando Prisma/PostgreSQL (Supabase). A correspondência exata usa o Prisma
 * Client normalmente; a busca semântica usa SQL bruto porque o pgvector ainda
 * não é modelado nativamente pelo Prisma (mesmo motivo de
 * PrismaCatalogoRepository.atualizarEmbeddingPeca).
 */
class PrismaComponenteRepository extends ComponenteRepository {
  constructor(prisma) {
    super();
    this.prisma = prisma;
  }

  async buscarPorCodigoExato({ empresaId, termo, marca, tensao }) {
    const registros = await this.prisma.peca.findMany({
      where: {
        empresaId,
        catalogo: { status: "VALIDADO" },
        codigo: { equals: termo, mode: "insensitive" },
        ...(marca ? { versaoTensao: { ferramenta: { marca: { nome: marca } } } } : {}),
        ...(tensao ? { versaoTensao: { tensao } } : {}),
      },
      include: {
        versaoTensao: { include: { ferramenta: { include: { marca: true } } } },
      },
    });

    return registros.map(paraComponente);
  }

  async buscarPorSimilaridadeSemantica({ empresaId, vetor, marca, tensao, limite = 20 }) {
    const vetorLiteral = `[${vetor.join(",")}]`;

    const filtros = [];
    if (marca) filtros.push(Prisma.sql`AND m.nome = ${marca}`);
    if (tensao) filtros.push(Prisma.sql`AND vt.tensao::text = ${tensao}`);

    const linhas = await this.prisma.$queryRaw`
      SELECT p.id, p.codigo, p.descricao, p."posicaoVisual", p."catalogoId",
             f.modelo AS modelo, m.nome AS marca, vt.tensao::text AS tensao,
             val."validadoEm" AS "validadoEm",
             (p.embedding <=> ${vetorLiteral}::vector) AS distancia
      FROM pecas p
      JOIN versoes_tensao vt ON vt.id = p."versaoTensaoId"
      JOIN ferramentas f ON f.id = vt."ferramentaId"
      JOIN marcas m ON m.id = f."marcaId"
      JOIN catalogos c ON c.id = p."catalogoId"
      LEFT JOIN LATERAL (
        SELECT v."validadoEm" FROM validacoes v WHERE v."catalogoId" = c.id ORDER BY v."validadoEm" DESC LIMIT 1
      ) val ON true
      WHERE p."empresaId" = ${empresaId}
        AND c.status = 'VALIDADO'
        AND p.embedding IS NOT NULL
        ${filtros.length ? Prisma.join(filtros, " ") : Prisma.empty}
      ORDER BY distancia ASC
      LIMIT ${limite}
    `;

    return linhas.map((linha) => ({
      id: linha.id,
      codigo: linha.codigo,
      descricao: linha.descricao,
      posicaoVisual: linha.posicaoVisual,
      marca: linha.marca,
      modelo: linha.modelo,
      tensao: linha.tensao,
      catalogoId: linha.catalogoId,
      validadoEm: linha.validadoEm ?? null,
      distancia: Number(linha.distancia),
    }));
  }

  async existeRegistroValidado({ empresaId }) {
    const registro = await this.prisma.peca.findFirst({
      where: { empresaId, catalogo: { status: "VALIDADO" } },
      select: { id: true },
    });
    return !!registro;
  }
}

module.exports = { PrismaComponenteRepository };
