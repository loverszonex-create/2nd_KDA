import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Star, Menu, Signal, Wifi, Battery, BatteryCharging, Navigation, Send, X } from 'lucide-react'
import robotImage from '../assets/robot.png'
import { getTimeAgo, getMockLastMessageTime } from '../utils/timeUtils'
import { getMultipleRealtimeStockPrices, STOCK_CODE_MAP, searchStocks, normalizeStock, getMacroWeather, extractStockCode } from '../utils/stockAPI'

const HEADER_COLOR = '#606CF2'
const CUSTOM_STOCKS_KEY = 'kiwume:customStocks'
const HIDDEN_DEFAULT_STOCKS_KEY = 'kiwume:hiddenDefaultStocks'

const readStoredArray = (key, fallback = []) => {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = window.localStorage.getItem(key)
    if (!stored) return fallback
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : fallback
  } catch (error) {
    console.warn(`[HomePage] Failed to parse ${key}`, error)
    return fallback
  }
}
import { getChatCount, calculateProgress } from '../utils/levelSystem'
import { removeBookmark } from '../utils/bookmarkUtils'
import { getCacheStats, clearChatHistory } from '../utils/chatCache'

function HomePage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('home') // 'home', 'history', or 'bookmark'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false)
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [customStocks, setCustomStocks] = useState(() => readStoredArray(CUSTOM_STOCKS_KEY))
  const [hiddenDefaultStocks, setHiddenDefaultStocks] = useState(() => readStoredArray(HIDDEN_DEFAULT_STOCKS_KEY))
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isCharging, setIsCharging] = useState(false)
  const [timeUpdateTrigger, setTimeUpdateTrigger] = useState(0)
  const [stockPrices, setStockPrices] = useState({})
  const [chatHistoryStocks, setChatHistoryStocks] = useState([])
  const [currentTemperature, setCurrentTemperature] = useState('😐⚪')
  
  // 레벨 시스템 상태
  const [levelInfo, setLevelInfo] = useState({
    level: 1,
    progress: 0,
    currentInLevel: 0,
    neededForNextLevel: 50,
    remainingChats: 50,
    levelName: '새싹 투자자',
    nextLevelName: '초보 투자자'
  })

  const searchBoxRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(CUSTOM_STOCKS_KEY, JSON.stringify(customStocks))
    } catch (error) {
      console.warn('[HomePage] Failed to persist custom stocks', error)
    }
  }, [customStocks])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(HIDDEN_DEFAULT_STOCKS_KEY, JSON.stringify(hiddenDefaultStocks))
    } catch (error) {
      console.warn('[HomePage] Failed to persist hidden stocks', error)
    }
  }, [hiddenDefaultStocks])

  const trackedStockCodes = useMemo(() => {
    const map = { ...STOCK_CODE_MAP }
    customStocks.forEach((stock) => {
      if (!stock?.name) return
      const code = stock.code || extractStockCode(stock.ticker || stock.name)
      if (code) {
        map[stock.name] = code
      }
    })
    return map
  }, [customStocks])

  // 실시간 주가 데이터 로드
  useEffect(() => {
    let priceTimer
    const loadStockPrices = async () => {
      try {
        const prices = await getMultipleRealtimeStockPrices(trackedStockCodes)
        setStockPrices(prices)
      } catch (error) {
        console.error('주가 데이터 로드 실패:', error)
        // 실패 시 이전 데이터를 유지
        setStockPrices((prev) => ({ ...prev }))
      }
    }
    
    loadStockPrices()
    priceTimer = setInterval(loadStockPrices, 5 * 60 * 1000)
    
    return () => clearInterval(priceTimer)
  }, [trackedStockCodes])

  // 레벨 정보 로드
  useEffect(() => {
    const loadLevelInfo = () => {
      const count = getChatCount()
      const info = calculateProgress(count)
      setLevelInfo(info)
    }
    
    loadLevelInfo()
    
    // 1분마다 레벨 정보 업데이트 (대화 횟수가 변경될 수 있으므로)
    const levelTimer = setInterval(loadLevelInfo, 60000)
    
    return () => clearInterval(levelTimer)
  }, [])

  // 실시간 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // 1초마다 업데이트

    return () => clearInterval(timer)
  }, [])

  // 시간 경과 표시 업데이트 (1분마다)
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeUpdateTrigger(prev => prev + 1)
    }, 60000) // 1분마다 "n분 전" 업데이트

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let timerId
    const loadTemperature = async () => {
      try {
        const data = await getMacroWeather()
        if (data?.label) {
          setCurrentTemperature(data.label)
        } else if (data?.score !== undefined) {
          setCurrentTemperature(`${Math.round(data.score)}°`)
        } else {
          setCurrentTemperature('😐⚪')
        }
      } catch (error) {
        console.error('[HomePage] 시장 온도 로드 실패:', error)
        setCurrentTemperature('😐⚪')
      }
    }
    loadTemperature()
    timerId = setInterval(loadTemperature, 5 * 60 * 1000)
    return () => clearInterval(timerId)
  }, [])

  // 배터리 충전 상태 체크
  useEffect(() => {
    const checkBatteryStatus = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await navigator.getBattery()
          setIsCharging(battery.charging)
          
          // 충전 상태 변경 감지
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

  // 시간 포맷팅 (9:41 형식)
  const formatTime = (date) => {
    const hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // 검색어를 가지고 "키우Me" 채팅방으로 이동하여 LLM과 대화
      navigate(`/chat/키우Me`, { state: { initialMessage: searchQuery } })
      setSearchQuery('') // 검색창 초기화
      setIsSearchDropdownOpen(false)
    } else {
      // 검색어가 없으면 그냥 키우Me 채팅방으로 이동
      navigate(`/chat/키우Me`)
      setIsSearchDropdownOpen(false)
    }
  }

  const handleAddStock = (stock) => {
    const normalized = normalizeStock(stock)
    if (!normalized) return
    setCustomStocks((prev) => {
      const exists = prev.some(
        (item) =>
          (item.ticker || item.code || item.name) ===
          (normalized.ticker || normalized.code || normalized.name)
      )
      if (exists) return prev
      return [{ ...normalized, addedAt: Date.now() }, ...prev]
    })
    setActiveTab('home')
    setSearchQuery('')
    setIsSearchDropdownOpen(false)
    setSearchResults([])
  }

  const handleRemoveHomeStock = (event, stock) => {
    event?.stopPropagation()
    if (stock?.isCustom) {
      setCustomStocks((prev) =>
        prev.filter(
          (item) =>
            (item.ticker || item.code || item.name) !==
            (stock.ticker || stock.code || stock.name)
        )
      )
    } else if (stock?.name) {
      setHiddenDefaultStocks((prev) => {
        if (prev.includes(stock.name)) return prev
        return [...prev, stock.name]
      })
    }
  }

  const handleSearchResultClick = (stock) => {
    if (!stock?.name) return
    setSearchQuery('')
    setIsSearchDropdownOpen(false)
    navigate(`/chat/${stock.name}`, {
      state: {
        ticker: stock.ticker,
        initialMessage: ''
      }
    })
  }

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearchDropdownOpen(false)
      setSearchError('')
      return
    }

    setIsSearchLoading(true)
    setSearchError('')
    const debounceId = setTimeout(async () => {
      try {
        const results = await searchStocks(searchQuery.trim())
        setSearchResults(results.slice(0, 8))
        setIsSearchDropdownOpen(true)
      } catch (error) {
        console.error('검색 실패:', error)
        setSearchResults([])
        setSearchError('검색 중 오류가 발생했어요.')
        setIsSearchDropdownOpen(true)
      } finally {
        setIsSearchLoading(false)
      }
    }, 250)

    return () => clearTimeout(debounceId)
  }, [searchQuery])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setIsSearchDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // 등락률 계산 함수
  const getChangeRate = (name) => {
    const price = stockPrices[name]
    if (!price || price.changeRate === undefined) return 'N/A'
    const rate = price.changeRate
    return rate >= 0 ? `+${rate.toFixed(2)}%` : `${rate.toFixed(2)}%`
  }

  const getLogoPlaceholder = (name = '') => {
    if (!name) return 'AI'
    const trimmed = name.replace(/\s+/g, '')
    return trimmed.slice(0, 3).toUpperCase() || 'AI'
  }

  const getLogoFontSize = (text = '') => {
    const length = text.length || 1
    if (length === 1) return '1rem'
    if (length === 2) return '0.9rem'
    return '0.75rem'
  }

  const renderLogoContent = (chat) => {
    switch (chat.logo) {
      case 'samsung':
        return <div className="text-blue-600 font-bold text-[10px]">SAMSUNG</div>
      case 'battery':
        return <div className="text-green-600 text-xl">🔋</div>
      case 'samsungsdi':
        return <div className="text-indigo-600 font-bold text-[10px]">SDI</div>
      case 'hyundai':
        return <div className="text-blue-800 font-bold text-[10px]">HYUNDAI</div>
      case 'lg':
        return <div className="text-red-500 font-bold text-[10px]">LG</div>
      case 'kia':
        return <div className="text-gray-700 font-bold text-[10px]">KIA</div>
      case 'sk':
        return <div className="text-red-600 font-bold text-[10px]">SK</div>
      case 'finance':
        return <div className="text-green-600 text-xl">💰</div>
      default: {
        const letters = chat.logoText || getLogoPlaceholder(chat.name)
        return (
          <span
            className="text-indigo-600 font-semibold"
            style={{ fontSize: getLogoFontSize(letters) }}
          >
            {letters}
          </span>
        )
      }
    }
  }

  // 홈 탭 - 금융주 팀톡 제외한 7개 종목
  const defaultHomeStocks = [
    {
      id: 1,
      name: '삼성전자',
      code: STOCK_CODE_MAP['삼성전자'],
      ticker: `${STOCK_CODE_MAP['삼성전자']}.KS`,
      category: '',
      lastMessage: '초심으로 돌아가자 .. 10만전자 될까?',
      lastMessageTime: getMockLastMessageTime(0.5), // 30초 전
      badge: '국내',
      changeRate: getChangeRate('삼성전자'),
      logo: 'samsung'
    },
    {
      id: 2,
      name: '에코프로',
      code: STOCK_CODE_MAP['에코프로'],
      ticker: `${STOCK_CODE_MAP['에코프로']}.KS`,
      category: '#2차전지',
      lastMessage: 'K-양극재 신화',
      lastMessageTime: getMockLastMessageTime(5), // 5분 전
      badge: '국내',
      changeRate: getChangeRate('에코프로'),
      logo: 'battery'
    },
    {
      id: 3,
      name: '삼성SDI',
      code: STOCK_CODE_MAP['삼성SDI'],
      ticker: `${STOCK_CODE_MAP['삼성SDI']}.KS`,
      category: '#2차전지',
      lastMessage: '꿈의 배터리 선도주자',
      lastMessageTime: getMockLastMessageTime(10), // 10분 전
      badge: '국내',
      changeRate: getChangeRate('삼성SDI'),
      logo: 'samsungsdi'
    },
    {
      id: 4,
      name: '현대차',
      code: STOCK_CODE_MAP['현대차'],
      ticker: `${STOCK_CODE_MAP['현대차']}.KS`,
      category: '#자동차',
      lastMessage: '명실상부 자동차 대장주',
      lastMessageTime: getMockLastMessageTime(30), // 30분 전
      badge: '국내',
      changeRate: getChangeRate('현대차'),
      logo: 'hyundai'
    },
    {
      id: 5,
      name: 'LG에너지솔루션',
      code: STOCK_CODE_MAP['LG에너지솔루션'],
      ticker: `${STOCK_CODE_MAP['LG에너지솔루션']}.KS`,
      category: '#2차전지',
      lastMessage: '글로벌 1위 K-배터리',
      lastMessageTime: getMockLastMessageTime(60), // 1시간 전
      badge: '국내',
      changeRate: getChangeRate('LG에너지솔루션'),
      logo: 'lg'
    },
    {
      id: 6,
      name: '기아',
      code: STOCK_CODE_MAP['기아'],
      ticker: `${STOCK_CODE_MAP['기아']}.KS`,
      category: '#자동차',
      lastMessage: 'RV/하이브리드 글로벌 강자',
      lastMessageTime: getMockLastMessageTime(120), // 2시간 전
      badge: '국내',
      changeRate: getChangeRate('기아'),
      logo: 'kia'
    },
    {
      id: 7,
      name: 'SK하이닉스',
      code: STOCK_CODE_MAP['SK하이닉스'],
      ticker: `${STOCK_CODE_MAP['SK하이닉스']}.KS`,
      category: '#반도체',
      lastMessage: 'HBM 시장 선두주자',
      lastMessageTime: getMockLastMessageTime(1440), // 어제 (24시간 전)
      badge: '국내',
      changeRate: getChangeRate('SK하이닉스'),
      logo: 'sk'
    }
  ]

  // 대화 기록 탭 - 대화 이력이 있는 종목만 표시
  useEffect(() => {
    if (activeTab === 'history') {
      refreshHistoryStocks()
    }
  }, [activeTab, stockPrices, timeUpdateTrigger, customStocks])

  // 북마크 데이터 로드
  const [bookmarks, setBookmarks] = useState([])
  
  useEffect(() => {
    if (activeTab === 'bookmark') {
      loadBookmarks()
    }
  }, [activeTab])
  
  const loadBookmarks = () => {
    try {
      const stored = localStorage.getItem('bookmarks')
      if (stored) {
        setBookmarks(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error)
    }
  }

  // 북마크 삭제 핸들러
  const handleDeleteBookmark = (e, bookmarkId) => {
    e.stopPropagation() // 클릭 이벤트 전파 방지
    removeBookmark(bookmarkId)
    loadBookmarks() // 북마크 목록 새로고침
  }

  // 북마크 클릭 시 채팅방으로 이동
  const handleBookmarkClick = (bookmark) => {
    navigate(`/chat/${bookmark.stockName}`, { state: { scrollToMessage: bookmark.messageId } })
  }

  // 대화 기록 삭제 핸들러
  const refreshHistoryStocks = () => {
    const cacheStats = getCacheStats()
    console.log('[HomePage] 대화 기록 통계:', cacheStats)
    
    const allStockTemplates = {
      '삼성전자': { id: 1, category: '', badge: '국내', logo: 'samsung', ticker: `${STOCK_CODE_MAP['삼성전자']}.KS`, code: STOCK_CODE_MAP['삼성전자'] },
      'SK하이닉스': { id: 2, category: '#반도체', badge: '국내', logo: 'sk', ticker: `${STOCK_CODE_MAP['SK하이닉스']}.KS`, code: STOCK_CODE_MAP['SK하이닉스'] },
      '삼성SDI': { id: 3, category: '#2차전지', badge: '국내', logo: 'samsungsdi', ticker: `${STOCK_CODE_MAP['삼성SDI']}.KS`, code: STOCK_CODE_MAP['삼성SDI'] },
      '현대차': { id: 4, category: '#자동차', badge: '국내', logo: 'hyundai', ticker: `${STOCK_CODE_MAP['현대차']}.KS`, code: STOCK_CODE_MAP['현대차'] },
      'LG에너지솔루션': { id: 5, category: '#2차전지', badge: '국내', logo: 'lg', ticker: `${STOCK_CODE_MAP['LG에너지솔루션']}.KS`, code: STOCK_CODE_MAP['LG에너지솔루션'] },
      '기아': { id: 6, category: '#자동차', badge: '국내', logo: 'kia', ticker: `${STOCK_CODE_MAP['기아']}.KS`, code: STOCK_CODE_MAP['기아'] },
      '에코프로': { id: 7, category: '#2차전지', badge: '국내', logo: 'battery', ticker: `${STOCK_CODE_MAP['에코프로']}.KS`, code: STOCK_CODE_MAP['에코프로'] }
    }

    const customTemplateMap = customStocks.reduce((acc, stock, idx) => {
      if (stock?.name) {
        acc[stock.name] = {
          id: 1000 + idx,
          category: stock.category || '#사용자등록',
          badge: stock.badge || '국내',
          logoText: stock.name?.slice(0, 3)?.toUpperCase() || 'NEW',
          ticker: stock.ticker || null,
          code: stock.code || null,
          isCustom: true
        }
      }
      return acc
    }, {})

    const historyStocks = []
    const sortedChats = [...cacheStats.chats].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    sortedChats.forEach((chat, index) => {
      const template = allStockTemplates[chat.stockName] || customTemplateMap[chat.stockName]
      if (!template) return
      historyStocks.push({
        ...template,
        id: index + 1,
        name: chat.stockName,
        lastMessage: `${chat.messageCount}개의 메시지`,
        lastMessageTime: chat.timestamp,
        changeRate: getChangeRate(chat.stockName)
      })
    })

    historyStocks.push({
      id: 999,
      name: '금융주 팀톡',
      category: '',
      lastMessage: '@미래에셋증권 @하나금융지주',
      lastMessageTime: getMockLastMessageTime(1500),
      badge: '국내',
      changeRate: getChangeRate('금융주 팀톡'),
      logo: 'finance'
    })

    setChatHistoryStocks(historyStocks)
    console.log('[HomePage] 대화 기록 종목:', historyStocks.map((s) => s.name))
  }

  const handleClearChatHistory = (e, stockName) => {
    e.stopPropagation() // 클릭 이벤트 전파 방지
    const confirmed = window.confirm(`${stockName}와의 대화 기록을 삭제하시겠습니까?`)
    if (confirmed) {
      console.log(`[HomePage] 🗑️ 대화 기록 삭제: ${stockName}`)
      clearChatHistory(stockName)
      if (activeTab === 'history') {
        refreshHistoryStocks()
      }
    }
  }

  const mergedHomeStocks = [
    ...customStocks.map((stock, index) => ({
      id: `custom-${stock.ticker || stock.code || index}`,
      name: stock.name,
      category: stock.category || '#사용자등록',
      lastMessage: stock.summary || '종목과 대화를 시작해 보세요.',
      lastMessageTime: stock.addedAt || new Date().toISOString(),
      badge: stock.badge || '국내',
      changeRate: getChangeRate(stock.name),
      logoText: stock.name?.slice(0, 3)?.toUpperCase() || 'NEW',
      ticker: stock.ticker,
      code: stock.code,
      isCustom: true
    })),
    ...defaultHomeStocks
      .filter((stock) => !hiddenDefaultStocks.includes(stock.name))
      .map((stock) => ({
        ...stock,
        isCustom: false
      }))
  ]

  const displayedStocks = activeTab === 'home' ? mergedHomeStocks : (activeTab === 'history' ? chatHistoryStocks : [])

  return (
    <div className="w-full min-h-screen relative bg-white overflow-y-auto">
      {/* Status Bar */}
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

      {/* Header - 컴팩트 디자인 */}
      <div className="w-full h-[50px] relative flex items-center justify-between px-5" style={{ backgroundColor: '#606CF2' }}>
        {/* Left: Profile Button */}
        <button onClick={() => navigate('/dashboard')}>
          <div className="w-6 h-6 relative overflow-hidden">
            {/* 사람 머리 (동그라미 - 테두리만) */}
            <div className="w-2 h-2 left-[8px] top-[2px] absolute rounded-full border-2 border-color-white-solid" />
            {/* 사람 몸통 (위로 볼록한 반원 - 테두리만) */}
            <div className="w-5 h-3 left-[2.34px] top-[12px] absolute rounded-t-full border-2 border-b-0 border-color-white-solid" />
          </div>
        </button>
        
        {/* Center: 키우Me + Beta */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
          <span className="text-white text-lg font-normal">키우Me</span>
          <div className="px-2 py-0.5 bg-blue-950/40 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-normal leading-none">Beta</span>
          </div>
        </div>
        
        {/* Right: Close Button */}
        <button onClick={() => navigate('/')}>
          <X className="w-6 h-6 text-white" strokeWidth={2} />
        </button>
      </div>

      <div className="relative w-full">
        {/* Hero Section */}
        <div className="w-full h-[230px] relative overflow-hidden rounded-br-[40px]" style={{ backgroundColor: '#606CF2' }}>
          {/* AI 로봇 이미지 - 왼쪽 */}
          <img 
            className="absolute left-[50px] top-[30px] object-contain" 
            style={{ width: '100px', height: '100px', transform: 'scale(2)' }}
            src={robotImage}
            alt="AI Robot"
          />
          {/* 오늘의 날씨 */}
          <div className="absolute right-4 top-[3px] text-left mb-1" style={{ transform: 'scale(1)', transformOrigin: 'top right' }}>
            <div className="relative inline-flex items-center gap-1 px-3 py-1.5 rounded-full overflow-hidden" style={{ 
              zIndex: 10, 
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.15))',
              backdropFilter: 'blur(10px)'
            }}>
              <span className="text-white text-sm font-semibold">오늘의 온도</span>
              <span className="text-sm">{currentTemperature}</span>
            </div>
          </div>
          {/* 오른쪽 상단 영역 */}
          <div className="absolute right-[30px] top-[40px]">
            {/* 레벨 배지 */}
            <div className="relative inline-flex items-center gap-1 px-1.5 rounded-full mb-1 overflow-hidden" style={{ zIndex: 10, backgroundColor: 'rgba(30, 27, 75, 0.4)', paddingTop: '2px', paddingBottom: '3px' }}>
              <div className="w-3.5 h-3.5 bg-yellow-400 rounded-full flex-shrink-0" style={{ zIndex: 2 }}></div>
              <span className="text-yellow-400 text-xs font-semibold leading-none" style={{ zIndex: 2 }}>Lv.{String(levelInfo.level).padStart(2, '0')}</span>
              
              {/* Progress Bar inside badge */}
              <div className="absolute bottom-0 left-0 w-full bg-yellow-400 transition-all duration-500 ease-out" style={{ width: `${levelInfo.progress}%`, height: '1px', zIndex: 1 }}>
              </div>
            </div>
            
            {/* 타이틀 */}
            <div className="text-left mb-2">
              <h1 className="text-white font-bold leading-tight" style={{ fontSize: '1.28rem' }}>
                종목과 대화하기<br/>키우Me
              </h1>
            </div>

            {/* 해시태그 */}
            <div className="text-left mt-2">
              <p className="text-white/50" style={{ fontSize: '0.8rem' }}>#소통 #Q&A</p>
            </div>
          </div>

          {/* 하단 안내 문구 */}
          <div className="absolute left-[20px] right-[20px] bottom-[20px] text-white text-[11px] leading-tight opacity-80">
            키우Me의 답변은 생성형 AI를 활용한 답변으로 사실과 다를 수 있어요
          </div>
        </div>

        {/* Search Bar - 헤더 외부 배치 (오버플로우 방지) */}
        <form
          ref={searchBoxRef}
          onSubmit={handleSearch}
          className="absolute bottom-[40px] left-1/2 -translate-x-1/2 w-[350px]"
          style={{ height: '38.4px', zIndex: 40 }}
        >
          <div className="relative w-full h-full p-[2px] bg-gradient-to-r from-cyan-500 via-blue-400 to-fuchsia-400 rounded-full shadow-lg">
            <div className="w-full h-full bg-white rounded-full flex items-center px-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) {
                    setIsSearchDropdownOpen(true)
                  }
                }}
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
            {isSearchDropdownOpen && (
              <div
                className="absolute left-0 right-0 top-full mt-3 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50"
                style={{ maxHeight: '260px' }}
              >
                <div className="max-h-[240px] overflow-y-auto">
                  {isSearchLoading && (
                    <div className="px-4 py-3 text-sm text-slate-500">검색 중...</div>
                  )}
                  {!isSearchLoading && searchError && (
                    <div className="px-4 py-3 text-sm text-red-500">{searchError}</div>
                  )}
                  {!isSearchLoading && !searchError && searchResults.length === 0 && (
                    <div className="px-4 py-3 text-sm text-slate-400">검색 결과가 없습니다.</div>
                  )}
                  {!isSearchLoading && !searchError && searchResults.length > 0 && (
                    <ul className="divide-y divide-slate-100">
                      {searchResults.map((stock) => (
                        <li key={stock.ticker || stock.code || stock.name} className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => handleSearchResultClick(stock)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  handleSearchResultClick(stock)
                                }
                              }}
                              role="button"
                              tabIndex={0}
                            >
                              <div className="text-sm font-semibold text-slate-900">{stock.name}</div>
                              <div className="text-xs text-slate-500">
                                {stock.code || '-'}
                                {stock.category ? ` · ${stock.category}` : ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleAddStock(stock)
                                }}
                                className="text-[11px] font-semibold px-3 py-1 rounded-full text-white"
                                style={{ backgroundColor: HEADER_COLOR }}
                              >
                                추가
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleSearchResultClick(stock)
                                }}
                                className="text-[11px] font-semibold px-3 py-1 rounded-full text-indigo-500 border border-indigo-100"
                              >
                                대화
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Tabs */}
      <div className="w-full h-14 bg-white flex items-end" style={{ paddingLeft: '6.5%' }}>
        <button 
          onClick={() => setActiveTab('home')}
          className={`h-full flex items-center justify-center text-base font-semibold relative ${
            activeTab === 'home' 
              ? 'text-black' 
              : 'text-stone-500'
          }`}
          style={{ marginRight: '3ch' }}
        >
          <span>홈</span>
          {activeTab === 'home' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-black" style={{ width: '130%', height: '2.4px' }}></div>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`h-full flex items-center justify-center text-base font-semibold relative ${
            activeTab === 'history' 
              ? 'text-black' 
              : 'text-stone-500'
          }`}
          style={{ marginRight: '3ch' }}
        >
          <span>대화 기록</span>
          {activeTab === 'history' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-black" style={{ width: '130%', height: '2.4px' }}></div>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('bookmark')}
          className={`h-full flex items-center justify-center text-base font-semibold relative ${
            activeTab === 'bookmark' 
              ? 'text-black' 
              : 'text-stone-500'
          }`}
        >
          <span>북마크</span>
          {activeTab === 'bookmark' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-black" style={{ width: '130%', height: '2.4px' }}></div>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="w-full bg-gray-50">
        <div className="px-5 py-6 pb-6">
          {/* 종목 대화 리스트 제목 - 대화 기록 탭에만 표시 */}
          {activeTab === 'history' && (
            <h2 className="text-black text-xl font-normal mb-4">종목 대화 리스트</h2>
          )}


          {/* 관심 종목 선택하기 섹션 - 홈 탭에만 표시 */}
          {activeTab === 'home' && (
            <div className="w-full mb-6">
              <div className="text-black text-xl font-normal mb-3">
                관심 종목 선택하기
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M3.90395 2.41159C4.79347 1.81724 5.83925 1.5 6.90906 1.5C8.3436 1.50009 9.71939 2.07 10.7338 3.08437C11.7481 4.09874 12.318 5.47449 12.3181 6.90903C12.3181 7.97884 12.0009 9.02466 11.4065 9.91418C10.8122 10.8037 9.9674 11.497 8.97902 11.9064C7.99065 12.3158 6.90306 12.4229 5.85381 12.2142C4.80455 12.0055 3.84075 11.4903 3.08428 10.7338C2.32781 9.97738 1.81265 9.01357 1.60394 7.96432C1.39523 6.91506 1.50234 5.82748 1.91174 4.8391C2.32114 3.85073 3.01444 3.00595 3.90395 2.41159ZM6.90903 2.5C6.03701 2.50001 5.18458 2.75859 4.45952 3.24306C3.73445 3.72754 3.16933 4.41614 2.83562 5.22179C2.50191 6.02744 2.4146 6.91395 2.58472 7.76923C2.75485 8.6245 3.17477 9.41012 3.79139 10.0267C4.40801 10.6434 5.19362 11.0633 6.0489 11.2334C6.90417 11.4035 7.79069 11.3162 8.59634 10.9825C9.40199 10.6488 10.0906 10.0837 10.5751 9.35861C11.0595 8.63355 11.3181 7.78111 11.3181 6.90909M6.90903 2.5C8.07836 2.50008 9.19981 2.96463 10.0267 3.79148C10.8535 4.61832 11.318 5.73976 11.3181 6.90909" fill="white"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M10.218 10.218C10.4133 10.0227 10.7299 10.0227 10.9251 10.218L14.3536 13.6464C14.5488 13.8417 14.5488 14.1583 14.3536 14.3536C14.1583 14.5488 13.8417 14.5488 13.6464 14.3536L10.218 10.9251C10.0227 10.7299 10.0227 10.4133 10.218 10.218Z" fill="white"/>
                  </svg>
                </div>
                
                <span className="text-indigo-600 text-base font-normal">
                  반도체 관련주 팀톡 만들어줘!
                </span>
              </div>
            </div>
          )}

          {/* 북마크 탭 컨텐츠 */}
          {activeTab === 'bookmark' ? (
            bookmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-gray-400 text-base mb-2">저장된 북마크가 없습니다</p>
                <p className="text-gray-300 text-sm">채팅에서 중요한 메시지를 북마크해보세요</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    onClick={() => handleBookmarkClick(bookmark)}
                    className="w-full bg-white rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.09)] p-4 text-left hover:shadow-lg transition-all relative group cursor-pointer"
                  >
                    {/* 삭제 버튼 - 우측 상단 */}
                    <button
                      onClick={(e) => handleDeleteBookmark(e, bookmark.id)}
                      className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                      title="북마크 삭제"
                    >
                      <X className="w-4 h-4 text-gray-600 hover:text-red-600" />
                    </button>

                    {/* 종목명 + 타임스탬프 */}
                    <div className="flex items-center gap-2 mb-2 pr-8">
                      <span className="text-indigo-600 text-sm font-semibold">{bookmark.stockName}</span>
                      <span className="text-gray-400 text-xs">{bookmark.timestamp}</span>
                    </div>
                    
                    {/* 메시지 내용 - 기본 3줄 제한 */}
                    <p className="text-gray-800 text-sm leading-relaxed break-words group-hover:hidden" style={{ 
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {bookmark.content}
                    </p>
                    
                    {/* hover 시 전체 내용 표시 */}
                    <p className="hidden group-hover:block text-gray-800 text-sm leading-relaxed break-words">
                      {bookmark.content}
                    </p>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Stock Chat List */
            <div className="space-y-4">
            {displayedStocks.map((chat) => (
            <div
              key={chat.id}
              onClick={() => navigate(`/chat/${chat.name}`, { state: { ticker: chat.ticker || null } })}
              className="w-full bg-white rounded-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.09)] relative cursor-pointer hover:shadow-lg transition-all group"
            >
              {/* 삭제 버튼 */}
              {activeTab === 'home' && (
                <button
                  onClick={(e) => handleRemoveHomeStock(e, chat)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 z-10"
                  title="관심 종목에서 제거"
                >
                  <X className="w-4 h-4 text-gray-600 hover:text-red-600" />
                </button>
              )}
              {activeTab === 'history' && chat.name !== '금융주 팀톡' && (
                <button
                  onClick={(e) => handleClearChatHistory(e, chat.name)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 z-10"
                  title="대화 기록 삭제"
                >
                  <X className="w-4 h-4 text-gray-600 hover:text-red-600" />
                </button>
              )}
              
              {/* 로고 */}
              <div className="absolute w-14 h-14 left-[18px] top-[15px] bg-white rounded-full border border-stone-500 flex items-center justify-center overflow-hidden">
                {renderLogoContent(chat)}
              </div>

              {/* 종목명 */}
              <div className="absolute left-[89px] top-[8px] text-black text-base font-normal">
                {chat.name}
              </div>

              {/* 카테고리 + 설명 */}
              <div className="absolute left-[89px] top-[37px] right-[70px] overflow-hidden text-ellipsis whitespace-nowrap">
                {chat.category && (
                  <span className="text-indigo-600 text-sm font-normal">{chat.category} </span>
                )}
                <span className="text-stone-500 text-sm font-normal">{chat.lastMessage}</span>
              </div>

              {/* 시장 구분 배지 */}
              <div className="absolute w-9 h-4 right-[10px] top-[10px] bg-green-50 rounded-[3px] flex items-center justify-center">
                <span className="text-green-600 text-[10px]">{chat.badge}</span>
              </div>

              {/* 등락률 */}
              <div className={`absolute right-[10px] top-[30px] text-right text-sm font-normal ${
                chat.changeRate.startsWith('+') ? 'text-red-500' : 
                chat.changeRate.startsWith('-') ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {chat.changeRate}
              </div>

              {/* 시간 - 실시간 업데이트 */}
              <div className="absolute right-[10px] bottom-[8px] text-stone-500 text-[10px]">
                {getTimeAgo(chat.lastMessageTime)}
              </div>

              {/* 높이 유지용 */}
              <div className="h-20" />
            </div>
          ))}
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HomePage

