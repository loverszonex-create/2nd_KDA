import { fetchJson } from './apiClient'

export function extractStockCode(value) {
  if (value === null || value === undefined) return null
  const digits = String(value).replace(/[^0-9]/g, '')
  if (digits.length === 0) return null
  if (digits.length === 6) return digits
  if (digits.length > 6) return digits.slice(-6)
  return digits.padStart(6, '0')
}

export function normalizeStock(stock) {
  if (!stock) return null
  const code =
    stock.code ||
    extractStockCode(stock.ticker || stock.displayedCode || stock.symbol || stock.name)
  if (!code) return null
  const ticker = stock.ticker || `${code}.KS`
  const name = stock.name || stock.koreanName || stock.displayedName || code

  return {
    ...stock,
    name,
    code,
    ticker,
    summary: stock.summary || '검색으로 추가한 종목입니다.',
    category: stock.category || '#사용자등록',
    badge: stock.badge || '국내',
    provider: stock.provider || 'gateway',
    quick: Array.isArray(stock.quick) && stock.quick.length > 0 ? stock.quick : null
  }
}

export function mergeStockLists(primary = [], fallback = []) {
  const map = new Map()
  ;[...primary, ...fallback].forEach((item) => {
    const normalized = normalizeStock(item)
    if (!normalized) return
    const key = (normalized.ticker || normalized.code).toUpperCase()
    if (!map.has(key)) {
      map.set(key, normalized)
    }
  })
  return Array.from(map.values())
}

export async function searchStocks(keyword) {
  if (!keyword || !keyword.trim()) return []
  const data = await fetchJson('/stocks/search', {
    query: { q: keyword.trim() }
  })
  const results = Array.isArray(data?.results) ? data.results : []
  return results.map(normalizeStock).filter(Boolean)
}

export async function lookupStock(keyword) {
  if (!keyword || !keyword.trim()) return null
  let data = null
  try {
    data = await fetchJson('/stocks/lookup', {
      query: { q: keyword.trim() },
      expectOk: false
    })
  } catch (err) {
    if (err?.status === 404) {
      return null
    }
    throw err
  }
  if (data?.ok !== true || !data?.result) return null
  return normalizeStock(data.result)
}

export async function getRealtimeStockPrice(code) {
  const normalized = extractStockCode(code)
  if (!normalized) {
    throw new Error('종목 코드를 확인해주세요.')
  }
  const data = await fetchJson(`/stock/${normalized}`, { expectOk: false })
  return data
}

export async function getMultipleRealtimeStockPrices(stockMap = {}) {
  const entries = Object.entries(stockMap)
  const results = {}

  await Promise.all(
    entries.map(async ([name, code]) => {
      try {
        const quote = await getRealtimeStockPrice(code)
        results[name] = {
          currentPrice: quote?.last_price ?? null,
          changeRate: quote?.pct_change ?? null,
          volume: quote?.volume ?? null,
          provider: quote?.provider ?? null
        }
      } catch (err) {
        console.error('[stockAPI] failed to load realtime price', name, err)
        results[name] = null
      }
    })
  )

  return results
}

export async function getStockMood(code) {
  const normalized = extractStockCode(code)
  if (!normalized) throw new Error('유효한 종목코드가 필요합니다.')
  const data = await fetchJson('/diag-mood', {
    query: { ticker: normalized },
    expectOk: false
  })
  return data
}

export async function getMacroWeather() {
  const data = await fetchJson('/diag-weather', { expectOk: false })
  return data
}

export const STOCK_CODE_MAP = {
  삼성전자: '005930',
  에코프로: '086520',
  삼성SDI: '006400',
  현대차: '005380',
  'LG에너지솔루션': '373220',
  기아: '000270',
  'SK하이닉스': '000660'
}

export function startAutoUpdate(callback, intervalMinutes = 5) {
  if (typeof callback !== 'function') {
    throw new Error('callback 함수가 필요합니다.')
  }
  callback()
  const interval = setInterval(callback, intervalMinutes * 60 * 1000)
  return interval
}

export function stopAutoUpdate(intervalId) {
  clearInterval(intervalId)
}

export function formatNumber(value) {
  if (value === null || value === undefined) return 'N/A'
  const num = Number(value)
  if (Number.isNaN(num)) return 'N/A'
  return new Intl.NumberFormat('ko-KR').format(num)
}

export function formatPlain(value) {
  if (value === null || value === undefined) return 'N/A'
  const num = Number(value)
  if (Number.isNaN(num)) return 'N/A'
  const fixed = Math.abs(num) >= 1 ? num.toFixed(2) : num.toFixed(4)
  return Number.parseFloat(fixed).toString()
}

export function formatPercent(value) {
  if (value === null || value === undefined) return 'N/A'
  const num = Number(value)
  if (Number.isNaN(num)) return 'N/A'
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`
}

export function formatPercentAbs(value) {
  if (value === null || value === undefined) return 'N/A'
  const num = Number(value)
  if (Number.isNaN(num)) return 'N/A'
  return `${num.toFixed(2)}%`
}

