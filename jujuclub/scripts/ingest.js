// node scripts/ingest.js ./sample_docs/005930.KS 005930.KS
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function embed(text) {
  const r = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text });
  return r.data[0].embedding;
}

async function ingestDir(dir, ticker) {
  const files = await fs.readdir(dir);
  for (const f of files) {
    const content = await fs.readFile(path.join(dir, f), 'utf8');
    const vec = await embed(content.slice(0, 7000));
    const { error } = await supa.from('rag_docs').insert({
      ticker, asof_date: new Date(), source: 'note', url: null, content, embedding: vec
    });
    if (error) console.error(error);
  }
  console.log('Ingest complete:', ticker);
}

const [,, dir, ticker] = process.argv;
if (!dir || !ticker) {
  console.error('Usage: node scripts/ingest.js <dir> <ticker>');
  process.exit(1);
}
await ingestDir(dir, ticker);
