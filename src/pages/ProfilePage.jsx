import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, X, Info, Edit2, Check, User, Camera, Signal, Wifi, Battery, BatteryCharging, Navigation } from 'lucide-react'
import robotImage from '../assets/robot.png'
import { getUserProfile, updateUserNickname, getMockUserId } from '../lib/supabase'
import { getChatCount, calculateProgress, getLevelBadgeColor } from '../utils/levelSystem'
import LevelDebugPanel from '../components/LevelDebugPanel'

function ProfilePage() {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('수익키우미')
  const [isEditingNickname, setIsEditingNickname] = useState(false)
  const [tempNickname, setTempNickname] = useState('')
  const [loading, setLoading] = useState(true)
  const [profileImage, setProfileImage] = useState(null)
  const fileInputRef = useRef(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isCharging, setIsCharging] = useState(false)
  const userId = getMockUserId()
  
  // 레벨 시스템 상태
  const [chatCount, setChatCount] = useState(0)
  const [levelInfo, setLevelInfo] = useState({
    level: 1,
    progress: 0,
    currentInLevel: 0,
    neededForNextLevel: 50,
    remainingChats: 50,
    levelName: '새싹 투자자',
    nextLevelName: '초보 투자자'
  })

  // 사용자 프로필 로드
  useEffect(() => {
    loadUserProfile()
    loadLevelInfo()
  }, [])
  
  // 레벨 정보 로드
  const loadLevelInfo = () => {
    const count = getChatCount()
    setChatCount(count)
    const info = calculateProgress(count)
    setLevelInfo(info)
  }

  const loadUserProfile = async () => {
    setLoading(true)
    
    // localStorage에서 먼저 확인
    const storedNickname = localStorage.getItem('userNickname')
    if (storedNickname) {
      setNickname(storedNickname)
      setLoading(false)
      return
    }
    
    // localStorage에 없으면 Supabase에서 불러오기
    const { data, error } = await getUserProfile(userId)
    
    if (data && data.nickname) {
      setNickname(data.nickname)
      localStorage.setItem('userNickname', data.nickname)
    }
    setLoading(false)
  }

  const handleEditNickname = () => {
    setTempNickname(nickname)
    setIsEditingNickname(true)
  }

  const handleSaveNickname = async () => {
    if (tempNickname.trim() && tempNickname !== nickname) {
      const { data, error } = await updateUserNickname(userId, tempNickname.trim())
      
      if (!error && data) {
        setNickname(data.nickname)
        // localStorage에 저장하여 다른 페이지에서도 사용 가능하도록
        localStorage.setItem('userNickname', data.nickname)
      } else {
        // Mock 환경에서는 그냥 업데이트
        setNickname(tempNickname.trim())
        localStorage.setItem('userNickname', tempNickname.trim())
      }
    }
    setIsEditingNickname(false)
  }

  const handleCancelEdit = () => {
    setIsEditingNickname(false)
    setTempNickname('')
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveNickname()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const handleProfileImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileImage(reader.result)
        // TODO: Supabase Storage에 업로드
      }
      reader.readAsDataURL(file)
    }
  }

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

  return (
    <div className="w-full h-screen relative bg-white overflow-hidden">
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
        {/* Left: Info Button */}
        <button>
          <Info className="w-6 h-6 text-white" />
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
          <X className="w-6 h-6 text-white" strokeWidth={2.5} />
        </button>
      </div>

      {/* Hero Section with Profile */}
      <div className="w-full h-60 relative" style={{ backgroundColor: '#606CF2' }}>
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        
        {/* Profile Image */}
        <div className="absolute left-[30px] top-[50px]">
          <button
            onClick={handleProfileImageClick}
            className="relative w-32 h-32 rounded-full bg-white/90 flex items-center justify-center overflow-hidden hover:bg-white transition-colors group"
          >
            {profileImage ? (
              <img 
                src={profileImage}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-16 h-16 text-indigo-400" strokeWidth={1.5} />
            )}
            
            {/* Camera Icon Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </button>
        </div>
        
        {/* Nickname Section */}
        <div className="absolute left-[180px] top-[40px] right-[20px]">
          {isEditingNickname ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={tempNickname}
                onChange={(e) => setTempNickname(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full px-3 py-2 text-base font-normal bg-white/20 text-white rounded-lg outline-none focus:ring-2 focus:ring-white"

                maxLength={15}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNickname}
                  className="flex-1 h-6 sm:h-9 md:h-9 
                            bg-green-500/40 backdrop-blur-sm 
                            flex items-center justify-center 
                            hover:bg-green-500/70 
                            border-b border-white/80 
                            transition-all"
                                          >
                  <Check className="w-4 h-4 text-white" />
                  <span className="text-white text-sm ml-1">저장</span>
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 h-8 sm:h-9 md:h-9 
                  bg-red-500/40 backdrop-blur-sm 
                  flex items-center justify-center 
                  hover:bg-red-500/70 
                  border-b border-white/80 
                  transition-all"
                >
                  <X className="w-4 h-4 text-white" />
                  <span className="text-white text-sm ml-1">취소</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-white text-base font-normal leading-relaxed truncate">
                {loading ? '로딩 중...' : nickname}
              </h2>
              <button
                onClick={handleEditNickname}
                className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors flex-shrink-0"
              >
                <Edit2 className="w-4 h-4 text-white" />
              </button>
            </div>
          )}
        </div>
        
        {/* Level Badge with Progress Bar - 동적 레벨 표시 (닉네임 편집 중이 아닐 때만 표시) */}
        {!isEditingNickname && (
          <div className="left-[180px] top-[70px] absolute">
          <div className="relative inline-flex items-center gap-1 px-1.5 rounded-full mb-1 overflow-hidden" style={{ zIndex: 10, backgroundColor: 'rgba(30, 27, 75, 0.4)', paddingTop: '2px', paddingBottom: '3px' }}>
            <div className="w-3.5 h-3.5 bg-yellow-400 rounded-full flex-shrink-0" style={{ zIndex: 2 }}></div>
            <span className="text-yellow-400 text-xs font-normal leading-none" style={{ zIndex: 2 }}>Lv.{String(levelInfo.level).padStart(2, '0')}</span>
            
            {/* Progress Bar inside badge */}
            <div className="absolute bottom-0 left-0 w-full bg-yellow-400 transition-all duration-500 ease-out" style={{ width: `${levelInfo.progress}%`, height: '1px', zIndex: 1 }}>
            </div>
          </div>
          
          {/* 다음 레벨까지 진행도 */}
          <div className="mt-2 w-full">
            <div className="text-white text-xs mb-1">다음 레벨까지</div>
            <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-yellow-400 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${levelInfo.progress}%` }}
              />
            </div>
            <div className="text-white/70 text-xs mt-1">{levelInfo.remainingChats}회 남음</div>
          </div>
        </div>
        )}
        
        {/* Robot Image - 오른쪽 하단 */}
        <img 
          src={robotImage}
          alt="Robot Mascot"
          className="w-28 h-28 absolute right-[20px] bottom-[8px] object-contain opacity-90"
        />
        
      </div>

      {/* Menu Items */}
      <div className="w-full bg-gray-50 px-6 py-8">
        <div className="space-y-6">
          {/* 계정 설정 */}
          <button className="w-full flex items-center gap-4 py-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-6 h-6 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.06536 4.55573L8.69776 3.62574L9.06536 4.55573ZM7.24047 4.41234L6.53336 5.11945L7.24047 4.41234ZM4.66074 8.81252L3.74397 8.41311L4.66074 8.81252ZM4.55573 9.06536L3.62574 8.69776L4.55573 9.06536ZM4.55592 14.9346L3.62605 15.3025L4.55592 14.9346ZM4.41239 16.7589L3.70506 16.052L4.41239 16.7589ZM4.66055 15.1863L3.74386 15.5859L4.66055 15.1863ZM4.41266 18.5552L5.11977 17.8481L4.41266 18.5552ZM7.24044 19.5871L6.53311 18.8802L7.24044 19.5871ZM5.44483 19.5874L6.15194 18.8803L5.44483 19.5874ZM8.81283 19.3384L8.41347 20.2552L8.81283 19.3384ZM9.06497 19.4432L8.69736 20.3731L9.06497 19.4432ZM16.759 19.5871L17.4661 18.88L16.759 19.5871ZM15.186 19.3386L14.7865 18.4219L15.186 19.3386ZM18.5555 19.5871L19.2626 20.2942L18.5555 19.5871ZM19.5871 16.759L18.88 17.4661L19.5871 16.759ZM19.5871 18.5555L20.2942 19.2626L19.5871 18.5555ZM19.339 15.1862L18.4225 14.7861L19.339 15.1862ZM19.4438 14.9345L18.5141 14.5661L19.4438 14.9345ZM19.444 9.06547L20.3737 8.69736L19.444 9.06547ZM19.5871 7.24044L18.8802 6.53311L19.5871 7.24044ZM19.3388 8.81266L18.4222 9.21259L19.3388 8.81266ZM19.5874 5.44483L20.2945 4.73773L19.5874 5.44483ZM16.7589 4.41239L16.052 3.70506L16.7589 4.41239ZM14.9346 4.55592L14.5667 5.48578C14.6406 5.51504 14.714 5.54554 14.7867 5.57725L15.1863 4.66055L15.5859 3.74386C15.4923 3.70304 15.3978 3.66376 15.3025 3.62605L14.9346 4.55592ZM18.5552 4.41266L17.8481 5.11977L18.8803 6.15194L19.5874 5.44483L20.2945 4.73773L19.2623 3.70556L18.5552 4.41266ZM19.3388 8.81266L18.4222 9.21259C18.4541 9.28564 18.4848 9.35931 18.5142 9.43358L19.444 9.06547L20.3737 8.69736C20.3358 8.60164 20.2964 8.50675 20.2553 8.41272L19.3388 8.81266ZM22 11.2686H21V12.7314H22H23V11.2686H22ZM19.4438 14.9345L18.5141 14.5661C18.4848 14.64 18.4543 14.7133 18.4225 14.7861L19.339 15.1862L20.2554 15.5863C20.2963 15.4927 20.3357 15.3982 20.3734 15.3029L19.4438 14.9345ZM19.5871 18.5555L18.88 17.8484L17.8484 18.88L18.5555 19.5871L19.2626 20.2942L20.2942 19.2626L19.5871 18.5555ZM15.186 19.3386L14.7865 18.4219C14.714 18.4535 14.6408 18.4839 14.567 18.5131L14.935 19.443L15.3029 20.3728C15.3979 20.3352 15.4922 20.296 15.5856 20.2553L15.186 19.3386ZM12.7309 22V21H11.2691V22V23H12.7309V22ZM9.06497 19.4432L9.43259 18.5132C9.35851 18.4839 9.28503 18.4534 9.21218 18.4216L8.81283 19.3384L8.41347 20.2552C8.50726 20.2961 8.6019 20.3354 8.69736 20.3731L9.06497 19.4432ZM5.44483 19.5874L6.15194 18.8803L5.11977 17.8481L4.41266 18.5552L3.70556 19.2623L4.73773 20.2945L5.44483 19.5874ZM4.66055 15.1863L5.57725 14.7867C5.54554 14.714 5.51504 14.6406 5.48578 14.5667L4.55592 14.9346L3.62605 15.3025C3.66376 15.3978 3.70304 15.4923 3.74386 15.5859L4.66055 15.1863ZM2 12.7314H3V11.2686H2H1V12.7314H2ZM4.55573 9.06536L5.48571 9.43295C5.51508 9.35867 5.54568 9.28499 5.57751 9.21193L4.66074 8.81252L3.74397 8.41311C3.703 8.50715 3.66357 8.60205 3.62574 8.69776L4.55573 9.06536ZM4.41234 5.44508L5.11945 6.15219L6.15219 5.11945L5.44508 4.41234L4.73797 3.70523L3.70523 4.73797L4.41234 5.44508ZM8.81252 4.66074L9.21193 5.57751C9.28499 5.54568 9.35867 5.51508 9.43295 5.48571L9.06536 4.55573L8.69776 3.62574C8.60205 3.66357 8.50715 3.703 8.41311 3.74397L8.81252 4.66074ZM11.2686 2V3H12.7314V2V1H11.2686V2ZM12.7314 2V3C12.8798 3 13 3.12024 13 3.26855H14H15C15 2.01567 13.9843 1 12.7314 1V2ZM10 3.26855H11C11 3.12024 11.1202 3 11.2686 3V2V1C10.0157 1 9 2.01567 9 3.26855H10ZM9.06536 4.55573L9.43295 5.48571C10.2846 5.14908 11 4.32659 11 3.26855H10H9C9 3.36816 8.9227 3.53683 8.69776 3.62574L9.06536 4.55573ZM7.24047 4.41234L6.53336 5.11945C7.28195 5.86804 8.37058 5.94406 9.21193 5.57751L8.81252 4.66074L8.41311 3.74397C8.19216 3.84023 8.01834 3.776 7.94757 3.70523L7.24047 4.41234ZM5.44508 4.41234L6.15219 5.11945C6.25745 5.01419 6.4281 5.01419 6.53336 5.11945L7.24047 4.41234L7.94757 3.70523C7.06127 2.81893 5.62428 2.81893 4.73797 3.70523L5.44508 4.41234ZM4.41234 7.24047L5.11945 6.53336C5.01419 6.4281 5.01419 6.25744 5.11945 6.15219L4.41234 5.44508L3.70523 4.73797C2.81893 5.62428 2.81893 7.06127 3.70523 7.94757L4.41234 7.24047ZM4.66074 8.81252L5.57751 9.21193C5.94406 8.37058 5.86804 7.28195 5.11945 6.53336L4.41234 7.24047L3.70523 7.94757C3.776 8.01834 3.84023 8.19216 3.74397 8.41311L4.66074 8.81252ZM3.26855 10V11C4.32659 11 5.14908 10.2846 5.48571 9.43295L4.55573 9.06536L3.62574 8.69776C3.53683 8.9227 3.36816 9 3.26855 9V10ZM2 11.2686H3C3 11.1202 3.12024 11 3.26855 11V10V9C2.01567 9 1 10.0157 1 11.2686H2ZM3.26855 14V13C3.12024 13 3 12.8798 3 12.7314H2H1C1 13.9843 2.01567 15 3.26855 15V14ZM4.55592 14.9346L5.48578 14.5667C5.14896 13.7154 4.3266 13 3.26855 13V14V15C3.36815 15 3.53697 15.0773 3.62605 15.3025L4.55592 14.9346ZM4.41239 16.7589L5.11971 17.4658C5.8681 16.717 5.94407 15.6283 5.57725 14.7867L4.66055 15.1863L3.74386 15.5859C3.8402 15.8069 3.77605 15.981 3.70506 16.052L4.41239 16.7589ZM4.41266 18.5552L5.11977 17.8481C5.01421 17.7426 5.01418 17.5714 5.11971 17.4658L4.41239 16.7589L3.70506 16.052C2.81889 16.9388 2.81911 18.3759 3.70556 19.2623L4.41266 18.5552ZM7.24044 19.5871L6.53311 18.8802C6.42788 18.9855 6.25721 18.9856 6.15194 18.8803L5.44483 19.5874L4.73773 20.2945C5.62421 21.181 7.06155 21.1808 7.94776 20.294L7.24044 19.5871ZM8.81283 19.3384L9.21218 18.4216C8.37065 18.0551 7.28169 18.1312 6.53311 18.8802L7.24044 19.5871L7.94776 20.294C8.0185 20.2232 8.19239 20.1589 8.41347 20.2552L8.81283 19.3384ZM10 20.7309H11C11 19.6726 10.2844 18.8499 9.43259 18.5132L9.06497 19.4432L8.69736 20.3731C8.92253 20.4621 9 20.631 9 20.7309H10ZM11.2691 22V21C11.1205 21 11 20.8795 11 20.7309H10H9C9 21.9841 10.0159 23 11.2691 23V22ZM14 20.7309H13C13 20.8795 12.8795 21 12.7309 21V22V23C13.9841 23 15 21.9841 15 20.7309H14ZM14.935 19.443L14.567 18.5131C13.7155 18.85 13 19.6726 13 20.7309H14H15C15 20.631 15.0775 20.462 15.3029 20.3728L14.935 19.443ZM16.759 19.5871L17.4661 18.88C16.7172 18.1311 15.6282 18.0551 14.7865 18.4219L15.186 19.3386L15.5856 20.2553C15.8067 20.159 15.9809 20.2232 16.0519 20.2942L16.759 19.5871ZM18.5555 19.5871L17.8484 18.88C17.7428 18.9856 17.5716 18.9856 17.4661 18.88L16.759 19.5871L16.0519 20.2942C16.9385 21.1808 18.376 21.1808 19.2626 20.2942L18.5555 19.5871ZM19.5871 16.759L18.88 17.4661C18.9856 17.5716 18.9856 17.7428 18.88 17.8484L19.5871 18.5555L20.2942 19.2626C21.1808 18.376 21.1808 16.9385 20.2942 16.0519L19.5871 16.759ZM19.339 15.1862L18.4225 14.7861C18.0549 15.628 18.1312 16.7172 18.88 17.4661L19.5871 16.759L20.2942 16.0519C20.2232 15.9809 20.1591 15.8069 20.2554 15.5863L19.339 15.1862ZM20.7314 14V13C19.6734 13 18.8512 13.7154 18.5141 14.5661L19.4438 14.9345L20.3734 15.3029C20.4628 15.0774 20.6319 15 20.7314 15V14ZM22 12.7314H21C21 12.8798 20.8798 13 20.7314 13V14V15C21.9843 15 23 13.9843 23 12.7314H22ZM20.7314 10V11C20.8798 11 21 11.1202 21 11.2686H22H23C23 10.0157 21.9843 9 20.7314 9V10ZM19.444 9.06547L18.5142 9.43358C18.8511 10.2846 19.6734 11 20.7314 11V10V9C20.6319 9 20.4629 8.92266 20.3737 8.69736L19.444 9.06547ZM19.5871 7.24044L18.8802 6.53311C18.1312 7.28169 18.0549 8.37083 18.4222 9.21259L19.3388 8.81266L20.2553 8.41272C20.1591 8.19216 20.2232 8.01851 20.294 7.94776L19.5871 7.24044ZM19.5874 5.44483L18.8803 6.15194C18.9856 6.25721 18.9855 6.42788 18.8802 6.53311L19.5871 7.24044L20.294 7.94776C21.1808 7.06155 21.181 5.62421 20.2945 4.73773L19.5874 5.44483ZM16.7589 4.41239L17.4658 5.11971C17.5714 5.01418 17.7426 5.01421 17.8481 5.11977L18.5552 4.41266L19.2623 3.70556C18.3759 2.81911 16.9388 2.81889 16.052 3.70506L16.7589 4.41239ZM15.1863 4.66055L14.7867 5.57725C15.6283 5.94407 16.717 5.8681 17.4658 5.11971L16.7589 4.41239L16.052 3.70506C15.981 3.77605 15.8069 3.8402 15.5859 3.74386L15.1863 4.66055ZM14.9346 4.55592L15.3025 3.62605C15.0773 3.53697 15 3.36815 15 3.26855H14H13C13 4.3266 13.7154 5.14896 14.5667 5.48578L14.9346 4.55592Z" fill="black"/>
                <circle cx="12" cy="12" r="4" stroke="black" strokeWidth="2"/>
              </svg>
            </div>
            <span className="text-black font-normal" style={{ fontSize: '14px' }}>계정 설정</span>
          </button>

          {/* 북마크 */}
          <button 
            onClick={() => navigate('/bookmarks')}
            className="w-full flex items-center gap-4 py-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 4.5C5 3.67157 5.67157 3 6.5 3H17.5C18.3284 3 19 3.67157 19 4.5V20.5704C19 20.9688 18.5568 21.2072 18.2244 20.9875L12.2756 17.0571C12.1085 16.9467 11.8915 16.9467 11.7244 17.0571L5.77563 20.9875C5.44322 21.2072 5 20.9688 5 20.5704V4.5Z" stroke="black" strokeWidth="2"/>
              </svg>
            </div>
            <span className="text-black font-normal" style={{ fontSize: '14px' }}>북마크</span>
          </button>

          {/* 고객 지원 */}
          <button className="w-full flex items-center gap-4 py-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-6 h-6 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 10C15.4477 10 15 10.4477 15 11C15 11.5523 15.4477 12 16 12L16 11L16 10ZM18.3284 9.82843L19.0355 10.5355L19.0355 10.5355L18.3284 9.82843ZM18.3284 4.17157L19.0355 3.46447L19.0355 3.46447L18.3284 4.17157ZM15.5 2C14.9477 2 14.5 2.44772 14.5 3C14.5 3.55228 14.9477 4 15.5 4L15.5 3L15.5 2ZM1 21C1 21.5523 1.44772 22 2 22C2.55228 22 3 21.5523 3 21H2H1ZM15 21C15 21.5523 15.4477 22 16 22C16.5523 22 17 21.5523 17 21H16H15ZM8.27764 14.0516L8.20639 13.0541L8.20639 13.0541L8.27764 14.0516ZM8.86729 14.0168L8.84518 13.017L8.84518 13.017L8.86729 14.0168ZM9.72236 14.0516L9.79361 13.0541L9.79361 13.0541L9.72236 14.0516ZM9.13271 14.0168L9.15482 13.017L9.15482 13.017L9.13271 14.0168ZM15.4769 16.2468L14.6077 16.7412L14.6077 16.7412L15.4769 16.2468ZM14.2204 14.8973L14.7755 14.0656L14.7755 14.0656L14.2204 14.8973ZM2.52313 16.2468L1.65391 15.7523L1.65391 15.7523L2.52313 16.2468ZM3.7796 14.8973L4.3347 15.7291L4.3347 15.7291L3.7796 14.8973ZM21 21C21 21.5523 21.4477 22 22 22C22.5523 22 23 21.5523 23 21H22H21ZM21.996 17.699L22.995 17.6541L22.995 17.6541L21.996 17.699ZM19.2997 13.046C18.7728 12.8805 18.2115 13.1734 18.046 13.7003C17.8805 14.2272 18.1734 14.7885 18.7003 14.954L19 14L19.2997 13.046ZM19.3688 14.1201L19.711 13.1804L19.711 13.1804L19.3688 14.1201ZM13 7H12C12 8.65685 10.6569 10 9 10V11V12C11.7614 12 14 9.76142 14 7H13ZM9 11V10C7.34315 10 6 8.65685 6 7H5H4C4 9.76142 6.23858 12 9 12V11ZM5 7H6C6 5.34315 7.34315 4 9 4V3V2C6.23858 2 4 4.23858 4 7H5ZM9 3V4C10.6569 4 12 5.34315 12 7H13H14C14 4.23858 11.7614 2 9 2V3ZM16 11L16 12C16.6799 12 17.2464 11.8607 17.7692 11.5681C18.258 11.2945 18.6605 10.9106 19.0355 10.5355L18.3284 9.82843L17.6213 9.12132C17.2462 9.49641 17.015 9.69828 16.7923 9.82292C16.6036 9.92856 16.381 10 16 10L16 11ZM18.3284 9.82843L19.0355 10.5355C19.9732 9.59785 20.5 8.32608 20.5 7L19.5 7L18.5 7C18.5 7.79565 18.1839 8.55871 17.6213 9.12132L18.3284 9.82843ZM19.5 7L20.5 7C20.5 5.67392 19.9732 4.40215 19.0355 3.46447L18.3284 4.17157L17.6213 4.87868C18.1839 5.44129 18.5 6.20435 18.5 7L19.5 7ZM18.3284 4.17157L19.0355 3.46447C18.0979 2.52678 16.8261 2 15.5 2L15.5 3L15.5 4C16.2957 4 17.0587 4.31607 17.6213 4.87868L18.3284 4.17157ZM2 21H3V20.7936H2H1V21H2ZM16 20.7936H15V21H16H17V20.7936H16ZM8.27764 14.0516L8.34889 15.0491C8.65281 15.0273 8.77203 15.0191 8.88941 15.0165L8.86729 14.0168L8.84518 13.017C8.66745 13.0209 8.49194 13.0337 8.20639 13.0541L8.27764 14.0516ZM9.72236 14.0516L9.79361 13.0541C9.50806 13.0337 9.33255 13.0209 9.15482 13.017L9.13271 14.0168L9.11059 15.0165C9.22797 15.0191 9.34719 15.0273 9.65111 15.0491L9.72236 14.0516ZM8.86729 14.0168L8.88941 15.0165C8.96313 15.0149 9.03687 15.0149 9.11059 15.0165L9.13271 14.0168L9.15482 13.017C9.05162 13.0147 8.94838 13.0147 8.84518 13.017L8.86729 14.0168ZM16 20.7936H17C17 19.6029 17.001 18.643 16.9305 17.8678C16.8587 17.0775 16.7067 16.3863 16.3461 15.7523L15.4769 16.2468L14.6077 16.7412C14.7702 17.0269 14.8798 17.4 14.9387 18.0488C14.999 18.7125 15 19.5662 15 20.7936H16ZM9.72236 14.0516L9.65111 15.0491C10.8754 15.1365 11.7268 15.1983 12.3846 15.3057C13.0275 15.4108 13.3919 15.5466 13.6653 15.7291L14.2204 14.8973L14.7755 14.0656C14.1689 13.6607 13.4902 13.4599 12.7071 13.3319C11.9388 13.2064 10.9813 13.139 9.79361 13.0541L9.72236 14.0516ZM15.4769 16.2468L16.3461 15.7523C15.9611 15.0754 15.4232 14.4978 14.7755 14.0656L14.2204 14.8973L13.6653 15.7291C14.0539 15.9885 14.3766 16.3351 14.6077 16.7412L15.4769 16.2468ZM2 20.7936H3C3 19.5662 3.00096 18.7125 3.06129 18.0488C3.12025 17.4 3.2298 17.0269 3.39234 16.7412L2.52313 16.2468L1.65391 15.7523C1.29332 16.3863 1.14131 17.0775 1.0695 17.8678C0.999039 18.643 1 19.6029 1 20.7936H2ZM8.27764 14.0516L8.20639 13.0541C7.01871 13.139 6.06115 13.2064 5.29291 13.3319C4.50981 13.4599 3.83111 13.6607 3.2245 14.0656L3.7796 14.8973L4.3347 15.7291C4.60814 15.5466 4.97248 15.4108 5.61538 15.3057C6.27315 15.1983 7.12459 15.1365 8.34889 15.0491L8.27764 14.0516ZM2.52313 16.2468L3.39234 16.7412C3.62336 16.3351 3.94605 15.9885 4.3347 15.7291L3.7796 14.8973L3.2245 14.0656C2.57675 14.4978 2.03894 15.0754 1.65391 15.7523L2.52313 16.2468ZM22 18.0868H21V21H22H23V18.0868H22ZM22 18.0868H23C23 17.898 23.0002 17.7717 22.995 17.6541L21.996 17.699L20.997 17.7439C20.9998 17.8058 21 17.8782 21 18.0868H22ZM19 14L18.7003 14.954C18.8994 15.0166 18.9684 15.0385 19.0266 15.0597L19.3688 14.1201L19.711 13.1804C19.6003 13.1401 19.4798 13.1025 19.2997 13.046L19 14ZM21.996 17.699L22.995 17.6541C22.9043 15.6365 21.6087 13.8715 19.711 13.1804L19.3688 14.1201L19.0266 15.0597C20.1652 15.4744 20.9426 16.5333 20.997 17.7439L21.996 17.699Z" fill="black"/>
              </svg>
            </div>
            <span className="text-black font-normal" style={{ fontSize: '14px' }}>고객 지원</span>
          </button>
        </div>
      </div>

      {/* 개발용 디버그 패널 (프로덕션에서는 제거) */}
      <LevelDebugPanel show={false} />
    </div>
  )
}

export default ProfilePage

