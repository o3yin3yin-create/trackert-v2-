import prisma from '@/lib/prisma';
import { getAuthUserId, getAuthUserData } from '@/lib/auth-server';

/**
 * Returns the database User record using the authenticated Firebase/desktop userId.
 * Supports web cookies, authorization headers, and seamlessly links returning users by email.
 */
export async function getCurrentDbUser(req) {
  const clerkId = await getAuthUserId(req);
  if (!clerkId) return null;
  let user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    try {
      const authData = await getAuthUserData(req);
      const email = authData?.email;
      if (email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          user = await prisma.user.update({
            where: { id: existing.id },
            data: { 
              clerkId,
              name: authData.name !== 'User' ? authData.name : existing.name,
            }
          });
        }
      }
    } catch (e) {}
  }
  return user;
}
