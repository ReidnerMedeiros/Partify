const { Perfil } = require("../enums/Perfil");

/**
 * Entidade Usuario (RF01 cria o administrador automaticamente; RF05 gerencia os demais).
 */
class Usuario {
  constructor({ id, nome, email, login, senhaHash, perfil, ativo, empresaId, criadoEm }) {
    this.id = id;
    this.nome = nome;
    this.email = email;
    this.login = login;
    this.senhaHash = senhaHash;
    this.perfil = perfil;
    this.ativo = ativo ?? true;
    this.empresaId = empresaId;
    this.criadoEm = criadoEm;
  }

  get isAdministrador() {
    return this.perfil === Perfil.ADMINISTRADOR;
  }
}

module.exports = { Usuario };
