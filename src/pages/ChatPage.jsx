import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, MoreVertical, Info, Send, Signal, Wifi, Battery, BatteryCharging, Navigation, Bookmark } from 'lucide-react'
import { getAIResponse, getFormattedTimestamp } from '../utils/chatAPI'
import { incrementChatCount, isLevelUp, calculateProgress } from '../utils/levelSystem'
import { addBookmark, removeBookmark, isBookmarked, findBookmarkByMessageId } from '../utils/bookmarkUtils'

function ChatPage() {
  const { stockName } = useParams()
  const navigate = useNavigate()
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
  
  // 닉네임 로드
  useEffect(() => {
    const storedNickname = localStorage.getItem('userNickname')
    if (storedNickname) {
      setUserNickname(storedNickname)
    }
  }, [])
  
  // 북마크된 메시지 로드
  useEffect(() => {
    const bookmarks = messages
      .filter(msg => msg.type === 'bot' && isBookmarked(msg.id.toString()))
      .map(msg => msg.id.toString())
    setBookmarkedMessages(new Set(bookmarks))
  }, [messages])
  
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

      {/* Header - HomePage와 동일 스타일 */}
      <div className="w-full h-[50px] relative flex items-center justify-between px-5" style={{ backgroundColor: '#606CF2' }}>
        {/* Left: Back Button */}
        <button onClick={() => navigate('/')}>
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        
        {/* Center: 종목명 + Beta */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
          <span className="text-white text-lg font-normal">{stockName} 키우Me</span>
          <div className="px-2 py-0.5 bg-blue-950/40 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-normal leading-none">Beta</span>
          </div>
        </div>
        
        {/* Right: More Button */}
        <button>
          <MoreVertical className="w-6 h-6 text-white" />
        </button>
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
              <div key={msg.id} className="w-full">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-7 h-7 bg-neutral-400 rounded-full" />
                  <span className="text-black text-base">{msg.sender}</span>
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
                {msg.suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full pl-5 pr-20 py-3.5 bg-color-white-solid rounded-full text-left hover:bg-gray-50 transition-colors border"
                    style={{ borderColor: '#C8CCFF' }}
                  >
                    <span className="text-base" style={{ color: '#717BE4' }}>{suggestion}</span>
                  </button>
                ))}
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

      {/* Input Area - HomePage 스타일 */}
      <div className="w-full h-24 bg-white relative flex items-center justify-center px-5">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="w-full max-w-[348px] h-14">
          <div className="relative w-full h-full p-[2px] bg-gradient-to-r from-cyan-500 via-blue-400 to-fuchsia-400 rounded-full shadow-lg">
            <div className="w-full h-full bg-white rounded-full flex items-center px-5">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="키우Me에게 물어보세요"
                className="flex-1 bg-transparent outline-none text-indigo-600 text-base placeholder:text-indigo-400"
              />
              <button 
                type="submit"
                className="w-12 h-12 bg-gradient-to-b from-cyan-500 via-blue-400 to-fuchsia-400 rounded-full flex items-center justify-center -mr-[18px]"
              >
                <Send className="w-5 h-5 text-white rotate-[18deg]" />
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

