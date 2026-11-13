import crypto from 'crypto';

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

function extractToken(req) {
  if (!req) return null;
  
  // 1. Authorization header: Bearer <token>
  const authHeader = typeof req.headers?.get === 'function' 
    ? req.headers.get('authorization')
    : req.headers?.['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // 2. Cookie: __bokra_session or __session
  if (typeof req.cookies?.get === 'function') {
    const val = req.cookies.get('__bokra_session')?.value || req.cookies.get('__session')?.value;
    if (val) return val.trim();
  }
  const cookieStr = typeof req.headers?.get === 'function' 
    ? req.headers.get('cookie')
    : req.headers?.cookie;
  if (cookieStr) {
    const match = cookieStr.match(/(?:^|; )__(?:bokra_session|session)=([^;]*)/);
    if (match) return decodeURIComponent(match[1]).trim();
  }
  return null;
}

export async function getAuthUserData(req) {
  // 1. Try bokra signed token (Cookie or Bearer Header)
  const token = extractToken(req);
  if (token && token.startsWith('bokra_dt_')) {
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
            return null; // Token revoked or account blocked
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
        avatar: verified.avatar || '',
      };
    }
  }

  // 2. Try Clerk session if available
  try {
    const { auth } = await import('@clerk/nextjs/server');
    const clerkAuth = await auth();
    if (clerkAuth?.userId) {
      return {
        userId: clerkAuth.userId,
        email: `${clerkAuth.userId}@bokra.app`,
        name: 'User',
        username: null,
        avatar: '',
      };
    }
  } catch (_) {}

  // 3. Try Clerk verifyToken if token in Bearer header
  if (token && process.env.CLERK_SECRET_KEY) {
    try {
      const { verifyToken } = await import('@clerk/backend');
      const clerkPayload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      if (clerkPayload?.sub) {
        return {
          userId: clerkPayload.sub,
          email: `${clerkPayload.sub}@bokra.app`,
          name: 'User',
          username: null,
          avatar: '',
        };
      }
    } catch (_) {}
  }

  return null;
}

export async function getAuthUserId(req) {
  const data = await getAuthUserData(req);
  return data?.userId || null;
}
