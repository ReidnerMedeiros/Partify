const { UsuarioRepository } = require("../../../domain/repositories/UsuarioRepository");
const { Usuario } = require("../../../domain/entities/Usuario");
const { Perfil } = require("../../../domain/enums/Perfil");

function paraEntidade(registro) {
  if (!registro) return null;
  return new Usuario({
    id: registro.id,
    nome: registro.nome,
    email: registro.email,
    login: registro.login,
    senhaHash: registro.senhaHash,
    perfil: registro.perfil,
    ativo: registro.ativo,
    empresaId: registro.empresaId,
    criadoEm: registro.criadoEm,
  });
}

class PrismaUsuarioRepository extends UsuarioRepository {
  constructor(prisma) {
    super();
    this.prisma = prisma;
  }

  async buscarPorLogin(login) {
    if (!login) return null;
    const registro = await this.prisma.usuario.findUnique({ where: { login } });
    return paraEntidade(registro);
  }

  async buscarPorId(id) {
    const registro = await this.prisma.usuario.findUnique({ where: { id } });
    return paraEntidade(registro);
  }

  async contarAdministradoresAtivos(empresaId) {
    return this.prisma.usuario.count({
      where: { empresaId, perfil: Perfil.ADMINISTRADOR, ativo: true },
    });
  }

  async atualizarSenha(usuarioId, novaSenhaHash) {
    const registro = await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { senhaHash: novaSenhaHash },
    });
    return paraEntidade(registro);
  }

  // RF05 — Manter Usuário
  async criar({ nome, login, email, senhaHash, perfil, empresaId }) {
    const registro = await this.prisma.usuario.create({
      data: { nome, login, email, senhaHash, perfil, empresaId },
    });
    return paraEntidade(registro);
  }

  async listarPorEmpresa(empresaId) {
    const registros = await this.prisma.usuario.findMany({
      where: { empresaId },
      orderBy: { criadoEm: "asc" },
    });
    return registros.map(paraEntidade);
  }

  async atualizar(id, dados) {
    const registro = await this.prisma.usuario.update({ where: { id }, data: dados });
    return paraEntidade(registro);
  }

  async atualizarStatus(id, ativo) {
    const registro = await this.prisma.usuario.update({ where: { id }, data: { ativo } });
    return paraEntidade(registro);
  }
}

module.exports = { PrismaUsuarioRepository };
