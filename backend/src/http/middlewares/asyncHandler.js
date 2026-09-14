/**
 * Evita repetir try/catch em cada controller — encaminha qualquer erro (inclusive
 * de Promises rejeitadas) para o errorHandler central.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
