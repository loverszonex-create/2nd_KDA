import axios from 'axios';

const DEFAULT_BASE_URL = process.env.KRX_API_BASE_URL || 'https://data-dbg.krx.co.kr';
const DEFAULT_VKOSPI_PATH = process.env.KRX_API_VKOSPI_PATH || '/svc/apis/idx/drvprod_dd_trd';
const DEFAULT_MAX_FALLBACK = Number(process.env.KRX_VKOSPI_MAX_FALLBACK ?? 15);
const DEFAULT_IDX_IDS = (process.env.KRX_VKOSPI_IDS || 'VKOSPI,KRDRVFIKR,KRDRVFIKR01,901,KRX:VKOSPI').split(',');
const DEFAULT_NAME_CANDIDATES = (process.env.KRX_VKOSPI_NAMES || '코스피 200 변동성지수,KOSPI200 변동성지수,KOSPI 200 Volatility Index,KOSPI200 Volatility Index,코스피200 변동성지수').split(',');

const toKstDate = (date = new Date()) => {
  const tzOffset = 9 * 60; // KST offset in minutes
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const kst = new Date(utc + tzOffset * 60000);
  const yyyy = kst.getFullYear();
  const mm = String(kst.getMonth() + 1).padStart(2, '0');
  const dd = String(kst.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
};

const fromYyyymmdd = (str) => {
  if (!/^\d{8}$/.test(str || '')) return null;
  const yyyy = Number(str.slice(0, 4));
  const mm = Number(str.slice(4, 6)) - 1;
  const dd = Number(str.slice(6, 8));
  return new Date(Date.UTC(yyyy, mm, dd, 0, 0, 0));
};

const formatYyyymmdd = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
};

const isWeekend = (date) => {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
};

const adjustToBizDay = (ymd) => {
  let date = fromYyyymmdd(ymd);
  if (!date) return ymd;
  while (isWeekend(date)) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return formatYyyymmdd(date);
};

const prevBizDay = (ymd) => {
  let date = fromYyyymmdd(ymd);
  if (!date) return ymd;
  do {
    date.setUTCDate(date.getUTCDate() - 1);
  } while (isWeekend(date));
  return formatYyyymmdd(date);
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
        method: err.config?.method,
        params: err.config?.params
      }
    };
  }
  return { message: err.message };
};

const toNumber = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).replace(/,/g, '').trim();
  if (!normalized) return null;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
};

const summarizeRow = (row, limit = 10) => {
  if (!row || typeof row !== 'object') return row;
  return Object.fromEntries(Object.entries(row).slice(0, limit));
};

const matchesIdxRow = (row = {}, targetId) => {
  const normalizedTarget = (targetId || '')
    .toString()
    .replace(/^KRX:/i, '')
    .trim()
    .toLowerCase();

  const values = [
    row.IDX_ID,
    row.idx_id,
    row.IDX_CD,
    row.idx_cd,
    row.IDX_IND_CD,
    row.idx_ind_cd,
    row.IDX_IND_NM,
    row.idx_ind_nm,
    row.IDX_NM,
    row.idx_nm,
    row.IDX_SRNO,
    row.idx_srno
  ]
    .filter((val) => val !== null && val !== undefined)
    .map((val) => val.toString().trim().toLowerCase());

  const lowerName = (row.IDX_NM || row.idx_nm || '').toString().trim().toLowerCase();
  const lowerClass = (row.IDX_CLSS || row.idx_clss || '').toString().trim().toLowerCase();

  if (normalizedTarget) {
    if (values.some((val) => val === normalizedTarget)) return true;
    if (normalizedTarget === 'vkospi' && values.some((val) => val.includes('vkospi'))) return true;
  } else if (values.some((val) => val.includes('vkospi'))) {
    return true;
  }

  if (values.some((val) => val === 'vkospi' || val === '901')) return true;

  if (lowerName.includes('코스피') && lowerName.includes('변동성')) {
    return true;
  }
  if (lowerClass.includes('변동성')) {
    return true;
  }
  if (lowerName.includes('volatility') && lowerName.includes('kospi')) {
    return true;
  }

  const nameMatches = DEFAULT_NAME_CANDIDATES.some((candidate) => {
    const normalized = candidate.trim().toLowerCase();
    if (!normalized) return false;
    if (values.some((val) => val === normalized || val.includes(normalized))) return true;
    return false;
  });
  if (nameMatches) return true;

  return false;
};

const pickVkospiRow = (payload, targetId) => {
  if (!payload) return null;
  const visited = new Set();
  const queue = [payload];

  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;

    if (typeof current === 'object') {
      if (visited.has(current)) continue;
      visited.add(current);
    }

    if (Array.isArray(current)) {
      for (const item of current) {
        if (!item || typeof item !== 'object') {
          queue.push(item);
          continue;
        }
        if (matchesIdxRow(item, targetId)) {
          return item;
        }
        queue.push(item);
      }
      continue;
    }

    if (typeof current === 'object') {
      if (matchesIdxRow(current, targetId)) {
        return current;
      }
      for (const value of Object.values(current)) {
        if (value && typeof value === 'object') {
          queue.push(value);
        }
      }
    }
  }

  return null;
};

const extractOpeningPriceFromRow = (row) => {
  if (!row || typeof row !== 'object') return null;
  const fields = [
    row.OPNPRC_IDX,
    row.opnprc_idx,
    row.OPNPRC,
    row.opnprc,
    row.OPEN,
    row.open,
    row.OPN_PRC,
    row.opn_prc,
    row.OPRPRC,
    row.oprprc,
    row.OPEN_PRC,
    row.open_prc
  ];
  for (const value of fields) {
    const num = toNumber(value);
    if (Number.isFinite(num)) return num;
  }
  return null;
};

const buildHeaders = () => {
  const apiKey = process.env.KRX_API_KEY;
  if (!apiKey) {
    throw new Error('KRX_API_KEY is missing. Please add it to .env.gateway');
  }
  return {
    'Content-Type': 'application/json; charset=UTF-8',
    Accept: 'application/json',
    Authorization: `Bearer ${apiKey}`,
    apikey: apiKey,
    'x-api-key': apiKey,
    ...(process.env.KRX_API_REFERER ? { Referer: process.env.KRX_API_REFERER } : {})
  };
};

const callKrX = async ({ url, targetDate, method = 'get', idxId }) => {
  const headers = buildHeaders();

  const config = {
    method,
    url,
    headers,
    timeout: Number(process.env.KRX_API_TIMEOUT_MS || 7000)
  };

  if (method === 'get') {
    config.params = {
      basDd: targetDate,
      idxId,
      idxCd: idxId,
      idxIndCd: idxId
    };
  } else {
    config.data = { InBlock_1: { basDd: targetDate } };
    if (idxId) {
      config.data.InBlock_1.idxId = idxId;
      config.data.InBlock_1.idxCd = idxId;
      config.data.InBlock_1.idxIndCd = idxId;
    }
  }

  return axios(config);
};

export async function fetchVkospiOpening({ basDd, maxFallback = DEFAULT_MAX_FALLBACK } = {}) {
  const apiKey = process.env.KRX_API_KEY;
  if (!apiKey) {
    throw new Error('KRX_API_KEY is missing. Please add it to .env.gateway');
  }

  const baseUrl = DEFAULT_BASE_URL.replace(/\/$/, '');
  const path = DEFAULT_VKOSPI_PATH.startsWith('/') ? DEFAULT_VKOSPI_PATH : `/${DEFAULT_VKOSPI_PATH}`;
  const url = `${baseUrl}${path}`;

  const initialTarget = adjustToBizDay(basDd || toKstDate());
  const attempts = [];
  let targetDate = initialTarget;
  let remaining = Math.max(0, Number(maxFallback) || 0);

  while (true) {
    try {
      let response;
      let row = null;
      let openingPrice = null;

      let matchedIdxId = null;

      for (const idxId of DEFAULT_IDX_IDS) {
        const trimmedId = idxId.trim();
        if (!trimmedId) continue;

        // 1) Try GET with query string (documented on data-dbg.krx)
        try {
          response = await callKrX({ url, targetDate, method: 'get', idxId: trimmedId });
          const outBlock = response?.data?.OutBlock_1;
          if (Array.isArray(outBlock) && outBlock.length) {
            console.log('[krx] VKOSPI via KRX: OutBlock_1 sample (GET)', {
              targetDate,
              idxId: trimmedId,
              sample: summarizeRow(outBlock[0])
            });
          }
          row = pickVkospiRow(response.data, trimmedId);
          if (!row) {
            console.log('[krx] VKOSPI via KRX: pickVkospiRow returned null (GET)', {
              targetDate,
              idxId: trimmedId,
              dataKeys: response?.data ? Object.keys(response.data) : null
            });
            if (Array.isArray(outBlock)) {
              for (const candidate of outBlock) {
                if (matchesIdxRow(candidate, null)) {
                  console.log('[krx] VKOSPI via KRX: fallback name match candidate (GET)', {
                    targetDate,
                    idxId: trimmedId,
                    candidate: summarizeRow(candidate)
                  });
                }
              }
            }
          }
          openingPrice = extractOpeningPriceFromRow(row);
          if (row && openingPrice !== null) {
            console.log('[krx] VKOSPI via KRX: GET extracted price', {
              targetDate,
              idxId: trimmedId,
              openingPrice,
              rowSample: summarizeRow(row)
            });
            matchedIdxId = trimmedId;
            break;
          }
        } catch (getError) {
          const code = getError?.response?.status;
          if (code && code !== 405 && code !== 404) {
            throw getError;
          }
        }

        // 2) If GET returned nothing, try POST with InBlock payload (older samples)
        try {
          response = await callKrX({ url, targetDate, method: 'post', idxId: trimmedId });
          const outBlock = response?.data?.OutBlock_1;
          if (Array.isArray(outBlock) && outBlock.length) {
            console.log('[krx] VKOSPI via KRX: OutBlock_1 sample (POST)', {
              targetDate,
              idxId: trimmedId,
              sample: summarizeRow(outBlock[0])
            });
          }
          row = pickVkospiRow(response.data, trimmedId);
          if (!row) {
            console.log('[krx] VKOSPI via KRX: pickVkospiRow returned null (POST)', {
              targetDate,
              idxId: trimmedId,
              dataKeys: response?.data ? Object.keys(response.data) : null
            });
            if (Array.isArray(outBlock)) {
              for (const candidate of outBlock) {
                if (matchesIdxRow(candidate, null)) {
                  console.log('[krx] VKOSPI via KRX: fallback name match candidate (POST)', {
                    targetDate,
                    idxId: trimmedId,
                    candidate: summarizeRow(candidate)
                  });
                }
              }
            }
          }
          openingPrice = extractOpeningPriceFromRow(row);
          if (row && openingPrice !== null) {
            console.log('[krx] VKOSPI via KRX: POST extracted price', {
              targetDate,
              idxId: trimmedId,
              openingPrice,
              rowSample: summarizeRow(row)
            });
            matchedIdxId = trimmedId;
            break;
          }
        } catch (postError) {
          const code = postError?.response?.status;
          if (code && code !== 404) {
            throw postError;
          }
        }
      }

      if (row && openingPrice !== null) {
        return {
          ok: true,
          basDd: targetDate,
          ticker: 'VKOSPI',
          openingPrice,
          row,
          raw: response.data,
          requestedBasDd: initialTarget,
          fallbackTrail: attempts,
          idxId: matchedIdxId
        };
      }

      attempts.push({ basDd: targetDate, reason: 'EMPTY_OR_NULL' });
    } catch (error) {
      const serialized = mapAxiosError(error);
      console.error('[krx] VKOSPI fetch error', serialized);
      return {
        ok: false,
        basDd: targetDate,
        ticker: 'VKOSPI',
        error: serialized,
        requestedBasDd: initialTarget,
        fallbackTrail: attempts
      };
    }

    if (remaining <= 0) {
      return {
        ok: true,
        basDd: targetDate,
        ticker: 'VKOSPI',
        openingPrice: null,
        row: null,
        raw: null,
        requestedBasDd: initialTarget,
        fallbackTrail: attempts,
        message: 'No VKOSPI data found within fallback window'
      };
    }

    remaining -= 1;
    targetDate = prevBizDay(targetDate);
  }
}

export default {
  fetchVkospiOpening
};

