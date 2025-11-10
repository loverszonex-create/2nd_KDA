/**
 * 북마크 관리 유틸리티
 */

/**
 * 모든 북마크 가져오기
 * @returns {Array} 북마크 배열
 */
export const getBookmarks = () => {
  try {
    const stored = localStorage.getItem('bookmarks')
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading bookmarks:', error)
    return []
  }
}

/**
 * 북마크 저장
 * @param {Array} bookmarks - 북마크 배열
 */
export const saveBookmarks = (bookmarks) => {
  try {
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks))
  } catch (error) {
    console.error('Error saving bookmarks:', error)
  }
}

/**
 * 북마크 추가
 * @param {Object} bookmark - 북마크 객체
 * @returns {boolean} 성공 여부
 */
export const addBookmark = (bookmark) => {
  try {
    const bookmarks = getBookmarks()
    const newBookmark = {
      id: Date.now().toString(),
      ...bookmark,
      createdAt: new Date().toISOString()
    }
    bookmarks.unshift(newBookmark) // 최신 항목을 앞에 추가
    saveBookmarks(bookmarks)
    return true
  } catch (error) {
    console.error('Error adding bookmark:', error)
    return false
  }
}

/**
 * 북마크 삭제
 * @param {string} bookmarkId - 북마크 ID
 * @returns {boolean} 성공 여부
 */
export const removeBookmark = (bookmarkId) => {
  try {
    const bookmarks = getBookmarks()
    const filtered = bookmarks.filter(b => b.id !== bookmarkId)
    saveBookmarks(filtered)
    return true
  } catch (error) {
    console.error('Error removing bookmark:', error)
    return false
  }
}

/**
 * 메시지가 북마크되어 있는지 확인
 * @param {string} messageId - 메시지 ID
 * @returns {boolean} 북마크 여부
 */
export const isBookmarked = (messageId) => {
  try {
    const bookmarks = getBookmarks()
    return bookmarks.some(b => b.messageId === messageId)
  } catch (error) {
    console.error('Error checking bookmark:', error)
    return false
  }
}

/**
 * 메시지 ID로 북마크 찾기
 * @param {string} messageId - 메시지 ID
 * @returns {Object|null} 북마크 객체 또는 null
 */
export const findBookmarkByMessageId = (messageId) => {
  try {
    const bookmarks = getBookmarks()
    return bookmarks.find(b => b.messageId === messageId) || null
  } catch (error) {
    console.error('Error finding bookmark:', error)
    return null
  }
}

