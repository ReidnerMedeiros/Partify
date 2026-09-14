/**
 * Contrato do repositório de Empresa. A camada de domínio e os use cases dependem
 * apenas desta interface — a implementação concreta (Prisma) vive em src/infra.
 * Métodos não implementados lançam erro para deixar claro, em tempo de execução,
 * quando uma implementação concreta esqueceu de sobrescrever algum método.
 */
class EmpresaRepository {
  async criar(_empresaComAdministrador) {
    throw new Error("EmpresaRepository.criar não implementado.");
  }

  async buscarPorId(_id) {
    throw new Error("EmpresaRepository.buscarPorId não implementado.");
  }

  async buscarPorCnpjCpf(_cnpjCpf) {
    throw new Error("EmpresaRepository.buscarPorCnpjCpf não implementado.");
  }

  async atualizar(_id, _dados) {
    throw new Error("EmpresaRepository.atualizar não implementado.");
  }

  async desativar(_id) {
    throw new Error("EmpresaRepository.desativar não implementado.");
  }
}

module.exports = { EmpresaRepository };
