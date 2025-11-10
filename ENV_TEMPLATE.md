# 환경 변수 템플릿

실제 LLM API 연동 시 프로젝트 루트에 `.env` 파일을 생성하고 아래 내용을 추가하세요.

```bash
# LLM API 키 (실제 API 연동 시 사용)
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
VITE_GOOGLE_API_KEY=your_google_api_key_here

# LLM API URL
VITE_LLM_API_URL=https://api.openai.com/v1/chat/completions

# 주식 데이터 API (향후 사용)
VITE_STOCK_API_KEY=your_stock_api_key_here
VITE_STOCK_API_URL=https://api.stock-data-service.com

# 앱 설정
VITE_APP_NAME=키우Me
VITE_APP_VERSION=1.0.0
```

## API 키 발급 방법

### OpenAI API
1. https://platform.openai.com 접속
2. API Keys 섹션에서 새 키 생성
3. `VITE_OPENAI_API_KEY`에 입력

### Anthropic Claude API
1. https://console.anthropic.com 접속
2. API Keys에서 키 생성
3. `VITE_ANTHROPIC_API_KEY`에 입력

### Google Gemini API
1. https://makersuite.google.com/app/apikey 접속
2. API 키 생성
3. `VITE_GOOGLE_API_KEY`에 입력

## 주의사항

⚠️ `.env` 파일은 절대 Git에 커밋하지 마세요!
⚠️ API 키는 안전하게 보관하세요.
⚠️ 현재는 Mock 데이터로 작동하므로 API 키 없이도 테스트 가능합니다.

