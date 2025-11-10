/**
 * 레벨 시스템 유틸리티
 * 사용자의 대화 횟수를 기반으로 레벨과 진행도를 계산합니다
 */

// 레벨별 필요 대화 횟수 정의
export const LEVEL_REQUIREMENTS = {
  1: { min: 0, max: 50, name: '새싹 투자자' },
  2: { min: 50, max: 150, name: '초보 투자자' },
  3: { min: 150, max: 300, name: '중급 투자자' },
  4: { min: 300, max: 500, name: '숙련 투자자' },
  5: { min: 500, max: 800, name: '고급 투자자' },
  6: { min: 800, max: 1200, name: '전문 투자자' },
  7: { min: 1200, max: 1700, name: '마스터 투자자' },
  8: { min: 1700, max: 2500, name: '전설의 투자자' },
  9: { min: 2500, max: 3500, name: '투자 구루' },
  10: { min: 3500, max: 999999, name: '투자의 신' }
}

/**
 * 대화 횟수로부터 현재 레벨 계산
 * @param {number} chatCount - 총 대화 횟수
 * @returns {number} 현재 레벨 (1-10)
 */
export const calculateLevel = (chatCount) => {
  for (let level = 1; level <= 10; level++) {
    const requirement = LEVEL_REQUIREMENTS[level]
    if (chatCount >= requirement.min && chatCount < requirement.max) {
      return level
    }
  }
  return 10 // 최대 레벨
}

/**
 * 다음 레벨까지의 진행도 계산 (0-100%)
 * @param {number} chatCount - 총 대화 횟수
 * @returns {object} { level, progress, current, needed, nextLevel }
 */
export const calculateProgress = (chatCount) => {
  const currentLevel = calculateLevel(chatCount)
  const requirement = LEVEL_REQUIREMENTS[currentLevel]
  
  // 현재 레벨에서의 진행도
  const currentInLevel = chatCount - requirement.min
  const neededForNextLevel = requirement.max - requirement.min
  const progress = (currentInLevel / neededForNextLevel) * 100
  
  // 다음 레벨까지 남은 대화 수
  const remainingChats = requirement.max - chatCount
  
  return {
    level: currentLevel,
    progress: Math.min(progress, 100), // 최대 100%
    currentInLevel,
    neededForNextLevel,
    remainingChats: remainingChats > 0 ? remainingChats : 0,
    levelName: requirement.name,
    nextLevelName: LEVEL_REQUIREMENTS[currentLevel + 1]?.name || '최고 레벨'
  }
}

/**
 * 레벨 배지 색상 가져오기
 * @param {number} level - 레벨 (1-10)
 * @returns {string} Tailwind CSS 클래스
 */
export const getLevelBadgeColor = (level) => {
  const colors = {
    1: 'bg-yellow-400 text-black',
    2: 'bg-yellow-500 text-black',
    3: 'bg-orange-400 text-white',
    4: 'bg-orange-500 text-white',
    5: 'bg-red-400 text-white',
    6: 'bg-red-500 text-white',
    7: 'bg-purple-500 text-white',
    8: 'bg-purple-600 text-white',
    9: 'bg-indigo-600 text-white',
    10: 'bg-purple-700 text-white'
  }
  return colors[level] || colors[1]
}

/**
 * LocalStorage에서 대화 횟수 가져오기
 * @returns {number} 저장된 대화 횟수
 */
export const getChatCount = () => {
  try {
    const stored = localStorage.getItem('userChatCount')
    return stored ? parseInt(stored, 10) : 0
  } catch (error) {
    console.error('Error reading chat count:', error)
    return 0
  }
}

/**
 * LocalStorage에 대화 횟수 저장
 * @param {number} count - 대화 횟수
 */
export const saveChatCount = (count) => {
  try {
    localStorage.setItem('userChatCount', count.toString())
  } catch (error) {
    console.error('Error saving chat count:', error)
  }
}

/**
 * 대화 횟수 증가
 * @returns {number} 업데이트된 대화 횟수
 */
export const incrementChatCount = () => {
  const current = getChatCount()
  const newCount = current + 1
  saveChatCount(newCount)
  return newCount
}

/**
 * 레벨업 확인
 * @param {number} oldCount - 이전 대화 횟수
 * @param {number} newCount - 새로운 대화 횟수
 * @returns {boolean} 레벨업 여부
 */
export const isLevelUp = (oldCount, newCount) => {
  const oldLevel = calculateLevel(oldCount)
  const newLevel = calculateLevel(newCount)
  return newLevel > oldLevel
}

