// 간단한 OpenAI 챗봇 API (튜닝 없이)

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/**
 * 간단한 OpenAI 챗봇 응답
 * @param {string} userMessage - 사용자 질문
 * @param {Function} onDelta - 스트리밍 콜백
 * @returns {Promise<{content: string, suggestions: string[]}>}
 */
export async function getSimpleChatResponse(userMessage, onDelta = null) {
  try {
    console.log('[SimpleChat] 질문:', userMessage)
    
    const response = await fetch(`${API_BASE_URL}/simple-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: userMessage,
        stream: true
      })
    })
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    
    let fullText = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6)
            const data = JSON.parse(jsonStr)
            
            if (data.delta) {
              fullText += data.delta
              if (onDelta) {
                onDelta(data.delta)
              }
            }
            
            if (data.done) {
              fullText = data.full || fullText
            }
          } catch (e) {
            console.error('[SimpleChat] 파싱 오류:', e)
          }
        }
      }
    }

    console.log('[SimpleChat] ✅ 응답 완료:', fullText.substring(0, 100) + '...')

    return {
      content: fullText.trim(),
      suggestions: []
    }

  } catch (error) {
    console.error('[SimpleChat] ❌ API 오류:', error)
    throw error
  }
}

