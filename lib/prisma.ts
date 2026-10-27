import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  const dbUrl = process.env.DATABASE_URL || '';
  const urlWithPool = dbUrl && !dbUrl.includes('connection_limit')
    ? `${dbUrl}${dbUrl.includes('?') ? '&' : '?'}connection_limit=30&pool_timeout=30`
    : dbUrl;

  return new PrismaClient({
    ...(urlWithPool ? { datasources: { db: { url: urlWithPool } } } : {})
  });
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export { prisma }
export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma