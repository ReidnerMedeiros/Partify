const { PrismaClient } = require("@prisma/client");

/**
 * Instância única do Prisma Client compartilhada por toda a aplicação
 * (evita esgotar o pool de conexões do Postgres/Supabase em desenvolvimento
 * com hot-reload do nodemon).
 */
const prisma = new PrismaClient();

module.exports = { prisma };
