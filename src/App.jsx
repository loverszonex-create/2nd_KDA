import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ChatPage from './pages/ChatPage'
import ProfilePage from './pages/ProfilePage'
import WeeklyReportPage from './pages/WeeklyReportPage'
import BookmarkPage from './pages/BookmarkPage'

function App() {
  return (
    <Router>
      <div className="w-full min-h-screen bg-gray-100 flex justify-center">
        <div className="w-full max-w-[393px] bg-white shadow-2xl">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat/:stockName" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/dashboard" element={<ProfilePage />} />
            <Route path="/weekly-report" element={<WeeklyReportPage />} />
            <Route path="/bookmarks" element={<BookmarkPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App

