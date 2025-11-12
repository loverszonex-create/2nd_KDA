// 종목 로고 컴포넌트
const StockLogo = ({ stockName, size = 'md' }) => {
  // 종목명 -> 로고 타입 매핑
  const logoMap = {
    '삼성전자': 'samsung',
    '에코프로': 'battery',
    '삼성SDI': 'samsungsdi',
    '현대차': 'hyundai',
    'LG에너지솔루션': 'lg',
    '기아': 'kia',
    'SK하이닉스': 'sk',
    '금융주 팀톡': 'finance'
  }

  const logoType = logoMap[stockName] || 'default'

  // 크기별 스타일
  const sizeStyles = {
    xs: 'w-7 h-7 text-[6px]',      // 채팅 프로필용
    sm: 'w-6 h-6 text-[7px]',      // 헤더용
    md: 'w-14 h-14 text-[10px]',   // HomePage 기본
    lg: 'w-20 h-20 text-sm'        // 확대용
  }

  const sizeClass = sizeStyles[size] || sizeStyles.md
  
  // xs, sm 사이즈에서는 테두리 제거 (이미 부모에 테두리 있음)
  const borderClass = (size === 'xs' || size === 'sm') ? '' : 'border border-stone-500'
  
  // 이모지 크기 (xs/sm은 작게)
  const emojiSize = (size === 'xs' || size === 'sm') ? 'text-xs' : 'text-xl'

  return (
    <div className={`${sizeClass} bg-white rounded-full ${borderClass} flex items-center justify-center overflow-hidden`}>
      {logoType === 'samsung' && (
        <div className="text-blue-600 font-bold">SAMSUNG</div>
      )}
      {logoType === 'battery' && (
        <div className={`text-green-600 ${emojiSize}`}>🔋</div>
      )}
      {logoType === 'samsungsdi' && (
        <div className="text-indigo-600 font-bold">SDI</div>
      )}
      {logoType === 'hyundai' && (
        <div className="text-blue-800 font-bold">HYUNDAI</div>
      )}
      {logoType === 'lg' && (
        <div className="text-red-500 font-bold">LG</div>
      )}
      {logoType === 'kia' && (
        <div className="text-gray-700 font-bold">KIA</div>
      )}
      {logoType === 'sk' && (
        <div className="text-red-600 font-bold">SK</div>
      )}
      {logoType === 'finance' && (
        <div className={`text-green-600 ${emojiSize}`}>💰</div>
      )}
      {logoType === 'default' && (
        <div className="text-gray-500 font-bold">📊</div>
      )}
    </div>
  )
}

export default StockLogo

