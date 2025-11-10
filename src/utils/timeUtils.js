/**
 * 시간 경과 계산 및 포맷팅 유틸리티
 */

/**
 * 마지막 메시지 시간으로부터 경과 시간 계산
 * @param {Date|string|number} lastMessageTime - 마지막 메시지 시간
 * @returns {string} "방금 전", "5분 전", "2시간 전", "어제", "3일 전" 등
 */
export function getTimeAgo(lastMessageTime) {
  const now = new Date()
  const past = new Date(lastMessageTime)
  const diffMs = now - past
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return '방금 전'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}분 전`
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`
  } else if (diffDays === 1) {
    return '어제'
  } else if (diffDays < 7) {
    return `${diffDays}일 전`
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks}주 전`
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months}개월 전`
  } else {
    const years = Math.floor(diffDays / 365)
    return `${years}년 전`
  }
}

/**
 * ISO 문자열을 Date 객체로 변환
 * @param {string} isoString
 * @returns {Date}
 */
export function parseISOString(isoString) {
  return new Date(isoString)
}

/**
 * 현재 시간을 ISO 문자열로 반환
 * @returns {string}
 */
export function getCurrentISOString() {
  return new Date().toISOString()
}

/**
 * 실시간 업데이트를 위한 Hook용 타이머
 * 1분마다 재계산하여 "n분 전" 표시 업데이트
 */
export function createTimeUpdateInterval(callback, intervalMs = 60000) {
  const intervalId = setInterval(callback, intervalMs)
  return intervalId
}

/**
 * 타이머 정리
 */
export function clearTimeUpdateInterval(intervalId) {
  clearInterval(intervalId)
}

/**
 * Mock 데이터: 테스트용 마지막 메시지 시간 생성
 */
export function getMockLastMessageTime(minutesAgo) {
  const now = new Date()
  return new Date(now.getTime() - minutesAgo * 60 * 1000)
}

/**
 * 시간 문자열을 파싱하여 Date 객체로 변환
 * "방금 전", "5분 전", "어제" 등의 문자열을 역으로 Date로 변환
 * (주로 기존 데이터 마이그레이션용)
 */
export function parseTimeAgoString(timeAgoString) {
  const now = new Date()

  if (timeAgoString === '방금 전') {
    return new Date(now.getTime() - 30 * 1000) // 30초 전
  }

  const minuteMatch = timeAgoString.match(/(\d+)분 전/)
  if (minuteMatch) {
    return new Date(now.getTime() - parseInt(minuteMatch[1]) * 60 * 1000)
  }

  const hourMatch = timeAgoString.match(/(\d+)시간 전/)
  if (hourMatch) {
    return new Date(now.getTime() - parseInt(hourMatch[1]) * 60 * 60 * 1000)
  }

  if (timeAgoString === '어제') {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }

  const dayMatch = timeAgoString.match(/(\d+)일 전/)
  if (dayMatch) {
    return new Date(now.getTime() - parseInt(dayMatch[1]) * 24 * 60 * 60 * 1000)
  }

  return now
}

