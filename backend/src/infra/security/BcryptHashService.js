const bcrypt = require("bcryptjs");
const { HashService } = require("../../domain/services/HashService");

const SALT_ROUNDS = 10;

class BcryptHashService extends HashService {
  async hash(valorEmTexto) {
    return bcrypt.hash(valorEmTexto, SALT_ROUNDS);
  }

  async comparar(valorEmTexto, hash) {
    if (!hash) return false;
    return bcrypt.compare(valorEmTexto, hash);
  }
}

module.exports = { BcryptHashService };
