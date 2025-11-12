import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Redis } from '@upstash/redis';
import { createClient } from '@supabase/supabase-js';
import {
  getStockQuote,
  getIndexQuote,
  getNews,
  getKisConfig,
  getStockDailyChart
} from '../../shared/kisClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env.ws') });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});
const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const STOCK_CODE = '005930';
const INDEX_CODE = '0001';
const NEWS_INTERVAL_MS = 10 * 60 * 1000;
const PRICE_INTERVAL_MS = 30 * 1000;
const HISTORY_INTERVAL_MS = 12 * 60 * 60 * 1000;
const PROVIDER = 'KIS-REST';

function normalizeQuote(output, code) {
  if (!output) {
    console.warn('[poll] normalizeQuote: empty output for', code);
    return null;
  }
  const ts = new Date().toISOString();
  const last = Number(output.stck_prpr ?? output.bstp_nmix_prpr ?? output.bzpi_clpr ?? output.bstp_kor_prpr);
  const pct = Number(output.prdy_ctrt ?? output.bstp_nmix_prdy_ctrt ?? output.bzpi_updn_rate ?? output.bstp_kor_prdy_ctrt);
  const volume = Number(output.acml_vol ?? output.acml_tr_pbmn ?? output.bstp_nmix_acml_tr_pbmn);
  if (!Number.isFinite(last)) {
    console.warn('[poll] normalizeQuote: invalid last price', output);
    return null;
  }
  return {
    ticker: code,
    ts,
    last_price: last,
    pct_change: Number.isFinite(pct) ? pct : null,
    volume: Number.isFinite(volume) ? volume : null,
    provider: PROVIDER,
    raw: output
  };
}

async function storeQuote(quote) {
  const ttlSeconds = Math.max(Math.ceil(PRICE_INTERVAL_MS / 1000) * 3, 120);
  await redis.set(`live:${quote.ticker}`, quote, { ex: ttlSeconds });
  await supa.from('live_ticks').insert({
    ticker: quote.ticker,
    ts: quote.ts,
    last_price: quote.last_price,
    pct_change: quote.pct_change,
    volume: quote.volume,
    provider: quote.provider
  });
}

async function pollPrices() {
  try {
    const cfg = getKisConfig();
    console.log('[poll] using config', { BASE_URL: cfg.BASE_URL, APPKEY: cfg.APPKEY, ENV_DV: cfg.ENV_DV });

    const stockOutput = await getStockQuote({ ticker: STOCK_CODE });
    console.log('[poll] raw stock output', stockOutput);
    const stock = normalizeQuote(stockOutput, STOCK_CODE);
    if (stock) {
      await storeQuote(stock);
      console.log('[poll] stock normalized', stock);
    }

    const indexOutput = await getIndexQuote({ indexCode: INDEX_CODE, market: 'U' });
    console.log('[poll] raw index output', indexOutput);
    const index = normalizeQuote(indexOutput, 'KOSPI');
    if (index) {
      await storeQuote(index);
      console.log('[poll] index normalized', index);
    }
  } catch (err) {
    console.error('[poll] price error', err?.response?.data || err?.message || err);
  }
}

async function pollNews() {
  try {
    const list = await getNews({ ticker: STOCK_CODE });
    await redis.set('news:005930', { items: list, ts: Date.now() }, { ex: NEWS_INTERVAL_MS / 1000 });
    console.log('[poll] news items', list?.length ?? 0);
  } catch (err) {
    console.error('[poll] news error', err?.response?.data || err?.message || err);
  }
}

async function pollHistory() {
  try {
    const rows = await getStockDailyChart({ ticker: STOCK_CODE, market: 'J', period: '3M' });
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
      const ttlSeconds = Math.floor(HISTORY_INTERVAL_MS / 1000);
      await redis.set(`history:${STOCK_CODE}:3M`, normalized, { ex: ttlSeconds });
      console.log('[poll] history points stored', normalized.length, 'TTL', ttlSeconds);
    } else {
      console.warn('[poll] history empty for', STOCK_CODE);
    }
  } catch (err) {
    console.error('[poll] history error', err?.response?.data || err?.message || err);
  }
}

async function main() {
  await pollPrices();
  await pollNews();
  await pollHistory();

  setInterval(pollPrices, PRICE_INTERVAL_MS);
  setInterval(pollNews, NEWS_INTERVAL_MS);
  setInterval(pollHistory, HISTORY_INTERVAL_MS);
}

main().catch((err) => {
  console.error('[poll] fatal', err);
  process.exit(1);
});
