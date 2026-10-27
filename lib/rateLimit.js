// In-memory sliding-window rate limiter with automatic stale entry cleanup
const rateLimitMap = new Map();

const CLEANUP_INTERVAL_MS = 60 * 1000; // prune every 60 seconds
let lastCleanup = Date.now();

function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter((t) => now - t < 120_000);
    if (valid.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, valid);
    }
  }
}

/**
 * Checks if a key has exceeded maximum allowed requests within a rolling time window.
 * @param {string} key Unique identifier (IP, userId, action)
 * @param {number} max Maximum allowed requests
 * @param {number} windowMs Rolling window in milliseconds (default: 60,000ms = 1 min)
 * @returns {boolean} true if allowed, false if rate limited
 */
export function rateLimit(key, max = 20, windowMs = 60_000) {
  const now = Date.now();
  cleanupStaleEntries();

  const timestamps = (rateLimitMap.get(key) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= max) {
    rateLimitMap.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return true;
}

export default rateLimit;
