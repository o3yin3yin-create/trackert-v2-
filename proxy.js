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
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com https://clerk.bokra101.vercel.app https://bokra101.vercel.app https://apis.google.com https://accounts.google.com https://www.gstatic.com https://*.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://server.arcgisonline.com https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com https://*.openfreemap.org https://tiles.openfreemap.org https://cdnjs.cloudflare.com https://img.clerk.com https://images.clerk.dev https://clerk.bokra101.vercel.app https://bokra101.vercel.app https://i.scdn.co https://*.scdn.co https://*.spotifycdn.com https://mosaic.scdn.co https://*.spotify.com https://lh3.googleusercontent.com https://demotiles.maplibre.org https://*.maplibre.org https://fonts.openmaptiles.org",
    "font-src 'self' data: https://fonts.gstatic.com https://fonts.openmaptiles.org",
    "connect-src 'self' https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com https://clerk.bokra101.vercel.app https://bokra101.vercel.app https://api.clerk.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://server.arcgisonline.com https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com https://*.openfreemap.org https://tiles.openfreemap.org https://demotiles.maplibre.org https://fonts.openmaptiles.org https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com https://*.googleapis.com https://*.firebaseio.com https://api.spotify.com https://*.upstash.io wss://*.upstash.io https://accounts.google.com https://*.protect.clerk.com:* https://clerk-telemetry.com https://*.clerk-telemetry.com",
    "frame-src 'self' https://open.spotify.com https://*.clerk.accounts.dev https://clerk.com https://clerk.bokra101.vercel.app https://bokra101.vercel.app https://accounts.google.com",
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
}, {
  frontendApiProxy: {
    enabled: true,
  },
});

const PROD_HOST = 'bokra101.vercel.app';
const PROD_ORIGIN = `https://${PROD_HOST}`;

async function handleClerkProxy(req, event) {
  const currentHost = req.nextUrl.host;
  const currentHostname = req.nextUrl.hostname;

  // If already on the production domain, pass through directly
  if (currentHostname === PROD_HOST) {
    return handler(req, event);
  }

  // Rewrite headers so Clerk accepts the proxy request
  const headers = new Headers(req.headers);
  headers.set('x-forwarded-host', PROD_HOST);
  headers.set('x-forwarded-proto', 'https');
  if (headers.has('origin')) {
    headers.set('origin', PROD_ORIGIN);
  }
  if (headers.has('referer')) {
    const referer = headers.get('referer');
    try {
      const refUrl = new URL(referer);
      headers.set('referer', `${PROD_ORIGIN}${refUrl.pathname}${refUrl.search}`);
    } catch {
      headers.set('referer', `${PROD_ORIGIN}/`);
    }
  }

  const init = { method: req.method, headers };
  if (req.body) {
    init.body = req.body;
    init.duplex = 'half';
  }

  const proxiedReq = new NextRequest(req.nextUrl, init);
  const response = await handler(proxiedReq, event);

  if (!response) return response;

  // Rewrite access-control-allow-origin so the client browser doesn't trigger CORS error
  const requestOrigin = req.headers.get('origin');
  if (requestOrigin) {
    response.headers.set('access-control-allow-origin', requestOrigin);
    response.headers.set('access-control-allow-credentials', 'true');
  }

  // Rewrite Set-Cookie headers so the client browser accepts them on current host (e.g. bokra.onrender.com or localhost)
  const rawCookies = response.headers.getSetCookie();
  if (rawCookies && rawCookies.length > 0) {
    response.headers.delete('set-cookie');
    for (const cookieStr of rawCookies) {
      // Remove explicit Domain=bokra101.vercel.app so it defaults to host-only cookie for current domain
      const cleaned = cookieStr.replace(/Domain=[^;]+;?\s*/gi, '');
      response.headers.append('set-cookie', cleaned);
    }
  }

  // Rewrite any redirect Location header pointing to bokra101.vercel.app
  const location = response.headers.get('location');
  if (location && location.includes(PROD_HOST)) {
    const currentOrigin = `${req.nextUrl.protocol}//${currentHost}`;
    response.headers.set('location', location.replace(PROD_ORIGIN, currentOrigin));
  }

  // Rewrite JSON body (e.g. Google OAuth redirect_uri inside external_verification_redirect_url)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json') || contentType.includes('text/')) {
    try {
      const text = await response.text();
      if (text.includes(PROD_HOST)) {
        const encodedProd = encodeURIComponent(PROD_HOST);
        const encodedCurr = encodeURIComponent(currentHost);
        const rewrittenText = text
          .replaceAll(encodedProd, encodedCurr)
          .replaceAll(PROD_HOST, currentHost);

        const newHeaders = new Headers(response.headers);
        newHeaders.delete('content-length');

        return new NextResponse(rewrittenText, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }
    } catch {
      // Fall back to original response if body reading fails
    }
  }

  return response;
}

export async function proxy(req, event) {
  if (req.nextUrl.pathname.startsWith('/__clerk')) {
    return handleClerkProxy(req, event);
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
