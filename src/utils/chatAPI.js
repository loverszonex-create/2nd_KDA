import { buildGatewayUrl, fetchJson } from './apiClient'
import { formatNumber, formatPercent, formatPlain } from './stockAPI'

const FALLBACK_SUGGESTIONS = [
  '최근 주가는 어때?',
  '투자자들이 주목하는 이슈는?',
  'KOSPI랑 비교해줘',
  '최근 뉴스 요약해줘'
]

function splitTextIntoParagraphs(text) {
  if (!text) return []
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function buildSuggestions(data) {
  const suggestions = new Set()
  if (data?.news?.highlights?.length) {
    suggestions.add('최근 뉴스 요약해줘')
  }
  if (data?.visuals?.snapshot?.benchmark) {
    suggestions.add('KOSPI랑 비교해줘')
  }
  if (data?.visuals?.history?.length) {
    suggestions.add('최근 추세를 요약해줘')
  }
  FALLBACK_SUGGESTIONS.forEach((item) => suggestions.add(item))
  return Array.from(suggestions).slice(0, 4)
}

export function formatAsOf(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getFormattedTimestamp() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${month}/${date} ${hours}:${minutes} 기준`
}

export async function sendChatMessage({ ticker, name, question, stream = false }) {
  if (!ticker) {
    throw new Error('ticker is required')
  }

  const params = new URLSearchParams({
    q: question || '',
    ticker,
    stream: stream ? 'true' : 'false'
  })
  if (name) params.append('name', name)

  if (stream) {
    const url = buildGatewayUrl('/chat')
    const response = await fetch(`${url}?${params.toString()}`, {
      headers: { Accept: 'text/event-stream' }
    })
    if (!response.ok || !response.body) {
      throw new Error(`스트리밍 요청에 실패했습니다. (HTTP ${response.status})`)
    }
    return response
  }

  const data = await fetchJson('/chat', {
    query: Object.fromEntries(params),
    expectOk: false
  })

  const paragraphs = splitTextIntoParagraphs(data?.text || '')
  const suggestions = buildSuggestions(data)

  return {
    raw: data,
    paragraphs,
    suggestions,
    mood: data?.mood || null,
    asOf: data?.asOf || null,
    macro: data?.macro || null,
    visuals: data?.visuals || null,
    stock: data?.stock || null,
    news: data?.news || null
  }
}

export function describeSnapshot(snapshot, stockName = '해당 종목') {
  if (!snapshot?.price) return null
  const { price, benchmark } = snapshot
  const parts = []
  if (price?.last !== undefined) {
    parts.push(
      `${stockName} 주가는 ${formatNumber(price.last)}원 (${formatPercent(price.change)})`
    )
  }
  if (benchmark?.last !== undefined) {
    parts.push(`KOSPI ${formatPlain(benchmark.last)} (${formatPercent(benchmark.change)})`)
  }
  return parts.join(' · ')
}
