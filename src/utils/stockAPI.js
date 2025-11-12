// 한국투자증권 API 연동 유틸리티

/**
 * 한국투자증권 API 설정
 * .env 파일에 다음 환경변수 추가 필요:
 * VITE_KIS_APP_KEY=your_app_key
 * VITE_KIS_APP_SECRET=your_app_secret
 * VITE_KIS_BASE_URL=https://openapi.koreainvestment.com:9443
 */

const KIS_CONFIG = {
  appKey: import.meta.env.VITE_KIS_APP_KEY || '',
  appSecret: import.meta.env.VITE_KIS_APP_SECRET || '',
  baseUrl: import.meta.env.VITE_KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443',
}

/**
 * 액세스 토큰 발급
 */
export async function getAccessToken() {
  try {
    const response = await fetch(`${KIS_CONFIG.baseUrl}/oauth2/tokenP`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: KIS_CONFIG.appKey,
        appsecret: KIS_CONFIG.appSecret,
      }),
    })

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error('Access Token Error:', error)
    return null
  }
}

/**
 * 실시간 주식 시세 조회 (5분 간격 업데이트용)
 * @param {string} stockCode - 종목코드 (예: 005930 = 삼성전자)
 * @returns {Object} { currentPrice, changeRate, changePrice }
 */
export async function getStockPrice(stockCode) {
  try {
    const token = await getAccessToken()
    if (!token) {
      throw new Error('Failed to get access token')
    }

    const response = await fetch(
      `${KIS_CONFIG.baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
          appkey: KIS_CONFIG.appKey,
          appsecret: KIS_CONFIG.appSecret,
          tr_id: 'FHKST01010100', // 국내주식 현재가 시세
        },
        params: {
          FID_COND_MRKT_DIV_CODE: 'J', // 주식
          FID_INPUT_ISCD: stockCode,
        },
      }
    )

    const data = await response.json()

    if (data.rt_cd === '0') {
      const output = data.output
      return {
        currentPrice: parseInt(output.stck_prpr), // 현재가
        changeRate: parseFloat(output.prdy_ctrt), // 전일대비율
        changePrice: parseInt(output.prdy_vrss), // 전일대비
        high: parseInt(output.stck_hgpr), // 최고가
        low: parseInt(output.stck_lwpr), // 최저가
        volume: parseInt(output.acml_vol), // 거래량
      }
    }

    throw new Error('Stock price fetch failed')
  } catch (error) {
    console.error('Stock Price Error:', error)
    return null
  }
}

/**
 * 여러 종목의 시세를 한번에 조회
 * @param {Array} stockCodes - 종목코드 배열
 */
export async function getMultipleStockPrices(stockCodes) {
  const promises = stockCodes.map((code) => getStockPrice(code))
  const results = await Promise.all(promises)

  return stockCodes.reduce((acc, code, index) => {
    acc[code] = results[index]
    return acc
  }, {})
}

/**
 * 백엔드 API를 통한 실시간 주가 조회
 * @param {string} stockCode - 종목 코드 (예: '005930')
 */
export async function getRealtimeStockPrice(stockCode) {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
    const response = await fetch(`${API_BASE_URL}/stock/${stockCode}`)
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('실시간 주가 조회 실패:', error)
    return null
  }
}

/**
 * 여러 종목의 실시간 주가를 한번에 조회
 * @param {Object} stockMap - { 종목명: 종목코드 } 형식
 */
export async function getMultipleRealtimeStockPrices(stockMap) {
  const results = {}
  
  for (const [name, code] of Object.entries(stockMap)) {
    const data = await getRealtimeStockPrice(code)
    if (data) {
      results[name] = {
        currentPrice: data.last_price,
        changeRate: data.pct_change,
        volume: data.volume,
        provider: data.provider
      }
    } else {
      // 실패 시 Mock 데이터 사용
      results[name] = getMockStockPrice(name)
    }
  }
  
  return results
}

/**
 * Mock 데이터 (개발/테스트용 및 백엔드 연결 실패 시 폴백)
 */
export function getMockStockPrice(stockName) {
  const mockData = {
    삼성전자: { changeRate: -0.19, currentPrice: 72000 },
    에코프로: { changeRate: -1.66, currentPrice: 85000 },
    삼성SDI: { changeRate: -1.66, currentPrice: 340000 },
    현대차: { changeRate: -1.66, currentPrice: 215000 },
    'LG에너지솔루션': { changeRate: -1.66, currentPrice: 425000 },
    기아: { changeRate: -1.66, currentPrice: 95000 },
    'SK하이닉스': { changeRate: +2.15, currentPrice: 165000 },
    '금융주 팀톡': { changeRate: +0.85, currentPrice: 0 },
  }

  return mockData[stockName] || { changeRate: 0, currentPrice: 0 }
}

/**
 * 종목코드 매핑 (종목명 -> 코드)
 */
export const STOCK_CODE_MAP = {
  삼성전자: '005930',
  에코프로: '086520',
  삼성SDI: '006400',
  현대차: '005380',
  'LG에너지솔루션': '373220',
  기아: '000270',
  'SK하이닉스': '000660',
}

/**
 * 5분마다 자동 업데이트 설정
 * @param {Function} callback - 업데이트 시 실행할 함수
 * @returns {number} interval ID
 */
export function startAutoUpdate(callback, intervalMinutes = 5) {
  // 즉시 한 번 실행
  callback()

  // 5분마다 실행
  return setInterval(callback, intervalMinutes * 60 * 1000)
}

/**
 * 자동 업데이트 중지
 * @param {number} intervalId
 */
export function stopAutoUpdate(intervalId) {
  clearInterval(intervalId)
}

