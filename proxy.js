import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsOptions } from './lib/cors';

const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/settings(.*)',
  '/account(.*)',
]);

const handler = clerkMiddleware(async (auth, req) => {
  // 1. Handle preflight OPTIONS requests for /api routes with strict whitelist CORS
  if (req.method === 'OPTIONS' && req.nextUrl.pathname.startsWith('/api')) {
    return handleCorsOptions(req);
  }

  // 2. Protect explicit protected routes: force sign-in for any unauthenticated user
  if (isProtectedRoute(req)) {
    await auth.protect();
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
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com https://clerk.bokra101.vercel.app https://bokra101.vercel.app https://apis.google.com https://accounts.google.com https://www.gstatic.com https://*.gstatic.com https://*.onrender.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://server.arcgisonline.com https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com https://*.openfreemap.org https://tiles.openfreemap.org https://cdnjs.cloudflare.com https://img.clerk.com https://images.clerk.dev https://clerk.bokra101.vercel.app https://bokra101.vercel.app https://i.scdn.co https://*.scdn.co https://*.spotifycdn.com https://mosaic.scdn.co https://*.spotify.com https://lh3.googleusercontent.com https://demotiles.maplibre.org https://*.maplibre.org https://fonts.openmaptiles.org https://*.onrender.com",
    "font-src 'self' data: https://fonts.gstatic.com https://fonts.openmaptiles.org",
    "connect-src 'self' https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com https://clerk.bokra101.vercel.app https://bokra101.vercel.app https://api.clerk.com https://frontend-api.clerk.dev https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://server.arcgisonline.com https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com https://*.openfreemap.org https://tiles.openfreemap.org https://demotiles.maplibre.org https://fonts.openmaptiles.org https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com https://*.googleapis.com https://*.firebaseio.com https://api.spotify.com https://*.upstash.io wss://*.upstash.io https://accounts.google.com https://*.protect.clerk.com:* https://clerk-telemetry.com https://*.clerk-telemetry.com https://*.onrender.com",
    "frame-src 'self' https://open.spotify.com https://*.clerk.accounts.dev https://clerk.com https://clerk.bokra101.vercel.app https://bokra101.vercel.app https://accounts.google.com https://*.onrender.com",
    "worker-src 'self' blob: https://bokra101.vercel.app https://*.onrender.com",
    "child-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com https://clerk.bokra101.vercel.app https://bokra101.vercel.app https://*.onrender.com",
    "frame-ancestors 'self'"
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  return response;
});

const CLERK_INSTANCE_HOST = 'bokra101.vercel.app';

async function handleClerkProxy(req) {
  const currentHost = req.headers.get('x-forwarded-host') || req.nextUrl.host;
  const currentProto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '') || 'https';
  const currentOrigin = `${currentProto}://${currentHost}`;

  const targetPath = req.nextUrl.pathname.replace(/^\/__clerk/, '') || '/';
  const targetUrl = new URL(targetPath + req.nextUrl.search, 'https://frontend-api.clerk.dev');

  const headers = new Headers();
  headers.set('Host', 'frontend-api.clerk.dev');
  headers.set('Clerk-Proxy-Url', `https://${CLERK_INSTANCE_HOST}/__clerk`);
  headers.set('Clerk-Secret-Key', process.env.CLERK_SECRET_KEY);
  headers.set('Accept-Encoding', 'identity');

  const fwdHeaders = ['cookie', 'authorization', 'content-type', 'user-agent', 'x-forwarded-for', 'accept', 'accept-language'];
  for (const h of fwdHeaders) {
    const val = req.headers.get(h);
    if (val) headers.set(h, val);
  }

  let reqBody = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    reqBody = await req.arrayBuffer();
  }

  const clerkRes = await fetch(targetUrl.toString(), {
    method: req.method,
    headers,
    body: reqBody,
    redirect: 'manual',
  });

  const resHeaders = new Headers();
  clerkRes.headers.forEach((val, key) => {
    const l = key.toLowerCase();
    if (!['connection', 'keep-alive', 'transfer-encoding', 'content-encoding'].includes(l)) {
      resHeaders.set(key, val);
    }
  });

  const reqOrigin = req.headers.get('origin') || currentOrigin;
  resHeaders.set('access-control-allow-origin', reqOrigin);
  resHeaders.set('access-control-allow-credentials', 'true');

  const rawCookies = clerkRes.headers.getSetCookie();
  if (rawCookies && rawCookies.length > 0) {
    resHeaders.delete('set-cookie');
    for (const c of rawCookies) {
      resHeaders.append('set-cookie', c.replace(/Domain=[^;]+;?\s*/gi, ''));
    }
  }

  let loc = clerkRes.headers.get('location');
  if (loc) {
    if (loc.includes(CLERK_INSTANCE_HOST)) {
      loc = loc.replaceAll(CLERK_INSTANCE_HOST, currentHost);
    }
    resHeaders.set('location', loc);
  }

  if (clerkRes.status === 301 || clerkRes.status === 302 || clerkRes.status === 204) {
    return new NextResponse(null, { status: clerkRes.status, headers: resHeaders });
  }

  const contentType = clerkRes.headers.get('content-type') || '';
  if (contentType.includes('application/json') || contentType.includes('text/') || contentType.includes('javascript')) {
    const text = await clerkRes.text();
    const rewritten = text.replaceAll(CLERK_INSTANCE_HOST, currentHost);
    resHeaders.delete('content-length');
    return new NextResponse(rewritten, { status: clerkRes.status, headers: resHeaders });
  }

  const buffer = await clerkRes.arrayBuffer();
  return new NextResponse(buffer, { status: clerkRes.status, headers: resHeaders });
}

export async function proxy(req, event) {
  if (req.nextUrl.pathname.startsWith('/__clerk')) {
    try {
      return await handleClerkProxy(req);
    } catch (err) {
      console.error('[Clerk Proxy Error]:', err);
      return new NextResponse(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
  }
  return handler(req, event);
}

export default proxy;


export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|apk|dmg|deb|AppImage|rpm|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Clerk proxy matcher
    '/__clerk/:path*',
  ],
};
