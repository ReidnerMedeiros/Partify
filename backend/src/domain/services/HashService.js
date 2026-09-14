/**
 * Contrato de hashing de senha. Implementação concreta (bcrypt) em src/infra/security.
 */
class HashService {
  async hash(_valorEmTexto) {
    throw new Error("HashService.hash não implementado.");
  }

  async comparar(_valorEmTexto, _hash) {
    throw new Error("HashService.comparar não implementado.");
  }
}

module.exports = { HashService };
