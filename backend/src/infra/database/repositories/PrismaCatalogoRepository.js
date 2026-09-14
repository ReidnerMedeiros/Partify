const { CatalogoRepository } = require("../../../domain/repositories/CatalogoRepository");
const { Catalogo } = require("../../../domain/entities/Catalogo");
const { Peca } = require("../../../domain/entities/Peca");

function paraEntidadeCatalogo(registro) {
  if (!registro) return null;
  return new Catalogo({
    id: registro.id,
    empresaId: registro.empresaId,
    nomeArquivo: registro.nomeArquivo,
    caminhoArquivo: registro.caminhoArquivo,
    status: registro.status,
    motivoPendencia: registro.motivoPendencia,
    camposAusentes: registro.camposAusentes,
    confiancaCampos: registro.confiancaCampos,
    confiancaGeral: registro.confiancaGeral,
    criadoEm: registro.criadoEm,
    atualizadoEm: registro.atualizadoEm,
  });
}

function paraEntidadePeca(registro) {
  if (!registro) return null;
  return new Peca({
    id: registro.id,
    empresaId: registro.empresaId,
    codigo: registro.codigo,
    descricao: registro.descricao,
    posicaoVisual: registro.posicaoVisual,
    confianca: registro.confianca,
    versaoTensaoId: registro.versaoTensaoId,
    catalogoId: registro.catalogoId,
    criadoEm: registro.criadoEm,
    atualizadoEm: registro.atualizadoEm,
  });
}

/**
 * Resolve (find-or-create) a cadeia Marca -> Ferramenta -> VersaoTensao,
 * sempre escopada por empresaId (RNF11 — isolamento por instância: duas
 * empresas nunca reaproveitam o mesmo registro, mesmo para o mesmo
 * fabricante/modelo), e retorna o id da VersaoTensao correspondente.
 * VersaoTensao não tem uma constraint @@unique própria no schema (uma
 * Ferramenta pode ter várias tensões, mas não há garantia de unicidade a
 * nível de banco aqui) — por isso usamos findFirst + create em vez de upsert
 * para esse último passo.
 */
async function resolverVersaoTensaoId(tx, { empresaId, marca, modelo, tensao }) {
  const marcaRegistro = await tx.marca.upsert({
    where: { empresaId_nome: { empresaId, nome: marca } },
    update: {},
    create: { empresaId, nome: marca },
  });

  const ferramentaRegistro = await tx.ferramenta.upsert({
    where: { marcaId_modelo: { marcaId: marcaRegistro.id, modelo } },
    update: {},
    create: { empresaId, marcaId: marcaRegistro.id, modelo },
  });

  let versaoTensaoRegistro = await tx.versaoTensao.findFirst({
    where: { ferramentaId: ferramentaRegistro.id, tensao },
  });

  if (!versaoTensaoRegistro) {
    versaoTensaoRegistro = await tx.versaoTensao.create({
      data: { empresaId, ferramentaId: ferramentaRegistro.id, tensao },
    });
  }

  return versaoTensaoRegistro.id;
}

/**
 * Implementação concreta de CatalogoRepository usando Prisma/PostgreSQL (Supabase).
 */
class PrismaCatalogoRepository extends CatalogoRepository {
  constructor(prisma) {
    super();
    this.prisma = prisma;
  }

  async criar({ empresaId, nomeArquivo, caminhoArquivo }) {
    const registro = await this.prisma.catalogo.create({
      data: { empresaId, nomeArquivo, caminhoArquivo },
    });
    return paraEntidadeCatalogo(registro);
  }

  async buscarComPecas(catalogoId) {
    return this.#buscarComPecas(catalogoId, this.prisma);
  }

  async registrarResultadoExtracao(catalogoId, empresaId, dados) {
    const { marca, modelo, tensao, pecas, confiancaCampos, confiancaGeral, status, motivoPendencia, camposAusentes } = dados;

    return this.prisma.$transaction(async (tx) => {
      let versaoTensaoId = null;
      if (marca && modelo && tensao) {
        versaoTensaoId = await resolverVersaoTensaoId(tx, { empresaId, marca, modelo, tensao });
      }

      if (versaoTensaoId && pecas?.length) {
        await tx.peca.createMany({
          data: pecas.map((peca) => ({
            empresaId,
            codigo: peca.codigo,
            descricao: peca.descricao ?? null,
            posicaoVisual: peca.posicaoVisual ?? null,
            confianca: peca.confianca ?? null,
            versaoTensaoId,
            catalogoId,
          })),
        });
      }

      await tx.catalogo.update({
        where: { id: catalogoId },
        data: {
          status,
          motivoPendencia: motivoPendencia ?? null,
          camposAusentes: camposAusentes ?? null,
          confiancaCampos: confiancaCampos ?? null,
          confiancaGeral: confiancaGeral ?? null,
        },
      });

      return this.#buscarComPecas(catalogoId, tx);
    }, { timeout: 15000 });
  }

  async registrarValidacao(catalogoId, empresaId, dados) {
    const { marca, modelo, tensao, pecas } = dados;

    return this.prisma.$transaction(async (tx) => {
      const versaoTensaoId = await resolverVersaoTensaoId(tx, { empresaId, marca, modelo, tensao });

      for (const peca of pecas) {
        if (peca.id) {
          await tx.peca.update({
            where: { id: peca.id },
            data: {
              codigo: peca.codigo,
              descricao: peca.descricao ?? null,
              posicaoVisual: peca.posicaoVisual ?? null,
              versaoTensaoId,
            },
          });
        } else {
          await tx.peca.create({
            data: {
              empresaId,
              codigo: peca.codigo,
              descricao: peca.descricao ?? null,
              posicaoVisual: peca.posicaoVisual ?? null,
              versaoTensaoId,
              catalogoId,
            },
          });
        }
      }

      await tx.catalogo.update({
        where: { id: catalogoId },
        data: { status: "VALIDADO" },
      });

      return this.#buscarComPecas(catalogoId, tx);
    }, { timeout: 15000 });
  }

  async atualizarEmbeddingPeca(pecaId, vetor) {
    const vetorLiteral = `[${vetor.join(",")}]`;
    await this.prisma.$executeRaw`UPDATE pecas SET embedding = ${vetorLiteral}::vector WHERE id = ${pecaId}`;
  }

  async listarPecasValidadas({ empresaId, marca, modelo, codigo }) {
    const registros = await this.prisma.peca.findMany({
      where: {
        empresaId,
        catalogo: { status: "VALIDADO" },
        ...(codigo ? { codigo: { contains: codigo, mode: "insensitive" } } : {}),
        ...(modelo ? { versaoTensao: { ferramenta: { modelo: { contains: modelo, mode: "insensitive" } } } } : {}),
        ...(marca ? { versaoTensao: { ferramenta: { marca: { nome: marca } } } } : {}),
      },
      include: {
        versaoTensao: { include: { ferramenta: { include: { marca: true } } } },
        catalogo: {
          include: {
            validacoes: { orderBy: { validadoEm: "desc" }, take: 1, include: { usuario: true } },
          },
        },
      },
      orderBy: { criadoEm: "desc" },
    });

    return registros.map((registro) => {
      const validacao = registro.catalogo.validacoes[0] ?? null;
      return {
        id: registro.id,
        codigo: registro.codigo,
        descricao: registro.descricao,
        posicaoVisual: registro.posicaoVisual,
        marca: registro.versaoTensao.ferramenta.marca.nome,
        modelo: registro.versaoTensao.ferramenta.modelo,
        tensao: registro.versaoTensao.tensao,
        catalogoId: registro.catalogoId,
        validadoPor: validacao?.usuario?.login ?? null,
        validadoEm: validacao?.validadoEm ?? null,
      };
    });
  }

  async atualizarCatalogo(catalogoId, empresaId, dados) {
    const { marca, modelo, tensao, pecas } = dados;

    return this.prisma.$transaction(async (tx) => {
      const versaoTensaoId = await resolverVersaoTensaoId(tx, { empresaId, marca, modelo, tensao });

      // RF09/A3 — peças que existiam no catálogo mas não vieram mais na lista
      // enviada pelo ator foram removidas na tela de edição; excluímos aqui.
      const pecasExistentes = await tx.peca.findMany({ where: { catalogoId }, select: { id: true } });
      const idsRecebidos = new Set(pecas.filter((p) => p.id).map((p) => p.id));
      const idsParaExcluir = pecasExistentes.map((p) => p.id).filter((id) => !idsRecebidos.has(id));
      if (idsParaExcluir.length > 0) {
        await tx.peca.deleteMany({ where: { id: { in: idsParaExcluir } } });
      }

      for (const peca of pecas) {
        if (peca.id) {
          await tx.peca.update({
            where: { id: peca.id },
            data: {
              codigo: peca.codigo,
              descricao: peca.descricao ?? null,
              posicaoVisual: peca.posicaoVisual ?? null,
              versaoTensaoId,
            },
          });
        } else {
          await tx.peca.create({
            data: {
              empresaId,
              codigo: peca.codigo,
              descricao: peca.descricao ?? null,
              posicaoVisual: peca.posicaoVisual ?? null,
              versaoTensaoId,
              catalogoId,
            },
          });
        }
      }

      // Toque no Catalogo só para bumpar atualizadoEm (o status não muda — já
      // era VALIDADO, checado pelo Use Case antes de chamar este método).
      await tx.catalogo.update({ where: { id: catalogoId }, data: { status: "VALIDADO" } });

      return this.#buscarComPecas(catalogoId, tx);
    }, { timeout: 15000 });
  }

  async excluirPeca(pecaId, empresaId) {
    const registro = await this.prisma.peca.findUnique({ where: { id: pecaId } });
    if (!registro || registro.empresaId !== empresaId) return null;

    await this.prisma.peca.delete({ where: { id: pecaId } });
    return paraEntidadePeca(registro);
  }

  async listarPendentes({ empresaId }) {
    const registros = await this.prisma.catalogo.findMany({
      where: { empresaId, status: "IRRESOLUVEL" },
      orderBy: { criadoEm: "desc" },
    });
    return registros.map(paraEntidadeCatalogo);
  }

  async excluirCatalogo(catalogoId) {
    await this.prisma.$transaction([
      this.prisma.peca.deleteMany({ where: { catalogoId } }),
      this.prisma.validacao.deleteMany({ where: { catalogoId } }),
      this.prisma.catalogo.delete({ where: { id: catalogoId } }),
    ]);
  }

  async #buscarComPecas(catalogoId, client) {
    const catalogoRegistro = await client.catalogo.findUnique({ where: { id: catalogoId } });
    if (!catalogoRegistro) return null;

    const pecasRegistros = await client.peca.findMany({
      where: { catalogoId },
      include: { versaoTensao: { include: { ferramenta: { include: { marca: true } } } } },
      orderBy: { criadoEm: "asc" },
    });

    const primeira = pecasRegistros[0];
    const marca = primeira?.versaoTensao?.ferramenta?.marca?.nome ?? null;
    const modelo = primeira?.versaoTensao?.ferramenta?.modelo ?? null;
    const tensao = primeira?.versaoTensao?.tensao ?? null;

    return {
      catalogo: paraEntidadeCatalogo(catalogoRegistro),
      marca,
      modelo,
      tensao,
      pecas: pecasRegistros.map(paraEntidadePeca),
    };
  }
}

module.exports = { PrismaCatalogoRepository };
