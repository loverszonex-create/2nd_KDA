# 레벨 시스템 가이드 📊

## 개요
키우Me 앱에 실제 대화 횟수 기반 레벨 시스템이 구현되었습니다.

## 기능 설명

### 1. 레벨 시스템 (10단계)

| 레벨 | 필요 대화 횟수 | 레벨 이름 | 배지 색상 |
|------|---------------|-----------|-----------|
| Lv.01 | 0 - 50회 | 새싹 투자자 | 노란색 |
| Lv.02 | 50 - 150회 | 초보 투자자 | 진한 노란색 |
| Lv.03 | 150 - 300회 | 중급 투자자 | 주황색 |
| Lv.04 | 300 - 500회 | 숙련 투자자 | 진한 주황색 |
| Lv.05 | 500 - 800회 | 고급 투자자 | 빨간색 |
| Lv.06 | 800 - 1200회 | 전문 투자자 | 진한 빨간색 |
| Lv.07 | 1200 - 1700회 | 마스터 투자자 | 보라색 |
| Lv.08 | 1700 - 2500회 | 전설의 투자자 | 진한 보라색 |
| Lv.09 | 2500 - 3500회 | 투자 구루 | 남색 |
| Lv.10 | 3500회 이상 | 투자의 신 | 그라데이션 (금/핑크/보라) |

### 2. 대화 횟수 추적
- **저장 위치**: LocalStorage (`userChatCount`)
- **증가 시점**: 
  - 채팅 메시지 전송 시
  - 제안 버튼 클릭 시
- **영구 저장**: 브라우저를 닫아도 유지됩니다

### 3. 프로필 페이지 표시
- **레벨 배지**: 현재 레벨 표시 (동적 색상)
- **진행 바**: 다음 레벨까지의 진행도 (0-100%)
- **상세 정보**:
  - "다음 레벨까지 X회 남음"
  - "현재/필요 대화 횟수" (예: 25 / 50)

## 사용 방법

### 레벨 확인하기
1. 프로필 페이지 접속 (헤더 우측 사용자 아이콘 클릭)
2. 상단 히어로 섹션에서 레벨 배지와 진행 바 확인

### 레벨업 방법
1. 채팅 페이지에서 종목과 대화하기
2. 메시지를 보내거나 제안 버튼 클릭
3. 필요한 대화 횟수에 도달하면 자동으로 레벨업
4. 레벨업 시 콘솔에 축하 메시지 표시

### 테스트 방법

#### 1. 개발자 도구로 대화 횟수 확인
```javascript
// 현재 대화 횟수 확인
localStorage.getItem('userChatCount')

// 특정 값으로 설정 (테스트용)
localStorage.setItem('userChatCount', '45') // Lv.1, 거의 레벨업
localStorage.setItem('userChatCount', '145') // Lv.2, 거의 레벨업
localStorage.setItem('userChatCount', '3500') // Lv.10 (최고 레벨)

// 초기화
localStorage.removeItem('userChatCount')
```

#### 2. 빠른 레벨업 테스트
```javascript
// 브라우저 콘솔에서 실행
localStorage.setItem('userChatCount', '48')
// 프로필 페이지 새로고침
// 채팅 페이지에서 메시지 2개 전송
// 프로필 페이지에서 Lv.02로 레벨업 확인
```

## API 레퍼런스

### `levelSystem.js` 유틸리티

```javascript
import { 
  getChatCount,           // 현재 대화 횟수 가져오기
  saveChatCount,          // 대화 횟수 저장
  incrementChatCount,     // 대화 횟수 +1
  calculateLevel,         // 대화 횟수로 레벨 계산
  calculateProgress,      // 진행도 계산
  getLevelBadgeColor,     // 레벨별 배지 색상
  isLevelUp,             // 레벨업 여부 확인
  LEVEL_REQUIREMENTS     // 레벨별 요구사항
} from '../utils/levelSystem'

// 사용 예시
const count = getChatCount()                    // 현재: 25
const level = calculateLevel(count)             // 1
const progress = calculateProgress(count)       // { level: 1, progress: 50, ... }
const color = getLevelBadgeColor(level)         // 'bg-yellow-400 text-black'
```

## 향후 개선 사항
- [ ] 레벨업 시 축하 모달/토스트 메시지
- [ ] Supabase와 연동하여 서버에 대화 횟수 저장
- [ ] 레벨별 보상 시스템 (뱃지, 칭호 등)
- [ ] 주간/월간 대화 통계
- [ ] 친구와 레벨 비교 기능
- [ ] 레벨별 특별 기능 해금

## 트러블슈팅

### 레벨이 표시되지 않아요
- 프로필 페이지를 새로고침해보세요
- LocalStorage가 활성화되어 있는지 확인하세요
- 개발자 도구에서 `localStorage.getItem('userChatCount')` 확인

### 대화 횟수가 증가하지 않아요
- 메시지가 성공적으로 전송되었는지 확인
- 콘솔에서 에러 메시지 확인
- LocalStorage 쓰기 권한 확인

### 진행 바가 업데이트되지 않아요
- 프로필 페이지를 새로고침하거나 다시 접속
- 브라우저 캐시 클리어

## 문의
문제가 발생하면 개발자 도구 콘솔을 확인하세요. 레벨업 시 "🎉 레벨업!" 메시지가 표시됩니다.

