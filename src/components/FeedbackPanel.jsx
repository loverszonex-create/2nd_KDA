import { ThumbsUp, ThumbsDown, Lightbulb, TrendingUp, AlertCircle } from 'lucide-react'

function FeedbackPanel({ stockName = '삼성전자' }) {
  const feedbackItems = [
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: '긍정적 신호',
      message: '최근 3일간 거래량이 평균 대비 25% 증가했습니다.',
      type: 'positive'
    },
    {
      icon: <AlertCircle className="w-5 h-5" />,
      title: '주의 필요',
      message: '외국인 투자자의 매도세가 지속되고 있습니다.',
      type: 'warning'
    }
  ]

  const actionRecommendations = [
    {
      icon: '💎',
      title: '분할 매수 전략',
      description: '현재 가격에서 30% 매수 후 추가 하락 시 분할 매수를 권장합니다.',
      confidence: 85
    },
    {
      icon: '🎯',
      title: '목표가 설정',
      description: '단기 목표가 105,000원, 중기 목표가 110,000원으로 설정하세요.',
      confidence: 78
    },
    {
      icon: '⚖️',
      title: '리밸런싱',
      description: '포트폴리오 내 비중이 높습니다. 다른 종목 추가를 고려하세요.',
      confidence: 72
    }
  ]

  return (
    <div className="w-full bg-white rounded-2xl shadow-lg p-5 space-y-6">
      {/* Feedback Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">AI 피드백</h3>
          <div className="flex gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ThumbsUp className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ThumbsDown className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {feedbackItems.map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-xl border-l-4 ${
                item.type === 'positive'
                  ? 'bg-green-50 border-green-500'
                  : 'bg-yellow-50 border-yellow-500'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 ${
                    item.type === 'positive' ? 'text-green-600' : 'text-yellow-600'
                  }`}
                >
                  {item.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-700">{item.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Recommendations */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">행동 추천</h3>
        </div>

        <div className="space-y-3">
          {actionRecommendations.map((action, idx) => (
            <div
              key={idx}
              className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{action.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{action.title}</h4>
                    <span className="text-xs font-medium text-purple-700 bg-purple-200 px-2 py-1 rounded-full">
                      신뢰도 {action.confidence}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{action.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trading Behavior Analysis */}
      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-3">나의 투자 행동 분석</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">평균 보유 기간</p>
            <p className="text-lg font-bold text-blue-900">24일</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">손절매 준수율</p>
            <p className="text-lg font-bold text-blue-900">68%</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">익절 타이밍</p>
            <p className="text-lg font-bold text-blue-900">양호</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">감정적 거래</p>
            <p className="text-lg font-bold text-red-600">주의</p>
          </div>
        </div>
        <p className="text-xs text-blue-800 mt-3">
          💡 최근 급등/급락 시 충동적 거래가 늘었습니다. 매매 원칙을 다시 점검해보세요.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors">
          매매 일지 작성
        </button>
        <button className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors">
          상세 분석 보기
        </button>
      </div>
    </div>
  )
}

export default FeedbackPanel

