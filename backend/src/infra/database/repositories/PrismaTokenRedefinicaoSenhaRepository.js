const { TokenRedefinicaoSenhaRepository } = require("../../../domain/repositories/TokenRedefinicaoSenhaRepository");

class PrismaTokenRedefinicaoSenhaRepository extends TokenRedefinicaoSenhaRepository {
  constructor(prisma) {
    super();
    this.prisma = prisma;
  }

  async criar({ usuarioId, tokenHash, expiraEm }) {
    return this.prisma.tokenRedefinicaoSenha.create({ data: { usuarioId, tokenHash, expiraEm } });
  }

  async buscarPorHash(tokenHash) {
    return this.prisma.tokenRedefinicaoSenha.findUnique({ where: { tokenHash } });
  }

  async marcarComoUsado(id) {
    return this.prisma.tokenRedefinicaoSenha.update({ where: { id }, data: { usadoEm: new Date() } });
  }
}

module.exports = { PrismaTokenRedefinicaoSenhaRepository };
