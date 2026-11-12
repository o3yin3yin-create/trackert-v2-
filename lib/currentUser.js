import prisma from '@/lib/prisma';
import { getAuthUserId } from '@/lib/auth-server';

/**
 * Returns the database User record using the authenticated Clerk userId (clerkId).
 * Supports both standard web cookies and Authorization Bearer tokens (desktop/mobile).
 */
export async function getCurrentDbUser(req) {
  const clerkId = await getAuthUserId(req);
  if (!clerkId) return null;
  let user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    try {
      const { currentUser } = await import('@clerk/nextjs/server');
      const clerkUser = await currentUser();
      const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
      if (email) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          user = await prisma.user.update({
            where: { id: existing.id },
            data: { clerkId }
          });
        }
      }
    } catch (e) {}
  }
  return user;
}
