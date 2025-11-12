import axios from 'axios';
import https from 'node:https';

const CNN_FGI_URL = process.env.CNN_FGI_URL || 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata';
const DEFAULT_CACHE_SECONDS = Number(process.env.CNN_FGI_CACHE_SECONDS || 600);
const DEFAULT_TIMEOUT = Number(process.env.CNN_FGI_TIMEOUT_MS || 5000);
const DEFAULT_USER_AGENT =
  process.env.CNN_FGI_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const DEFAULT_REFERER =
  process.env.CNN_FGI_REFERER || 'https://edition.cnn.com/markets/fear-and-greed';
const DEFAULT_ORIGIN =
  process.env.CNN_FGI_ORIGIN || 'https://edition.cnn.com';
const USER_AGENT_POOL = (process.env.CNN_FGI_USER_AGENT_POOL || '')
  .split(',')
  .map((ua) => ua.trim())
  .filter(Boolean);
const REFERER_POOL = (process.env.CNN_FGI_REFERER_POOL || '')
  .split(',')
  .map((ref) => ref.trim())
  .filter(Boolean);
const MAX_ATTEMPTS = Math.max(1, Number(process.env.CNN_FGI_MAX_ATTEMPTS || 4));

const cacheKey = 'macro:cnn:fear_greed';
let cookieCache = null;
let cookieCacheExpiry = 0;
const keepAliveAgent = new https.Agent({ keepAlive: true, timeout: DEFAULT_TIMEOUT });

const pickRandom = (arr, fallback) => {
  if (!arr?.length) return fallback;
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx] || fallback;
};

const toIso = (ts) => {
  if (ts === null || ts === undefined) return null;
  const num = Number(ts);
  if (!Number.isFinite(num)) return null;
  const ms = num > 1e12 ? num : num * 1000;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const mapAxiosError = (err) => {
  if (!err) return { message: 'Unknown error' };
  if (err.response) {
    return {
      message: err.message,
      status: err.response.status,
      data: err.response.data
    };
  }
  if (err.request) {
    return {
      message: err.message,
      request: {
        url: err.config?.url,
        method: err.config?.method
      }
    };
  }
  return { message: err.message };
};

const buildHeaders = ({ cookie, attempt = 0 } = {}) => {
  const userAgent = attempt === 0 ? DEFAULT_USER_AGENT : pickRandom(USER_AGENT_POOL, DEFAULT_USER_AGENT);
  const referer = attempt === 0 ? DEFAULT_REFERER : pickRandom(REFERER_POOL, DEFAULT_REFERER);
  return {
    'User-Agent': userAgent,
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
    Referer: referer,
  Origin: DEFAULT_ORIGIN,
  Pragma: 'no-cache',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
    'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Fetch-Site': 'same-site',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Dest': 'empty',
  'Sec-CH-UA': '"Chromium";v="129", "Not=A?Brand";v="24", "Google Chrome";v="129"',
  'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': '"Windows"',
    DNT: '1',
    ...(cookie ? { Cookie: cookie } : {})
  };
};

const fetchCookie = async ({ force = false, attempt = 0 } = {}) => {
  const now = Date.now();
  if (!force && cookieCache && cookieCacheExpiry > now) {
    return cookieCache;
  }

  try {
    const response = await axios.get(DEFAULT_REFERER, {
      timeout: DEFAULT_TIMEOUT,
      httpsAgent: keepAliveAgent,
      headers: buildHeaders({ attempt })
    });

    const setCookie = response.headers?.['set-cookie'];
    if (Array.isArray(setCookie) && setCookie.length) {
      const cookie = setCookie
        .map((entry) => entry.split(';')[0])
        .filter(Boolean)
        .join('; ');
      cookieCache = cookie;
      cookieCacheExpiry = now + Number(process.env.CNN_FGI_COOKIE_TTL_MS || 15 * 60 * 1000);
      return cookieCache;
    }
  } catch (error) {
    console.warn('[cnn] cookie fetch warning', mapAxiosError(error));
  }
  cookieCache = null;
  cookieCacheExpiry = 0;
  return null;
};

const normalizeFearGreed = (payload) => {
  if (!payload?.fear_and_greed) return null;
  const core = payload.fear_and_greed;
  const history = Array.isArray(payload.fear_and_greed_historical)
    ? payload.fear_and_greed_historical
    : [];
  const previous = Array.isArray(payload.fear_and_greed_historical)
    ? payload.fear_and_greed_historical[0]
    : null;

  return {
    score: Number(core.score ?? core.value ?? core.index),
    rating: core.rating ?? core.classification ?? null,
    timestamp: toIso(core.timestamp ?? core.lastUpdated ?? core.last_update),
    previousClose: previous
      ? {
          score: Number(previous.score ?? previous.value ?? previous.index),
          rating: previous.rating ?? null,
          timestamp: toIso(previous.timestamp ?? previous.lastUpdated ?? previous.last_update)
        }
      : null,
    raw: payload
  };
};

export async function fetchFearGreedIndex({ redis, force = false } = {}) {
  if (!force && redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached && cached.raw) {
        return { ok: true, ...cached, cached: true };
      }
    } catch (error) {
      console.error('[cnn] cache read error', error);
    }
  }

  try {
    let cookie = await fetchCookie();
    let response;
    let lastError = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      try {
        response = await axios.get(CNN_FGI_URL, {
          timeout: DEFAULT_TIMEOUT,
          httpsAgent: keepAliveAgent,
          headers: buildHeaders({ cookie, attempt }),
          responseType: 'json',
          transitional: { forcedJSONParsing: true }
        });
        break;
      } catch (err) {
        lastError = err;
        const status = err?.response?.status;
        if (status === 403 || status === 418 || status === 429) {
          const waitMs = Math.min(1500 * (attempt + 1), 5000);
          if (waitMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, waitMs));
          }
          cookie = await fetchCookie({ force: true, attempt: attempt + 1 });
          continue;
        }
        throw err;
      }
    }

    if (!response) {
      throw lastError || new Error('Unknown CNN response error');
    }

    const normalized = normalizeFearGreed(response.data);

    const result = {
      ok: true,
      fetchedAt: new Date().toISOString(),
      cached: false,
      ...normalized
    };

    if (redis) {
      try {
        await redis.set(cacheKey, result, { ex: DEFAULT_CACHE_SECONDS });
      } catch (error) {
        console.error('[cnn] cache write error', error);
      }
    }

    return result;
  } catch (error) {
    const serialized = mapAxiosError(error);
    console.error('[cnn] fetch error', serialized);
    return {
      ok: false,
      error: serialized
    };
  }
}

export default {
  fetchFearGreedIndex
};

