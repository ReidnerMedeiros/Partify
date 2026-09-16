/**
 * Template do e-mail de redefinição de senha (RF03), compartilhado entre
 * BrevoEmailService e SmtpEmailService — mesmo conteúdo, independente do
 * provedor de envio usado.
 *
 * HTML de e-mail tem suporte limitado a CSS em vários clientes (principalmente
 * Outlook desktop, que renderiza com o motor do Word) — por isso a estrutura
 * usa tabelas em vez de flexbox/grid, e todo estilo é inline em vez de uma
 * tag <style> ou classes CSS externas.
 */
const AZUL_PARTIFY = "#1d4ed8";
const AZUL_PARTIFY_ESCURO = "#1e3a8a";
const TEXTO = "#1f2937";
const TEXTO_MUTED = "#6b7280";
const FUNDO_PAGINA = "#eef2fb";

function montarHtmlRedefinicaoSenha({ link }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Partify — Redefinição de senha</title>
  </head>
  <body style="margin:0; padding:0; background-color:${FUNDO_PAGINA}; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${FUNDO_PAGINA}; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:#ffffff; border-radius:12px; overflow:hidden;">
            <tr>
              <td style="background-color:${AZUL_PARTIFY}; padding:28px 32px; text-align:center;">
                <span style="font-size:22px; font-weight:bold; color:#ffffff; letter-spacing:0.5px;">Partify</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px; font-size:18px; color:${TEXTO};">Redefinição de senha solicitada</h1>
                <p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:${TEXTO};">
                  Recebemos uma solicitação para redefinir a senha da sua conta no Partify. Clique no botão abaixo para escolher uma nova senha — o link é válido por <strong>30 minutos</strong>.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                  <tr>
                    <td style="border-radius:8px; background-color:${AZUL_PARTIFY};">
                      <a href="${link}" style="display:inline-block; padding:12px 28px; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:8px;">
                        Redefinir senha
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px; font-size:12px; line-height:1.6; color:${TEXTO_MUTED};">
                  Se o botão não funcionar, copie e cole este link no navegador:
                </p>
                <p style="margin:0 0 24px; font-size:12px; line-height:1.6; word-break:break-all;">
                  <a href="${link}" style="color:${AZUL_PARTIFY_ESCURO};">${link}</a>
                </p>
                <p style="margin:0; font-size:12px; line-height:1.6; color:${TEXTO_MUTED};">
                  Se você não solicitou essa redefinição, pode ignorar este e-mail com segurança — sua senha atual continua válida.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px; background-color:${FUNDO_PAGINA}; text-align:center;">
                <span style="font-size:11px; color:${TEXTO_MUTED};">Este é um e-mail automático — não responda a esta mensagem.</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function montarTextoRedefinicaoSenha({ link }) {
  return `Foi solicitada a redefinição da sua senha no Partify.\n\nAcesse o link a seguir para definir uma nova senha (válido por 30 minutos):\n${link}\n\nSe você não fez essa solicitação, ignore este e-mail.`;
}

module.exports = { montarHtmlRedefinicaoSenha, montarTextoRedefinicaoSenha };
