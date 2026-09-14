const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const { TokenService } = require("../../domain/services/TokenService");

class JwtTokenService extends TokenService {
  constructor({ secret, expiresIn }) {
    super();
    if (!secret) {
      throw new Error("JwtTokenService: JWT_SECRET não configurado (ver backend/.env).");
    }
    this.secret = secret;
    this.expiresIn = expiresIn ?? "8h";
  }

  // Cada token carrega um "jti" (identificador único de sessão) para viabilizar
  // a invalidação imediata no logout (RF02-A1) via SessaoRevogadaRepository —
  // um JWT comum não pode ser "apagado" do lado do servidor, só marcado como revogado.
  gerar(payload) {
    return jwt.sign({ ...payload, jti: randomUUID() }, this.secret, { expiresIn: this.expiresIn });
  }

  verificar(token) {
    return jwt.verify(token, this.secret);
  }
}

module.exports = { JwtTokenService };
