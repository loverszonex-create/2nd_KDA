import { useState, useEffect } from 'react'
import { getChatCount, saveChatCount, calculateProgress, LEVEL_REQUIREMENTS } from '../utils/levelSystem'

/**
 * 개발용 레벨 시스템 디버그 패널
 * 프로덕션에서는 제거하거나 숨기세요
 */
function LevelDebugPanel({ show = false }) {
  const [chatCount, setChatCount] = useState(0)
  const [levelInfo, setLevelInfo] = useState(null)
  const [isOpen, setIsOpen] = useState(show)

  const loadData = () => {
    const count = getChatCount()
    setChatCount(count)
    const info = calculateProgress(count)
    setLevelInfo(info)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSetCount = (value) => {
    const newCount = parseInt(value, 10) || 0
    saveChatCount(newCount)
    setChatCount(newCount)
    loadData()
  }

  const handleQuickSet = (preset) => {
    saveChatCount(preset)
    loadData()
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-12 h-12 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all z-50 flex items-center justify-center text-xl font-bold"
      >
        🔧
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white rounded-lg shadow-2xl border-2 border-purple-500 z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-purple-600 text-white px-4 py-3 flex justify-between items-center">
        <h3 className="font-bold">레벨 시스템 디버그</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:text-red-300 text-xl font-bold"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {/* Current Status */}
        {levelInfo && (
          <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">현재 상태</div>
            <div className="text-2xl font-bold text-purple-600">
              Lv.{String(levelInfo.level).padStart(2, '0')}
            </div>
            <div className="text-sm text-gray-700 mt-1">
              {levelInfo.levelName}
            </div>
            <div className="mt-2 text-xs text-gray-600">
              진행도: {levelInfo.progress.toFixed(1)}% 
              ({levelInfo.currentInLevel}/{levelInfo.neededForNextLevel})
            </div>
            <div className="text-xs text-gray-600">
              다음 레벨까지: {levelInfo.remainingChats}회
            </div>
          </div>
        )}

        {/* Manual Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            대화 횟수 설정
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              max="10000"
              value={chatCount}
              onChange={(e) => setChatCount(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <button
              onClick={() => handleSetCount(chatCount)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              적용
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">
            빠른 설정
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickSet(0)}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs"
            >
              초기화 (0)
            </button>
            <button
              onClick={() => handleQuickSet(48)}
              className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-xs"
            >
              Lv.1 끝 (48)
            </button>
            <button
              onClick={() => handleQuickSet(145)}
              className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-xs"
            >
              Lv.2 끝 (145)
            </button>
            <button
              onClick={() => handleQuickSet(295)}
              className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs"
            >
              Lv.3 끝 (295)
            </button>
            <button
              onClick={() => handleQuickSet(495)}
              className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs"
            >
              Lv.4 끝 (495)
            </button>
            <button
              onClick={() => handleQuickSet(3500)}
              className="px-3 py-2 bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 text-purple-900 rounded-lg hover:opacity-80 transition-opacity text-xs font-bold"
            >
              Lv.10 (3500)
            </button>
          </div>
        </div>

        {/* Level Requirements Table */}
        <div className="text-xs">
          <div className="text-sm font-medium text-gray-700 mb-2">
            레벨별 요구사항
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {Object.entries(LEVEL_REQUIREMENTS).map(([level, req]) => (
              <div
                key={level}
                className={`px-2 py-1 rounded ${
                  levelInfo?.level === parseInt(level)
                    ? 'bg-purple-100 border border-purple-300'
                    : 'bg-gray-50'
                }`}
              >
                <span className="font-medium">Lv.{level}</span>
                <span className="text-gray-600 ml-2">
                  {req.min} - {req.max === 999999 ? '∞' : req.max}회
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 text-center border-t">
        프로덕션 배포 시 제거하세요
      </div>
    </div>
  )
}

export default LevelDebugPanel

