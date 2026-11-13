import { NextResponse } from 'next/server';
import { getCorsHeaders, handleCorsOptions } from './lib/cors';

export function proxy(req) {
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
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://*.clerk.accounts.dev https://clerk.com https://*.clerk.com https://clerk.bokra101.vercel.app https://bokra101.vercel.app https://apis.google.com https://accounts.google.com https://www.gstatic.com https://*.gstatic.com https://*.onrender.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
    "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://server.arcgisonline.com https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com https://*.openfreemap.org https://tiles.openfreemap.org https://cdnjs.cloudflare.com https://img.clerk.com https://images.clerk.dev https://clerk.bokra101.vercel.app https://bokra101.vercel.app https://i.scdn.co https://*.scdn.co https://*.spotifycdn.com https://mosaic.scdn.co https://*.spotify.com https://*.googleusercontent.com https://googleusercontent.com https://*.google.com https://*.gstatic.com https://demotiles.maplibre.org https://*.maplibre.org https://fonts.openmaptiles.org https://*.onrender.com",
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
}

export default proxy;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|apk|dmg|deb|AppImage|rpm|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
