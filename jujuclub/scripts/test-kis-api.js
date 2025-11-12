import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getAccessToken,
  getApprovalKey,
  getStockQuote,
  getIndexQuote,
  getNews,
  getKisConfig
} from '../services/shared/kisClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load ../.env.ws so we can reuse existing credentials
dotenv.config({ path: path.resolve(__dirname, '../.env.ws') });

async function main() {
  try {
    const cfg = getKisConfig();
    console.log('[test] config', {
      BASE_URL: cfg.BASE_URL,
      APPKEY: cfg.APPKEY,
      APPSECRET: cfg.APPSECRET ? `${cfg.APPSECRET.slice(0, 6)}***` : null,
      CUSTTYPE: cfg.CUSTTYPE,
      ENV_DV: cfg.ENV_DV
    });

    const token = await getAccessToken();
    console.log('[test] access token prefix', token.slice(0, 12));

    const approval = await getApprovalKey();
    console.log('[test] approval key', approval);

    const quote = await getStockQuote({ ticker: '005930' });
    console.log('[test] 삼성전자 시세', quote);

    const kospi = await getIndexQuote({ indexCode: '0001' });
    console.log('[test] KOSPI 지수', kospi);

    const news = await getNews({ ticker: '005930' });
    console.log('[test] 삼성전자 뉴스', news);

    console.log('[test] done');
    process.exit(0);
  } catch (err) {
    console.error('[test] error', err?.response?.data || err?.message || err);
    process.exit(1);
  }
}

main();

