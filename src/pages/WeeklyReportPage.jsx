import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Download, Share2, TrendingUp, TrendingDown, Award, Target } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

function WeeklyReportPage() {
  const navigate = useNavigate()

  const weeklyPerformance = [
    { day: '월', profit: 45000 },
    { day: '화', profit: -23000 },
    { day: '수', profit: 67000 },
    { day: '목', profit: 31000 },
    { day: '금', profit: 89000 }
  ]

  const portfolioData = [
    { name: '삼성전자', value: 35, color: '#3B82F6' },
    { name: 'SK하이닉스', value: 28, color: '#8B5CF6' },
    { name: '삼성SDI', value: 22, color: '#EC4899' },
    { name: '기타', value: 15, color: '#10B981' }
  ]

  const tradingStats = [
    { label: '총 거래 횟수', value: '24회', change: '+3' },
    { label: '승률', value: '62.5%', change: '+5.2%' },
    { label: '평균 수익률', value: '+3.8%', change: '+1.1%' },
    { label: '최대 수익', value: '89,000원', change: '신기록' }
  ]

  const achievements = [
    { icon: '🏆', title: '연승 달성', description: '5일 연속 수익 달성!' },
    { icon: '🎯', title: '목표 달성', description: '주간 목표 120% 달성' },
    { icon: '📚', title: '학습왕', description: 'AI 추천 10개 학습 완료' }
  ]

  const improvementAreas = [
    {
      area: '손절매 실행',
      current: 68,
      target: 90,
      description: '손실 확정이 어려운 경우가 있습니다.'
    },
    {
      area: '포트폴리오 다각화',
      current: 75,
      target: 85,
      description: '기술주 비중이 높습니다.'
    },
    {
      area: '장기 보유',
      current: 45,
      target: 70,
      description: '단기 매매가 많습니다.'
    }
  ]

  return (
    <div className="w-96 min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="w-full h-16 bg-indigo-600 flex items-center justify-between px-4">
        <button onClick={() => navigate('/')} className="p-1">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-white text-lg font-normal">주간 리포트</h1>
        <div className="flex gap-2">
          <button className="p-1">
            <Share2 className="w-5 h-5 text-white" />
          </button>
          <button className="p-1">
            <Download className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="p-5 space-y-6">
        {/* Header Card */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 text-white">
          <p className="text-sm opacity-90 mb-2">11월 1주차 (11/1 - 11/7)</p>
          <h2 className="text-2xl font-bold mb-4">주간 투자 리포트</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm opacity-80 mb-1">총 수익</p>
              <p className="text-2xl font-bold">+209,000원</p>
            </div>
            <div>
              <p className="text-sm opacity-80 mb-1">수익률</p>
              <p className="text-2xl font-bold">+8.7%</p>
            </div>
          </div>
        </div>

        {/* Daily Performance */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            일별 수익 현황
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip 
                formatter={(value) => `${value >= 0 ? '+' : ''}${value.toLocaleString()}원`}
                contentStyle={{ borderRadius: '8px' }}
              />
              <Bar dataKey="profit" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trading Statistics */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h3 className="text-lg font-semibold mb-4">거래 통계</h3>
          <div className="grid grid-cols-2 gap-3">
            {tradingStats.map((stat, idx) => (
              <div key={idx} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
                <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
                <p className="text-xl font-bold text-indigo-900 mb-1">{stat.value}</p>
                <p className="text-xs text-green-600 font-medium">{stat.change}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio Distribution */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h3 className="text-lg font-semibold mb-4">포트폴리오 구성</h3>
          <div className="flex items-center justify-center mb-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={portfolioData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {portfolioData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {portfolioData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm">{item.name}</span>
                </div>
                <span className="text-sm font-semibold">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            이번 주 성과
          </h3>
          <div className="space-y-3">
            {achievements.map((achievement, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                <div className="text-3xl">{achievement.icon}</div>
                <div>
                  <h4 className="font-semibold text-gray-900">{achievement.title}</h4>
                  <p className="text-sm text-gray-700">{achievement.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Improvement Areas */}
        <div className="bg-white rounded-2xl shadow-md p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            개선이 필요한 영역
          </h3>
          <div className="space-y-4">
            {improvementAreas.map((item, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{item.area}</span>
                  <span className="text-xs text-gray-600">{item.current}% / {item.target}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all"
                    style={{ width: `${item.current}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-5 text-white">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            🤖 AI 코치 추천
          </h3>
          <div className="space-y-3 text-sm">
            <p>✅ 이번 주 거래 패턴이 개선되었습니다. 계속 유지하세요!</p>
            <p>💡 손절매 타이밍을 놓치는 경우가 있습니다. 자동 손절 설정을 고려해보세요.</p>
            <p>📚 추천 학습: "분산투자의 중요성"을 학습하면 포트폴리오 관리에 도움이 됩니다.</p>
          </div>
          <button className="mt-4 w-full bg-white text-purple-600 py-3 rounded-xl font-medium hover:bg-gray-100 transition-colors">
            키우Me와 상담하기
          </button>
        </div>

        {/* Next Week Goals */}
        <div className="bg-white rounded-2xl shadow-md p-5 border-2 border-dashed border-indigo-300">
          <h3 className="text-lg font-semibold mb-4 text-indigo-900">다음 주 목표</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded" />
              <span className="text-sm">손절매 원칙 100% 준수하기</span>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded" />
              <span className="text-sm">새로운 섹터 종목 1개 이상 분석하기</span>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" className="w-5 h-5 text-indigo-600 rounded" />
              <span className="text-sm">매매 일지 5회 이상 작성하기</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-96 h-20 bg-white border-t border-gray-200 flex items-center justify-around">
        <button className="flex flex-col items-center gap-1" onClick={() => navigate('/')}>
          <div className="text-2xl">🏠</div>
          <span className="text-xs text-gray-500">홈</span>
        </button>
        <button className="flex flex-col items-center gap-1" onClick={() => navigate('/dashboard')}>
          <div className="text-2xl">📊</div>
          <span className="text-xs text-gray-500">대시보드</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="text-2xl">📋</div>
          <span className="text-xs text-indigo-600">주간리포트</span>
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

export default WeeklyReportPage

