const { randomBytes, createHash } = require("crypto");
const { RandomTokenService } = require("../../domain/services/RandomTokenService");

/**
 * Implementação de RandomTokenService usando o módulo "crypto" nativo do Node.
 * Só o hash (SHA-256) do token é persistido — o token bruto some do backend
 * assim que o e-mail é enviado, então nem um vazamento do banco permite reuso.
 */
class NodeRandomTokenService extends RandomTokenService {
  gerarTokenEHash() {
    const tokenBruto = randomBytes(32).toString("hex");
    return { tokenBruto, tokenHash: this.hash(tokenBruto) };
  }

  hash(tokenBruto) {
    return createHash("sha256").update(tokenBruto).digest("hex");
  }
}

module.exports = { NodeRandomTokenService };
