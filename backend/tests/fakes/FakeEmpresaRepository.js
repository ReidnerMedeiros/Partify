const { randomUUID } = require("crypto");
const { Empresa } = require("../../src/domain/entities/Empresa");

/**
 * Implementação em memória de EmpresaRepository, usada nos testes unitários dos
 * Use Cases. Replica o comportamento essencial do PrismaEmpresaRepository sem
 * precisar de um banco de dados real.
 */
class FakeEmpresaRepository {
  constructor() {
    this.empresas = [];
    // Referência opcional a um FakeUsuarioRepository — quando definida, `criar`
    // também persiste o administrador ali, replicando a transação atômica
    // (Empresa + Usuario administrador) feita pelo PrismaEmpresaRepository real.
    this.usuarioRepository = null;
  }

  async criar({ nome, cnpjCpf, telefone, email, administrador }) {
    const empresa = new Empresa({ id: randomUUID(), nome, cnpjCpf, telefone, email, criadoEm: new Date() });
    this.empresas.push(empresa);

    const administradorCriado = {
      id: randomUUID(),
      ativo: true,
      empresaId: empresa.id,
      criadoEm: new Date(),
      ...administrador,
    };
    if (this.usuarioRepository) {
      this.usuarioRepository.usuarios.push(administradorCriado);
    }

    return { empresa, administrador: administradorCriado };
  }

  async buscarPorId(id) {
    return this.empresas.find((e) => e.id === id) ?? null;
  }

  async buscarPorCnpjCpf(cnpjCpf) {
    return this.empresas.find((e) => e.cnpjCpf === cnpjCpf) ?? null;
  }

  async atualizar(id, dados) {
    const empresa = await this.buscarPorId(id);
    empresa.atualizarDados(dados);
    return empresa;
  }

  async desativar(id) {
    const empresa = await this.buscarPorId(id);
    empresa.desativar();
    return empresa;
  }
}

module.exports = { FakeEmpresaRepository };
