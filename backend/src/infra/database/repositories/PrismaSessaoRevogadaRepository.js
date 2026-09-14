const { SessaoRevogadaRepository } = require("../../../domain/repositories/SessaoRevogadaRepository");

class PrismaSessaoRevogadaRepository extends SessaoRevogadaRepository {
  constructor(prisma) {
    super();
    this.prisma = prisma;
  }

  async revogar({ jti, usuarioId, expiraEm }) {
    await this.prisma.sessaoRevogada.create({ data: { jti, usuarioId, expiraEm } });
  }

  async estaRevogado(jti) {
    if (!jti) return true;
    const registro = await this.prisma.sessaoRevogada.findUnique({ where: { jti } });
    return Boolean(registro);
  }
}

module.exports = { PrismaSessaoRevogadaRepository };
