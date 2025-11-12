import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// RLS 활성화되어 있으니 service_role로 접속 (서버 전용)
const supa   = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function hybridSearch(ticker, query, k = 6) {
  // 1) 쿼리 임베딩
  const emb = await openai.embeddings.create({ model: 'text-embedding-3-small', input: query });
  const vec = emb.data[0].embedding.map(Number);

  // 2) 벡터 KNN (배열 입력 RPC 권장)
  const { data: knn, error: e1 } = await supa.rpc('knn_search_arr', {
    ticker_in: ticker, embedding_arr: vec, k_in: 20
  });
  if (e1) console.error('knn_search_arr error', e1);

  // 3) 키워드 FTS
  const { data: fts, error: e2 } = await supa
    .from('rag_docs')
    .select('id, content, url, source, asof_date')
    .eq('ticker', ticker)
    .textSearch('fts', query, { type: 'websearch' })
    .limit(20);
  if (e2) console.error('FTS error', e2);

  // 4) 병합 뒤 상위 k
  const pool = new Map();
  for (const r of knn || []) pool.set(r.id, r);
  for (const r of fts || []) pool.set(r.id, r);
  return [...pool.values()].slice(0, k).map((c, i) => ({
    rank: i+1, text: c.content, url: c.url, source: c.source, asof_date: c.asof_date
  }));
}
