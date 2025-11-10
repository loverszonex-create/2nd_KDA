# 키우Me - 주식 행동데이터 챗봇 어플리케이션

주식 투자자를 위한 AI 챗봇 기반 행동 분석 및 추천 플랫폼입니다.

## 주요 기능

### 1. 챗 인터페이스 (Chat Interface)
- 종목별 AI 챗봇과 실시간 대화
- 주가 정보, 뉴스, 분석 정보 제공
- 추천 질문 및 액션 버튼
- 생성형 AI 기반 답변

### 2. 홈/대화 리스트 (Home/Chat List)
- 최근 대화 목록
- 북마크 기능
- 종목별 대화방 관리
- 빠른 검색 기능

### 3. 주식 대시보드 (Stock Dashboard)
- 실시간 주가 차트 (Line Chart)
- 거래량 분석 (Bar Chart)
- 내 포트폴리오 현황
- 수익률 통계
- AI 인사이트 제공

### 4. 피드백 & 행동 추천 패널 (Feedback & Action Panel)
- AI 기반 투자 피드백
- 개인화된 행동 추천
- 투자 행동 패턴 분석
- 신뢰도 기반 추천 시스템

### 5. 주간 리포트 (Weekly Report)
- 주간 수익 현황
- 일별 거래 통계
- 포트폴리오 구성 분석
- 성과 및 개선 영역
- AI 코치 추천
- 다음 주 목표 설정

## 기술 스택

- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM v6
- **Charts**: Recharts
- **Icons**: Lucide React

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```

애플리케이션이 `http://localhost:3000`에서 실행됩니다.

### 3. 프로덕션 빌드
```bash
npm run build
```

### 4. 프로덕션 미리보기
```bash
npm run preview
```

## 프로젝트 구조

```
myVibe/
├── src/
│   ├── components/          # 재사용 가능한 컴포넌트
│   │   └── FeedbackPanel.jsx
│   ├── pages/              # 페이지 컴포넌트
│   │   ├── HomePage.jsx
│   │   ├── ChatPage.jsx
│   │   ├── DashboardPage.jsx
│   │   └── WeeklyReportPage.jsx
│   ├── App.jsx             # 메인 앱 컴포넌트
│   ├── main.jsx            # 앱 엔트리 포인트
│   └── index.css           # 글로벌 스타일
├── public/                 # 정적 파일
├── index.html             # HTML 템플릿
├── package.json           # 프로젝트 설정
├── vite.config.js         # Vite 설정
├── tailwind.config.js     # Tailwind 설정
└── postcss.config.js      # PostCSS 설정
```

## 페이지 라우팅

- `/` - 홈페이지 (대화 리스트)
- `/chat/:stockName` - 채팅 페이지
- `/dashboard` - 주식 대시보드
- `/weekly-report` - 주간 리포트

## 디자인 특징

- 모바일 퍼스트 디자인 (너비: 448px)
- 흰색 기반 깔끔한 UI
- 그라데이션 액센트
- 직관적인 네비게이션
- 반응형 차트 및 그래프

## 커스텀 컬러

```javascript
{
  'color-white-solid': '#FFFFFF',
  'color-blue-59': '#3B5998',
  'color-blue-82': '#CBD5E1',
  'color-grey-97': '#F7F7F7',
  'color-grey-98': '#FAFAFA',
  'color-azure-11': '#1E3A8A',
  'color-azure-27': '#1E40AF',
  'color-azure-64': '#60A5FA',
}
```

## LLM API 연동 가이드

현재는 Mock 데이터로 구현되어 있으며, 실제 LLM API와 연동하려면 다음 단계를 따르세요:

### 1. 환경 변수 설정

`.env` 파일을 생성하고 API 키를 추가합니다:

```bash
VITE_LLM_API_KEY=your_api_key_here
VITE_LLM_API_URL=https://api.openai.com/v1/chat/completions
```

### 2. chatAPI.js 수정

`src/utils/chatAPI.js` 파일의 `getAIResponse` 함수에서 주석 처리된 실제 API 호출 코드를 활성화하세요:

```javascript
export const getAIResponse = async (question, stockName = '삼성전자') => {
  const response = await fetch(import.meta.env.VITE_LLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_LLM_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `당신은 ${stockName}에 대한 전문적인 투자 상담 AI입니다. 
                    사용자의 질문에 친절하고 정확하게 답변하되, 
                    투자 리스크에 대한 경고를 잊지 마세요.`
        },
        {
          role: 'user',
          content: question
        }
      ]
    })
  })
  
  const data = await response.json()
  
  // Format the response to match our structure
  return {
    content: data.choices[0].message.content.split('\n\n'),
    suggestions: generateSuggestions(question, stockName)
  }
}
```

### 3. 지원되는 LLM 제공자

- **OpenAI GPT-4/GPT-3.5**
- **Anthropic Claude**
- **Google Gemini**
- **Custom LLM API**

### Mock 데이터 응답

현재 구현된 Mock 응답 질문들:
- "키움증권 의견을 알려 줘"
- "AI 버블론은 뭐였는데?"
- "다른 증권사 의견도 궁금해"
- "그럼 지금이 매수 타이밍일까?"
- "목표주가가 현실적일까?"
- "엔비디아 주가는 어떻게 됐어?"
- "HBM 수주는 얼마나 늘었어?"
- "실적 발표는 언제야?"
- "배당은 얼마나 받을 수 있어?"

더 많은 Mock 응답은 `src/utils/chatAPI.js`의 `mockResponses` 객체에서 확인할 수 있습니다.

## 향후 개선 사항

- ✅ LLM API 연동 준비 완료 (Mock 데이터로 구현됨)
- 실제 LLM API 연결 (OpenAI/Claude/Gemini)
- 사용자 인증 시스템
- 실시간 주가 데이터 연동
- 대화 히스토리 저장 및 관리
- 푸시 알림 기능
- 소셜 공유 기능
- 다크 모드 지원
- 음성 입력 기능
- 차트 이미지 생성 및 공유

## 라이선스

Private - myVibe Project

## 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.
