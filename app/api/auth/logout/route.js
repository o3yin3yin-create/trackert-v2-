import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUserData } from '@/lib/auth-server';
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors';

export async function OPTIONS(req) {
  return handleCorsOptions(req);
}

export async function POST(req) {
  try {
    const authData = await getAuthUserData(req).catch(() => null);
    if (authData?.userId) {
      // Invalidate all active tokens for this user by bumping tokenVersion
      await prisma.user.update({
        where: { clerkId: authData.userId },
        data: { tokenVersion: { increment: 1 } },
      }).catch(() => {});
    }
  } catch (_) {}

  const response = NextResponse.json(
    { success: true, loggedOut: true },
    { headers: getCorsHeaders(req) }
  );

  // Set-Cookie options for RFC 6265 & Safari/WebKit compliance
  const clearCookieAttrs = [
    'Path=/',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'SameSite=Lax',
    'HttpOnly',
  ];
  if (process.env.NODE_ENV === 'production') {
    clearCookieAttrs.push('Secure');
  }

  const cookiesToClear = [
    '__bokra_session',
    '__session',
    '__client_uat',
    '__clerk_db_jwt',
  ];

  for (const cookieName of cookiesToClear) {
    response.headers.append(
      'Set-Cookie',
      `${cookieName}=; ${clearCookieAttrs.join('; ')}`
    );
  }

  return response;
}
