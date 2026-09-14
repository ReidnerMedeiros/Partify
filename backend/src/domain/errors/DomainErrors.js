/**
 * Erros de domínio — lançados pelos Use Cases e traduzidos para respostas HTTP
 * pelo middleware errorHandler (camada http), conforme RNF05 (mensagens de erro
 * compreensíveis, sem vazar detalhes internos ao usuário final).
 */

class DomainError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

class ValidationError extends DomainError {
  constructor(message, fieldErrors = {}) {
    super(message, 422);
    this.fieldErrors = fieldErrors;
  }
}

class NotFoundError extends DomainError {
  constructor(message = "Registro não encontrado.") {
    super(message, 404);
  }
}

class ConflictError extends DomainError {
  constructor(message = "Registro em conflito com um já existente.") {
    super(message, 409);
  }
}

class UnauthorizedError extends DomainError {
  constructor(message = "Credenciais inválidas.") {
    super(message, 401);
  }
}

class ForbiddenError extends DomainError {
  constructor(message = "Você não tem permissão para executar esta operação.") {
    super(message, 403);
  }
}

// RF07/E1 — falha de comunicação com um serviço externo (ex.: Gemini API), do qual
// o caso de uso depende para concluir a operação, mas que não é um erro de dados
// do usuário nem um erro interno do próprio Partify.
class ServiceUnavailableError extends DomainError {
  constructor(message = "Serviço temporariamente indisponível. Tente novamente em instantes.") {
    super(message, 503);
  }
}

module.exports = {
  DomainError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  ServiceUnavailableError,
};
