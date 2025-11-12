import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, MoreVertical, Info, Send, Signal, Wifi, Battery, BatteryCharging, Navigation, Bookmark, X } from 'lucide-react'
import { getAIResponse, getFormattedTimestamp } from '../utils/chatAPI'
import { incrementChatCount, isLevelUp, calculateProgress } from '../utils/levelSystem'
import { addBookmark, removeBookmark, isBookmarked, findBookmarkByMessageId } from '../utils/bookmarkUtils'
import { saveChatHistory, loadChatHistory, clearChatHistory } from '../utils/chatCache'
import StockLogo from '../components/StockLogo'

// mood에서 이모지만 추출하는 함수
const getMoodEmoji = (mood) => {
  if (!mood) return '😐'
  const moodMap = {
    '😄 매우 기쁨': '😄',
    '🙂 기쁨': '🙂',
    '😐 보통': '😐',
    '☹️ 슬픔': '☹️',
    '😭 매우 슬픔': '😭'
  }
  return moodMap[mood] || mood.split(' ')[0] || '😐'
}

function ChatPage() {
  const { stockName } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [message, setMessage] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isCharging, setIsCharging] = useState(false)
  const [userNickname, setUserNickname] = useState('회원')
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'date',
      content: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    },
    {
      id: 2,
      type: 'notice',
      content: '키우Me 서비스 이용 유의사항',
      subtext: '키우Me의 답변은 생성형 AI를 활용한 답변으로 사실과 다를 수 있어요.'
    },
    {
      id: 3,
      type: 'bot',
      sender: `${stockName} 키우Me`,
      content: [
        `안녕하세요! ${stockName}에 대해 궁금하신 점이 있으신가요?`,
        '무엇이든 물어보세요. 주가 정보, 최근 뉴스, 투자 전략 등 다양한 정보를 제공해드립니다.'
      ],
      timestamp: new Date().toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' 기준'
    },
    {
      id: 4,
      type: 'suggestions',
      suggestions: [
        '최근 주가는 어때?',
        '투자 의견을 알려줘'
      ]
    }
  ])
  const messagesEndRef = useRef(null)
  const [bookmarkedMessages, setBookmarkedMessages] = useState(new Set())
  const [currentMood, setCurrentMood] = useState('😐 보통')
  
  // 종목명 -> 티커 매핑
  const STOCK_NAME_TO_TICKER = {
    '삼성전자': '005930.KS',
    'SK하이닉스': '000660.KS',
    '삼성SDI': '006400.KS',
    '현대차': '005380.KS',
    'LG에너지솔루션': '373220.KS',
    '기아': '000270.KS',
    '에코프로': '086520.KS'
  }
  
  // 초기 mood 로드
  useEffect(() => {
    const loadMood = async () => {
      try {
        const ticker = STOCK_NAME_TO_TICKER[stockName] || '005930.KS'
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
        const response = await fetch(`${API_BASE_URL}/mood/${ticker}`)
        
        if (response.ok) {
          const data = await response.json()
          if (data.ok && data.mood) {
            setCurrentMood(data.mood)
          }
        }
      } catch (error) {
        console.error('Mood 로드 실패:', error)
      }
    }
    
    loadMood()
    
    // 5분마다 mood 업데이트
    const moodTimer = setInterval(loadMood, 5 * 60 * 1000)
    
    return () => clearInterval(moodTimer)
  }, [stockName])
  
  // 닉네임 로드
  useEffect(() => {
    const storedNickname = localStorage.getItem('userNickname')
    if (storedNickname) {
      setUserNickname(storedNickname)
    }
  }, [])

  // 캐시 로드 상태 추가
  const [cacheLoaded, setCacheLoaded] = useState(false)

  // 채팅 히스토리 로드 (초기화) - 최우선 실행
  useEffect(() => {
    let isMounted = true
    
    async function loadCache() {
      console.log(`[ChatPage] 🔄 캐시 로드 시작: ${stockName}`)
      try {
        const cachedMessages = await loadChatHistory(stockName)
        
        if (!isMounted) return // 컴포넌트가 언마운트되었으면 중단
        
        if (cachedMessages && cachedMessages.length > 0) {
          console.log(`[ChatPage] ✅ 캐시에서 ${cachedMessages.length}개 메시지 로드`)
          setMessages(cachedMessages)
        } else {
          console.log(`[ChatPage] ⚠️ 캐시 없음, 기본 메시지 사용`)
        }
      } catch (error) {
        console.error(`[ChatPage] ❌ 캐시 로드 실패:`, error)
      } finally {
        if (isMounted) {
          // 캐시 로드 완료 표시 (성공/실패 무관)
          setCacheLoaded(true)
        }
      }
    }
    
    loadCache()
    
    return () => {
      isMounted = false
    }
  }, [stockName])

  // 채팅 히스토리 자동 저장 (메시지 변경 시)
  useEffect(() => {
    // 캐시가 로드된 후에만 저장 (무한 루프 방지)
    if (cacheLoaded && messages.length > 1) {
      console.log(`[ChatPage] 💾 캐시 저장: ${messages.length}개 메시지`)
      saveChatHistory(stockName, messages)
    }
  }, [messages, stockName, cacheLoaded])

  // HomePage에서 전달된 초기 메시지 자동 전송
  useEffect(() => {
    const initialMessage = location.state?.initialMessage
    if (initialMessage && initialMessage.trim()) {
      // 약간의 딜레이 후 메시지 자동 전송
      setTimeout(() => {
        setMessage(initialMessage)
        // 자동으로 메시지 전송
        handleSuggestionClick(initialMessage)
      }, 500)
      
      // state 정리 (재방문 시 재전송 방지)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])
  
  // 북마크된 메시지 로드
  useEffect(() => {
    const bookmarks = messages
      .filter(msg => msg.type === 'bot' && isBookmarked(msg.id.toString()))
      .map(msg => msg.id.toString())
    setBookmarkedMessages(new Set(bookmarks))
  }, [messages])

  // 북마크에서 메시지로 이동 (스크롤) - 캐시 로드 후 실행
  useEffect(() => {
    const scrollToMessageId = location.state?.scrollToMessage
    
    // 캐시가 로드되고 메시지가 있을 때만 스크롤
    if (scrollToMessageId && cacheLoaded && messages.length > 0) {
      console.log(`[ChatPage] 🎯 북마크 메시지로 스크롤 시도: ${scrollToMessageId}`)
      
      // 메시지가 렌더링될 때까지 충분한 딜레이
      const timer = setTimeout(() => {
        const element = document.getElementById(`message-${scrollToMessageId}`)
        if (element) {
          console.log(`[ChatPage] ✅ 북마크 메시지 발견, 스크롤 실행`)
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center'
          })
          // 강조 효과 추가
          element.style.transition = 'background-color 0.3s'
          element.style.backgroundColor = 'rgba(96, 108, 242, 0.15)'
          setTimeout(() => {
            element.style.backgroundColor = 'transparent'
          }, 2000)
        } else {
          console.warn(`[ChatPage] ⚠️ 북마크 메시지를 찾을 수 없음: ${scrollToMessageId}`)
        }
      }, 800) // 딜레이 증가
      
      return () => clearTimeout(timer)
    }
  }, [location.state, messages, cacheLoaded])
  
  // 대화 기록 삭제 핸들러
  const handleClearChat = () => {
    const confirmed = window.confirm(`${stockName}와의 대화 기록을 모두 삭제하시겠습니까?`)
    if (confirmed) {
      console.log(`[ChatPage] 🗑️ 대화 기록 삭제: ${stockName}`)
      clearChatHistory(stockName)
      
      // HomePage로 이동
      navigate('/')
    }
  }

  // 북마크 토글 핸들러
  const handleBookmarkToggle = (msg) => {
    const messageId = msg.id.toString()
    const bookmarked = isBookmarked(messageId)
    
    if (bookmarked) {
      // 북마크 제거
      const bookmark = findBookmarkByMessageId(messageId)
      if (bookmark) {
        removeBookmark(bookmark.id)
        setBookmarkedMessages(prev => {
          const newSet = new Set(prev)
          newSet.delete(messageId)
          return newSet
        })
      }
    } else {
      // 북마크 추가
      const success = addBookmark({
        messageId: messageId,
        stockName: stockName,
        content: Array.isArray(msg.content) ? msg.content.join(' ') : msg.content,
        timestamp: msg.timestamp,
        sender: msg.sender
      })
      if (success) {
        setBookmarkedMessages(prev => new Set([...prev, messageId]))
      }
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 북마크에서 온 경우 해당 메시지로 스크롤
  useEffect(() => {
    const scrollToMessageId = location.state?.scrollToMessage
    if (scrollToMessageId && messages.length > 0) {
      // 약간의 지연을 주어 DOM이 완전히 렌더링된 후 스크롤
      setTimeout(() => {
        const messageElement = document.getElementById(`message-${scrollToMessageId}`)
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 300)
      
      // state 정리 (재방문 시 스크롤 방지)
      window.history.replaceState({}, document.title)
    }
  }, [location.state, messages])

  // 실시간 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 배터리 충전 상태 체크
  useEffect(() => {
    const checkBatteryStatus = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await navigator.getBattery()
          setIsCharging(battery.charging)
          battery.addEventListener('chargingchange', () => {
            setIsCharging(battery.charging)
          })
        } catch (error) {
          console.log('Battery API not supported')
        }
      }
    }
    checkBatteryStatus()
  }, [])

  // 시간 포맷팅
  const formatTime = (date) => {
    const hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const handleSendMessage = async () => {
    if (message.trim()) {
      const userMessage = message
      const messagesWithoutSuggestions = messages.filter(msg => msg.type !== 'suggestions')
      
      setMessages([...messagesWithoutSuggestions, {
        id: Date.now(),
        type: 'user',
        content: userMessage,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      }])
      setMessage('')

      // 대화 횟수 증가 및 레벨업 체크
      const oldCount = incrementChatCount() - 1 // 이전 값
      const newCount = oldCount + 1
      
      if (isLevelUp(oldCount, newCount)) {
        const newLevel = calculateProgress(newCount)
        // 레벨업 알림 (선택적)
        console.log(`🎉 레벨업! Lv.${newLevel.level}에 도달했습니다!`)
        // TODO: 레벨업 축하 모달이나 토스트 메시지 표시
      }

      // Get AI response (mock for now, will be replaced with real LLM later)
      try {
        const response = await getAIResponse(userMessage, stockName, userNickname)
        
        // mood 업데이트
        if (response.metadata && response.metadata.mood) {
          setCurrentMood(response.metadata.mood)
        }
        
        setMessages(prev => {
          const withoutSuggestions = prev.filter(msg => msg.type !== 'suggestions')
          return [
            ...withoutSuggestions,
            {
              id: Date.now() + 1,
              type: 'bot',
              sender: `${stockName} 키우Me`,
              content: response.content,
              timestamp: getFormattedTimestamp()
            },
            {
              id: Date.now() + 2,
              type: 'suggestions',
              suggestions: response.suggestions
            }
          ]
        })
      } catch (error) {
        console.error('Error getting AI response:', error)
        // Fallback error message
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          type: 'bot',
          sender: `${stockName} 키우Me`,
          content: ['죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.'],
          timestamp: getFormattedTimestamp()
        }])
      }
    }
  }

  const handleSuggestionClick = async (suggestion) => {
    // Remove existing suggestions from messages
    const messagesWithoutSuggestions = messages.filter(msg => msg.type !== 'suggestions')
    
    // Add user message
    const newMessages = [...messagesWithoutSuggestions, {
      id: Date.now(),
      type: 'user',
      content: suggestion,
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    }]
    
    setMessages(newMessages)

    // 대화 횟수 증가 및 레벨업 체크
    const oldCount = incrementChatCount() - 1
    const newCount = oldCount + 1
    
    if (isLevelUp(oldCount, newCount)) {
      const newLevel = calculateProgress(newCount)
      console.log(`🎉 레벨업! Lv.${newLevel.level}에 도달했습니다!`)
    }

    // Get AI response
    try {
      const response = await getAIResponse(suggestion, stockName, userNickname)
      
      // mood 업데이트
      if (response.metadata && response.metadata.mood) {
        setCurrentMood(response.metadata.mood)
      }
      
      setMessages(prev => {
        const withoutSuggestions = prev.filter(msg => msg.type !== 'suggestions')
        return [
          ...withoutSuggestions,
          {
            id: Date.now() + 1,
            type: 'bot',
            sender: `${stockName} 키우Me`,
            content: response.content,
            timestamp: getFormattedTimestamp()
          },
          {
            id: Date.now() + 2,
            type: 'suggestions',
            suggestions: response.suggestions
          }
        ]
      })
    } catch (error) {
      console.error('Error getting AI response:', error)
    }
  }

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: '#E9EFFE' }}>
      {/* Status Bar - HomePage와 동일 */}
      <div className="w-full px-4 py-2 flex justify-between items-center" style={{ backgroundColor: '#606CF2' }}>
        {/* Left: Time + Location Icon */}
        <div className="flex items-center gap-1">
          <span className="text-white text-sm font-normal">{formatTime(currentTime)}</span>
          <Navigation className="w-3 h-3 text-white" fill="white" />
        </div>
        
        {/* Right: Signal + WiFi + Battery */}
        <div className="flex items-center gap-1">
          <Signal className="w-4 h-4 text-white" strokeWidth={2} />
          <Wifi className="w-4 h-4 text-white" strokeWidth={2} />
          {isCharging ? (
            <BatteryCharging className="w-5 h-5 text-white" strokeWidth={2} />
          ) : (
            <Battery className="w-5 h-5 text-white" strokeWidth={2} />
          )}
        </div>
      </div>

      {/* Header - 2줄 구조 */}
      <div className="w-full relative px-5 py-2" style={{ backgroundColor: '#606CF2' }}>
        {/* 상단 줄: 버튼들과 종목명 키우Me */}
        <div className="flex items-center justify-between mb-2">
          {/* Left: Back Button */}
          <button onClick={() => navigate('/')}>
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          
          {/* Center: 종목명 키우Me */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <span className="text-white text-lg font-normal">{stockName} 키우Me</span>
            <div className="px-2 py-0.5 bg-blue-950/40 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-normal leading-none">Beta</span>
            </div>
          </div>
          
          {/* Right: Clear Chat Button */}
          <button 
            onClick={handleClearChat}
            className="hover:bg-white/10 rounded-full p-1 transition-colors"
            title="대화 기록 삭제"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* 하단 줄: 오늘의 온도 */}
        <div className="flex justify-center">
          <div className="relative inline-flex items-center gap-1 px-2 py-1 rounded-full overflow-hidden" style={{ 
            zIndex: 10, 
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.15))',
            backdropFilter: 'blur(10px)'
          }}>
            <span className="text-white text-xs font">오늘의 온도 : </span>
            <span className="text-xs">{getMoodEmoji(currentMood)}⚪</span>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="self-stretch flex-1 px-3.5 py-4 flex flex-col gap-2.5 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', backgroundColor: '#E9EFFE' }}>
        {messages.map((msg) => {
          if (msg.type === 'date') {
            return (
              <div key={msg.id} className="w-32 mx-auto h-6 bg-slate-400/40 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">{msg.content}</span>
              </div>
            )
          }

          if (msg.type === 'notice') {
            return (
              <div key={msg.id} className="w-full px-3.5 flex justify-center items-center flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-stone-500 text-xs">{msg.content}</span>
                  <div className="w-5 h-5 bg-neutral-400 rounded-full flex items-center justify-center">
                    <Info className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="w-full text-center">
                  <span className="text-neutral-400 text-xs">{msg.subtext}</span>
                </div>
              </div>
            )
          }

          if (msg.type === 'user') {
            return (
              <div key={msg.id} className="w-full flex justify-end items-start gap-2">
                <span className="text-neutral-400 text-xs self-end mb-3">{msg.time}</span>
                <div className="max-w-[250px] rounded-tl-2xl rounded-tr-lg rounded-bl-2xl rounded-br-2xl shadow-md p-3" style={{ backgroundColor: '#7D4DDD' }}>
                  <p className="text-white text-base">{msg.content}</p>
                </div>
              </div>
            )
          }

          if (msg.type === 'bot') {
            const messageId = msg.id.toString()
            const isMarked = bookmarkedMessages.has(messageId)
            
            return (
              <div key={msg.id} id={`message-${messageId}`} className="w-full transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  {/* 프로필 로고 */}
                  <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center border border-stone-300 bg-white">
                    <StockLogo stockName={stockName} size="xs" />
                  </div>
                  {/* 닉네임 + Mood 이모지 */}
                  <div className="flex items-center gap-1">
                    <span className="text-black text-base">{msg.sender}</span>
                    <span className="text-sm">{getMoodEmoji(currentMood)}</span>
                  </div>
                </div>
                <div className="max-w-[340px] px-5 py-4 bg-color-white-solid rounded-tl-lg rounded-tr-2xl rounded-bl-2xl rounded-br-2xl shadow-md">
                  {msg.content.map((paragraph, idx) => (
                    <p key={idx} className={`text-color-azure-${idx === 0 ? '11' : '27'} text-base mb-3 last:mb-0`}>
                      {paragraph}
                    </p>
                  ))}
                  <div className="pt-3 flex justify-end items-center gap-2 border-t border-gray-100 mt-3">
                    <span className="text-color-azure-64 text-xs">유의사항</span>
                    <Info className="w-4 h-4 text-color-azure-64" />
                    <button
                      onClick={() => handleBookmarkToggle(msg)}
                      className="ml-2 hover:scale-110 transition-transform"
                      title={isMarked ? "북마크 해제" : "북마크 추가"}
                    >
                      <Bookmark 
                        className={`w-4 h-4 ${isMarked ? 'fill-[#606CF2]' : 'text-gray-400'}`}
                        style={isMarked ? { color: '#606CF2' } : {}}
                      />
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-color-azure-64 text-xs">{msg.timestamp}</span>
                </div>
              </div>
            )
          }

          if (msg.type === 'suggestions') {
            return (
              <div key={msg.id} className="w-full flex flex-col gap-3">
                {msg.suggestions.slice(0, 2).map((suggestion, idx) => {
                  // 한 문장만 추출 (첫 번째 마침표, 물음표, 느낌표까지)
                  const firstSentence = suggestion.split(/[.?!]/)[0].trim() + (suggestion.match(/[.?!]/) ? suggestion.match(/[.?!]/)[0] : '')
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full pl-5 pr-20 py-3.5 bg-color-white-solid rounded-full text-left hover:bg-gray-50 transition-colors border"
                      style={{ borderColor: '#C8CCFF' }}
                    >
                      <span className="text-base" style={{ color: '#717BE4' }}>{firstSentence}</span>
                    </button>
                  )
                })}
              </div>
            )
          }

          if (msg.type === 'action') {
            return (
              <button
                key={msg.id}
                className="w-full pl-5 pr-32 py-3.5 bg-indigo-400 rounded-full outline outline-2 outline-offset-[-2px] outline-color-blue-82 text-left hover:bg-indigo-500 transition-colors"
              >
                <span className="text-white text-base">{msg.content}</span>
              </button>
            )
          }

          return null
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - HomePage와 동일한 디자인 */}
      <div className="w-full h-24 bg-white relative flex items-center justify-center px-5">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="w-[350px]" style={{ height: '38.4px' }}>
          <div className="relative w-full h-full p-[2px] bg-gradient-to-r from-cyan-500 via-blue-400 to-fuchsia-400 rounded-full shadow-lg">
            <div className="w-full h-full bg-white rounded-full flex items-center px-4">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="키우Me에게 물어보세요"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: '#717BE4' }}
              />
              <button 
                type="submit"
                className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(60deg, #06b6d4, #60a5fa, #e879f9)', width: '34.4px', height: '34.4px', marginRight: '-15.2px' }}
              >
                <Send className="w-4 h-4 text-white" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Bottom Indicator */}
      <div className="self-stretch h-6 flex items-center justify-center">
        <div className="w-32 h-[5px] bg-color-azure-11 rounded-full" />
      </div>
    </div>
  )
}

export default ChatPage

