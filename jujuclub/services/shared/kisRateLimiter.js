import { Redis } from '@upstash/redis';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const RATE_KEY = process.env.KIS_RATE_LIMIT_KEY || 'kis:throttle:global';
const GAP_MS = Math.max(Number(process.env.KIS_RATE_LIMIT_GAP_MS || 200), 50);
const MAX_WAIT_MS = Math.max(Number(process.env.KIS_RATE_LIMIT_MAX_WAIT_MS || 2000), GAP_MS * 2);

let redisClient;
try {
  redisClient = Redis.fromEnv();
} catch (err) {
  // Upstash env not configured; fall back to local throttle only
  redisClient = null;
}

let localLastCall = 0;

async function acquireLocalSlot() {
  const now = Date.now();
  const wait = localLastCall + GAP_MS - now;
  if (wait > 0) {
    await sleep(wait);
  }
  localLastCall = Date.now();
}

export async function acquireKisSlot(label = 'generic') {
  if (!redisClient) {
    await acquireLocalSlot();
    return;
  }

  const end = Date.now() + MAX_WAIT_MS;
  while (Date.now() <= end) {
    try {
      const res = await redisClient.set(RATE_KEY, `${label}:${Date.now()}`, { nx: true, px: GAP_MS });
      if (res === 'OK') {
        localLastCall = Date.now();
        return;
      }
      const ttl = await redisClient.pttl(RATE_KEY).catch(() => GAP_MS);
      const wait = ttl > 0 ? ttl : GAP_MS;
      await sleep(Math.min(wait + 20, GAP_MS * 2));
    } catch (err) {
      console.warn('[kisRateLimiter] redis error, falling back to local throttle', err?.message || err);
      break;
    }
  }

  await acquireLocalSlot();
}

export default {
  acquireKisSlot
};


