import prisma from '@/lib/prisma';
import { getAuthUserId } from '@/lib/auth-server';

/**
 * Returns the database User record using the authenticated Clerk userId (clerkId).
 * Supports both standard web cookies and Authorization Bearer tokens (desktop/mobile).
 */
export async function getCurrentDbUser(req) {
  const clerkId = await getAuthUserId(req);
  if (!clerkId) return null;
  return prisma.user.findUnique({ where: { clerkId } });
}
