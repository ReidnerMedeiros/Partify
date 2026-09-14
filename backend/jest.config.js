/**
 * Configuração do Jest. Os testes são unitários e rodam contra implementações
 * em memória dos repositórios/serviços (ver tests/fakes) — nenhum deles toca o
 * Prisma ou um banco de dados real, então `npm test` funciona sem precisar de
 * DATABASE_URL configurada.
 */
module.exports = {
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  collectCoverageFrom: ["src/domain/**/*.js", "src/useCases/**/*.js"],
  verbose: true,
};
