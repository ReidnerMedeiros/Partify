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

const P2028_TENTATIVAS = 3;
const P2028_ESPERA_MS = 300;

function aguardar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executa uma transação interativa do Prisma com retentativa automática para o
 * caso de a conexão que segurava a transação cair no meio do caminho (P2028
 * "Transaction not found... refers to an old closed transaction" — diferente
 * do P2028 de timeout, que já tem seu próprio tratamento via `{ timeout }`).
 * Contra um banco remoto (Supabase, via pooler), blips de rede/reciclagem de
 * conexão são na maioria das vezes transitórios — tentar de novo silenciosamente
 * evita expor ao usuário um erro por uma instabilidade momentânea.
 */
async function transacaoComRetry(prisma, callback, options) {
  let ultimoErro;
  for (let tentativa = 1; tentativa <= P2028_TENTATIVAS; tentativa++) {
    try {
      return await prisma.$transaction(callback, options);
    } catch (erro) {
      ultimoErro = erro;
      const quedaDeConexao = erro?.code === "P2028" && /transaction not found/i.test(erro?.meta?.error ?? "");
      if (!quedaDeConexao || tentativa === P2028_TENTATIVAS) throw erro;
      console.warn(
        `[PrismaCatalogoRepository] transação caiu por queda de conexão (P2028, tentativa ${tentativa}/${P2028_TENTATIVAS}) — tentando de novo...`
      ); // eslint-disable-line no-console
      await aguardar(P2028_ESPERA_MS * tentativa);
    }
  }
  throw ultimoErro;
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

    return transacaoComRetry(this.prisma, async (tx) => {
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

    return transacaoComRetry(this.prisma, async (tx) => {
      const versaoTensaoId = await resolverVersaoTensaoId(tx, { empresaId, marca, modelo, tensao });

      // Peças já existentes (com id) só podem ser atualizadas uma a uma — o
      // Prisma não tem um "updateMany com valor diferente por linha". Peças
      // novas (sem id), por outro lado, vão todas num único createMany, pra
      // reduzir o número de idas e voltas dentro da transação (menos round
      // trips = menos exposição a queda de conexão contra o banco remoto).
      const pecasExistentes = pecas.filter((peca) => peca.id);
      const pecasNovas = pecas.filter((peca) => !peca.id);

      for (const peca of pecasExistentes) {
        await tx.peca.update({
          where: { id: peca.id },
          data: {
            codigo: peca.codigo,
            descricao: peca.descricao ?? null,
            posicaoVisual: peca.posicaoVisual ?? null,
            versaoTensaoId,
          },
        });
      }

      if (pecasNovas.length > 0) {
        await tx.peca.createMany({
          data: pecasNovas.map((peca) => ({
            empresaId,
            codigo: peca.codigo,
            descricao: peca.descricao ?? null,
            posicaoVisual: peca.posicaoVisual ?? null,
            versaoTensaoId,
            catalogoId,
          })),
        });
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

    return transacaoComRetry(this.prisma, async (tx) => {
      const versaoTensaoId = await resolverVersaoTensaoId(tx, { empresaId, marca, modelo, tensao });

      // RF09/A3 — peças que existiam no catálogo mas não vieram mais na lista
      // enviada pelo ator foram removidas na tela de edição; excluímos aqui.
      const pecasExistentes = await tx.peca.findMany({ where: { catalogoId }, select: { id: true } });
      const idsRecebidos = new Set(pecas.filter((p) => p.id).map((p) => p.id));
      const idsParaExcluir = pecasExistentes.map((p) => p.id).filter((id) => !idsRecebidos.has(id));
      if (idsParaExcluir.length > 0) {
        await tx.peca.deleteMany({ where: { id: { in: idsParaExcluir } } });
      }

      // Mesma otimização de round-trips do registrarValidacao: peças novas
      // (sem id) vão todas juntas num único createMany.
      const pecasParaAtualizar = pecas.filter((peca) => peca.id);
      const pecasNovas = pecas.filter((peca) => !peca.id);

      for (const peca of pecasParaAtualizar) {
        await tx.peca.update({
          where: { id: peca.id },
          data: {
            codigo: peca.codigo,
            descricao: peca.descricao ?? null,
            posicaoVisual: peca.posicaoVisual ?? null,
            versaoTensaoId,
          },
        });
      }

      if (pecasNovas.length > 0) {
        await tx.peca.createMany({
          data: pecasNovas.map((peca) => ({
            empresaId,
            codigo: peca.codigo,
            descricao: peca.descricao ?? null,
            posicaoVisual: peca.posicaoVisual ?? null,
            versaoTensaoId,
            catalogoId,
          })),
        });
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
