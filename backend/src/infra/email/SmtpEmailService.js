const nodemailer = require("nodemailer");
const { EmailService } = require("../../domain/services/EmailService");
const { montarHtmlRedefinicaoSenha, montarTextoRedefinicaoSenha } = require("./templates/redefinicaoSenhaTemplate");

/**
 * Implementação de EmailService via SMTP genérico (nodemailer). Usada em produção
 * quando SMTP_HOST/SMTP_USER/SMTP_PASS estão configurados em backend/.env.
 *
 * Nota de arquitetura: o DERS (RF03) descreve o envio do link "via Supabase".
 * Como o RF01/RF02 deste projeto usam autenticação própria (bcrypt + JWT, tabela
 * `usuarios` no Prisma) em vez do Supabase Auth, não há um usuário gerenciado
 * pelo GoTrue para acionar o e-mail de recuperação nativo do Supabase. Optamos
 * por manter a consistência com a decisão já tomada no RF01/RF02 e implementar
 * o envio via SMTP configurável — o Postgres em si continua hospedado no
 * Supabase, conforme o restante do DERS. Migrar para Supabase Auth é possível
 * no futuro, mas exigiria refatorar o modelo de usuários já construído.
 */
class SmtpEmailService extends EmailService {
  constructor({ host, port, secure, user, pass, remetente }) {
    super();
    this.remetente = remetente ?? user;
    this.transporter = nodemailer.createTransport({
      host,
      port: Number(port ?? 587),
      secure: Boolean(secure),
      auth: user ? { user, pass } : undefined,
    });
  }

  async enviarRedefinicaoSenha({ destinatario, link }) {
    await this.transporter.sendMail({
      from: this.remetente,
      to: destinatario,
      subject: "Partify — Redefinição de senha",
      text: montarTextoRedefinicaoSenha({ link }),
      html: montarHtmlRedefinicaoSenha({ link }),
    });
  }
}

module.exports = { SmtpEmailService };
