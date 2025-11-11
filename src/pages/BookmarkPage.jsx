import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Signal, Wifi, Battery, BatteryCharging, Navigation, X } from 'lucide-react'
import { removeBookmark } from '../utils/bookmarkUtils'

function BookmarkPage() {
  const navigate = useNavigate()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isCharging, setIsCharging] = useState(false)
  const [bookmarks, setBookmarks] = useState([])

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

  // 북마크 데이터 로드
  useEffect(() => {
    loadBookmarks()
  }, [])

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

  // 시간 포맷팅
  const formatTime = (date) => {
    const hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const handleBookmarkClick = (bookmark) => {
    // 해당 채팅방으로 이동
    navigate(`/chat/${bookmark.stockName}`, { state: { scrollToMessage: bookmark.messageId } })
  }

  // 북마크 삭제 핸들러
  const handleDeleteBookmark = (e, bookmarkId) => {
    e.stopPropagation() // 클릭 이벤트 전파 방지
    removeBookmark(bookmarkId)
    loadBookmarks() // 북마크 목록 새로고침
  }

  return (
    <div className="w-full h-screen relative bg-white overflow-hidden">
      {/* Status Bar */}
      <div className="w-full px-4 py-2 flex justify-between items-center" style={{ backgroundColor: '#606CF2' }}>
        <div className="flex items-center gap-1">
          <span className="text-white text-sm font-normal">{formatTime(currentTime)}</span>
          <Navigation className="w-3 h-3 text-white" fill="white" />
        </div>
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

      {/* Header */}
      <div className="w-full h-[50px] relative flex items-center justify-between px-5" style={{ backgroundColor: '#606CF2' }}>
        <button onClick={() => navigate(-1)}>
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="text-white text-lg font-normal">북마크</span>
        </div>
        <div className="w-6"></div>
      </div>

      {/* Content */}
      <div className="w-full h-[calc(100vh-100px)] bg-gray-50 overflow-y-auto">
        <div className="px-5 py-6">
          {bookmarks.length === 0 ? (
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

                  {/* 종목명 */}
                  <div className="flex items-center gap-2 mb-2 pr-8">
                    <span className="text-indigo-600 text-sm font-semibold">{bookmark.stockName}</span>
                    <span className="text-gray-400 text-xs">{bookmark.timestamp}</span>
                  </div>
                  
                  {/* 메시지 내용 */}
                  <p className="text-gray-800 text-sm leading-relaxed line-clamp-3">
                    {bookmark.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BookmarkPage

