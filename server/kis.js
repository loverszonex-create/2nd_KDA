import { Redis } from '@upstash/redis';
import {
  getStockQuote,
  getIndexQuote,
  getNews,
  getStockDailyChart,
  getIndexCategoryPrice,
  getIndexDailyBreadth,
  hasKisConfig
} from './shared/kisClient.js';

const redis = Redis.fromEnv();
const CACHE_TTL = 30; // seconds
const NEWS_CACHE_TTL = 60 * 10; // 10 minutes
const HISTORY_CACHE_TTL = 60 * 15; // 15 minutes
const BREADTH_CACHE_TTL = 60 * 15; // 15 minutes

export const hasKis = hasKisConfig();

const tzOffsetMinutes = 9 * 60;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const toYyyymmddKst = (date = new Date()) => {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const kst = new Date(utc + tzOffsetMinutes * 60000);
  const yyyy = kst.getFullYear();
  const mm = String(kst.getMonth() + 1).padStart(2, '0');
  const dd = String(kst.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
};

const isWeekend = (date) => {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
};

const prevBusinessDay = (ymd) => {
  const yyyy = Number(ymd.slice(0, 4));
  const mm = Number(ymd.slice(4, 6)) - 1;
  const dd = Number(ymd.slice(6, 8));
  let cursor = new Date(Date.UTC(yyyy, mm, dd, 0, 0, 0));
  do {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  } while (isWeekend(cursor));
  const year = cursor.getUTCFullYear();
  const month = String(cursor.getUTCMonth() + 1).padStart(2, '0');
  const day = String(cursor.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

const resolveDefaultStartDate = () => {
  let ymd = toYyyymmddKst();
  const yyyy = Number(ymd.slice(0, 4));
  const mm = Number(ymd.slice(4, 6)) - 1;
  const dd = Number(ymd.slice(6, 8));
  let cursor = new Date(Date.UTC(yyyy, mm, dd, 0, 0, 0));
  if (isWeekend(cursor)) {
    ymd = prevBusinessDay(ymd);
  }
  return ymd;
};

const toNumber = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = typeof value === 'string' ? value.replace(/,/g, '') : value;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
};

function normalizeQuote(output = {}, ticker, provider = 'KIS-REST') {
  if (!output) return null;
  const ts = new Date().toISOString();
  const lastPrice = Number(output.stck_prpr);
  const pctChange = output.prdy_ctrt !== undefined ? Number(output.prdy_ctrt) : null;
  const volume = output.acml_vol !== undefined ? Number(output.acml_vol) : null;
  if (!Number.isFinite(lastPrice)) return null;
  return {
    ticker,
    ts,
    last_price: lastPrice,
    pct_change: Number.isFinite(pctChange) ? pctChange : null,
    volume: Number.isFinite(volume) ? volume : null,
    provider,
    raw: output
  };
}

export async function fetchKisQuote(ticker, { market = 'J' } = {}) {
  if (!hasKis) return null;
  const cacheKey = `kis:quote:${ticker}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached && cached.ts && Date.now() - Date.parse(cached.ts) < CACHE_TTL * 1000) {
      return cached;
    }
    const output = await getStockQuote({ ticker, market });
    const normalized = normalizeQuote(output, ticker);
    if (normalized) {
      await redis.set(cacheKey, normalized, { ex: CACHE_TTL });
    }
    return normalized;
  } catch (err) {
    console.error('[gateway] fetchKisQuote error', err?.message || err);
    return null;
  }
}

export async function fetchKospiQuote() {
  const cacheKey = 'live:KOSPI';

  try {
    const cached = await redis.get(cacheKey);
    if (cached && cached.last_price !== undefined) {
      console.log('[kis] kospi cache hit', cached.last_price);
      return cached;
    }
  } catch (err) {
    console.error('[kis] kospi cache read error', err?.message || err);
  }

  if (!hasKis) {
    console.warn('[kis] kospi cache miss and no KIS credentials');
    return null;
  }

  try {
    const output = await getIndexQuote({ indexCode: '0001' });
    const raw = Array.isArray(output?.output)
      ? output.output[0]
      : Array.isArray(output?.output1)
        ? output.output1[0]
        : Array.isArray(output?.output2)
          ? output.output2[0]
          : output;

    const normalized = {
      ticker: 'KOSPI',
      ts: new Date().toISOString(),
      last_price: Number(raw?.bstp_nmix_prpr ?? raw?.bzpi_clpr ?? raw?.clpr),
      pct_change: Number(raw?.bstp_nmix_prdy_ctrt ?? raw?.bzpi_updn_rate ?? raw?.prdy_ctrt),
      volume: raw?.acml_vol !== undefined ? Number(raw.acml_vol) : null,
      provider: 'KIS-REST',
      raw
    };

    if (Number.isFinite(normalized.last_price)) {
      await redis.set(cacheKey, normalized, { ex: CACHE_TTL });
      console.log('[kis] kospi api fallback stored', normalized.last_price);
      return normalized;
    }

    console.warn('[kis] kospi api fallback invalid', raw);
    return null;
  } catch (err) {
    console.error('[gateway] fetchKospiQuote error', err?.message || err);
    return null;
  }
}

export async function fetchSamsungNews() {
  const cacheKey = 'news:005930';
  let cached;
  try {
    cached = await redis.get(cacheKey);
    console.log('[kis] news cached raw', cached ? typeof cached : 'null');
    if (cached?.items?.length) {
      const cachedTs = typeof cached.ts === 'number' ? cached.ts : 0;
      const ageMs = cachedTs ? Date.now() - cachedTs : 0;
      if (!cachedTs || ageMs < NEWS_CACHE_TTL * 1000) {
        console.log('[kis] news cache hit', cached.items.length, 'age(ms)', ageMs);
        return cached.items;
      }
      console.log('[kis] news cache stale', cached.items.length, 'age(ms)', ageMs);
    }
  } catch (err) {
    console.error('[kis] news cache read error', err?.message || err);
  }

  if (!hasKis) {
    console.warn('[kis] no KIS credentials; returning cached news only');
    return cached?.items || [];
  }

  try {
    const news = await getNews({ ticker: '005930' });
    console.log('[kis] news api length', Array.isArray(news) ? news.length : 'not-array');
    if (Array.isArray(news) && news.length) {
      await redis.set(cacheKey, { items: news, ts: Date.now() }, { ex: NEWS_CACHE_TTL });
      return news;
    }
    return cached?.items || [];
  } catch (err) {
    console.error('[gateway] fetchSamsungNews error', err?.message || err);
    return cached?.items || [];
  }
}

export async function fetchHistoricalPrices(ticker, { market = 'J', period = '3M' } = {}) {
  const cacheKey = `history:${ticker}:${period}`;
  let cached;
  try {
    cached = await redis.get(cacheKey);
    console.log('[kis] history cached raw', cacheKey, Array.isArray(cached) ? cached.length : typeof cached);
    if (Array.isArray(cached) && cached.length) {
      const normalized = cached
        .map((row) => {
          const date = row?.date || row?.stck_bsop_date;
          const value = row?.close ?? row?.stck_clpr ?? row?.stck_prpr ?? row?.stck_oprc;
          const close = Number(value);
          if (!date || !Number.isFinite(close)) return null;
          const iso = date.includes('T') ? date : `${String(date).slice(0, 4)}-${String(date).slice(4, 6)}-${String(date).slice(6, 8)}T00:00:00+09:00`;
          return { date: iso, close };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      console.log('[kis] history cache normalized', cacheKey, normalized.length);
      if (normalized.length) return normalized;
    }
  } catch (err) {
    console.error('[kis] history cache read error', err?.message || err);
  }

  if (!hasKis) {
    console.warn('[kis] no KIS credentials; returning cached data only', cacheKey);
    return Array.isArray(cached) ? cached : [];
  }

  try {
    console.log('[kis] history cache miss', cacheKey);
    const rows = await getStockDailyChart({ ticker, market, period });
    console.log('[kis] history api rows length', Array.isArray(rows) ? rows.length : 'not-array');
    if (Array.isArray(rows) && rows.length) {
      const normalized = rows
        .map((row) => {
          const date = row?.stck_bsop_date;
          const close = Number(row?.stck_clpr ?? row?.stck_prpr ?? row?.stck_oprc);
          if (!date || !Number.isFinite(close)) return null;
          const iso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T00:00:00+09:00`;
          return { date: iso, close };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (normalized.length) {
        await redis.set(cacheKey, normalized, { ex: HISTORY_CACHE_TTL });
        console.log('[kis] history normalized stored', cacheKey, normalized.length);
        return normalized;
      }

      console.warn('[kis] history normalized empty', cacheKey);
      await redis.set(cacheKey, rows, { ex: HISTORY_CACHE_TTL });
      return rows;
    }

    console.warn('[kis] history API empty', cacheKey, rows);
    return [];
  } catch (err) {
    console.error('[gateway] fetchHistoricalPrices error', err?.message || err);
    try {
      const fallback = await redis.get(cacheKey);
      if (Array.isArray(fallback)) {
        const normalized = fallback
          .map((row) => {
            const date = row?.date || row?.stck_bsop_date;
            const value = row?.close ?? row?.stck_clpr ?? row?.stck_prpr ?? row?.stck_oprc;
            const close = Number(value);
            if (!date || !Number.isFinite(close)) return null;
            const iso = date.includes('T') ? date : `${String(date).slice(0, 4)}-${String(date).slice(4, 6)}-${String(date).slice(6, 8)}T00:00:00+09:00`;
            return { date: iso, close };
          })
          .filter(Boolean)
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        console.log('[kis] history fallback normalized', cacheKey, normalized.length);
        return normalized;
      }
    } catch {}
    return [];
  }
}

function normalizeBreadthRow(row = {}) {
  const ymd = row.date;
  if (!ymd || typeof ymd !== 'string' || ymd.length !== 8) return null;
  const dateIso = `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}T00:00:00+09:00`;
  const advance = Number.isFinite(row.advance) ? row.advance : (Number(row.advance) || 0);
  const decline = Number.isFinite(row.decline) ? row.decline : (Number(row.decline) || 0);
  const unchanged = Number.isFinite(row.unchanged) ? row.unchanged : (Number(row.unchanged) || 0);
  const upper = Number.isFinite(row.upper) ? row.upper : (Number(row.upper) || 0);
  const lower = Number.isFinite(row.lower) ? row.lower : (Number(row.lower) || 0);
  return {
    date: dateIso,
    advance,
    decline,
    unchanged,
    upper,
    lower
  };
}

export async function fetchIndexBreadth({ indexCode = '0001', lookback = 60, force = false, startDate } = {}) {
  if (!hasKis) {
    console.warn('[kis] no KIS credentials; breadth unavailable');
    return [];
  }

  const effectiveStart = startDate || resolveDefaultStartDate();
  const cacheKey = `breadth:${indexCode}:${effectiveStart}`;
  try {
    if (!force) {
    const cached = await redis.get(cacheKey);
    if (cached?.rows && Array.isArray(cached.rows)) {
      return cached.rows.slice(-lookback);
    }
    }
  } catch (err) {
    console.error('[kis] breadth cache read error', err?.message || err);
  }

  try {
    const maxAttempts = 3;
    let lastError;
    let rows = [];

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        console.log('[kis] breadth fetch attempt', { attempt, indexCode, effectiveStart });
        const fallbackSpan = Math.min(12, Math.max(4, Math.ceil(lookback / 8)));
        rows = await getIndexDailyBreadth({
          indexCode,
          startDate: effectiveStart,
          maxPages: Math.ceil(lookback / 20) + 1,
          fallbackDays: fallbackSpan
        });
        break;
      } catch (err) {
        lastError = err;
        const detail = err?.response?.data || err?.message || err;
        console.warn('[kis] breadth fetch error attempt', attempt, detail);
        if (attempt < maxAttempts) {
          await sleep(1200 * attempt);
          continue;
        }
        throw err;
      }
    }

    const normalized = rows.map(normalizeBreadthRow).filter(Boolean);
    if (normalized.length) {
      await redis.set(cacheKey, { rows: normalized, ts: Date.now() }, { ex: BREADTH_CACHE_TTL });
    }
    return normalized.slice(-lookback);
  } catch (err) {
    const detail = err?.response?.data || err?.message || err;
    console.error('[gateway] fetchIndexBreadth error', detail);
    try {
      const fallback = await redis.get(cacheKey);
      if (fallback?.rows) return fallback.rows.slice(-lookback);
    } catch {}
    return [];
  }
}

export function computeAdrFromBreadth(rows = [], days = 20) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const usable = rows.slice(-days).filter((row) => Number.isFinite(row?.advance) || Number.isFinite(row?.decline));
  if (!usable.length) return null;

  let sumAdvance = 0;
  let sumDecline = 0;
  for (const row of usable) {
    if (Number.isFinite(row.advance)) sumAdvance += row.advance;
    if (Number.isFinite(row.decline)) sumDecline += row.decline;
  }

  if (sumAdvance <= 0 && sumDecline <= 0) return null;

  const adr = sumDecline === 0 ? null : (sumAdvance / (sumDecline || 1)) * 100;
  return {
    adr,
    sumAdvance,
    sumDecline,
    days: usable.length,
    firstDate: usable[0]?.date || null,
    lastDate: usable[usable.length - 1]?.date || null,
    rows: usable
  };
}

export async function fetchAdr({ indexCode = '0001', days = 20, force = false, startDate } = {}) {
  const effectiveStart = startDate || resolveDefaultStartDate();
  const cacheKey = `adr:${indexCode}:${days}:${effectiveStart}`;
  try {
    if (!force) {
      const cached = await redis.get(cacheKey);
      if (cached?.adr !== undefined) {
        return { ...cached, cached: true };
      }
    }
  } catch (err) {
    console.error('[kis] adr cache read error', err?.message || err);
  }

  const rows = await fetchIndexBreadth({
    indexCode,
    lookback: Math.max(days * 2, days + 5),
    force,
    startDate: effectiveStart
  });
  const agg = computeAdrFromBreadth(rows, days);
  const result = {
    ok: !!agg,
    indexCode,
    days,
    startDate: effectiveStart,
    cached: false,
    adr: agg?.adr ?? null,
    sumAdvance: agg?.sumAdvance ?? null,
    sumDecline: agg?.sumDecline ?? null,
    daysUsed: agg?.days ?? 0,
    firstDate: agg?.firstDate ?? null,
    lastDate: agg?.lastDate ?? null,
    rows,
    message: agg ? null : 'ADR could not be computed due to insufficient data'
  };

  try {
    await redis.set(cacheKey, result, { ex: BREADTH_CACHE_TTL });
  } catch (err) {
    console.error('[kis] adr cache write error', err?.message || err);
  }

  return result;
}

function normalizeVolumeSnapshot(output = {}) {
  if (!output) return null;
  const volume = toNumber(output.acml_vol);
  const prevVolume = toNumber(output.prdy_vol);
  const prdyRatio = toNumber(output.prdy_vol ?? output.acml_vol_rlim);
  return {
    volume,
    prevVolume,
    weightAveragePrice: toNumber(output.wghn_avrg_stck_prc),
    prevVolumeRatio: prdyRatio,
    raw: output
  };
}

export async function fetchVolumeRatio() {
  const cached = await redis.get('macro:volume:ratio:0001').catch((err) => {
    console.error('[kis] volume ratio cache read error', err?.message || err);
    return null;
  });
  if (cached?.ratio !== undefined) {
    return { ...cached, cached: true, ok: true };
  }
  return { ok: false, message: 'Volume ratio not available yet' };
}

