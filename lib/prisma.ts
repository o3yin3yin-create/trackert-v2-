import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  const dbUrl = process.env.DATABASE_URL || '';
  const urlWithPool = dbUrl && !dbUrl.includes('connection_limit')
    ? `${dbUrl}${dbUrl.includes('?') ? '&' : '?'}connection_limit=30&pool_timeout=30`
    : dbUrl;

  const client = new PrismaClient({
    ...(urlWithPool ? { datasources: { db: { url: urlWithPool } } } : {})
  });

  // Runtime safety guard: prevent accidental deletion of User records or unscoped bulk deletes
  return client.$extends({
    query: {
      user: {
        delete({ args, query }) {
          if (process.env.ALLOW_USER_DELETE !== '1') {
            throw new Error('[SAFETY GUARD] Blocked attempt to delete User record');
          }
          return query(args);
        },
        deleteMany({ args, query }) {
          if (process.env.ALLOW_USER_DELETE !== '1') {
            throw new Error('[SAFETY GUARD] Blocked attempt to deleteMany User records');
          }
          return query(args);
        },
      },
      habit: {
        deleteMany({ args, query }) {
          if (!args?.where || (!args.where.userId && !args.where.id)) {
            throw new Error('[SAFETY GUARD] Blocked unscoped Habit.deleteMany');
          }
          return query(args);
        },
      },
      dailyLog: {
        deleteMany({ args, query }) {
          if (!args?.where || (!args.where.userId && !args.where.id)) {
            throw new Error('[SAFETY GUARD] Blocked unscoped DailyLog.deleteMany');
          }
          return query(args);
        },
      },
      friendship: {
        deleteMany({ args, query }) {
          if (!args?.where || (!args.where.id && !args.where.OR && !args.where.requesterId && !args.where.addresseeId)) {
            throw new Error('[SAFETY GUARD] Blocked unscoped Friendship.deleteMany');
          }
          return query(args);
        },
      },
    },
  });
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

export { prisma }
export default prisma

globalThis.prisma = prisma
