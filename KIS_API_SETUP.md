# 한국투자증권 API 연동 가이드

## 1. API 신청

### 한국투자증권 API 발급 방법
1. [한국투자증권 오픈API](https://apiportal.koreainvestment.com) 접속
2. 회원가입 및 로그인
3. "API 신청" 메뉴에서 신청서 작성
4. 승인 후 APP KEY와 APP SECRET 발급

## 2. 환경 변수 설정

`.env` 파일을 프로젝트 루트에 생성하고 다음 내용을 추가:

```env
# 한국투자증권 API
VITE_KIS_APP_KEY=your_app_key_here
VITE_KIS_APP_SECRET=your_app_secret_here
VITE_KIS_BASE_URL=https://openapi.koreainvestment.com:9443

# 실전 투자 계좌 (운영서버)
# VITE_KIS_BASE_URL=https://openapi.koreainvestment.com:9443

# 모의 투자 계좌 (테스트서버)
# VITE_KIS_BASE_URL=https://openapivts.koreainvestment.com:29443
```

## 3. 종목 코드 확인

주요 종목 코드:
- 삼성전자: `005930`
- SK하이닉스: `000660`
- 에코프로: `086520`
- 삼성SDI: `006400`
- 현대차: `005380`
- LG에너지솔루션: `373220`
- 기아: `000270`

## 4. 사용 방법

### 4-1. 단일 종목 시세 조회

```javascript
import { getStockPrice } from './utils/stockAPI'

// 삼성전자 시세 조회
const stockData = await getStockPrice('005930')
console.log(stockData)
// {
//   currentPrice: 72000,
//   changeRate: -0.19,
//   changePrice: -100,
//   high: 73000,
//   low: 71500,
//   volume: 15234567
// }
```

### 4-2. 여러 종목 동시 조회

```javascript
import { getMultipleStockPrices, STOCK_CODE_MAP } from './utils/stockAPI'

const stockCodes = ['005930', '000660', '086520']
const stockData = await getMultipleStockPrices(stockCodes)
console.log(stockData)
// {
//   '005930': { currentPrice: 72000, changeRate: -0.19, ... },
//   '000660': { currentPrice: 165000, changeRate: 2.15, ... },
//   '086520': { currentPrice: 85000, changeRate: -1.66, ... }
// }
```

### 4-3. 5분마다 자동 업데이트

```javascript
import { startAutoUpdate, stopAutoUpdate, getStockPrice } from './utils/stockAPI'

function updateStockPrices() {
  const stockData = await getStockPrice('005930')
  // UI 업데이트 로직
  setStockPrice(stockData)
}

// 5분마다 자동 업데이트 시작
const intervalId = startAutoUpdate(updateStockPrices, 5)

// 컴포넌트 언마운트 시 중지
useEffect(() => {
  return () => stopAutoUpdate(intervalId)
}, [])
```

### 4-4. React 컴포넌트에서 사용 예시

```jsx
import { useState, useEffect } from 'react'
import { getStockPrice, startAutoUpdate, stopAutoUpdate } from './utils/stockAPI'

function StockCard({ stockCode, stockName }) {
  const [stockData, setStockData] = useState(null)

  useEffect(() => {
    async function fetchData() {
      const data = await getStockPrice(stockCode)
      setStockData(data)
    }

    // 5분마다 자동 업데이트
    const intervalId = startAutoUpdate(fetchData, 5)

    return () => stopAutoUpdate(intervalId)
  }, [stockCode])

  if (!stockData) return <div>로딩 중...</div>

  return (
    <div>
      <h3>{stockName}</h3>
      <p>현재가: {stockData.currentPrice.toLocaleString()}원</p>
      <p className={stockData.changeRate > 0 ? 'text-red-500' : 'text-blue-600'}>
        {stockData.changeRate > 0 ? '+' : ''}{stockData.changeRate}%
      </p>
    </div>
  )
}
```

## 5. HomePage.jsx에 적용하기

현재는 Mock 데이터를 사용하고 있습니다. 실제 API를 연결하려면:

```jsx
// HomePage.jsx 수정 예시
import { useEffect, useState } from 'react'
import { getMultipleStockPrices, STOCK_CODE_MAP } from '../utils/stockAPI'

function HomePage() {
  const [stockPrices, setStockPrices] = useState({})

  useEffect(() => {
    async function fetchStockPrices() {
      const codes = Object.values(STOCK_CODE_MAP)
      const prices = await getMultipleStockPrices(codes)
      setStockPrices(prices)
    }

    // 즉시 실행
    fetchStockPrices()

    // 5분마다 업데이트
    const intervalId = setInterval(fetchStockPrices, 5 * 60 * 1000)

    return () => clearInterval(intervalId)
  }, [])

  // homeStocks 배열에 실제 등락률 반영
  const homeStocks = [
    {
      name: '삼성전자',
      changeRate: stockPrices['005930']?.changeRate 
        ? `${stockPrices['005930'].changeRate > 0 ? '+' : ''}${stockPrices['005930'].changeRate.toFixed(2)}%`
        : '-0.19%', // 기본값 (API 응답 전)
      // ... 나머지 속성
    },
    // ... 다른 종목들
  ]
}
```

## 6. 주의사항

### API 호출 제한
- 한국투자증권 API는 호출 횟수 제한이 있습니다
- 5분 간격 업데이트 권장 (너무 빈번한 호출 지양)
- 장 마감 후(15:30~09:00)는 업데이트 중지 권장

### 에러 처리
```javascript
const stockData = await getStockPrice('005930')
if (!stockData) {
  // API 오류 시 기본값 사용
  console.error('API 호출 실패, Mock 데이터 사용')
  const mockData = getMockStockPrice('삼성전자')
}
```

### 장 운영 시간 체크
```javascript
function isTradingHours() {
  const now = new Date()
  const hours = now.getHours()
  const day = now.getDay()
  
  // 주말 제외
  if (day === 0 || day === 6) return false
  
  // 평일 9시~15:30
  if (hours >= 9 && hours < 15) return true
  if (hours === 15 && now.getMinutes() < 30) return true
  
  return false
}

// 장 시간에만 업데이트
if (isTradingHours()) {
  await updateStockPrices()
}
```

## 7. KRX(한국거래소) API 대안

한국투자증권 API 외에도 다음 API 사용 가능:
- KRX 정보데이터시스템: http://data.krx.co.kr
- 금융위원회 금융데이터개방시스템: https://finlife.fss.or.kr
- 네이버 금융 크롤링 (비공식)
- 다음 금융 크롤링 (비공식)

## 8. 문제 해결

### CORS 에러 발생 시
프록시 서버 설정 필요:

```javascript
// vite.config.js
export default {
  server: {
    proxy: {
      '/api': {
        target: 'https://openapi.koreainvestment.com:9443',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
}
```

### 인증 토큰 만료
토큰은 24시간 유효. 매일 새로 발급 필요:

```javascript
let cachedToken = null
let tokenExpiry = null

export async function getAccessToken() {
  const now = Date.now()
  
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken
  }
  
  // 새 토큰 발급
  const token = await fetchNewToken()
  cachedToken = token
  tokenExpiry = now + 24 * 60 * 60 * 1000 // 24시간
  
  return token
}
```

## 9. 개발 로드맵

1. **Phase 1** (현재): Mock 데이터 사용
2. **Phase 2**: 한국투자증권 API 연동
3. **Phase 3**: 5분 자동 업데이트 구현
4. **Phase 4**: 에러 처리 및 폴백 시스템
5. **Phase 5**: 캐싱 및 성능 최적화

