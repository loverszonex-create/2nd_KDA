// 채팅 히스토리 캐시 관리 유틸리티
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트 초기화 (선택적)
let supabase = null
try {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey)
    console.log('[Cache] ✅ Supabase 클라이언트 초기화 완료')
  } else {
    console.warn('[Cache] ⚠️ Supabase 환경변수 없음, localStorage만 사용')
  }
} catch (error) {
  console.warn('[Cache] ⚠️ Supabase 초기화 실패, localStorage만 사용:', error)
}

// 세션 ID 생성 또는 로드
function getSessionId() {
  let sessionId = localStorage.getItem('chat_session_id')
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('chat_session_id', sessionId)
    console.log(`[Cache] 🆕 새로운 세션 ID 생성: ${sessionId}`)
  }
  return sessionId
}

// 종목명을 티커로 변환
const STOCK_NAME_TO_TICKER = {
  '삼성전자': '005930.KS',
  'SK하이닉스': '000660.KS',
  '삼성SDI': '006400.KS',
  '현대차': '005380.KS',
  'LG에너지솔루션': '373220.KS',
  '기아': '000270.KS',
  '에코프로': '086520.KQ',
  '금융주 팀톡': 'FINANCE'
}

/**
 * 채팅 히스토리를 localStorage + Supabase에 저장
 * @param {string} stockName - 종목명
 * @param {Array} messages - 메시지 배열
 */
export async function saveChatHistory(stockName, messages) {
  try {
    // 1. localStorage 저장 (빠른 로컬 캐시)
    const key = `chat_history_${stockName}`
    const data = {
      stockName,
      messages,
      timestamp: new Date().toISOString(),
      version: '1.0'
    }
    localStorage.setItem(key, JSON.stringify(data))
    console.log(`[Cache] 💾 localStorage 저장: ${stockName}, ${messages.length}개 메시지`)
    
    // 2. Supabase 저장 (백업, 비동기)
    if (supabase && messages.length > 1) {
      saveToSupabase(stockName, messages).catch(err => {
        console.warn('[Cache] ⚠️ Supabase 저장 실패 (무시됨):', err.message)
      })
    }
  } catch (error) {
    console.error('[Cache] ❌ localStorage 저장 실패:', error)
  }
}

/**
 * Supabase에 채팅 히스토리 저장 (비동기)
 * @param {string} stockName - 종목명
 * @param {Array} messages - 메시지 배열
 */
async function saveToSupabase(stockName, messages) {
  if (!supabase) return
  
  try {
    const sessionId = getSessionId()
    const ticker = STOCK_NAME_TO_TICKER[stockName] || stockName
    
    const { data, error } = await supabase
      .from('chat_history')
      .upsert({
        session_id: sessionId,
        ticker: ticker,
        stock_name: stockName,
        messages: messages,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'session_id,ticker'
      })
    
    if (error) throw error
    console.log(`[Cache] ✅ Supabase 저장 완료: ${stockName}`)
  } catch (error) {
    console.error('[Cache] ❌ Supabase 저장 실패:', error)
    throw error
  }
}

/**
 * 채팅 히스토리를 localStorage + Supabase에서 로드
 * @param {string} stockName - 종목명
 * @returns {Promise<Array|null>} 메시지 배열 또는 null
 */
export async function loadChatHistory(stockName) {
  try {
    // 1. localStorage 먼저 확인 (빠름)
    const key = `chat_history_${stockName}`
    const stored = localStorage.getItem(key)
    
    if (stored) {
      const data = JSON.parse(stored)
      
      // 24시간 이상 지난 캐시는 무효화
      const cachedTime = new Date(data.timestamp).getTime()
      const now = new Date().getTime()
      const hoursPassed = (now - cachedTime) / (1000 * 60 * 60)
      
      if (hoursPassed <= 24) {
        console.log(`[Cache] 📦 localStorage 로드: ${stockName}, ${data.messages.length}개 메시지`)
        return data.messages
      } else {
        console.log(`[Cache] ⏰ localStorage 만료 (${hoursPassed.toFixed(1)}시간)`)
        localStorage.removeItem(key)
      }
    }
    
    // 2. localStorage 없으면 Supabase에서 로드 시도
    if (supabase) {
      console.log(`[Cache] 🔄 Supabase에서 로드 시도: ${stockName}`)
      const messages = await loadFromSupabase(stockName)
      if (messages && messages.length > 0) {
        // Supabase에서 로드한 데이터를 localStorage에도 저장
        const data = {
          stockName,
          messages,
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
        localStorage.setItem(key, JSON.stringify(data))
        console.log(`[Cache] ✅ Supabase에서 복구: ${stockName}, ${messages.length}개 메시지`)
        return messages
      }
    }
    
    console.log(`[Cache] ❌ 캐시 없음: ${stockName}`)
    return null
  } catch (error) {
    console.error('[Cache] ❌ 로드 실패:', error)
    return null
  }
}

/**
 * Supabase에서 채팅 히스토리 로드
 * @param {string} stockName - 종목명
 * @returns {Promise<Array|null>} 메시지 배열 또는 null
 */
async function loadFromSupabase(stockName) {
  if (!supabase) return null
  
  try {
    const sessionId = getSessionId()
    const ticker = STOCK_NAME_TO_TICKER[stockName] || stockName
    
    const { data, error } = await supabase
      .from('chat_history')
      .select('messages, updated_at')
      .eq('session_id', sessionId)
      .eq('ticker', ticker)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // 데이터 없음
        return null
      }
      throw error
    }
    
    // 7일 이상 지난 데이터는 무시
    const updatedTime = new Date(data.updated_at).getTime()
    const now = new Date().getTime()
    const daysPassed = (now - updatedTime) / (1000 * 60 * 60 * 24)
    
    if (daysPassed > 7) {
      console.log(`[Cache] ⏰ Supabase 데이터 만료 (${daysPassed.toFixed(1)}일)`)
      return null
    }
    
    return data.messages || null
  } catch (error) {
    console.error('[Cache] ❌ Supabase 로드 실패:', error)
    return null
  }
}

/**
 * 특정 종목의 채팅 히스토리 삭제
 * @param {string} stockName - 종목명
 */
export function clearChatHistory(stockName) {
  try {
    const key = `chat_history_${stockName}`
    localStorage.removeItem(key)
    console.log(`[Cache] 캐시 삭제: ${stockName}`)
  } catch (error) {
    console.error('[Cache] 삭제 실패:', error)
  }
}

/**
 * 모든 채팅 히스토리 삭제
 */
export function clearAllChatHistory() {
  try {
    const keys = Object.keys(localStorage)
    const chatKeys = keys.filter(key => key.startsWith('chat_history_'))
    
    chatKeys.forEach(key => localStorage.removeItem(key))
    console.log(`[Cache] 전체 캐시 삭제: ${chatKeys.length}개`)
  } catch (error) {
    console.error('[Cache] 전체 삭제 실패:', error)
  }
}

/**
 * 캐시 통계 정보
 * @returns {Object} 캐시 통계
 */
export function getCacheStats() {
  try {
    const keys = Object.keys(localStorage)
    const chatKeys = keys.filter(key => key.startsWith('chat_history_'))
    
    const stats = chatKeys.map(key => {
      const data = JSON.parse(localStorage.getItem(key))
      return {
        stockName: data.stockName,
        messageCount: data.messages.length,
        timestamp: data.timestamp
      }
    })
    
    return {
      totalChats: chatKeys.length,
      chats: stats
    }
  } catch (error) {
    console.error('[Cache] 통계 조회 실패:', error)
    return { totalChats: 0, chats: [] }
  }
}

