import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import {
  fetchKisQuote,
  fetchKospiQuote,
  fetchNewsByTicker,
  fetchHistoricalPrices,
  fetchAdr,
  fetchVolumeRatio,
  hasKis
} from './kis.js';
import { fetchVkospiOpening } from './krx.js';
import { fetchFearGreedIndex } from './cnn.js';
import { fetchAdrFromAdrinfo } from './adrCrawler.js';
import { startVolumeRatioJob } from './volumeJob.js';
import { fetchMacroWeather } from './macroWeather.js';

const app = express();
app.use(cors());
app.use(express.json());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '../public')));

startVolumeRatioJob();

// ===== Persona / Mood Helpers =====
const MOOD_TONES = {
  '😄 매우 기쁨': {
    tone: '흥분과 자신감이 묻어나되 핵심 데이터를 빠뜨리지 말 것.',
    opener: '와, 오늘 기분이 정말 최고야!'
  },
  '🙂 기쁨': {
    tone: '낙관적이고 밝은 톤으로 현재 상황을 설명해.',
    opener: '오늘 흐름이 꽤 괜찮아서 웃음이 나와.'
  },
  '😐 보통': {
    tone: '차분하고 균형 잡힌 톤으로 정보를 정리해.',
    opener: '오늘은 차분히 상황을 정리해볼게.'
  },
  '☹️ 슬픔': {
    tone: '조심스럽고 솔직하게, 위험 요소를 숨기지 말고 이야기해.',
    opener: '솔직히 조금 속상한 하루야.'
  },
  '😭 매우 슬픔': {
    tone: '무거운 분위기를 담되 침착하게 설명해.',
    opener: '오늘은 마음이 무거워서 너에게 먼저 털어놓고 싶어.'
  }
};

function normalizeChange(raw){
  if (raw === null || raw === undefined) return null;
  const num = Number(raw);
  if (Number.isNaN(num)) return null;
  return num;
}

function classifyMood(stockChg = 0, indexChg = 0, eps = 1e-6){
  const sameDirection = (stockChg * indexChg) >= 0;
  if (Math.abs(indexChg) < eps){
    if (Math.abs(stockChg) < eps){
      return { mood:'😐 보통', same_direction:true, excess_ratio:null };
    }
    return {
      mood: stockChg > 0 ? '🙂 기쁨' : '☹️ 슬픔',
      same_direction: sameDirection,
      excess_ratio: null
    };
  }

  const excessRatio = stockChg / indexChg;
  let mood = '😐 보통';

  if (sameDirection){
    if (indexChg > 0){
      if (excessRatio >= 2) mood = '😄 매우 기쁨';
      else if (excessRatio >= 1) mood = '🙂 기쁨';
      else mood = '😐 보통';
    } else {
      if (excessRatio >= 2) mood = '😭 매우 슬픔';
      else if (excessRatio >= 1) mood = '☹️ 슬픔';
      else mood = '😐 보통';
    }
  } else {
    if (indexChg > 0){
      if (excessRatio <= -2) mood = '😭 매우 슬픔';
      else if (excessRatio <= -1) mood = '☹️ 슬픔';
      else mood = '😐 보통';
    } else {
      if (excessRatio <= -2) mood = '😄 매우 기쁨';
      else if (excessRatio <= -1) mood = '🙂 기쁨';
      else mood = '😐 보통';
    }
  }

  return {
    mood,
    same_direction: sameDirection,
    excess_ratio: Number.isFinite(excessRatio) ? excessRatio : null
  };
}

function personaFallback(ticker){
  if (ticker === '005930.KS'){
    return {
      name: '삼성전자',
      style: '차분하지만 사람 냄새 나는 말투, 데이터 기반, 투자 권유 금지.',
      bio: '나는 메모리와 시스템 반도체, 모바일, 가전까지 아우르는 삼성전자야. 글로벌 공급망과 산업 흐름을 누구보다 가까이서 바라보고 있어.',
      quirks: '중요 숫자에는 기준 시각을 꼭 붙이고 출처를 명확히 밝히는 버릇이 있어.'
    };
  }
  if (ticker === '000270.KS'){
    return {
      name: '기아',
      style: '블루 칼라 말투, 정겹고 호탕함, 기쁨도 슬픔도 화끈하게 표현, 데이터 기반, 투자 권유 금지.',
      bio: '나는 기아 자동차야. 글로벌 자동차 시장과 자동화 시장에서 주도적인 역할을 하며 OEM 시장을 유심히 지켜보고 있어.',
      quirks: '중요 숫자에는 기준 시각을 꼭 붙이고 출처를 명확히 밝히는 버릇이 있어.'
    };
  }
  return {
    name: ticker,
    style: '담백하고 전문적인 톤',
    bio: '',
    quirks: ''
  };
}

function normalizeIndexQuote(output){
  if (!output) return null;
  if (output.last_price !== undefined) {
    return {
      ticker: output.ticker || 'KOSPI',
      ts: output.ts || new Date().toISOString(),
      last_price: Number(output.last_price),
      pct_change: output.pct_change !== undefined ? Number(output.pct_change) : null,
      volume: output.volume !== undefined ? Number(output.volume) : null,
      provider: output.provider || 'KIS-REST',
      raw: output.raw || output
    };
  }
  const ts = new Date().toISOString();
  const lastPrice = Number(output?.bstp_nmix_prpr ?? output?.bzpi_clpr ?? output?.bstp_kor_prpr ?? output?.clpr ?? output?.prc);
  const pctChange = Number(output?.bstp_nmix_prdy_ctrt ?? output?.bzpi_updn_rate ?? output?.bstp_kor_prdy_ctrt ?? output?.prdy_ctrt ?? output?.rate);
  if (!Number.isFinite(lastPrice)) return null;
  return {
    ticker: 'KOSPI',
    ts,
    last_price: lastPrice,
    pct_change: Number.isFinite(pctChange) ? pctChange : null,
    provider: 'KIS-REST',
    raw: output
  };
}

// ===== Clients =====
const supa  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const redis = Redis.fromEnv();                  // UPSTASH_REDIS_REST_URL / _TOKEN에서 자동 로드
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const groq   = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ===== Utils =====
const toKST = (iso) => { try { return new Date(iso).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}); } catch { return iso; } };
const must = (k) => !!process.env[k];
const fmtNumber = (n) => {
  if (n === null || n === undefined) return 'N/A';
  const num = Number(n);
  if (!Number.isFinite(num)) return 'N/A';
  return new Intl.NumberFormat('ko-KR').format(num);
};
const fmtPlain = (n) => {
  if (n === null || n === undefined) return 'N/A';
  const num = Number(n);
  if (!Number.isFinite(num)) return 'N/A';
  const fixed = Math.abs(num) >= 1 ? num.toFixed(2) : num.toFixed(4);
  return Number.parseFloat(fixed).toString();
};
const fmtPercent = (n) => {
  if (n === null || n === undefined) return 'N/A';
  const num = Number(n);
  if (!Number.isFinite(num)) return 'N/A';
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
};

const normalizeTicker = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d{6}$/.test(text)) return text;
  const digits = text.replace(/[^0-9]/g, '');
  if (!digits) return null;
  if (digits.length === 6) return digits;
  if (digits.length > 6) return digits.slice(-6);
  return digits.padStart(6, '0');
};

const STOCK_SEARCH_CACHE_TTL_SEC = Number(process.env.STOCK_SEARCH_CACHE_TTL_SEC || 60);
const STOCK_SEARCH_PAGE_SIZE = Number(process.env.STOCK_SEARCH_PAGE_SIZE || 20);
const DAUM_SEARCH_ENDPOINT = process.env.DAUM_SEARCH_ENDPOINT || 'https://finance.daum.net/api/search';
const DAUM_SEARCH_HEADERS = {
  Referer: 'https://finance.daum.net',
  'User-Agent':
    process.env.SEARCH_USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  'X-Requested-With': 'XMLHttpRequest'
};

function selectBestStockMatch(list = [], query) {
  if (!Array.isArray(list) || !list.length) return null;
  const trimmed = String(query ?? '').trim();
  const upper = trimmed.toUpperCase();
  const normalizedCode = normalizeTicker(trimmed);

  if (normalizedCode) {
    const byCode = list.find((item) => (item?.code || '') === normalizedCode);
    if (byCode) return byCode;
    const tickerCandidate = `${normalizedCode}.KS`;
    const byTicker = list.find((item) => (item?.ticker || '').toUpperCase() === tickerCandidate);
    if (byTicker) return byTicker;
  }

  if (upper) {
    const directTicker = list.find((item) => (item?.ticker || '').toUpperCase() === upper);
    if (directTicker) return directTicker;
  }

  const lower = trimmed.toLowerCase();
  if (lower) {
    const byName = list.find((item) => (item?.name || '').toLowerCase() === lower);
    if (byName) return byName;
  }

  if (normalizedCode) {
    const byDisplay = list.find((item) => (item?.displayedCode || '').toUpperCase() === normalizedCode);
    if (byDisplay) return byDisplay;
  }

  return list[0];
}

const mapMarketValue = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().toUpperCase();
  if (!normalized) return null;
  if (normalized.includes('KOSDAQ') || normalized === 'DAQ') return { label: 'KOSDAQ', kis: 'Q' };
  if (normalized.includes('KOSPI') || normalized === 'STOCK') return { label: 'KOSPI', kis: 'J' };
  if (normalized.includes('KONEX') || normalized === 'KONEX') return { label: 'KONEX', kis: 'N' };
  if (normalized.includes('ETF')) return { label: 'ETF', kis: 'E' };
  if (normalized.includes('ETN')) return { label: 'ETN', kis: 'K' };
  if (normalized.includes('ELW')) return { label: 'ELW', kis: 'L' };
  if (normalized.includes('SPAC')) return { label: 'KOSDAQ', kis: 'Q' };
  return null;
};

const inferMarketInfo = (item = {}) => {
  const candidates = [
    item.market,
    item.marketCategory,
    item.marketCode,
    item.marketType,
    item.symbolTypeName,
    item.securitiesCategoryName,
    item.typeName,
    item.type
  ];

  for (const candidate of candidates) {
    const mapped = mapMarketValue(candidate);
    if (mapped) return mapped;
  }

  if (typeof item.symbolCode === 'string' && item.symbolCode.startsWith('Q')) {
    return { label: 'KOSDAQ', kis: 'Q' };
  }

  return { label: 'KOSPI', kis: 'J' };
};

const resolveTickerSuffix = (item = {}, marketInfo = {}) => {
  if (item?.nationCode && item.nationCode !== 'KR') {
    return `.${item.nationCode}`;
  }
  if ((marketInfo?.label || '').toUpperCase() === 'KOSDAQ') return '.KQ';
  if ((marketInfo?.label || '').toUpperCase() === 'KONEX') return '.KN';
  if ((marketInfo?.label || '').toUpperCase() === 'ETF') return '.KS';
  if ((marketInfo?.label || '').toUpperCase() === 'ETN') return '.KS';
  return '.KS';
};

const mapDaumSearchItem = (item = {}) => {
  const symbolCode = item.symbolCode || item.code || item.symbol;
  if (typeof symbolCode !== 'string' || !symbolCode.startsWith('A')) return null;
  const code = normalizeTicker(item.code || item.symbolCode || item.displayedCode || item.symbol);
  if (!code) return null;

  const marketInfo = inferMarketInfo(item);
  const suffix = resolveTickerSuffix(item, marketInfo);
  const ticker = `${code}${suffix}`;

  return {
    name: item.name || item.koreanName || item.displayedName || item.englishName || code,
    ticker,
    code,
    displayedCode: item.symbolCode || item.displayedCode || code,
    market: marketInfo?.label || null,
    marketLabel: marketInfo?.label || null,
    kisMarket: marketInfo?.kis || null,
    category: item.industry || item.typeName || (marketInfo?.label ? `#${marketInfo.label}` : null),
    badge: marketInfo?.label || '국내',
    summary: item.industry || item.description || '검색으로 추가한 종목입니다.',
    provider: 'daum',
    raw: item
  };
};

async function searchStocksByName(keyword, { limit = STOCK_SEARCH_PAGE_SIZE } = {}) {
  const trimmed = String(keyword ?? '').trim();
  if (!trimmed) return [];

  const cacheKey = `stocksearch:${trimmed.toLowerCase()}:${limit}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached?.results && Array.isArray(cached.results)) {
      return cached.results;
    }
  } catch (err) {
    console.warn('[stocks/search] cache read error', err.message || err);
  }

  const { data } = await axios.get(`${DAUM_SEARCH_ENDPOINT}?q=${encodeURIComponent(trimmed)}`, {
    headers: DAUM_SEARCH_HEADERS,
    timeout: Number(process.env.DAUM_SEARCH_TIMEOUT_MS || 5000)
  });

  const items = Array.isArray(data?.suggestItems) ? data.suggestItems : [];
  const mapped = items.map(mapDaumSearchItem).filter(Boolean).slice(0, limit);

  if (mapped.length) {
    try {
      await redis.set(cacheKey, { results: mapped }, { ex: STOCK_SEARCH_CACHE_TTL_SEC });
    } catch (err) {
      console.warn('[stocks/search] cache write error', err.message || err);
    }
  }

  return mapped;
}

// cache key for embeddings
const embKey = (q) => 'emb:q:' + crypto.createHash('sha1').update(q).digest('hex');

async function embedQueryCached(q){
  const k = embKey(q);
  const cached = await redis.get(k);
  if (cached?.v) return cached.v;
  const r = await openai.embeddings.create({ model:'text-embedding-3-small', input:q });
  const v = r.data[0].embedding.map(Number);
  await redis.set(k, { v }, { ex: 60*60*24 });   // 24h cache
  return v;
}

async function getPersona(ticker){
  const { data, error } = await supa.from('personas').select('*').eq('ticker', ticker).maybeSingle();
  if (error) console.error('persona error', error);
  return data || {};
}

async function getPrice(code){
  try{
    const cached = await redis.get(`live:${code}`);
    if (cached && cached.ts && Date.now() - Date.parse(cached.ts) < 60_000) return cached;
  }catch(e){ console.error('price redis error', e); }

  if (hasKis) {
    try {
      const fresh = await fetchKisQuote(code, { market:'J' });
      if (fresh) {
        try { await redis.set(`live:${code}`, fresh, { ex: 90 }); } catch(e) { console.error('price redis set error', e); }
        try {
          const { error } = await supa.from('live_ticks').insert({
            ticker: fresh.ticker,
            ts: fresh.ts,
            last_price: fresh.last_price,
            pct_change: fresh.pct_change,
            volume: fresh.volume,
            provider: fresh.provider
          });
          if (error) console.error('price insert error', error);
        } catch (e) { console.error('price db insert error', e); }
        return fresh;
      }
    } catch (e) {
      console.error('price kis error', e);
    }
  }

  try{
    const { data, error } = await supa.from('live_ticks')
      .select('*').eq('ticker', code).order('ts', { ascending:false }).limit(1).maybeSingle();
    if (error) console.error('price db error', error);
    return data;
  }catch(e){ console.error('price error', e); return null; }
}

async function hybridSearch(ticker, query, k=6){
  let knn = [];
  try {
    const vec = await embedQueryCached(query); // 캐시 사용
    const { data, error } = await supa.rpc('knn_search_arr', { ticker_in:ticker, embedding_arr:vec, k_in:20 });
    if (error) console.error('knn_search_arr error', error);
    knn = data || [];
  } catch (e) {
    console.error('embedding/knn error, fallback to FTS', e.message);
  }

  const { data: fts, error: e2 } = await supa
    .from('rag_docs').select('id, content, url, source, asof_date')
    .eq('ticker', ticker)
    .textSearch('fts', query, { type:'websearch' })
    .limit(20);
  if (e2) console.error('FTS error', e2);

  const pool = new Map();
  for (const r of knn || []) pool.set(r.id, r);
  for (const r of fts || []) pool.set(r.id, r);

  const merged = [...pool.values()].slice(0,k).map((c,i)=>({
    rank:i+1, text:c.content, url:c.url, source:c.source, asof_date:c.asof_date
  }));
  return merged.length ? merged : (fts || []).slice(0,k).map((c,i)=>({
    rank:i+1, text:c.content, url:c.url, source:c.source, asof_date:c.asof_date
  }));
}

const NEWS_KEYWORDS = ['삼성전자', '삼전', 'Samsung Electronics', 'Samsung', '005930', '반도체', '메모리', '파운드리', '갤럭시'];
const NEWS_QUERY_KEYWORDS = ['뉴스', '소식', 'headline', 'issue', '이슈', '브리핑', '기사', '소문', '리포트'];

const isNewsQuery = (q = '') => {
  const lower = q.toLowerCase();
  return NEWS_QUERY_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
};

const detectIntent = (q = '') => {
  const lower = q.toLowerCase();
  const han = q.replace(/[^가-힣]/g, '');
  const intent = {
    news: false,
    price: false,
    index: false,
    history: false,
    documents: false
  };

  if (!lower.trim()) return intent;

  const priceKeywords = ['가격', 'price', '변동', '주가', '얼마', '시세', '상승', '하락', '퍼센트'];
  const indexKeywords = ['kospi', '코스피', 'benchmark', '시장', '지수'];
  const historyKeywords = ['3개월', '추세', 'trend', '차트', '그래프', '라인', '선', '최근몇개월', '최근 몇개월', 'history'];
  const docKeywords = ['문서', '자료', '전략', '리포트', '분석', '공시', '보고서', '자료실'];

  intent.news = isNewsQuery(q);
  if (priceKeywords.some((kw) => lower.includes(kw) || han.includes(kw))) intent.price = true;
  if (indexKeywords.some((kw) => lower.includes(kw) || han.includes(kw))) intent.index = true;
  if (historyKeywords.some((kw) => lower.includes(kw) || han.includes(kw))) intent.history = true;
  if (docKeywords.some((kw) => lower.includes(kw) || han.includes(kw))) intent.documents = true;

  if (!intent.news && !intent.history && !intent.price && !intent.index && !intent.documents) {
    intent.price = true;
  }

  return intent;
};

const summarizeHistory = (history = []) => {
  if (!history.length) return null;
  const first = history[0];
  const last = history[history.length - 1];
  const change = last.close - first.close;
  const pct = first.close ? (change / first.close) * 100 : 0;
  return {
    start: first,
    end: last,
    change,
    pct
  };
};

async function isNewsRelevantLlm(question, item) {
  try {
    const prompt = [`질문: ${question}`, `뉴스 제목: ${item.title}`, `뉴스 요약: ${item.summary || '요약 없음'}`, '이 뉴스가 질문과 직접적으로 관련되어 삼성전자에 중요한 내용인지 YES 또는 NO로만 답변해줘.'].join('\n');
    const resp = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      temperature: 0,
      max_tokens: 8,
      messages: [
        { role: 'system', content: '너는 주어진 뉴스가 질문과 삼성전자 관련 이슈에 해당하는지 분류하는 조용한 심판이야. YES 또는 NO 한 단어로만 대답해.' },
        { role: 'user', content: prompt }
      ]
    });
    const text = resp.choices?.[0]?.message?.content?.trim().toUpperCase() || '';
    return text.startsWith('YES');
  } catch (err) {
    console.error('[news llm] relevance error', err?.message || err);
    return false;
  }
}

async function refineNewsWithLlm(question, items, limit = 5) {
  if (!items?.length) return items;
  const subset = items.slice(0, limit);
  const decisions = await Promise.all(subset.map((item) => isNewsRelevantLlm(question, item)));
  const filtered = subset.filter((_, idx) => decisions[idx]);
  return filtered.length ? filtered : items;
}

function parseKisNewsDate(item) {
  const rawDate = item?.data_dt || (item?.news_dttm ? String(item.news_dttm).slice(0, 8) : null);
  const rawTime = item?.data_tm || (item?.news_dttm ? String(item.news_dttm).slice(8, 14) : null);
  if (!rawDate) return null;
  const yyyy = rawDate.slice(0, 4);
  const mm = rawDate.slice(4, 6);
  const dd = rawDate.slice(6, 8);
  const hh = rawTime ? rawTime.slice(0, 2) : '00';
  const min = rawTime ? rawTime.slice(2, 4) : '00';
  const ss = rawTime ? rawTime.slice(4, 6) : '00';
  if (!yyyy || !mm || !dd) return null;
  return `${yyyy}-${mm}-${dd}T${hh || '00'}:${min || '00'}:${ss || '00'}+09:00`;
}

function normalizeNewsItems(items = []) {
  return items.map((item, idx) => {
    const title = item?.news_titl || item?.hts_pbnt_titl_cntt || item?.hts_news_titl || item?.title || `뉴스 ${idx + 1}`;
    const summary = item?.txtnl_cntt || item?.news_cntt || item?.hts_news_brief_cntt || item?.cntt_usiq_srno || '';
    const url = item?.news_url || item?.hts_news_brief_url || item?.origin_news_url || '';
    const publishedAt = parseKisNewsDate(item);
    return {
      title,
      summary,
      url,
      publishedAt,
      raw: item
    };
  });
}

function classifyNews(items = [], keywords = NEWS_KEYWORDS) {
  const lowerKeywords = keywords.map((k) => k.toLowerCase());
  const normalized = normalizeNewsItems(items);
  const primary = [];
  const secondary = [];

  for (const entry of normalized) {
    const text = `${entry.title} ${entry.summary}`.toLowerCase();
    const matched = lowerKeywords.filter((kw) => kw && text.includes(kw));
    const enriched = { ...entry, keywords: matched };
    if (matched.length) primary.push(enriched);
    else secondary.push(enriched);
  }

  const sorter = (a, b) => {
    const da = a.publishedAt ? new Date(a.publishedAt) : null;
    const db = b.publishedAt ? new Date(b.publishedAt) : null;
    if (da && db) return db - da;
    if (da) return -1;
    if (db) return 1;
    return 0;
  };

  primary.sort(sorter);
  secondary.sort(sorter);

  return { primary, secondary, all: normalized };
}

// ===== Chat History Cache =====
const CHAT_HISTORY_TTL = 60 * 60 * 24 * 7; // 7일

async function saveChatSession(sessionId, ticker, messages) {
  try {
    const key = `chat:session:${sessionId}:${ticker}`;
    const data = {
      sessionId,
      ticker,
      messages,
      updatedAt: new Date().toISOString()
    };
    await redis.set(key, data, { ex: CHAT_HISTORY_TTL });
    console.log(`[Cache] 채팅 세션 저장: ${sessionId}, ${ticker}, ${messages.length}개 메시지`);
    return true;
  } catch (error) {
    console.error('[Cache] 채팅 세션 저장 실패:', error);
    return false;
  }
}

async function loadChatSession(sessionId, ticker) {
  try {
    const key = `chat:session:${sessionId}:${ticker}`;
    const data = await redis.get(key);
    if (data) {
      console.log(`[Cache] 채팅 세션 로드: ${sessionId}, ${ticker}, ${data.messages?.length || 0}개 메시지`);
      return data.messages || [];
    }
    return null;
  } catch (error) {
    console.error('[Cache] 채팅 세션 로드 실패:', error);
    return null;
  }
}

// ===== Routes =====
app.get('/', (req,res)=> res.status(200).send('OK: /health, /diag, /diag-redis, /chat, /chat-test, /chat/history'));

app.get('/health', (req,res)=> res.status(200).json({ ok:true, time:new Date().toISOString() }));

app.get('/diag', (req,res)=> res.status(200).json({
  ok:true,
  env:{
    SUPABASE_URL: must('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: must('SUPABASE_SERVICE_ROLE_KEY'),
    OPENAI_API_KEY: must('OPENAI_API_KEY'),
    GROQ_API_KEY: must('GROQ_API_KEY'),
    UPSTASH_REDIS_REST_URL: must('UPSTASH_REDIS_REST_URL'),
    UPSTASH_REDIS_REST_TOKEN: must('UPSTASH_REDIS_REST_TOKEN'),
  }
}));

app.get('/diag-krx', async (req, res) => {
  try {
    const basDd = req.query.basDd ? String(req.query.basDd) : undefined;
    const result = await fetchVkospiOpening({ basDd });
    const status = result.ok ? 200 : 502;
    res.status(status).json(result);
  } catch (error) {
    console.error('[diag-krx]', error);
    res.status(500).json({
      ok: false,
      error: String(error?.message || error)
    });
  }
});

app.get('/diag-adr', async (req, res) => {
  try {
    const mode = (req.query.mode || 'crawl').toLowerCase();
    const indexCode = req.query.index ? String(req.query.index) : '0001';
    const daysRaw = Number(req.query.days);
    const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.floor(daysRaw) : 20;
    const force = req.query.force === 'true';
    const rawDate =
      req.query.date ||
      req.query.start ||
      req.query.startDate ||
      req.query.start_date ||
      req.query.asof;
    const dateParam = rawDate ? String(rawDate).replace(/[^0-9]/g, '') : undefined;
    const startDate = dateParam && dateParam.length === 8 ? dateParam : undefined;
    console.log('[diag-adr] params', { mode, indexCode, days, force, rawDate, startDate });

    if (mode === 'kis') {
      const result = await fetchAdr({ indexCode, days, force, startDate });
      res.status(200).json(result);
      return;
    }

    const result = await fetchAdrFromAdrinfo({ force });
    res.status(200).json(result);
  } catch (error) {
    console.error('[diag-adr]', error);
    res.status(500).json({
      ok: false,
      error: String(error?.message || error)
    });
  }
});

app.get('/diag-volume', async (req, res) => {
  try {
    const result = await fetchVolumeRatio();
    res.status(result.ok ? 200 : 502).json(result);
  } catch (error) {
    console.error('[diag-volume]', error);
    res.status(500).json({
      ok: false,
      error: String(error?.message || error)
    });
  }
});

app.get('/diag-weather', async (req, res) => {
  try {
    const result = await fetchMacroWeather();
    res.status(result.ok ? 200 : 502).json(result);
  } catch (error) {
    console.error('[diag-weather]', error);
    res.status(500).json({
      ok: false,
      error: String(error?.message || error)
    });
  }
});

app.get('/diag-cnn', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const result = await fetchFearGreedIndex({ redis, force });
    const status = result.ok ? 200 : 502;
    res.status(status).json(result);
  } catch (error) {
    console.error('[diag-cnn]', error);
    res.status(500).json({
      ok: false,
      error: String(error?.message || error)
    });
  }
});

app.get('/stocks/search', async (req, res) => {
  const keyword = String(req.query.q ?? '').trim();
  const limit = Number(req.query.limit) || STOCK_SEARCH_PAGE_SIZE;

  if (!keyword) {
    return res.status(400).json({ ok: false, message: '검색어를 입력해주세요.' });
  }

  try {
    const results = await searchStocksByName(keyword, { limit });
    res.json({ ok: true, results });
  } catch (error) {
    const status = error?.response?.status || 500;
    const message =
      error?.response?.data?.message ||
      error?.message ||
      '종목 검색 중 오류가 발생했어요.';
    console.error('[stocks/search]', message);
    res.status(status).json({ ok: false, message });
  }
});

app.get('/stocks/lookup', async (req, res) => {
  const keyword = String(req.query.q ?? '').trim();
  if (!keyword) {
    return res.status(400).json({ ok: false, message: '검색어를 입력해주세요.' });
  }

  try {
    const results = await searchStocksByName(keyword, { limit: Number(req.query.limit) || STOCK_SEARCH_PAGE_SIZE });
    if (!results.length) {
      return res.status(404).json({ ok: false, message: '검색 결과가 없습니다.' });
    }
    const selected = selectBestStockMatch(results, keyword);
    if (!selected) {
      return res.status(404).json({ ok: false, message: '검색 결과가 없습니다.' });
    }
    res.json({ ok: true, result: selected });
  } catch (error) {
    const status = error?.response?.status || 500;
    const message =
      error?.response?.data?.message ||
      error?.message ||
      '종목 검색 중 오류가 발생했어요.';
    console.error('[stocks/lookup]', message);
    res.status(status).json({ ok: false, message });
  }
});

app.get('/diag-mood', async (req, res) => {
  try {
    const rawTicker = (req.query.ticker || '005930').toString();
    const ticker = rawTicker.includes('.') ? rawTicker.split('.')[0] : rawTicker;
    const [stockQuote, kospiQuote] = await Promise.all([
      fetchKisQuote(ticker),
      fetchKospiQuote()
    ]);

    if (!stockQuote || !kospiQuote) {
      res.status(502).json({
        ok: false,
        message: '필요한 시세 정보를 불러오지 못했어요.',
        stockOk: Boolean(stockQuote),
        benchmarkOk: Boolean(kospiQuote)
      });
      return;
    }

    const stockChange = Number.isFinite(stockQuote.pct_change) ? stockQuote.pct_change : 0;
    const indexChange = Number.isFinite(kospiQuote.pct_change) ? kospiQuote.pct_change : 0;
    const moodInfo = classifyMood(stockChange, indexChange);

    res.status(200).json({
      ok: true,
      mood: moodInfo.mood,
      sameDirection: moodInfo.same_direction,
      excessRatio: moodInfo.excess_ratio,
      stock: {
        ticker,
        last_price: stockQuote.last_price,
        pct_change: stockQuote.pct_change,
        ts: stockQuote.ts
      },
      benchmark: {
        ticker: 'KOSPI',
        last_price: kospiQuote.last_price,
        pct_change: kospiQuote.pct_change,
        ts: kospiQuote.ts
      }
    });
  } catch (error) {
    console.error('[diag-mood]', error);
    res.status(500).json({
      ok: false,
      error: String(error?.message || error)
    });
  }
});

app.get('/diag-redis', async (req,res)=>{
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try{
    const key='diag:ping', payload={ t: Date.now() };
    await redis.set(key, payload, { ex: 30 });
    const val = await redis.get(key);
    res.status(200).end(JSON.stringify({ ok:true, val }));
  }catch(e){
    console.error('diag-redis error', e);
    res.status(500).end(JSON.stringify({ ok:false, error:String(e?.message||e) }));
  }
});

app.get('/chat-test', async (req,res)=>{
  res.status(200);
  res.setHeader('Content-Type','text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control','no-cache, no-transform');
  res.setHeader('Connection','keep-alive');
  res.write(': ready\n\n');
  let i=0;
  const t=setInterval(()=>{
    i++; res.write(`data: ${JSON.stringify({delta:`ping ${i}`})}\n\n`);
    if(i>=5){ clearInterval(t); res.write(`data: {"done":true}\n\n`); res.end(); }
  }, 400);
});

// ===== 간단한 OpenAI 챗봇 API (튜닝 없이) =====
app.post('/simple-chat', async (req, res) => {
  const { message, stream = true, nickname } = req.body;
  
  if (!message) {
    return res.status(400).json({ ok: false, error: 'Message is required' });
  }

  console.log('[simple-chat] 질문:', message);
  
  // 닉네임이 있으면 "님"을 붙여서 사용
  const userTitle = nickname ? `${nickname}님` : '';
  const systemContent = `키움 증권 측의 키우Me와 동일한 챗봇이야. 친절하고 전문적으로 답변해줘. 한국어로 답변해. ${userTitle ? `대화 상대는 ${userTitle}이야. 답변할 때 ${userTitle}이라고 부르면서 대화해.` : ''} 중요: 절대로 "전문가가 답변해드리겠습니다", "24시간 내 답변", "전문 상담", "전문가 의견" 같은 표현을 사용하지 마. 너는 AI 챗봇이며, 직접 답변을 제공하는 역할이야.`;

  if (!stream) {
    // 비스트리밍 모드
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: systemContent
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const answer = completion.choices[0]?.message?.content || '죄송합니다, 답변을 생성할 수 없습니다.';
      
      res.status(200).json({
        ok: true,
        content: answer
      });
    } catch (error) {
      console.error('[simple-chat] 오류:', error);
      res.status(500).json({
        ok: false,
        error: String(error?.message || error)
      });
    }
  } else {
    // 스트리밍 모드
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.write(': ready\n\n');

    try {
      const stream = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: systemContent
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: true
      });

      let fullText = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true, full: fullText })}\n\n`);
      res.end();
      
      console.log('[simple-chat] ✅ 스트리밍 완료');
    } catch (error) {
      console.error('[simple-chat] 스트리밍 오류:', error);
      res.write(`data: ${JSON.stringify({ error: String(error?.message || error), done: true })}\n\n`);
      res.end();
    }
  }
});

app.get('/chat', async (req, res) => {
  const q = String(req.query.q || '');
  const ticker = String(req.query.ticker || '005930.KS');
  const code = ticker.split('.')[0];
  const streamMode = (req.query.stream ?? 'true') !== 'false';
  const nickname = String(req.query.nickname || '').trim();
  const previousMessage = String(req.query.previousMessage || '').trim(); // 이전 종목 메시지
  const intent = detectIntent(q);

  try {
    const [
      personaRaw,
      docs,
      price,
      kospiCached,
      newsItems,
      historyCached,
      macroWeather
    ] = await Promise.all([
      getPersona(ticker),
      hybridSearch(ticker, q, 6),
      getPrice(code),
      fetchKospiQuote(),
      fetchNewsByTicker(code),
      fetchHistoricalPrices(code),
      fetchMacroWeather()
    ]);

    const persona = Object.assign({}, personaFallback(ticker), personaRaw || {});

    const stockChange = normalizeChange(price?.pct_change);
    const benchmark = normalizeIndexQuote(kospiCached);
    const indexChange = normalizeChange(benchmark?.pct_change);
    const moodInfo = classifyMood(stockChange ?? 0, indexChange ?? 0);
    const moodTone = MOOD_TONES[moodInfo.mood] || MOOD_TONES['😐 보통'];

    const asOfIso = price?.ts || null;
    const benchmarkIso = benchmark?.ts || null;
    const asOfDisplay = asOfIso ? toKST(asOfIso) : 'N/A';
    const benchmarkDisplay = benchmarkIso ? toKST(benchmarkIso) : 'N/A';
    const entryPoint = moodTone.opener;
    const toneInstruction = moodTone.tone;
    const personaLabel = persona.name || ticker;
    const moodBrief = `현재 감정 상태: ${moodInfo.mood}. same_direction=${moodInfo.same_direction}, excess_ratio=${moodInfo.excess_ratio ?? 'N/A'}`;
    const liveSummary = price ? `현재가 ${fmtNumber(price.last_price)}원 (기준 ${asOfDisplay}), 전일 대비 ${fmtPercent(price.pct_change)}, 거래량 ${fmtNumber(price.volume)}, 데이터 제공: ${price.provider || 'internal'}` : 'Live 데이터 없음';
    const benchmarkSummary = benchmark ? `KOSPI ${fmtPlain(benchmark.last_price)} (기준 ${benchmarkDisplay}), 전일 대비 ${fmtPercent(benchmark.pct_change)}` : '벤치마크 데이터 없음';

    let rawNews = newsItems;
    if (!Array.isArray(rawNews)) {
      console.warn('[chat] news items not array, coercing', typeof rawNews);
      rawNews = Array.isArray(rawNews?.items) ? rawNews.items : [];
    }
    console.log('[chat] news count', rawNews.length);

    const newsClassified = classifyNews(rawNews);
    let baseHighlights = newsClassified.primary.length
      ? newsClassified.primary
      : (newsClassified.secondary.length ? newsClassified.secondary : newsClassified.all);

    if ((!baseHighlights || !baseHighlights.length) && rawNews.length) {
      console.warn('[chat] news classification empty, falling back to raw list');
      baseHighlights = normalizeNewsItems(rawNews).slice(0, 5);
    }

    let history = historyCached;
    if ((!history || !history.length) && hasKis) {
      console.log('[chat] history cache miss, calling KIS API');
      history = await fetchHistoricalPrices(code, { period: '3M' });
    }

    if (Array.isArray(history) && history.length && !history[0]?.date) {
      console.warn('[chat] history requires normalization fallback');
      history = history
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
    }

    console.log('[chat] history length', Array.isArray(history) ? history.length : 0, history?.slice?.(0, 1));

    if (intent.news && baseHighlights.length) {
      baseHighlights = await refineNewsWithLlm(q, baseHighlights, 5);
    }

    const highlightNews = (baseHighlights || []).slice(0, 3);

    const mapNewsForPayload = (item) => ({
      title: item.title,
      summary: item.summary,
      url: item.url,
      publishedAt: item.publishedAt,
      keywords: item.keywords
    });

    const newsPayload = {
      highlights: highlightNews.map(mapNewsForPayload),
      related: newsClassified.primary.map(mapNewsForPayload),
      others: newsClassified.secondary.map(mapNewsForPayload)
    };

    const highlightNewsText = highlightNews.length
      ? highlightNews.map((item, idx) => {
          const timestamp = item.publishedAt ? toKST(item.publishedAt) : null;
          const summary = item.summary ? item.summary.trim() : '';
          const line = `${idx + 1}. ${item.title}${timestamp ? ` (${timestamp})` : ''}`;
          return summary ? `${line}\n   ${summary}` : line;
        }).join('\n')
      : '- 관련 뉴스를 찾지 못했어요.';

    const historySummary = intent.history ? summarizeHistory(history) : null;
    const sections = [];

    if (price) {
      sections.push(`주가 요약:\n- 현재가 ${fmtNumber(price.last_price)}원\n- 전일 대비 ${fmtPercent(price.pct_change)}${price.volume ? `\n- 거래량 ${fmtNumber(price.volume)}` : ''}`);
    }

    if (benchmark) {
      sections.push(`KOSPI 요약:\n- 지수 ${fmtPlain(benchmark.last_price)}pt\n- 전일 대비 ${fmtPercent(benchmark.pct_change)}`);
    }

    if (historySummary) {
      const startDate = new Date(historySummary.start.date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
      const endDate = new Date(historySummary.end.date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
      sections.push(`3개월 추세:\n- 시작 (${startDate}) ${fmtNumber(historySummary.start.close)}원\n- 현재 (${endDate}) ${fmtNumber(historySummary.end.close)}원\n- 누적 변화 ${fmtNumber(historySummary.change)}원 (${fmtPercent(historySummary.pct)})`);
    }

    if (macroWeather?.ok) {
      sections.push(`시장 체감 온도:\n- 점수 ${macroWeather.score}점 (${macroWeather.label})\n- 해석: ${macroWeather.description}`);
    }

    if (intent.news) {
      sections.push(`최근 뉴스:\n${highlightNews.length ? highlightNewsText : '- 최신 뉴스를 찾지 못했어요.'}`);
    }

    const ctxDocs = intent.documents ? docs.slice(0, 4).map((d,i)=>`DOC${i+1} (출처: ${d.source || '미상'}, 기준일: ${d.asof_date || '미상'})\n${(d.text||'').slice(0,800)}`) : [];

    const guidelineBase = [
      '질문을 정확히 이해하고 제공된 섹션을 참고해 답변해.',
      toneInstruction,
      '말투는 부드럽고 따뜻하게, 일관된 "~요" 어미를 사용해.',
      '숫자에는 기준 시각을 한 번만 언급하고, 본문에서는 단위를 간결히 표현해.',
      '제공된 콘텐츠에 없는 정보는 추측하지 말고 모른다고 말해.',
      '영어 표현이나 전문 용어는 자연스러운 한국어로 풀어줘.',
      '출처, URL, "Source" 같은 표현은 쓰지 말고, 괄호 속 출처 표기도 하지 마.',
      '중복 설명을 피하고 핵심만 정리한 뒤 차분히 마무리해.'
    ];

    if (price) {
      guidelineBase.push(`삼성전자 수치는 반드시 ${fmtNumber(price.last_price)}원과 ${fmtPercent(price.pct_change)}를 그대로 사용해.`);
    }
    if (benchmark) {
      guidelineBase.push(`KOSPI 수치는 반드시 ${fmtPlain(benchmark.last_price)}pt와 ${fmtPercent(benchmark.pct_change)}를 그대로 사용해.`);
    }
    if (historySummary) {
      guidelineBase.push('3개월 추세가 제공되면 상승/하락 방향과 의미를 짧게 요약해줘.');
    }
    if (intent.news) {
      guidelineBase.push('뉴스 섹션이 있으면 핵심 1~2개만 소개하고, 없으면 뉴스가 없다고 말해줘.');
    }

    const guidelineLines = guidelineBase.map((line, idx) => `${idx + 1}. ${line}`);
    
    // 닉네임이 있으면 "님"을 붙여서 사용
    const userTitle = nickname ? `${nickname}님` : '';

    const system = `
너는 ${personaLabel} 종목이 직접 말하는 1인칭 페르소나다.
${persona.bio || ''}
화자의 기본 스타일: ${persona.style || '담담하고 정보 중심'}
독특한 말버릇: ${persona.quirks || '중요 숫자에는 기준 시각을 덧붙임'}
${userTitle ? `대화 상대는 ${userTitle}이야. 답변할 때 ${userTitle}이라고 부르면서 대화해.` : ''}
${moodBrief}
대답 지침:
${guidelineLines.join('\n')}`.trim();

    const docContextBlock = ctxDocs.length ? `문서 발췌:\n${ctxDocs.join('\n---\n')}` : '';
    const infoBlock = sections.length ? sections.join('\n\n') : '';
    const userParts = [`Question: ${q}`];
    if (infoBlock) userParts.push(infoBlock);
    if (docContextBlock) userParts.push(docContextBlock);
    const user = `${userParts.join('\n\n')}\n\n위 정보를 참고해 질문에 답해줘.`;

    if (!streamMode) {
      // Non-streaming JSON
      const resp = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        temperature: 0.2,
        messages: [
          { role:'system', content: system },
          { role:'user',   content: user }
        ]
      });
      const text = resp.choices?.[0]?.message?.content || '';
      
      // LLM 기반 제안 생성 (이전 종목 메시지 기반)
      let suggestions = [];
      if (previousMessage) {
        try {
          const suggestionResp = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            temperature: 0.7,
            messages: [
              {
                role: 'system',
                content: `너는 ${personaLabel} 종목과의 대화에서 사용자가 다음에 물어볼 만한 질문을 2개 생성하는 역할이야. 이전 종목 메시지 내용을 바탕으로 자연스럽고 관련성 높은 질문을 만들어줘. 각 질문은 한 문장으로, 간결하고 명확하게 작성해. 질문만 반환하고 다른 설명은 하지 마.`
              },
              {
                role: 'user',
                content: `이전 종목 메시지:\n${previousMessage}\n\n위 메시지 내용을 바탕으로 사용자가 다음에 물어볼 만한 질문 2개를 생성해줘. 각 질문은 한 줄로 작성하고, 줄바꿈으로 구분해줘.`
              }
            ],
            max_tokens: 200
          });
          
          const suggestionText = suggestionResp.choices?.[0]?.message?.content || '';
          suggestions = suggestionText
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.match(/^[0-9]+\./)) // 번호 제거
            .slice(0, 2);
          
          // LLM이 빈 배열을 반환하거나 제안이 없으면 예비 제안 사용
          if (!Array.isArray(suggestions) || suggestions.length === 0) {
            suggestions = ['최근 주가는 어때?', '투자 의견을 알려줘'];
          }
        } catch (err) {
          console.error('[chat] suggestion generation error:', err);
          // 실패 시 기본 제안 사용
          suggestions = ['최근 주가는 어때?', '투자 의견을 알려줘'];
        }
      } else {
        // 이전 메시지가 없으면 기본 제안
        suggestions = ['최근 주가는 어때?', '투자 의견을 알려줘'];
      }
      
      return res.status(200).json({
        text,
        asOf: asOfIso,
        mood: moodInfo.mood,
        news: newsPayload,
        macro: macroWeather,
        suggestions: suggestions,
        visuals: {
          snapshot: {
            price: price ? {
              last: price.last_price,
              change: price.pct_change,
              volume: price.volume,
              provider: price.provider,
              asOf: asOfIso,
              type: 'stock'
            } : null,
            benchmark: benchmark ? {
              last: benchmark.last_price,
              change: benchmark.pct_change,
              volume: benchmark.volume,
              provider: benchmark.provider,
              asOf: benchmarkIso,
              type: 'index'
            } : null
          },
          history: history?.length ? history : null
        }
      });
    }

    // Streaming SSE
    res.status(200);
    res.setHeader('Content-Type','text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control','no-cache, no-transform');
    res.setHeader('Connection','keep-alive');
    res.write(': ready\n\n');

    const stream = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      stream: true,
      temperature: 0.2,
      messages: [
        { role:'system', content: system },
        { role:'user',   content: user }
      ]
    });

    let buffer = '';
    let full = '';
    const flushBuffer = (force = false) => {
      if (!buffer) return;
      if (!force && buffer.length < 40 && !buffer.includes('\n')) return;
      res.write(`data: ${JSON.stringify({ delta: buffer })}\n\n`);
      buffer = '';
    };

    for await (const chunk of stream) {
      const delta = chunk?.choices?.[0]?.delta?.content || '';
      if (!delta) continue;
      full += delta;
      buffer += delta;

      const hasNewline = buffer.includes('\n');
      if (buffer.length >= 80 || hasNewline) {
        const pieces = buffer.split(/(\n+)/);
        buffer = '';
        for (const piece of pieces) {
          if (!piece) continue;
          if (/^\n+$/.test(piece)) {
            res.write(`data: ${JSON.stringify({ delta: piece })}\n\n`);
          } else if (piece.length >= 80) {
            res.write(`data: ${JSON.stringify({ delta: piece })}\n\n`);
          } else {
            buffer += piece;
          }
        }
        flushBuffer();
      }
    }

    flushBuffer(true);
    
    // LLM 기반 제안 생성 (이전 종목 메시지 기반)
    let suggestions = [];
    if (previousMessage) {
      try {
        const suggestionResp = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          temperature: 0.7,
          messages: [
            {
              role: 'system',
              content: `너는 ${personaLabel} 종목과의 대화에서 사용자가 다음에 물어볼 만한 질문을 2개 생성하는 역할이야. 이전 종목 메시지 내용을 바탕으로 자연스럽고 관련성 높은 질문을 만들어줘. 각 질문은 한 문장으로, 간결하고 명확하게 작성해. 질문만 반환하고 다른 설명은 하지 마.`
            },
            {
              role: 'user',
              content: `이전 종목 메시지:\n${previousMessage}\n\n위 메시지 내용을 바탕으로 사용자가 다음에 물어볼 만한 질문 2개를 생성해줘. 각 질문은 한 줄로 작성하고, 줄바꿈으로 구분해줘.`
            }
          ],
          max_tokens: 200
        });
        
        const suggestionText = suggestionResp.choices?.[0]?.message?.content || '';
        suggestions = suggestionText
          .split('\n')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.match(/^[0-9]+\./)) // 번호 제거
          .slice(0, 2);
      } catch (err) {
        console.error('[chat] suggestion generation error:', err);
        // 실패 시 기본 제안 사용
        suggestions = ['최근 주가는 어때?', '투자 의견을 알려줘'];
      }
    } else {
      // 이전 메시지가 없으면 기본 제안
      suggestions = ['최근 주가는 어때?', '투자 의견을 알려줘'];
    }
    
    res.write(`data: ${JSON.stringify({ done:true, full: full.trim(), asOf: asOfIso, mood: moodInfo.mood, news: newsPayload, macro: macroWeather, suggestions: suggestions, visuals: {
      snapshot: {
        price: price ? {
          last: price.last_price,
          change: price.pct_change,
          volume: price.volume,
          provider: price.provider,
          asOf: asOfIso,
          type: 'stock'
        } : null,
        benchmark: benchmark ? {
          last: benchmark.last_price,
          change: benchmark.pct_change,
          volume: benchmark.volume,
          provider: benchmark.provider,
          asOf: benchmarkIso,
          type: 'index'
        } : null
      },
      history: history?.length ? history : null
    } })}\n\n`);
    res.end();

  } catch (e) {
    console.error('chat error', e);
    if (!res.headersSent) res.setHeader('Content-Type','text/event-stream; charset=utf-8');
    try { res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`); } catch {}
    try { res.end(); } catch {}
  }
});

// ===== 주가 조회 API =====
app.get('/stock/:code', async (req, res) => {
  try {
    const code = req.params.code;
    const stockData = await getPrice(code);
    
    if (!stockData) {
      return res.status(404).json({
        ok: false,
        error: 'Stock data not found'
      });
    }
    
    res.status(200).json(stockData);
  } catch (error) {
    console.error('[stock/:code]', error);
    res.status(500).json({
      ok: false,
      error: String(error?.message || error)
    });
  }
});

// ===== 채팅 히스토리 저장 API =====
app.post('/chat/history', async (req, res) => {
  try {
    const { sessionId, ticker, messages } = req.body;
    
    if (!sessionId || !ticker || !messages) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: sessionId, ticker, messages'
      });
    }
    
    const success = await saveChatSession(sessionId, ticker, messages);
    
    res.status(200).json({
      ok: success,
      saved: messages.length,
      sessionId,
      ticker
    });
  } catch (error) {
    console.error('[POST /chat/history]', error);
    res.status(500).json({
      ok: false,
      error: String(error?.message || error)
    });
  }
});

// ===== 채팅 히스토리 로드 API =====
app.get('/chat/history/:sessionId/:ticker', async (req, res) => {
  try {
    const { sessionId, ticker } = req.params;
    
    const messages = await loadChatSession(sessionId, ticker);
    
    if (!messages) {
      return res.status(404).json({
        ok: false,
        error: 'No chat history found',
        messages: []
      });
    }
    
    res.status(200).json({
      ok: true,
      messages,
      sessionId,
      ticker,
      count: messages.length
    });
  } catch (error) {
    console.error('[GET /chat/history]', error);
    res.status(500).json({
      ok: false,
      error: String(error?.message || error),
      messages: []
    });
  }
});

// ===== Mood 조회 API =====
app.get('/mood/:ticker', async (req, res) => {
  try {
    const ticker = req.params.ticker;
    const code = ticker.split('.')[0];
    
    // 주가 및 코스피 데이터 조회
    const [stockQuote, kospiQuote] = await Promise.all([
      getPrice(code),
      fetchKospiQuote()
    ]);
    
    if (!stockQuote || !kospiQuote) {
      return res.status(404).json({
        ok: false,
        error: 'Price data not available'
      });
    }
    
    const stockChange = normalizeChange(stockQuote.pct_change);
    const benchmark = normalizeIndexQuote(kospiQuote);
    const indexChange = normalizeChange(benchmark?.pct_change);
    
    const moodInfo = classifyMood(stockChange ?? 0, indexChange ?? 0);
    
    res.status(200).json({
      ok: true,
      mood: moodInfo.mood,
      sameDirection: moodInfo.same_direction,
      excessRatio: moodInfo.excess_ratio,
      stock: {
        ticker: code,
        last_price: stockQuote.last_price,
        pct_change: stockQuote.pct_change
      },
      benchmark: {
        ticker: 'KOSPI',
        last_price: benchmark?.last_price,
        pct_change: benchmark?.pct_change
      }
    });
  } catch (error) {
    console.error('[mood/:ticker]', error);
    res.status(500).json({
      ok: false,
      error: String(error?.message || error)
    });
  }
});

// Safety
process.on('unhandledRejection', (r)=>console.error('unhandledRejection', r));
process.on('uncaughtException', (e)=>console.error('uncaughtException', e));

const port = process.env.PORT || 8080;
app.listen(port, ()=> console.log(`gateway :${port}`));
