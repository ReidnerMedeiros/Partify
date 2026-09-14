/**
 * Contrato de envio de e-mail transacional. Implementações concretas em
 * src/infra/email — por padrão, ConsoleEmailService (dev) e SmtpEmailService
 * (produção, configurável via SMTP_* em backend/.env).
 */
class EmailService {
  async enviarRedefinicaoSenha(_dados /* { destinatario, link } */) {
    throw new Error("EmailService.enviarRedefinicaoSenha não implementado.");
  }
}

module.exports = { EmailService };
