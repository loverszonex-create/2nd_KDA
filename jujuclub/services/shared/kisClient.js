import axios from 'axios';
import { acquireKisSlot } from './kisRateLimiter.js';

const tzOffsetMinutes = 9 * 60;
const toKstDate = (date = new Date()) => {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const kst = new Date(utc + tzOffsetMinutes * 60000);
  const yyyy = kst.getFullYear();
  const mm = String(kst.getMonth() + 1).padStart(2, '0');
  const dd = String(kst.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
};

const toNumber = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = typeof value === 'string' ? value.replace(/,/g, '') : value;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
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

function resolveKisConfig() {
  return {
    BASE_URL: process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443',
    APPKEY: process.env.KIS_APPKEY || process.env.APP_KEY,
    APPSECRET: process.env.KIS_SECRET || process.env.SECRET_KEY,
    CUSTTYPE: process.env.KIS_CUSTTYPE || 'P',
    ENV_DV: process.env.KIS_ENV || 'real'
  };
}

function ensureConfig(config) {
  if (!config.APPKEY || !config.APPSECRET) {
    throw new Error('KIS_APPKEY / KIS_SECRET (or APP_KEY / SECRET_KEY) environment variables are required.');
  }
}

export function getKisConfig() {
  const cfg = resolveKisConfig();
  ensureConfig(cfg);
  return cfg;
}

export async function getAccessToken() {
  const { BASE_URL, APPKEY, APPSECRET } = getKisConfig();
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    appkey: APPKEY,
    appsecret: APPSECRET
  });
  await acquireKisSlot('oauth_token');
  const { data } = await axios.post(
    `${BASE_URL}/oauth2/token`,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } }
  );
  if (!data?.access_token) {
    throw new Error(`Failed to obtain KIS access token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

export async function getApprovalKey() {
  const { BASE_URL, APPKEY, APPSECRET } = getKisConfig();
  await acquireKisSlot('oauth_approval');
  const { data } = await axios.post(
    `${BASE_URL}/oauth2/Approval`,
    {
      grant_type: 'client_credentials',
      appkey: APPKEY,
      secretkey: APPSECRET
    },
    { headers: { 'Content-Type': 'application/json; charset=UTF-8' } }
  );
  if (!data?.approval_key) {
    throw new Error(`Failed to obtain KIS approval key: ${JSON.stringify(data)}`);
  }
  return data.approval_key;
}

export async function getStockQuote({ ticker, market = 'J' }) {
  const { BASE_URL, APPKEY, APPSECRET } = getKisConfig();
  const token = await getAccessToken();
  await acquireKisSlot('FHKST01010100');
  const { data } = await axios.get(
    `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`,
    {
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${token}`,
        appkey: APPKEY,
        appsecret: APPSECRET,
        tr_id: 'FHKST01010100'
      },
      params: {
        fid_cond_mrkt_div_code: market,
        fid_input_iscd: ticker
      }
    }
  );
  return data?.output;
}

export async function getIndexQuote({ indexCode, market = 'U' }) {
  const { BASE_URL, APPKEY, APPSECRET, CUSTTYPE } = getKisConfig();
  const token = await getAccessToken();

  await acquireKisSlot('FHPUP02100000');
  const { data } = await axios.get(
    `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-price`,
    {
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${token}`,
        appkey: APPKEY,
        appsecret: APPSECRET,
        custtype: CUSTTYPE,
        tr_id: 'FHPUP02100000'
      },
      params: {
        FID_COND_MRKT_DIV_CODE: market,
        FID_INPUT_ISCD: indexCode
      }
    }
  );

  if (data?.rt_cd && data.rt_cd !== '0') {
    console.warn('[kisClient] inquire-index-price returned error code', data);
    return null;
  }

  const output = data?.output ?? data?.output1 ?? data?.outputs ?? null;
  if (!output) {
    console.warn('[kisClient] inquire-index-price payload missing output', data);
    return null;
  }
  if (Array.isArray(output)) {
    return output[0] ?? null;
  }
  return output;
}

export async function getNews({ ticker, startDate = '', startTime = '', rankSort = '01', limit = 40 }) {
  const { BASE_URL, APPKEY, APPSECRET, CUSTTYPE } = getKisConfig();
  const token = await getAccessToken();
  await acquireKisSlot('FHKST01011800');
  const { data } = await axios.get(
    `${BASE_URL}/uapi/domestic-stock/v1/quotations/news-title`,
    {
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${token}`,
        appkey: APPKEY,
        appsecret: APPSECRET,
        custtype: CUSTTYPE,
        tr_id: 'FHKST01011800'
      },
      params: {
        FID_NEWS_OFER_ENTP_CODE: '2',
        FID_COND_MRKT_CLS_CODE: '00',
        FID_INPUT_ISCD: ticker,
        FID_TITL_CNTT: '',
        FID_INPUT_DATE_1: startDate,
        FID_INPUT_HOUR_1: startTime,
        FID_RANK_SORT_CLS_CODE: rankSort,
        FID_INPUT_SRNO: '1',
        FID_ROW_COUNT: String(limit)
      }
    }
  );
  const list = data?.output ?? data?.output1 ?? data?.list ?? [];
  return Array.isArray(list) ? list : [];
}

export async function getStockDailyChart({ ticker, market = 'J', period = '3M', adjPrice = '0' }) {
  const { BASE_URL, APPKEY, APPSECRET } = getKisConfig();
  const token = await getAccessToken();

  const PERIOD_MAP = {
    '1M': '1',
    '3M': '3',
    '6M': '6',
    '1Y': '12',
    '3': '3',
    '6': '6',
    '12': '12'
  };
  const periodCode = PERIOD_MAP[period] || period || '3';

  await acquireKisSlot('FHKST03010100');
  const { data } = await axios.get(
    `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`,
    {
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${token}`,
        appkey: APPKEY,
        appsecret: APPSECRET,
        tr_id: 'FHKST03010100'
      },
      params: {
        fid_cond_mrkt_div_code: market,
        fid_input_iscd: ticker,
        fid_period_div_code: periodCode,
        fid_org_adj_prc: adjPrice,
        fid_input_date_1: '',
        fid_input_date_2: ''
      }
    }
  );

  if (data?.rt_cd && data.rt_cd !== '0') {
    console.warn('[kisClient] inquire-daily-itemchartprice returned error code', data);
    return [];
  }

  const list = data?.output2 ?? data?.output1 ?? data?.output ?? [];
  return Array.isArray(list) ? list : [];
}

export async function getIndexCategoryPrice({
  marketDiv = 'U',
  indexCode = '0001',
  screenCode = '20214',
  marketClsCode = 'K',
  belongClsCode = '0'
} = {}) {
  const { BASE_URL, APPKEY, APPSECRET, CUSTTYPE } = getKisConfig();
  const token = await getAccessToken();

  await acquireKisSlot('FHPUP02140000');
  const { data } = await axios.get(
    `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-category-price`,
    {
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${token}`,
        appkey: APPKEY,
        appsecret: APPSECRET,
        custtype: CUSTTYPE,
        tr_id: 'FHPUP02140000'
      },
      params: {
        FID_COND_MRKT_DIV_CODE: marketDiv,
        FID_INPUT_ISCD: indexCode,
        FID_COND_SCR_DIV_CODE: screenCode,
        FID_MRKT_CLS_CODE: marketClsCode,
        FID_BLNG_CLS_CODE: belongClsCode
      }
    }
  );

  if (data?.rt_cd && data.rt_cd !== '0') {
    throw new Error(`KIS index category price error ${data.rt_cd}: ${data?.msg1 || ''}`);
  }

  const output1 = data?.output1 ?? null;
  const output2 = data?.output2 ?? [];
  return {
    output1,
    output2: Array.isArray(output2) ? output2 : [],
    raw: data
  };
}

export async function getIndexDailyVolumes({
  indexCode = '0001',
  marketDiv = 'U',
  period = 'D',
  startDate,
  maxPages = 5,
  fallbackDays = 5
} = {}) {
  const { BASE_URL, APPKEY, APPSECRET, CUSTTYPE } = getKisConfig();
  const token = await getAccessToken();
  const targetStart = adjustToBizDay(startDate || toKstDate());

  const fetchForDate = async (targetDate) => {
    const rows = [];
    let tr_cont = '';
    let page = 0;

    while (page < maxPages) {
      await acquireKisSlot('FHPUP02120000');
      const { data, headers } = await axios.get(
        `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-daily-price`,
        {
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${token}`,
            appkey: APPKEY,
            appsecret: APPSECRET,
            custtype: CUSTTYPE,
            tr_id: 'FHPUP02120000',
            ...(tr_cont ? { tr_cont } : {})
          },
          params: {
            FID_PERIOD_DIV_CODE: period,
            FID_COND_MRKT_DIV_CODE: marketDiv,
            FID_INPUT_ISCD: indexCode,
            FID_INPUT_DATE_1: targetDate
          }
        }
      );

      if (data?.rt_cd && data.rt_cd !== '0') {
        throw new Error(`KIS index daily price error ${data.rt_cd}: ${data?.msg1 || ''}`);
      }

      const outputs = [];
      if (Array.isArray(data?.output1)) outputs.push(...data.output1);
      else if (data?.output1) outputs.push(data.output1);
      if (Array.isArray(data?.output2)) outputs.push(...data.output2);
      else if (data?.output2) outputs.push(data.output2);

      for (const row of outputs) {
        const ymd =
          row?.stck_bsop_date ||
          row?.bsop_date ||
          row?.bstp_nmix_bsop_date ||
          row?.date;
        if (!ymd) continue;
        const volume = toNumber(row?.acml_vol ?? row?.tot_vol ?? row?.volume);
        if (volume === null) continue;
        rows.push({
          date: ymd,
          volume,
          raw: row
        });
      }

      const nextTrCont = headers?.['tr_cont'] ?? headers?.tr_cont ?? data?.tr_cont;
      if (!nextTrCont || nextTrCont === 'F' || nextTrCont === '0') break;
      tr_cont = 'N';
      page += 1;
    }

    return rows;
  };

  const result = [];
  let currentDate = targetStart;
  for (let attempt = 0; attempt <= Math.max(0, fallbackDays); attempt += 1) {
    const rows = await fetchForDate(currentDate);
    if (rows.length) {
      result.push(...rows);
    }
    currentDate = prevBizDay(currentDate);
  }

  const unique = new Map();
  for (const row of result) {
    unique.set(row.date, row);
  }
  const merged = Array.from(unique.values()).sort((a, b) => a.date.localeCompare(b.date));
  return merged;
}

export async function getIndexDailyBreadth({
  indexCode = '0001',
  marketDiv = 'U',
  period = 'D',
  startDate,
  maxPages = 5,
  fallbackDays = 5
} = {}) {
  const { BASE_URL, APPKEY, APPSECRET, CUSTTYPE } = getKisConfig();
  const token = await getAccessToken();
  const targetStart = adjustToBizDay(startDate || toKstDate());
  const triedDates = [];

  const fetchForDate = async (targetDate) => {
    const rows = [];
    let tr_cont = '';
    let page = 0;

    while (page < maxPages) {
      await acquireKisSlot('FHPUP02120000');
      const { data, headers } = await axios.get(
        `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-daily-price`,
        {
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${token}`,
            appkey: APPKEY,
            appsecret: APPSECRET,
            custtype: CUSTTYPE,
            tr_id: 'FHPUP02120000',
            ...(tr_cont ? { tr_cont } : {})
          },
          params: {
            FID_PERIOD_DIV_CODE: period,
            FID_COND_MRKT_DIV_CODE: marketDiv,
            FID_INPUT_ISCD: indexCode,
            FID_INPUT_DATE_1: targetDate
          }
        }
      );

      if (data?.rt_cd && data.rt_cd !== '0') {
        throw new Error(`KIS index daily price error ${data.rt_cd}: ${data?.msg1 || ''}`);
      }

      const outputs = [];
      if (Array.isArray(data?.output1)) outputs.push(...data.output1);
      else if (data?.output1) outputs.push(data.output1);
      if (Array.isArray(data?.output2)) outputs.push(...data.output2);
      else if (data?.output2) outputs.push(data.output2);

      if (!outputs.length) {
        console.warn('[kisClient] index daily breadth empty page', {
          indexCode,
          targetDate,
          page,
          headers,
          receivedKeys: Object.keys(data || {}),
          dataSample: JSON.stringify(data)?.slice(0, 400)
        });
      }

      for (const row of outputs) {
        if (!row) continue;
        const date =
          row.stck_bsop_date ||
          row.bsop_date ||
          row.bstp_nmix_bsop_date ||
          null;
        const advance = toNumber(row.ascn_issu_cnt);
        const decline = toNumber(row.down_issu_cnt);
        const unchanged = toNumber(row.stnr_issu_cnt);
        const upper = toNumber(row.uplm_issu_cnt);
        const lower = toNumber(row.lslm_issu_cnt);

        if (!date || (advance === null && decline === null && upper === null && lower === null)) {
          continue;
        }

        rows.push({
          date,
          advance,
          decline,
          unchanged,
          upper,
          lower,
          raw: row
        });
      }

      const nextTrCont = headers?.['tr_cont'] ?? headers?.tr_cont ?? data?.tr_cont;
      if (!nextTrCont || nextTrCont === 'F' || nextTrCont === '0') break;
      tr_cont = 'N';
      page += 1;
    }

    return rows;
  };

  let currentDate = targetStart;
  for (let attempt = 0; attempt <= Math.max(0, fallbackDays); attempt += 1) {
    triedDates.push(currentDate);
    const rows = await fetchForDate(currentDate);
    if (rows.length) {
      rows.sort((a, b) => {
        if (a.date === b.date) return 0;
        return a.date < b.date ? -1 : 1;
      });
      return rows;
    }
    currentDate = prevBizDay(currentDate);
  }

  console.warn('[kisClient] index daily breadth empty after fallbacks', {
    indexCode,
    startDate: targetStart,
    attempts: fallbackDays + 1,
    triedDates
  });
  return [];
}

export function hasKisConfig() {
  try {
    getKisConfig();
    return true;
  } catch {
    return false;
  }
}
