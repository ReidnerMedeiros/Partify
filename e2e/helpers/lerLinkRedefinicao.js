const fs = require("fs");
const path = require("path");

/**
 * Jornada 3 (recuperar senha) — o backend, em dev, não envia e-mail de
 * verdade: o ConsoleEmailService só imprime o link de redefinição no console
 * do servidor (ver backend/src/infra/email/ConsoleEmailService.js). O plano
 * original (PLANO_TESTES_AVANCADOS.md) já descrevia essa etapa como
 * "verificação manual do recebimento" — não há caixa de e-mail de teste real
 * neste projeto.
 *
 * Para automatizar mesmo assim, reaproveitamos o mesmo workaround já usado
 * nesta sessão para ler saída de `npm test` (arquivo redirecionado): rode o
 * backend com `npm run dev:backend > backend/dev-server.log 2>&1` (ou
 * equivalente) ANTES do E2E, e este helper lê esse arquivo em busca do link
 * mais recente impresso para o e-mail informado.
 *
 * Se o arquivo de log não existir ou o link não for encontrado dentro do
 * timeout, lança um erro explicando o que fazer — não falha silenciosamente.
 */
const CAMINHO_LOG_PADRAO = path.join(__dirname, "..", "..", "backend", "dev-server.log");

async function lerLinkRedefinicao({ email, caminhoLog = CAMINHO_LOG_PADRAO, timeoutMs = 15_000, intervaloMs = 500 }) {
  const inicio = Date.now();

  while (Date.now() - inicio < timeoutMs) {
    if (fs.existsSync(caminhoLog)) {
      const conteudo = fs.readFileSync(caminhoLog, "utf-8");
      const link = extrairUltimoLink(conteudo, email);
      if (link) return link;
    }
    await new Promise((resolve) => setTimeout(resolve, intervaloMs));
  }

  throw new Error(
    `Não encontrei o link de redefinição de senha para "${email}" em ${caminhoLog}.\n` +
      "Rode o backend redirecionando a saída para esse arquivo antes do E2E, por exemplo:\n" +
      "  npm run dev:backend --workspace backend > backend/dev-server.log 2>&1\n" +
      "(equivalente em PowerShell: npm run dev --workspace backend *> backend/dev-server.log)"
  );
}

function extrairUltimoLink(conteudo, email) {
  const linhas = conteudo.split(/\r?\n/);
  let ultimoLink = null;

  for (let i = 0; i < linhas.length; i += 1) {
    if (linhas[i].includes(`Para: ${email}`)) {
      // O link vem 1 linha depois de "Para: <email>" (ver ConsoleEmailService.enviarRedefinicaoSenha).
      const linhaLink = linhas.slice(i, i + 3).find((linha) => linha.includes("Link de redefinição de senha:"));
      if (linhaLink) {
        const match = linhaLink.match(/Link de redefinição de senha:\s*(\S+)/);
        if (match) ultimoLink = match[1];
      }
    }
  }

  return ultimoLink;
}

module.exports = { lerLinkRedefinicao };
