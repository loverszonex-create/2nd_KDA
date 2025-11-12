// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// 종목명을 티커로 변환하는 매핑
const STOCK_NAME_TO_TICKER = {
  '삼성전자': '005930.KS',
  'SK하이닉스': '000660.KS',
  '삼성SDI': '006400.KS'
}

// Mock AI responses - 백엔드 연결 실패 시 폴백용
const mockResponses = {
  '삼성전자': {
    'AI 버블론은 뭐였는데?': {
      content: [
        '좋은 질문입니다!',
        'AI 버블론은 최근 생성형 AI 관련 기업들의 주가가 과도하게 상승했다는 우려에서 시작된 논란입니다.',
        '특히 엔비디아를 비롯한 AI 반도체 기업들의 밸류에이션이 너무 높다는 지적이 나오면서, 2000년대 닷컴 버블과 유사하다는 의견이 제기되었습니다.',
        '이로 인해 기술주 전반에 조정이 발생했고, 삼성전자와 같은 반도체 기업들도 동반 하락했습니다.'
      ],
      suggestions: [
        '삼성전자는 언제 다시 오를까?',
        '지금이 매수 타이밍일까?'
      ]
    },
    '키움증권 의견을 알려 줘': {
      content: [
        '키움증권의 최근 리포트를 확인해드리겠습니다.',
        '키움증권은 삼성전자에 대해 "목표주가 110,000원, 투자의견 BUY"를 제시했습니다.',
        '단기적 조정은 있겠지만, HBM3E 양산과 파운드리 사업 개선으로 2025년 실적 개선이 기대된다고 분석했습니다.',
        '특히 AI 서버용 메모리 수요 증가가 긍정적인 요인으로 작용할 것으로 전망하고 있습니다.'
      ],
      suggestions: [
        'HBM3E가 뭐야?',
        '다른 증권사 의견도 알려줘'
      ]
    },
    '삼성전자는 언제 다시 오를까?': {
      content: [
        '정확한 시점을 예측하기는 어렵지만, 몇 가지 긍정적인 신호가 있습니다.',
        '첫째, 저가 매수세가 유입되고 있습니다. 둘째, HBM 사업이 본격화되면서 실적 개선이 예상됩니다.',
        '기술적으로는 95,000원~97,000원 구간이 강한 지지선으로 작용하고 있어, 이 구간을 지키면 반등 가능성이 높습니다.',
        '중장기적으로는 AI 반도체 수요 증가와 함께 상승 추세를 회복할 것으로 예상됩니다.'
      ],
      suggestions: [
        '분할 매수 전략을 추천해줘',
        '목표가를 어디로 잡을까?'
      ]
    },
    '지금이 매수 타이밍일까?': {
      content: [
        '현재 가격대는 상대적으로 저평가 구간입니다.',
        '다만, 시장 변동성이 큰 상황이므로 분할 매수 전략을 권장드립니다.',
        '예를 들어, 현재 가격에서 30% 매수하고, 추가 하락 시 95,000원과 92,000원 구간에서 각각 35%씩 매수하는 방법을 고려해보세요.',
        '장기 투자 관점이라면 현재는 충분히 좋은 진입 구간입니다.'
      ],
      suggestions: [
        '손절가는 어디로 설정할까?',
        '얼마나 보유해야 할까?'
      ]
    },
    'HBM3E가 뭐야?': {
      content: [
        'HBM3E는 5세대 고대역폭 메모리입니다.',
        '이전 세대 HBM3 대비 대역폭이 50% 이상 향상되었으며, AI 학습 속도를 크게 개선할 수 있습니다.',
        '삼성전자는 SK하이닉스보다 HBM3E 양산이 다소 늦었지만, 최근 엔비디아 테스트를 통과하며 공급을 시작했습니다.',
        '이것이 삼성전자 주가에 긍정적인 모멘텀으로 작용할 것으로 기대됩니다.'
      ],
      suggestions: [
        '엔비디아와 관계는?',
        'SK하이닉스와 경쟁은?'
      ]
    },
    '다른 증권사 의견도 알려줘': {
      content: [
        '여러 증권사의 의견을 종합해드리겠습니다.',
        '미래에셋증권은 목표주가 105,000원(BUY), NH투자증권은 108,000원(BUY), 삼성증권은 112,000원(Strong BUY)을 제시했습니다.',
        '대부분의 증권사가 단기 조정 후 반등을 예상하고 있으며, HBM 사업 정상화와 파운드리 개선을 주요 근거로 들고 있습니다.',
        '평균 목표주가는 약 108,000원 수준입니다.'
      ],
      suggestions: [
        '파운드리 사업 전망은?',
        '배당금은 얼마나 받을 수 있어?'
      ]
    },
    '분할 매수 전략을 추천해줘': {
      content: [
        '분할 매수는 리스크를 줄이는 좋은 전략입니다.',
        '예시 전략: 1차 매수 - 현재가 30%, 2차 매수 - 95,000원 35%, 3차 매수 - 92,000원 35%',
        '이렇게 하면 평균 단가를 낮추면서도 큰 폭의 추가 하락에 대비할 수 있습니다.',
        '단, 전체 투자 금액은 본인의 위험 감수 능력을 고려해 설정하세요.'
      ],
      suggestions: [
        '손절가는 어디로 설정할까?',
        '목표 수익률은 얼마로 잡을까?'
      ]
    },
    '목표가를 어디로 잡을까?': {
      content: [
        '투자 기간에 따라 목표가를 다르게 설정하는 것이 좋습니다.',
        '단기(1-3개월): 105,000원~108,000원, 중기(6개월): 110,000원~115,000원, 장기(1년 이상): 120,000원 이상',
        '현재 밸류에이션과 업황 회복 시나리오를 고려하면 중기적으로 110,000원은 충분히 도달 가능한 목표입니다.',
        '다만, 목표가 도달 시 일부 매도 후 나머지는 재투자하는 전략도 고려해보세요.'
      ],
      suggestions: [
        '실적 발표는 언제야?',
        '배당락일은 언제야?'
      ]
    },
    '손절가는 어디로 설정할까?': {
      content: [
        '손절가 설정은 투자 성공의 핵심입니다.',
        '기술적 분석상 90,000원이 중요한 지지선입니다. 이 라인이 무너지면 추가 하락 가능성이 높습니다.',
        '보수적인 투자자라면 매수가 대비 -7~8% 수준인 92,000원~93,000원에 손절가를 설정하는 것을 권장합니다.',
        '감정적인 판단을 배제하고, 손절가 도달 시 반드시 실행하는 것이 중요합니다.'
      ],
      suggestions: [
        '손절하면 세금은?',
        '지금 다른 종목 추천해줘'
      ]
    },
    '최근 뉴스 요약해줘': {
      content: [
        '삼성전자 관련 최근 주요 뉴스를 정리해드립니다.',
        '1) HBM3E 엔비디아 품질 테스트 통과로 공급 시작 2) 3분기 반도체 부문 적자 축소 3) 미국 정부의 대중 반도체 수출 규제 강화',
        '긍정적 요소와 부정적 요소가 혼재되어 있지만, HBM 공급 개시는 장기적으로 매우 긍정적인 신호입니다.',
        '향후 4분기 실적 발표가 중요한 변곡점이 될 것으로 보입니다.'
      ],
      suggestions: [
        '미중 갈등 영향은?',
        '실적 발표 일정은?'
      ]
    },
    '경쟁사와 비교해줘': {
      content: [
        '주요 경쟁사는 SK하이닉스, 마이크론, TSMC입니다.',
        'HBM 시장에서는 SK하이닉스가 선두(50%), 삼성(30%), 마이크론(20%) 순입니다.',
        '파운드리는 TSMC가 압도적(60% 점유율)이지만, 삼성은 최신 공정 개발로 격차를 좁히고 있습니다.',
        '밸류에이션은 삼성이 상대적으로 저평가되어 있어, 실적 개선 시 리레이팅 가능성이 있습니다.'
      ],
      suggestions: [
        'TSMC와 기술 차이는?',
        'SK하이닉스를 살까?'
      ]
    },
    '배당금은 얼마나 받을 수 있어?': {
      content: [
        '삼성전자는 연간 배당을 지급합니다.',
        '최근 배당 성향은 주당 약 1,444원(2023년 기준)이며, 현재 주가 기준 배당수익률은 약 1.4% 수준입니다.',
        '배당락일은 보통 12월 말이며, 배당금은 다음 해 4월경 지급됩니다.',
        '장기 투자자에게는 배당도 추가 수익이 될 수 있지만, 배당 수익률 자체는 높지 않은 편입니다.'
      ],
      suggestions: [
        '배당주로는 어때?',
        '배당 재투자 전략은?'
      ]
    },
    'default': {
      content: [
        '네, 알겠습니다.',
        '삼성전자는 현재 반도체 업황 회복 기대감 속에서 변동성이 큰 흐름을 보이고 있습니다.',
        '추가로 궁금하신 점이 있다면 구체적으로 질문해주세요. 주가 전망, 재무 분석, 경쟁사 비교 등 다양한 정보를 제공해드릴 수 있습니다.'
      ],
      suggestions: [
        '최근 뉴스 요약해줘',
        '경쟁사와 비교해줘'
      ]
    }
  },
  'SK하이닉스': {
    'default': {
      content: [
        'SK하이닉스에 대해 알려드리겠습니다.',
        'SK하이닉스는 HBM 시장에서 독보적인 위치를 차지하고 있으며, AI 반도체 수요 증가의 최대 수혜주로 평가받고 있습니다.',
        '엔비디아 H100, H200 GPU에 탑재되는 HBM3, HBM3E의 주요 공급사로서 높은 수익성을 기록하고 있습니다.',
        '다만 밸류에이션이 높은 편이므로, 단기 조정 가능성도 염두에 두시기 바랍니다.'
      ],
      suggestions: [
        'HBM이 뭐야?',
        '삼성전자와 비교해줘'
      ]
    },
    'HBM이 뭐야?': {
      content: [
        'HBM은 High Bandwidth Memory의 약자입니다.',
        '기존 메모리보다 데이터 전송 속도가 월등히 빠른 차세대 메모리로, AI 학습과 추론에 필수적인 기술입니다.',
        'GPU와 수직으로 쌓아 올리는 3D 구조로 설계되어 공간 효율성과 성능을 동시에 확보했습니다.',
        'SK하이닉스는 HBM3E 양산에서 앞서가고 있으며, 이것이 주가 상승의 주요 동력이 되고 있습니다.'
      ],
      suggestions: [
        '앞으로 전망은?',
        '목표주가는 얼마야?'
      ]
    }
  },
  '삼성SDI': {
    'default': {
      content: [
        '삼성SDI는 전기차 배터리와 ESS(에너지저장장치) 분야의 글로벌 리더입니다.',
        '최근 전기차 수요 둔화로 단기 실적에 부담이 있지만, 중장기적으로는 전기차 시장 성장과 함께 회복될 것으로 예상됩니다.',
        '특히 차세대 전고체 배터리 개발에 적극 투자하고 있어, 기술적 우위를 확보하고 있습니다.'
      ],
      suggestions: [
        '전기차 시장 전망은?',
        '배터리 업종 분석해줘'
      ]
    }
  }
}

// 시뮬레이션을 위한 지연 함수
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * AI 응답을 가져오는 함수 - 실제 백엔드 API와 연동
 * @param {string} userMessage - 사용자 메시지
 * @param {string} stockName - 종목명
 * @param {string} userNickname - 사용자 닉네임 (선택적)
 * @param {Function} onDelta - 스트리밍 중 델타 텍스트를 받을 콜백 (선택적)
 * @returns {Promise<{content: string[], suggestions: string[], metadata: object}>}
 */
export async function getAIResponse(userMessage, stockName, userNickname = '회원', onDelta = null) {
  try {
    // 종목명을 티커로 변환
    const ticker = STOCK_NAME_TO_TICKER[stockName] || '005930.KS'
    
    // API URL 구성
    const url = `${API_BASE_URL}/chat?q=${encodeURIComponent(userMessage)}&ticker=${encodeURIComponent(ticker)}&stream=true`
    
    // SSE (Server-Sent Events) 스트리밍 연결
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    
    let fullText = ''
    let metadata = {}
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break
      
      // 청크 디코딩
      buffer += decoder.decode(value, { stream: true })
      
      // SSE 형식 파싱 (data: {...}\n\n)
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || '' // 마지막 불완전한 줄은 버퍼에 보관
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6) // 'data: ' 제거
            const data = JSON.parse(jsonStr)
            
            if (data.delta) {
              fullText += data.delta
              // 스트리밍 콜백 호출
              if (onDelta) {
                onDelta(data.delta)
              }
            }
            
            if (data.done) {
              // 최종 데이터 수신
              fullText = data.full || fullText
              metadata = {
                asOf: data.asOf,
                mood: data.mood,
                news: data.news,
                macro: data.macro,
                visuals: data.visuals
              }
            }
          } catch (e) {
            console.error('SSE 파싱 오류:', e)
          }
        }
      }
    }

    // 제안 질문 추출 (LLM이 생성한 제안)
    let suggestions = []
    let cleanText = fullText
    
    // [SUGGEST]질문1|질문2[/SUGGEST] 형식 파싱
    const suggestMatch = fullText.match(/\[SUGGEST\](.*?)\[\/SUGGEST\]/s)
    if (suggestMatch) {
      const suggestText = suggestMatch[1].trim()
      suggestions = suggestText
        .split('|')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .slice(0, 2) // 최대 2개로 제한
      // 제안 부분 제거
      cleanText = fullText.replace(/\[SUGGEST\].*?\[\/SUGGEST\]/s, '').trim()
    }
    
    // 제안이 없으면 기본 제안 사용
    if (suggestions.length === 0) {
      suggestions = extractSuggestions(cleanText, stockName)
    }

    // 텍스트를 단락으로 분리
    const paragraphs = cleanText
      .split('\n\n')
      .map(p => p.trim())
      .filter(p => p.length > 0)

    return {
      content: paragraphs,
      suggestions: suggestions,
      metadata: metadata
    }

  } catch (error) {
    console.error('백엔드 API 연동 실패, Mock 응답 사용:', error)
    
    // 폴백: Mock 응답 사용
    return getMockResponse(userMessage, stockName, userNickname)
  }
}

/**
 * Mock 응답 가져오기 (백엔드 연결 실패 시 폴백)
 */
function getMockResponse(userMessage, stockName, userNickname) {
  // 종목별 응답 데이터 가져오기
  const stockResponses = mockResponses[stockName] || mockResponses['삼성전자']
  
  // 메시지와 일치하는 응답 찾기
  let response = stockResponses[userMessage]
  
  // 일치하는 응답이 없으면 키워드 기반 매칭 시도
  if (!response) {
    const messageKeywords = userMessage.toLowerCase()
    
    // 키워드 매칭
    if (messageKeywords.includes('버블') || messageKeywords.includes('ai')) {
      response = stockResponses['AI 버블론은 뭐였는데?']
    } else if (messageKeywords.includes('증권') || messageKeywords.includes('의견') || messageKeywords.includes('리포트')) {
      response = stockResponses['키움증권 의견을 알려 줘']
    } else if (messageKeywords.includes('언제') || messageKeywords.includes('상승') || messageKeywords.includes('오를')) {
      response = stockResponses['삼성전자는 언제 다시 오를까?']
    } else if (messageKeywords.includes('매수') || messageKeywords.includes('타이밍') || messageKeywords.includes('사야')) {
      response = stockResponses['지금이 매수 타이밍일까?']
    }
  }
  
  // 그래도 없으면 기본 응답 사용
  if (!response) {
    response = stockResponses['default'] || mockResponses['삼성전자']['default']
  }

  // 응답의 첫 번째 문장에 닉네임 추가
  const responseWithNickname = {
    ...response,
    content: [
      `${userNickname}님, ${response.content[0]}`,
      ...response.content.slice(1)
    ],
    metadata: {}
  }

  return responseWithNickname
}

/**
 * AI 응답에서 제안 질문 추출
 */
function extractSuggestions(text, stockName) {
  // 기본 제안 질문 (추후 개선 가능)
  const defaultSuggestions = [
    '최근 뉴스 알려줘',
    '투자 의견을 알려줘',
    '경쟁사와 비교해줘',
    '배당금은 얼마야?'
  ]
  
  return defaultSuggestions.slice(0, 2)
}

/**
 * 현재 시간을 포맷팅하여 반환
 * @returns {string} 예: "11/07 14:32 기준"
 */
export function getFormattedTimestamp() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  
  return `${month}/${date} ${hours}:${minutes} 기준`
}

/**
 * 실제 LLM API 연동 예시 (추후 구현)
 * 
 * export async function getAIResponseFromLLM(userMessage, stockName, conversationHistory) {
 *   const response = await fetch('https://api.your-llm-service.com/chat', {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *       'Authorization': `Bearer ${process.env.REACT_APP_LLM_API_KEY}`
 *     },
 *     body: JSON.stringify({
 *       model: 'gpt-4',
 *       messages: [
 *         {
 *           role: 'system',
 *           content: `당신은 "${stockName}"에 대한 전문 투자 상담 AI입니다. 
 *                    사용자의 질문에 친절하고 전문적으로 답변해주세요.
 *                    답변은 3-4개의 단락으로 구성하고, 
 *                    후속 질문 2개를 제안해주세요.`
 *         },
 *         ...conversationHistory,
 *         {
 *           role: 'user',
 *           content: userMessage
 *         }
 *       ],
 *       temperature: 0.7,
 *       max_tokens: 500
 *     })
 *   })
 * 
 *   const data = await response.json()
 *   
 *   // 응답 파싱 및 포맷팅
 *   return {
 *     content: parseContentIntoParagraphs(data.choices[0].message.content),
 *     suggestions: extractSuggestions(data.choices[0].message.content)
 *   }
 * }
 */
