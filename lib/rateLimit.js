import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// In-memory sliding-window fallback limiter with automated stale-key garbage collection
const rateLimitMap = new Map();
const CLEANUP_INTERVAL_MS = 60 * 1000;
let lastCleanup = Date.now();

function memoryRateLimit(key, max = 20, windowMs = 60_000) {
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    lastCleanup = now;
    for (const [k, timestamps] of rateLimitMap.entries()) {
      const valid = timestamps.filter((t) => now - t < 120_000);
      if (valid.length === 0) rateLimitMap.delete(k);
      else rateLimitMap.set(k, valid);
    }
  }

  const timestamps = (rateLimitMap.get(key) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= max) {
    rateLimitMap.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return true;
}

// Check if Upstash Redis credentials are provided
const hasUpstashConfig = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

let upstashRatelimit = null;
if (hasUpstashConfig) {
  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    upstashRatelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: true,
      prefix: 'bokra_rl',
    });
  } catch (err) {
    console.warn('[RateLimit] Failed to initialize Upstash Redis, falling back to in-memory store:', err.message);
  }
}

/**
 * Checks if request is within allowed rate limits.
 * Uses distributed Upstash Redis if configured; gracefully falls back to local in-memory sliding window.
 * @param {string} key Unique identifier (IP, userId, action)
 * @param {number} max Maximum allowed requests
 * @param {number} windowMs Rolling window in milliseconds (default: 60,000ms = 1 min)
 * @returns {Promise<boolean>} true if allowed, false if rate limited
 */
export async function rateLimit(key, max = 20, windowMs = 60_000) {
  if (process.env.BENCHMARK_MODE === 'true') return true;

  if (hasUpstashConfig && upstashRatelimit) {
    try {
      const { success } = await upstashRatelimit.limit(key);
      return success;
    } catch (e) {
      // Graceful fallback to memory on network/connection failure
      return memoryRateLimit(key, max, windowMs);
    }
  }

  return memoryRateLimit(key, max, windowMs);
}

/**
 * Extracts trusted client IP on Vercel / serverless deployments.
 * Prioritizes platform-provided request.ip and Vercel's x-real-ip over client-spoofable leftmost x-forwarded-for.
 */
export function getClientIp(request) {
  if (!request) return '127.0.0.1';
  if (request.ip) return request.ip;

  const realIp = typeof request.headers?.get === 'function'
    ? request.headers.get('x-real-ip')
    : request.headers?.['x-real-ip'];
  if (realIp && typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  const forwardedFor = typeof request.headers?.get === 'function'
    ? request.headers.get('x-forwarded-for')
    : request.headers?.['x-forwarded-for'];
  if (forwardedFor && typeof forwardedFor === 'string') {
    const parts = forwardedFor.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      // Rightmost hop is appended by the nearest trusted infrastructure proxy
      return parts[parts.length - 1];
    }
  }

  return '127.0.0.1';
}

export default rateLimit;
