const { Prisma } = require("@prisma/client");
const { ComponenteRepository } = require("../../../domain/repositories/ComponenteRepository");

function paraComponente(registro) {
  return {
    id: registro.id,
    codigo: registro.codigo,
    descricao: registro.descricao,
    posicaoVisual: registro.posicaoVisual,
    quantidade: registro.quantidade,
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
    // Marca e tensão ficam na mesma relação (versaoTensao): precisam ser
    // combinadas num único objeto, senão o segundo spread sobrescreve o primeiro.
    const filtroVersaoTensao = {
      ...(marca ? { ferramenta: { marca: { nome: marca } } } : {}),
      ...(tensao ? { tensao } : {}),
    };

    const registros = await this.prisma.peca.findMany({
      where: {
        empresaId,
        catalogo: { status: "VALIDADO" },
        codigo: { equals: termo, mode: "insensitive" },
        ...(Object.keys(filtroVersaoTensao).length ? { versaoTensao: filtroVersaoTensao } : {}),
      },
      include: {
        versaoTensao: { include: { ferramenta: { include: { marca: true } } } },
      },
    });

    return registros.map(paraComponente);
  }

  async buscarPorSimilaridadeSemantica({ empresaId, vetor, marca, tensao, modelos, limite = 20 }) {
    const vetorLiteral = `[${vetor.join(",")}]`;

    const filtros = [];
    if (marca) filtros.push(Prisma.sql`AND m.nome = ${marca}`);
    if (tensao) filtros.push(Prisma.sql`AND vt.tensao::text = ${tensao}`);
    if (modelos?.length) filtros.push(Prisma.sql`AND f.modelo IN (${Prisma.join(modelos)})`);

    const linhas = await this.prisma.$queryRaw`
      SELECT p.id, p.codigo, p.descricao, p."posicaoVisual", p.quantidade, p."catalogoId",
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
      quantidade: linha.quantidade ?? null,
      marca: linha.marca,
      modelo: linha.modelo,
      tensao: linha.tensao,
      catalogoId: linha.catalogoId,
      validadoEm: linha.validadoEm ?? null,
      distancia: Number(linha.distancia),
    }));
  }

  async buscarPorPalavrasChave({ empresaId, palavras, modelos, limite = 20 }) {
    if (!palavras?.length) return [];

    // translate() tira os acentos da descrição sem depender da extensão unaccent.
    // As palavras vêm só com [a-z0-9] (ver analisarPergunta), então não há
    // caracteres especiais de LIKE a escapar.
    const condicoes = palavras.map(
      (palavra) =>
        Prisma.sql`translate(lower(coalesce(p.descricao, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') LIKE ${`%${palavra}%`}`
    );
    const pontuacao = Prisma.join(
      condicoes.map((condicao) => Prisma.sql`(CASE WHEN ${condicao} THEN 1 ELSE 0 END)`),
      " + "
    );
    const filtroModelo = modelos?.length ? Prisma.sql`AND f.modelo IN (${Prisma.join(modelos)})` : Prisma.empty;

    const linhas = await this.prisma.$queryRaw`
      SELECT p.id, p.codigo, p.descricao, p."posicaoVisual", p.quantidade, p."catalogoId",
             f.modelo AS modelo, m.nome AS marca, vt.tensao::text AS tensao,
             val."validadoEm" AS "validadoEm",
             (${pontuacao}) AS pontuacao
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
        AND (${Prisma.join(condicoes, " OR ")})
        ${filtroModelo}
      ORDER BY pontuacao DESC, p.codigo ASC
      LIMIT ${limite}
    `;

    return linhas.map((linha) => ({
      id: linha.id,
      codigo: linha.codigo,
      descricao: linha.descricao,
      posicaoVisual: linha.posicaoVisual,
      quantidade: linha.quantidade ?? null,
      marca: linha.marca,
      modelo: linha.modelo,
      tensao: linha.tensao,
      catalogoId: linha.catalogoId,
      validadoEm: linha.validadoEm ?? null,
      distancia: null,
    }));
  }

  async listarPecasDoModelo({ empresaId, modelos, limite = 100 }) {
    if (!modelos?.length) return [];

    const linhas = await this.prisma.$queryRaw`
      SELECT p.id, p.codigo, p.descricao, p."posicaoVisual", p.quantidade, p."catalogoId",
             f.modelo AS modelo, m.nome AS marca, vt.tensao::text AS tensao,
             val."validadoEm" AS "validadoEm"
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
        AND f.modelo IN (${Prisma.join(modelos)})
      ORDER BY p."posicaoVisual" ASC NULLS LAST, p.codigo ASC
      LIMIT ${limite}
    `;

    return linhas.map((linha) => ({
      id: linha.id,
      codigo: linha.codigo,
      descricao: linha.descricao,
      posicaoVisual: linha.posicaoVisual,
      quantidade: linha.quantidade ?? null,
      marca: linha.marca,
      modelo: linha.modelo,
      tensao: linha.tensao,
      catalogoId: linha.catalogoId,
      validadoEm: linha.validadoEm ?? null,
      distancia: null,
    }));
  }

  async listarModelosValidados({ empresaId }) {
    const linhas = await this.prisma.$queryRaw`
      SELECT DISTINCT m.nome AS marca, f.modelo AS modelo
      FROM pecas p
      JOIN versoes_tensao vt ON vt.id = p."versaoTensaoId"
      JOIN ferramentas f ON f.id = vt."ferramentaId"
      JOIN marcas m ON m.id = f."marcaId"
      JOIN catalogos c ON c.id = p."catalogoId"
      WHERE p."empresaId" = ${empresaId}
        AND c.status = 'VALIDADO'
    `;
    return linhas.map((linha) => ({ marca: linha.marca, modelo: linha.modelo }));
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
