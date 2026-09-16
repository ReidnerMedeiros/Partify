const { EmailService } = require("../../domain/services/EmailService");
const { montarHtmlRedefinicaoSenha, montarTextoRedefinicaoSenha } = require("./templates/redefinicaoSenhaTemplate");

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Implementação de EmailService via API HTTP (REST) do Brevo, em vez de SMTP
 * tradicional. Motivo: Render (e outras plataformas de deploy) bloqueiam
 * conexões de saída para portas de SMTP (25/465/587) em planos gratuitos —
 * qualquer EmailService baseado em `nodemailer`/SMTP puro (ver SmtpEmailService.js)
 * falha com ETIMEDOUT em produção, mesmo com credenciais corretas. Como a API
 * do Brevo é uma chamada HTTPS comum (porta 443, igual a qualquer outra
 * requisição da aplicação), esse bloqueio não se aplica.
 *
 * Usa `fetch` nativo do Node (disponível desde o Node 18, sem dependência nova).
 */
class BrevoEmailService extends EmailService {
  constructor({ apiKey, remetenteEmail, remetenteNome }) {
    super();
    this.apiKey = apiKey;
    this.remetenteEmail = remetenteEmail;
    this.remetenteNome = remetenteNome ?? "Partify";
  }

  async enviarRedefinicaoSenha({ destinatario, link }) {
    const resposta = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": this.apiKey,
      },
      body: JSON.stringify({
        sender: { name: this.remetenteNome, email: this.remetenteEmail },
        to: [{ email: destinatario }],
        subject: "Partify — Redefinição de senha",
        textContent: montarTextoRedefinicaoSenha({ link }),
        htmlContent: montarHtmlRedefinicaoSenha({ link }),
      }),
    });

    if (!resposta.ok) {
      const corpoErro = await resposta.text().catch(() => "");
      throw new Error(`Falha ao enviar e-mail via Brevo (HTTP ${resposta.status}): ${corpoErro}`);
    }
  }
}

module.exports = { BrevoEmailService };
