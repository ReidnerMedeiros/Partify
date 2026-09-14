const { StatusEmpresa } = require("../enums/StatusEmpresa");

/**
 * Entidade Empresa (RF01 — Manter Empresa).
 * Representa a instância exclusiva de um estabelecimento no Partify (RNF11).
 * Não conhece Prisma, HTTP ou qualquer detalhe de infraestrutura.
 */
class Empresa {
  constructor({ id, nome, cnpjCpf, telefone, email, status, criadoEm }) {
    this.id = id;
    this.nome = nome;
    this.cnpjCpf = cnpjCpf;
    this.telefone = telefone;
    this.email = email;
    this.status = status ?? StatusEmpresa.ATIVA;
    this.criadoEm = criadoEm;
  }

  get ativa() {
    return this.status === StatusEmpresa.ATIVA;
  }

  desativar() {
    this.status = StatusEmpresa.INATIVA;
  }

  atualizarDados({ nome, telefone, email }) {
    if (nome !== undefined) this.nome = nome;
    if (telefone !== undefined) this.telefone = telefone;
    if (email !== undefined) this.email = email;
  }
}

module.exports = { Empresa };
