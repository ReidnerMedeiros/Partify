const { LogAuditoriaRepository } = require("../../../domain/repositories/LogAuditoriaRepository");

/**
 * Implementação concreta de LogAuditoriaRepository. Só expõe "registrar" (insert) —
 * a tabela logs_auditoria não deve receber UPDATE/DELETE em nenhuma camada (RNF09).
 * A imutabilidade em nível de banco é reforçada por trigger, ver
 * prisma/migrations/<timestamp>_immutable_audit_log/migration.sql.
 */
class PrismaLogAuditoriaRepository extends LogAuditoriaRepository {
  constructor(prisma) {
    super();
    this.prisma = prisma;
  }

  async registrar({ usuarioId, empresaId, tipoAcao, registroAfetado, detalhes }) {
    return this.prisma.logAuditoria.create({
      data: {
        usuarioId: usuarioId ?? null,
        empresaId: empresaId ?? null,
        tipoAcao,
        registroAfetado: registroAfetado ?? null,
        detalhes: detalhes ?? undefined,
      },
    });
  }

  async consultar({ empresaId, usuarioId, tipoAcao, dataInicial, dataFinal }) {
    const where = { empresaId };

    if (usuarioId) where.usuarioId = usuarioId;
    if (tipoAcao) where.tipoAcao = tipoAcao;
    if (dataInicial || dataFinal) {
      where.realizadoEm = {};
      if (dataInicial) where.realizadoEm.gte = dataInicial;
      if (dataFinal) where.realizadoEm.lte = dataFinal;
    }

    return this.prisma.logAuditoria.findMany({
      where,
      orderBy: { realizadoEm: "asc" },
    });
  }
}

module.exports = { PrismaLogAuditoriaRepository };
