/**
 * Implementação falsa de EmailService — em vez de enviar de verdade, guarda
 * cada chamada em `enviados` para inspeção nos testes do RF03.
 */
class FakeEmailService {
  constructor() {
    this.enviados = [];
  }

  async enviarRedefinicaoSenha(dados) {
    this.enviados.push(dados);
  }
}

module.exports = { FakeEmailService };
