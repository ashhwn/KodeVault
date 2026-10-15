const { PrismaClient } = require('@prisma/client');

// A single shared Prisma instance across the app avoids exhausting
// your Postgres connection pool by creating a new client per request.
const prisma = new PrismaClient();

module.exports = prisma;