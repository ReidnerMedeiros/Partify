const { EmpresaRepository } = require("../../../domain/repositories/EmpresaRepository");
const { Empresa } = require("../../../domain/entities/Empresa");
const { Usuario } = require("../../../domain/entities/Usuario");

function paraEntidadeEmpresa(registro) {
  if (!registro) return null;
  return new Empresa({
    id: registro.id,
    nome: registro.nome,
    cnpjCpf: registro.cnpjCpf,
    telefone: registro.telefone,
    email: registro.email,
    status: registro.status,
    criadoEm: registro.criadoEm,
  });
}

function paraEntidadeUsuario(registro) {
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

/**
 * Implementação concreta de EmpresaRepository usando Prisma/PostgreSQL (Supabase).
 */
class PrismaEmpresaRepository extends EmpresaRepository {
  constructor(prisma) {
    super();
    this.prisma = prisma;
  }

  async criar({ nome, cnpjCpf, telefone, email, administrador }) {
    const empresaCriada = await this.prisma.empresa.create({
      data: {
        nome,
        cnpjCpf,
        telefone,
        email,
        usuarios: {
          create: {
            nome: administrador.nome,
            email: administrador.email,
            login: administrador.login,
            senhaHash: administrador.senhaHash,
            perfil: administrador.perfil,
          },
        },
      },
      include: { usuarios: true },
    });

    return {
      empresa: paraEntidadeEmpresa(empresaCriada),
      administrador: paraEntidadeUsuario(empresaCriada.usuarios[0]),
    };
  }

  async buscarPorId(id) {
    const registro = await this.prisma.empresa.findUnique({ where: { id } });
    return paraEntidadeEmpresa(registro);
  }

  async buscarPorCnpjCpf(cnpjCpf) {
    const registro = await this.prisma.empresa.findUnique({ where: { cnpjCpf } });
    return paraEntidadeEmpresa(registro);
  }

  async atualizar(id, dados) {
    const registro = await this.prisma.empresa.update({ where: { id }, data: dados });
    return paraEntidadeEmpresa(registro);
  }

  async desativar(id) {
    const registro = await this.prisma.empresa.update({
      where: { id },
      data: { status: "INATIVA" },
    });
    return paraEntidadeEmpresa(registro);
  }
}

module.exports = { PrismaEmpresaRepository };
