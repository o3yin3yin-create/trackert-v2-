import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const handler = clerkMiddleware(async (auth, req) => {
  const origin = req.headers.get('origin');

  // Handle preflight OPTIONS requests for all /api routes
  if (req.method === 'OPTIONS' && req.nextUrl.pathname.startsWith('/api')) {
    const preflightHeaders = {
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
      'Access-Control-Max-Age': '86400',
    };
    if (origin) {
      preflightHeaders['Access-Control-Allow-Origin'] = origin;
      preflightHeaders['Access-Control-Allow-Credentials'] = 'true';
    }
    return new NextResponse(null, {
      status: 204,
      headers: preflightHeaders,
    });
  }

  const response = NextResponse.next();
  if (req.nextUrl.pathname.startsWith('/api')) {
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
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
