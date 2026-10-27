import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsOptions } from './lib/cors';

const handler = clerkMiddleware(async (auth, req) => {
  // 1. Handle preflight OPTIONS requests for /api routes with strict whitelist CORS
  if (req.method === 'OPTIONS' && req.nextUrl.pathname.startsWith('/api')) {
    return handleCorsOptions(req);
  }

  const response = NextResponse.next();

  // 2. Attach strict CORS headers on API routes
  if (req.nextUrl.pathname.startsWith('/api')) {
    const cors = getCorsHeaders(req);
    for (const [key, val] of Object.entries(cors)) {
      if (val) response.headers.set(key, val);
    }
  }

  // 3. Security Headers on all pages and routes
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  return response;
});

export function proxy(req, event) {
  return handler(req, event);
}

export default handler;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
