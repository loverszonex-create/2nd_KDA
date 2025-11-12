import axios from 'axios';
import { load as loadHtml } from 'cheerio';
import { Redis } from '@upstash/redis';

const CACHE_KEY = 'macro:adrinfo:latest';
const CACHE_TTL_SECONDS = 60 * 10; // 10 minutes
const FALLBACK_CACHE_TTL_SECONDS = 60 * 60; // 1 hour for stale data
const TARGET_URL = 'http://adrinfo.kr/';

let redisClient = null;
try {
  redisClient = Redis.fromEnv();
} catch (err) {
    console.warn('[adrCrawler] Redis unavailable, caching disabled', err?.message || err);
}

const sanitizeNumberFromText = (text) => {
  if (!text) return null;
  const match = text.replace(/\s+/g, ' ').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
};

const extractKospiAdr = ($) => {
  let result = null;
  $('article').each((_, article) => {
    if (result !== null) return;
    const headerText = $(article).find('header').first().text().trim().toLowerCase();
    if (!headerText.includes('kospi')) return;

    const cardTitle = $(article).find('.card-title').first();
    const parsed = sanitizeNumberFromText(cardTitle.text());
    if (Number.isFinite(parsed)) {
      result = {
        ok: true,
        source: 'adrinfo.kr',
        adr: parsed,
        timestamp: $(article).find('small').first().text().trim() || null,
        scrapedAt: new Date().toISOString()
      };
    }
  });
  return result;
};

async function scrapeAdrInfo() {
  const response = await axios.get(TARGET_URL, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; jujuclub-bot/1.0; +https://github.com/)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'http://adrinfo.kr/'
    }
  });

  const html = response?.data;
  if (!html || typeof html !== 'string') {
    throw new Error('adrinfo.kr 응답을 가져오지 못했습니다.');
  }
  if (html.includes('Blocked due to excessive traffic')) {
    throw new Error('adrinfo.kr에서 요청을 일시적으로 차단했습니다.');
  }

  const $ = loadHtml(html);
  const kospi = extractKospiAdr($);
  if (!kospi) {
    throw new Error('adrinfo.kr 페이지에서 KOSPI ADR을 찾지 못했습니다.');
  }

  return {
    ...kospi,
    fetchedAt: kospi.scrapedAt,
    raw: {
      url: TARGET_URL
    }
  };
}

async function getCachedAdr(force = false) {
  if (!redisClient || force) return null;
  try {
    const cached = await redisClient.get(CACHE_KEY);
    if (cached && typeof cached === 'object') {
      return { ...cached, cached: true };
    }
    return null;
  } catch (err) {
    console.warn('[adrCrawler] cache read error', err?.message || err);
    return null;
  }
}

async function saveCache(result, ttlSeconds = CACHE_TTL_SECONDS) {
  if (!redisClient || !result) return;
  try {
    await redisClient.set(CACHE_KEY, result, { ex: ttlSeconds });
  } catch (err) {
    console.warn('[adrCrawler] cache write error', err?.message || err);
  }
}

export async function fetchAdrFromAdrinfo({ force = false } = {}) {
  const cached = await getCachedAdr(force);
  if (cached && !force) {
    return cached;
  }

  try {
    const fresh = await scrapeAdrInfo();
    await saveCache(fresh, CACHE_TTL_SECONDS);
    return { ...fresh, cached: false };
  } catch (error) {
    console.error('[adrCrawler] fetch error', error?.message || error);
    if (cached) {
      await saveCache(cached, FALLBACK_CACHE_TTL_SECONDS);
      return { ...cached, stale: true };
    }
    return {
      ok: false,
      source: 'adrinfo.kr',
      adr: null,
      fetchedAt: new Date().toISOString(),
      error: error?.message || 'ADR 정보를 가져오는 중 오류가 발생했습니다.'
    };
  }
}

export default {
  fetchAdrFromAdrinfo
};

