const { Prisma } = require("@prisma/client");
const multer = require("multer");
const { DomainError, ValidationError } = require("../../domain/errors/DomainErrors");

/**
 * Middleware central de tratamento de erros (RNF05 — Mensagens de Erro Compreensíveis).
 * Nunca expõe stack trace, código HTTP interno de terceiros ou exceção bruta ao
 * cliente; apenas uma mensagem contextualizada e, quando aplicável, os campos
 * inválidos do formulário.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({
      erro: err.message,
      campos: err.fieldErrors,
    });
  }

  if (err instanceof DomainError) {
    return res.status(err.statusCode).json({ erro: err.message });
  }

  // RF06 — upload maior que o limite configurado no multer (uploadMiddleware.js).
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(422).json({
      erro: "Não foi possível importar o arquivo. Revise os campos destacados.",
      campos: { arquivo: "O arquivo excede o tamanho máximo permitido de 50MB." },
    });
  }

  // Salvaguarda contra corrida entre a checagem prévia de duplicidade e o INSERT
  // (ex.: dois cadastros simultâneos com o mesmo CNPJ/CPF ou login).
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return res.status(409).json({ erro: "Já existe um registro com estes dados. Verifique as informações e tente novamente." });
  }

  console.error("[erro-nao-tratado]", err); // eslint-disable-line no-console
  return res.status(500).json({
    erro: "Não foi possível concluir a operação no momento. Tente novamente em instantes.",
  });
}

module.exports = { errorHandler };
