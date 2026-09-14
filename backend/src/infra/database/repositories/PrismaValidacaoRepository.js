const { ValidacaoRepository } = require("../../../domain/repositories/ValidacaoRepository");

/**
 * Implementação concreta de ValidacaoRepository usando Prisma/PostgreSQL (Supabase).
 */
class PrismaValidacaoRepository extends ValidacaoRepository {
  constructor(prisma) {
    super();
    this.prisma = prisma;
  }

  async registrar({ empresaId, catalogoId, usuarioId, observacoes }) {
    const registro = await this.prisma.validacao.create({
      data: { empresaId, catalogoId, usuarioId, observacoes: observacoes ?? null },
    });
    return registro;
  }
}

module.exports = { PrismaValidacaoRepository };
