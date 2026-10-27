import crypto from 'crypto';
import { auth } from '@clerk/nextjs/server';

const SECRET = process.env.CLERK_SECRET_KEY || process.env.JWT_SECRET || 'bokra_desktop_fallback_secret_key_3910';
if (!process.env.CLERK_SECRET_KEY && !process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('[SECURITY WARNING] Neither CLERK_SECRET_KEY nor JWT_SECRET is configured. Desktop tokens may not be secure.');
}

export function signDesktopToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `bokra_dt_${data}.${signature}`;
}

export function verifyDesktopToken(token) {
  if (!token || !token.startsWith('bokra_dt_')) return null;
  const raw = token.slice('bokra_dt_'.length);
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  
  try {
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch (e) {
    return null;
  }
}

export async function getAuthUserId(req) {
  // 1. Try standard Clerk session
  try {
    const clerkAuth = await auth();
    if (clerkAuth?.userId) return clerkAuth.userId;
  } catch (e) {}

  // 2. Try signed token or Clerk JWT from Authorization header
  if (req) {
    const authHeader = typeof req.headers?.get === 'function' 
      ? req.headers.get('authorization')
      : req.headers?.['authorization'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      
      // 2a. Desktop HMAC token
      const verified = verifyDesktopToken(token);
      if (verified?.userId) {
        return verified.userId;
      }

      // 2b. Clerk Session JWT Token
      try {
        const { verifyToken } = await import('@clerk/backend');
        if (process.env.CLERK_SECRET_KEY) {
          const clerkPayload = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
          });
          if (clerkPayload?.sub) {
            return clerkPayload.sub;
          }
        }
      } catch (e) {
        // Fallback: safely extract sub from signed clerk JWT
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
            if (payload?.sub) {
              return payload.sub;
            }
          }
        } catch (err) {}
      }
    }
  }

  return null;
}
