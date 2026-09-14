const { EmailService } = require("../../domain/services/EmailService");

/**
 * Implementação usada em desenvolvimento quando nenhum SMTP_* está configurado
 * em backend/.env: em vez de enviar um e-mail de verdade, imprime o link de
 * redefinição no console do backend, para que o fluxo do RF03 seja testável
 * localmente sem depender de um provedor de e-mail.
 */
class ConsoleEmailService extends EmailService {
  async enviarRedefinicaoSenha({ destinatario, link }) {
    console.log("\n[e-mail simulado — configure SMTP_* em backend/.env para envio real]"); // eslint-disable-line no-console
    console.log(`Para: ${destinatario}`); // eslint-disable-line no-console
    console.log(`Link de redefinição de senha: ${link}\n`); // eslint-disable-line no-console
  }
}

module.exports = { ConsoleEmailService };
