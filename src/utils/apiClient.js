const DEFAULT_BASE_URL = '/api'

function getGatewayBaseUrl() {
  const url = import.meta.env.VITE_GATEWAY_BASE_URL
  if (typeof url === 'string' && url.trim().length > 0) {
    return url.replace(/\/+$/, '')
  }
  return DEFAULT_BASE_URL
}

function resolveBaseUrl() {
  const raw = getGatewayBaseUrl()
  const isAbsolute = /^https?:\/\//i.test(raw)
  if (isAbsolute) return raw

  if (raw.startsWith('/')) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${raw}`
    }
    const fallbackOrigin = process.env.VITE_DEV_SERVER_ORIGIN || 'http://localhost:5173'
    return `${fallbackOrigin}${raw}`
  }

  // treat as relative host, default to https
  return `https://${raw}`
}

const BASE_URL = resolveBaseUrl()

export function buildGatewayUrl(path, query) {
  const trimmedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${BASE_URL}${trimmedPath}`)
  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      url.searchParams.append(key, String(value))
    })
  }
  return url.toString()
}

export async function fetchJson(path, { query, options = {}, expectOk = true } = {}) {
  const url = buildGatewayUrl(path, query)
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  })

  let data = null
  try {
    data = await response.json()
  } catch (err) {
    // ignore JSON parse errors for non-JSON responses
  }

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.payload = data
    throw error
  }

  if (expectOk && data && data.ok === false) {
    const error = new Error(data.message || 'Gateway call failed')
    error.payload = data
    throw error
  }

  return data
}

export { BASE_URL as gatewayBaseUrl }

