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

export default rateLimit;
