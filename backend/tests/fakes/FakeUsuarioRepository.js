const { randomUUID } = require("crypto");
const { Usuario } = require("../../src/domain/entities/Usuario");

/**
 * Implementação em memória de UsuarioRepository para os testes unitários.
 */
class FakeUsuarioRepository {
  constructor() {
    this.usuarios = [];
  }

  async buscarPorLogin(login) {
    if (!login) return null;
    return this.usuarios.find((u) => u.login === login) ?? null;
  }

  async buscarPorId(id) {
    return this.usuarios.find((u) => u.id === id) ?? null;
  }

  async contarAdministradoresAtivos(empresaId) {
    return this.usuarios.filter((u) => u.empresaId === empresaId && u.perfil === "ADMINISTRADOR" && u.ativo).length;
  }

  async atualizarSenha(usuarioId, novaSenhaHash) {
    const usuario = await this.buscarPorId(usuarioId);
    usuario.senhaHash = novaSenhaHash;
    return usuario;
  }

  // --- RF05 — Manter Usuário ---------------------------------------------

  async criar({ nome, login, email, senhaHash, perfil, empresaId }) {
    const usuario = new Usuario({
      id: randomUUID(),
      nome,
      login,
      email,
      senhaHash,
      perfil,
      ativo: true,
      empresaId,
      criadoEm: new Date(),
    });
    this.usuarios.push(usuario);
    return usuario;
  }

  async listarPorEmpresa(empresaId) {
    return this.usuarios
      .filter((u) => u.empresaId === empresaId)
      .sort((a, b) => a.criadoEm - b.criadoEm);
  }

  async atualizar(id, dados) {
    const usuario = await this.buscarPorId(id);
    Object.assign(usuario, dados);
    return usuario;
  }

  async atualizarStatus(id, ativo) {
    const usuario = await this.buscarPorId(id);
    usuario.ativo = ativo;
    return usuario;
  }
}

module.exports = { FakeUsuarioRepository };
