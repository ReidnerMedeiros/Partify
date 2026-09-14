/**
 * Contrato de geração de tokens aleatórios de uso único (RF03/RF04-A1).
 * Implementação concreta em src/infra/security usando o módulo crypto do Node.
 */
class RandomTokenService {
  /** Gera um token bruto (a ser enviado por e-mail) e o hash correspondente (a ser persistido). */
  gerarTokenEHash() {
    throw new Error("RandomTokenService.gerarTokenEHash não implementado.");
  }

  /** Recalcula o hash de um token bruto recebido do cliente, para comparação. */
  hash(_tokenBruto) {
    throw new Error("RandomTokenService.hash não implementado.");
  }
}

module.exports = { RandomTokenService };
