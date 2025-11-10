import { useNavigate } from 'react-router-dom'
import { ChevronLeft, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function DashboardPage() {
  const navigate = useNavigate()

  // Sample data for charts
  const priceData = [
    { date: '11/1', price: 98000 },
    { date: '11/2', price: 99500 },
    { date: '11/3', price: 97000 },
    { date: '11/4', price: 96700 },
    { date: '11/5', price: 98200 },
    { date: '11/6', price: 99800 },
    { date: '11/7', price: 101000 }
  ]

  const volumeData = [
    { date: '11/1', volume: 15000000 },
    { date: '11/2', volume: 18000000 },
    { date: '11/3', volume: 25000000 },
    { date: '11/4', volume: 22000000 },
    { date: '11/5', volume: 19000000 },
    { date: '11/6', volume: 16000000 },
    { date: '11/7', volume: 20000000 }
  ]

  const myStocks = [
    { name: '삼성전자', price: 101000, change: 2.5, shares: 10 },
    { name: 'SK하이닉스', price: 178000, change: -1.2, shares: 5 },
    { name: '삼성SDI', price: 445000, change: 3.8, shares: 2 }
  ]

  return (
    <div className="w-96 min-h-screen bg-white">
      {/* Header */}
      <div className="w-full h-16 bg-indigo-600 flex items-center justify-between px-4">
        <button onClick={() => navigate('/')} className="p-1">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-white text-lg font-normal">주식 대시보드</h1>
        <div className="w-6" />
      </div>

      {/* Main Content */}
      <div className="p-5 space-y-6">
        {/* Market Overview */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white">
          <h2 className="text-sm opacity-80 mb-2">코스피</h2>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold">2,645.50</p>
              <div className="flex items-center gap-2 mt-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">+25.30 (+0.97%)</span>
              </div>
            </div>
            <div className="text-right text-sm">
              <p>11월 7일</p>
              <p className="opacity-80">15:30 기준</p>
            </div>
          </div>
        </div>

        {/* Price Chart */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">삼성전자 주가 추이</h3>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-xs">1주</button>
              <button className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">1개월</button>
              <button className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">3개월</button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={priceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={['dataMin - 2000', 'dataMax + 2000']} />
              <Tooltip />
              <Line type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Volume Chart */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <h3 className="text-lg font-semibold mb-4">거래량</h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="volume" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* My Portfolio */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">내 포트폴리오</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {myStocks.map((stock, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium">{stock.name}</p>
                  <p className="text-sm text-gray-500">{stock.shares}주 보유</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{stock.price.toLocaleString()}원</p>
                  <div className={`flex items-center gap-1 text-sm ${stock.change >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                    {stock.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{stock.change >= 0 ? '+' : ''}{stock.change}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-xl p-4 text-white">
            <p className="text-sm opacity-80 mb-1">총 수익률</p>
            <p className="text-2xl font-bold">+8.5%</p>
            <p className="text-xs mt-2">+1,250,000원</p>
          </div>
          <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-4 text-white">
            <p className="text-sm opacity-80 mb-1">평가 금액</p>
            <p className="text-2xl font-bold">15.8M</p>
            <p className="text-xs mt-2">원화 기준</p>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">🤖</span>
            </div>
            <h3 className="font-semibold text-purple-900">AI 인사이트</h3>
          </div>
          <p className="text-sm text-purple-800">
            삼성전자가 최근 반등세를 보이고 있습니다. 저가 매수 타이밍을 놓치지 마세요. 
            장기 투자 관점에서 긍정적인 신호입니다.
          </p>
          <button 
            onClick={() => navigate('/chat/삼성전자')}
            className="mt-3 w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            키우Me와 대화하기
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-96 h-20 bg-white border-t border-gray-200 flex items-center justify-around">
        <button className="flex flex-col items-center gap-1" onClick={() => navigate('/')}>
          <div className="text-2xl">🏠</div>
          <span className="text-xs text-gray-500">홈</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="text-2xl">📊</div>
          <span className="text-xs text-indigo-600">대시보드</span>
        </button>
        <button className="flex flex-col items-center gap-1" onClick={() => navigate('/weekly-report')}>
          <div className="text-2xl">📋</div>
          <span className="text-xs text-gray-500">주간리포트</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="text-2xl">👤</div>
          <span className="text-xs text-gray-500">마이페이지</span>
        </button>
      </div>

      <div className="h-20" />
    </div>
  )
}

export default DashboardPage

