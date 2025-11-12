import { Redis } from '@upstash/redis';
import {
  getIndexCategoryPrice,
  getIndexDailyVolumes,
  hasKisConfig
} from '../../shared/kisClient.js';

const redis = Redis.fromEnv();

const VOLUME_JOB_CACHE_KEY = 'macro:volume:ratio:0001';
const VOLUME_HISTORY_CACHE_KEY = 'macro:volume:history:0001';
const DEFAULT_LOOKBACK = Number(process.env.VOLUME_RATIO_LOOKBACK || 20);
const DEFAULT_INTERVAL_MS = Number(process.env.VOLUME_RATIO_INTERVAL_MS || 300_000); // 기본 5분
const RETRY_BACKOFF_MS = Number(process.env.VOLUME_RATIO_BACKOFF_MS || 10_000); // 재시도 10초
const ERROR_INTERVAL_MS = Number(process.env.VOLUME_RATIO_ERROR_INTERVAL_MS || DEFAULT_INTERVAL_MS * 2);
const RATE_LIMIT_INTERVAL_MS = Number(process.env.VOLUME_RATIO_RATE_LIMIT_MS || DEFAULT_INTERVAL_MS * 4);
const HISTORY_CACHE_TTL = Number(process.env.VOLUME_HISTORY_CACHE_TTL || 1800); // 30분
const HISTORY_STALE_MS = Number(process.env.VOLUME_HISTORY_STALE_MS || 30 * 60 * 1000);
const INITIAL_DELAY_MS = Number(process.env.VOLUME_RATIO_INITIAL_DELAY_MS || 4_000);
const INITIAL_JITTER_MS = Number(process.env.VOLUME_RATIO_INITIAL_JITTER_MS || 2_000);
const MAX_ATTEMPTS = 3;
const BACKOFF_BASE_MS = RETRY_BACKOFF_MS;

const toNumber = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = typeof value === 'string' ? value.replace(/,/g, '') : value;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeSnapshot(output = {}) {
  if (!output) return null;
  const volume = toNumber(output.acml_vol);
  const prevVolume = toNumber(output.prdy_vol);
  const weightAveragePrice = toNumber(output.wghn_avrg_stck_prc);
  return {
    volume,
    prevVolume,
    weightAveragePrice,
    raw: output
  };
}

async function fetchLatestSnapshot({
  indexCode = '0001',
  marketDiv = 'U',
  screenCode = '20214',
  marketClsCode = 'K',
  belongClsCode = '0'
} = {}) {
  const data = await getIndexCategoryPrice({
    indexCode,
    marketDiv,
    screenCode,
    marketClsCode,
    belongClsCode
  });
  const snapshot = normalizeSnapshot(data.output1);
  if (!snapshot || snapshot.volume === null) {
    throw new Error('Volume snapshot missing volume field');
  }
  return snapshot;
}

async function fetchHistoricalVolumes({
  indexCode = '0001',
  marketDiv = 'U',
  lookback = DEFAULT_LOOKBACK
} = {}) {
  const historyRows = await getIndexDailyVolumes({
    indexCode,
    marketDiv,
    startDate: undefined,
    maxPages: Math.ceil((lookback + 5) / 20),
    fallbackDays: Math.max(lookback + 5, 10)
  });

  const normalized = historyRows
    .map((row) => ({
      date: row.date,
      volume: toNumber(row.volume)
    }))
    .filter((row) => row.volume !== null);

  return normalized.slice(-lookback);
}

async function computeAndStoreVolumeRatio({ force = false } = {}) {
  if (!hasKisConfig()) {
    console.warn('[volumeJob] KIS credentials missing. Skipping volume computation.');
    return { ok: false, message: 'KIS credentials missing' };
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const snapshot = await fetchLatestSnapshot();
      let history = null;

      if (!force) {
        const cachedHistory = await redis.get(VOLUME_HISTORY_CACHE_KEY).catch((err) => {
          console.error('[volumeJob] history cache read error', err?.message || err);
          return null;
        });

        if (cachedHistory?.rows && Array.isArray(cachedHistory.rows) && cachedHistory.rows.length >= DEFAULT_LOOKBACK) {
          const fetchedAt = cachedHistory.fetchedAt ? new Date(cachedHistory.fetchedAt) : null;
          const isFresh = fetchedAt && !Number.isNaN(fetchedAt.getTime())
            ? (Date.now() - fetchedAt.getTime()) <= HISTORY_STALE_MS
            : false;
          if (isFresh) {
            history = cachedHistory.rows;
          }
        }
      }

      if (!history) {
        history = await fetchHistoricalVolumes();
      }

      if (!history.length) {
        throw new Error('Insufficient history for average calculation');
      }

      const avgVolume = history.reduce((sum, row) => sum + row.volume, 0) / history.length;
      if (!Number.isFinite(avgVolume) || avgVolume <= 0) {
        throw new Error('Average volume is invalid');
      }

      const prevVolume = history.length ? history[history.length - 1].volume : snapshot.prevVolume;
      const ratio = (snapshot.volume / avgVolume) * 100;

      const result = {
        ok: true,
        ratio,
        volume: snapshot.volume,
        prevVolume,
        avgVolume,
        historyDays: history.length,
        weightAveragePrice: snapshot.weightAveragePrice,
        fetchedAt: new Date().toISOString()
      };

      await redis.set(VOLUME_JOB_CACHE_KEY, result, { ex: Math.max(DEFAULT_INTERVAL_MS / 1000, 60) }).catch((err) => {
        console.error('[volumeJob] cache write error', err?.message || err);
      });
      await redis
        .set(
          VOLUME_HISTORY_CACHE_KEY,
          { rows: history, fetchedAt: new Date().toISOString() },
          { ex: HISTORY_CACHE_TTL }
        )
        .catch((err) => {
          console.error('[volumeJob] history cache write error', err?.message || err);
        });

      console.log('[volumeJob] updated ratio', { ratio: result.ratio.toFixed(2), avgVolume, volume: result.volume });
      return result;
    } catch (err) {
      const detail = err?.response?.data || err?.message || err;
      console.warn('[volumeJob] attempt error', attempt, detail);

      const msgCode = detail?.msg_cd || detail?.msgCd;
      if (msgCode === 'EGW00201' || String(detail).includes('EGW00201')) {
        console.warn('[volumeJob] rate limit detected, skipping further attempts this cycle');
        return { ok: false, message: 'EGW00201' };
      }

      if (attempt < MAX_ATTEMPTS) {
        await sleep(BACKOFF_BASE_MS * attempt);
      } else {
        console.error('[volumeJob] failed after attempts', detail);
        return { ok: false, message: String(detail) };
      }
    }
  }

  return { ok: false, message: 'Unknown error' };
}

let jobTimer = null;

export function startVolumeRatioJob() {
  if (jobTimer) return; // already running
  console.log('[volumeJob] initializing');
  const run = async () => {
    let delay = DEFAULT_INTERVAL_MS;
    try {
      const result = await computeAndStoreVolumeRatio();
      if (!result?.ok) {
        if (result?.message === 'EGW00201') {
          delay = RATE_LIMIT_INTERVAL_MS;
        } else {
          delay = ERROR_INTERVAL_MS;
        }
      }
    } catch (err) {
      console.error('[volumeJob] unhandled error', err?.message || err);
      delay = ERROR_INTERVAL_MS;
    }

    const jitter = Math.floor(Math.random() * 20_000);
    jobTimer = setTimeout(run, delay + jitter);
  };
  const initialJitter = Math.floor(Math.random() * INITIAL_JITTER_MS);
  jobTimer = setTimeout(run, INITIAL_DELAY_MS + initialJitter);
}

export async function getCachedVolumeRatio() {
  const cached = await redis.get(VOLUME_JOB_CACHE_KEY).catch((err) => {
    console.error('[volumeJob] cache read error', err?.message || err);
    return null;
  });
  if (cached?.ratio !== undefined) {
    return { ...cached, cached: true };
  }
  return { ok: false, message: 'Volume ratio not available yet' };
}

export async function getCachedVolumeHistory() {
  const cached = await redis.get(VOLUME_HISTORY_CACHE_KEY).catch((err) => {
    console.error('[volumeJob] history cache read error', err?.message || err);
    return null;
  });
  if (cached?.rows && Array.isArray(cached.rows)) {
    return cached.rows;
  }
  return Array.isArray(cached) ? cached : [];
}

export default {
  startVolumeRatioJob,
  computeAndStoreVolumeRatio,
  getCachedVolumeRatio,
  getCachedVolumeHistory
};

