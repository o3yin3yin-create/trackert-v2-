import crypto from 'crypto';
import { getAdminAuth } from '@/lib/firebaseAdmin';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[SECURITY FATAL] JWT_SECRET is not configured in production. Rejecting all desktop tokens (fail-closed).');
    }
    return '';
  }
  return secret;
}

export function signDesktopToken(payload) {
  const secret = getSecret();
  if (!secret) throw new Error('JWT_SECRET is required to sign desktop tokens');
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `bokra_dt_${data}.${signature}`;
}

export function verifyDesktopToken(token) {
  if (!token || !token.startsWith('bokra_dt_')) return null;
  const secret = getSecret();
  if (!secret) return null; // Fail-closed when JWT_SECRET is not configured
  const raw = token.slice('bokra_dt_'.length);
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  
  try {
    const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    // Enforce expiry validation: must have exp and cannot be expired
    if (!payload.exp || typeof payload.exp !== 'number' || Date.now() > payload.exp) {
      return null; // Expired or missing expiry
    }
    return payload;
  } catch (e) {
    return null;
  }
}

// In-memory token cache for verified Firebase ID tokens (5 minutes TTL)
const tokenCache = new Map();

function getCachedAuth(token) {
  const cached = tokenCache.get(token);
  if (cached && cached.exp > Date.now()) {
    return cached.data;
  }
  if (cached) {
    tokenCache.delete(token);
  }
  return null;
}

function setCachedAuth(token, data, expSeconds) {
  const exp = Math.min(Date.now() + 5 * 60 * 1000, (expSeconds || 0) * 1000);
  tokenCache.set(token, { data, exp });
  // Prevent memory leak by pruning oldest if cache exceeds 5000 items
  if (tokenCache.size > 5000) {
    const firstKey = tokenCache.keys().next().value;
    tokenCache.delete(firstKey);
  }
}

function extractToken(req) {
  if (!req) return null;

  // 1. Authorization header: Bearer <token>
  const authHeader = typeof req.headers?.get === 'function' 
    ? req.headers.get('authorization')
    : req.headers?.['authorization'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // 2. Cookie: __session or firebase_token
  let cookieStr = null;
  if (typeof req.headers?.get === 'function') {
    cookieStr = req.headers.get('cookie');
  } else if (req.headers?.cookie) {
    cookieStr = req.headers.cookie;
  } else if (req.cookies?.get) {
    const sessionCookie = req.cookies.get('__session')?.value || req.cookies.get('firebase_token')?.value;
    if (sessionCookie) return sessionCookie.trim();
  }

  if (cookieStr) {
    const match = cookieStr.match(/(?:^|; )(?:__session|firebase_token)=([^;]*)/);
    if (match) return decodeURIComponent(match[1]).trim();
  }

  return null;
}

export async function getAuthUserData(req) {
  const token = extractToken(req);
  if (!token) return null;

  // 1. Desktop token
  if (token.startsWith('bokra_dt_')) {
    const verified = verifyDesktopToken(token);
    if (verified?.userId) {
      if (typeof verified.tokenVersion === 'number') {
        try {
          const { default: prisma } = await import('@/lib/prisma');
          const dbUser = await prisma.user.findUnique({
            where: { clerkId: verified.userId },
            select: { tokenVersion: true, isBlocked: true }
          });
          if (!dbUser || dbUser.isBlocked || dbUser.tokenVersion !== verified.tokenVersion) {
            return null;
          }
        } catch {
          return null;
        }
      }
      return {
        userId: verified.userId,
        email: verified.email || `${verified.userId}@bokra.app`,
        name: verified.name || 'User',
        username: verified.username || null,
        avatar: '',
      };
    }
    return null;
  }

  // 2. Firebase ID token
  const cached = getCachedAuth(token);
  if (cached) return cached;

  // 2a. Try Firebase Admin SDK if configured
  const auth = getAdminAuth();
  if (auth) {
    try {
      const decoded = await auth.verifyIdToken(token);
      if (decoded && decoded.uid) {
        const data = {
          userId: decoded.uid,
          email: decoded.email || `${decoded.uid}@bokra.app`,
          name: decoded.name || decoded.displayName || 'User',
          username: decoded.name ? decoded.name.replace(/\s+/g, '').toLowerCase() : null,
          avatar: decoded.picture || '',
        };
        setCachedAuth(token, data, decoded.exp);
        return data;
      }
    } catch (_) {}
  }

  // 2b. Standalone verification via Google Identity Toolkit REST API
  // Requires ZERO service-account private keys: works 100% with NEXT_PUBLIC_FIREBASE_API_KEY on Render!
  const apiKey = process.env.FIREBASE_API_KEY || 
                 process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 
                 'AIzaSyBjfeyhQy8EN507J7NKz11PI-HOuBPAUL4';

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    });

    if (res.ok) {
      const data = await res.json();
      const fbUser = data?.users?.[0];
      if (fbUser && fbUser.localId) {
        let exp = Math.floor(Date.now() / 1000) + 300;
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
          if (payload?.exp) exp = payload.exp;
        } catch (_) {}

        const userData = {
          userId: fbUser.localId,
          email: fbUser.email || `${fbUser.localId}@bokra.app`,
          name: fbUser.displayName || 'User',
          username: fbUser.displayName ? fbUser.displayName.replace(/\s+/g, '').toLowerCase() : null,
          avatar: fbUser.photoUrl || '',
        };

        setCachedAuth(token, userData, exp);
        return userData;
      }
    }
  } catch (err) {
    console.error('[auth-server] Remote token verification error:', err);
  }

  return null;
}

export async function getAuthUserId(req) {
  const data = await getAuthUserData(req);
  return data?.userId || null;
}
