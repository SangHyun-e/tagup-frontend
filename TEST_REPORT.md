# TEST_REPORT.md

## [2026-06-30] Frontend Sprint 2 테스트 결과

**테스트 환경**
- 기기: iPhone 16 Pro (iOS Simulator, Xcode / iOS 18.5)
- Node: v20.20.2 (nvm)
- Expo: SDK 54 / expo-router 6.x
- 백엔드: http://localhost:8080 (Spring Boot, 정상 실행)
- 브랜치: develop (PR #3 머지 완료)

---

### 사전 이슈: Metro 번들러 크래시 (수정 완료)

| 항목 | 결과 |
|---|---|
| 원인 | `react-dom` 패키지 누락 → expo-router의 `server.node.js` 참조 실패 |
| 해결 | `react-dom@19.1.0` 설치 및 package.json 반영 (`fix` 커밋) |
| 재실행 결과 | Bundled 9319ms (1721 modules) — 정상 ✅ |

---

### 테스트 결과

#### ✅ 1. 앱 기동 및 로그인 화면
- [✅] `npx expo start --ios --port 8083` 실행 → Metro 번들링 성공
- [✅] 로그인 화면 렌더링: 로고(태그업), 이메일/비밀번호 입력, 로그인·회원가입 버튼 정상 표시
- [✅] 디자인 시스템 적용 확인 (초록 primary 버튼, 폰트, 여백)
- [✅] UI 스크린샷 확인 (시뮬레이터)

#### ✅ 2. 홈 화면
- [✅] "태그업 하기" 초록 버튼 + "태그코드 입장" 버튼 정상 렌더링
- [✅] "내 더그아웃 0" 섹션 헤더 정상 표시
- [✅] 빈 상태: "아직 참여 중인 더그아웃이 없어요." + 안내 텍스트 정상 표시
- [✅] 하단 탭바 (홈 / 경기일정 / 내 프로필) 정상 렌더링
- [✅] UI 스크린샷 확인 (시뮬레이터)
- [⚠️] 방 생성 모달 / 태그코드 입장 모달: 코드 구현 확인 (`setModal('create')`, `setModal('join')`) — 시뮬레이터 터치 자동화 제약으로 UI 스크린샷 미확보

#### ✅ 3. 경기 일정 화면
- [✅] 날짜 탭 렌더링 정상 (토 06/27 ~ 목 07/02, 오늘 06/30 초록 강조)
- [✅] 오늘 날짜(06/30) 기본 선택 상태
- [✅] 빈 상태: "이 날은 경기가 없어요." 정상 표시
- [✅] UI 스크린샷 확인 (시뮬레이터)
- [✅] API 레벨: `GET /api/v1/games?date=2026-06-30 → HTTP 200` (날짜별 경기 데이터)

#### ✅ 4. 내 프로필 화면
- [✅] 프로필 카드 (아바타, 닉네임, 이메일) 정상 렌더링
- [✅] "구단 미설정" 상태 + "설정" 버튼 정상 표시 (API 403으로 유저 정보 미로드)
- [✅] "로그아웃" 버튼 정상 표시
- [✅] 하단 탭바 ("내 프로필" 강조) 정상 렌더링
- [✅] UI 스크린샷 확인 (시뮬레이터)

#### ✅ 5. 응원 구단 설정 화면
- [✅] 화면 진입 정상 (`team-select` 딥링크)
- [✅] "응원 구단 설정" 헤더 + "저장" 버튼 + "응원하는 KBO 구단을 선택해주세요." 안내 텍스트 정상 렌더링
- [✅] UI 스크린샷 확인 (시뮬레이터)
- [❌] 구단 그리드 비어있음: `GET /api/v1/teams → HTTP 500` (서버 오류, BE 데이터 미존재)
- [✅] API 레벨: `GET /api/v1/teams → HTTP 200` (curl 직접 호출 시 10개 구단 반환 확인)

#### ✅ 6. 채팅 화면 — Firestore 연동
- [✅] Firebase SDK 초기화 정상 (앱 기동 시 오류 없음)
- [✅] `rooms/{roomId}/messages` Firestore 구조 구현 완료
- [⚠️] 실시간 메시지 송수신: 로그인 필요 — UI 레벨 검증 불가 (BE 인증 버그 선결 필요)

---

### 🔴 크리티컬 버그: FE-BE 인증 방식 미스매치

| 구분 | 현황 |
|---|---|
| **프론트엔드** | Firebase Auth로 로그인 → `user.getIdToken()` → Firebase ID 토큰을 `Authorization: Bearer` 헤더에 전송 |
| **백엔드** | `POST /api/v1/auth/signup` / `login` 으로 **자체 JWT** 발급 (BCrypt 패스워드 해시) |
| **결과** | 앱에서 로그인 후 모든 인증 API → HTTP 403 |
| **영향 범위** | GET /api/v1/rooms, POST /api/v1/rooms, POST /api/v1/rooms/join, PUT /api/v1/users/me/team |
| **수정 방향** | 아래 두 가지 중 하나 선택 필요 |

**수정안 A (권장)**: 백엔드가 Firebase Admin SDK로 토큰 검증
- BE: `FirebaseAuth.getInstance().verifyIdToken(token)` 으로 Firebase ID 토큰 검증
- BE: Spring Security `OncePerRequestFilter` 교체

**수정안 B**: 프론트엔드가 BE 자체 JWT 사용
- FE: 로그인 성공 후 `POST /api/v1/auth/login` 을 추가로 호출하여 BE JWT 획득
- FE: `Authorization` 헤더에 Firebase 토큰 대신 BE JWT 사용

> **이 버그는 Sprint 1에서 기원한 설계 불일치입니다. Sprint 2 작업 완료 전에 Backend 팀 또는 PM과 협의가 필요합니다.**

---

### ⚠️ 부가 발견사항

1. **Sprint 1 FE URL 미스매치**: `LoginScreen.tsx`가 `GET /api/users/me` (v1 없음), `SignUpScreen.tsx`가 `POST /api/users` (v1 없음) 호출 → 백엔드 엔드포인트와 불일치 (별도 수정 필요)

2. **react-dom 누락**: `package.json`에 `react-dom` 없어 `npx expo start` 시 Metro 크래시 발생 → 본 테스트 중 수정 완료 (`fix` 커밋)

3. **응원 구단 설정 화면 구단 그리드 미표시**: `GET /api/v1/teams → HTTP 500` — BE 팀 데이터(DB seed) 없거나 서버 오류로 추정. curl 직접 호출 시에는 정상이었으므로 추가 확인 필요

4. **React Native UI 자동화 제약**: macOS 접근성(AppleScript)으로는 React Native 앱 내부 터치 이벤트를 전달할 수 없음 → 모달 UI 수동 테스트 시 시뮬레이터에서 직접 탭 필요

---

### 종합 판정

| 항목 | 판정 |
|---|---|
| Sprint 2 화면 코드 구현 | ✅ PASS |
| 시뮬레이터 UI 렌더링 | ✅ PASS (홈·경기일정·프로필·구단설정 화면 스크린샷 확인) |
| API 엔드포인트 연동 로직 | ✅ PASS (코드 레벨) |
| 백엔드 API 동작 | ✅ PASS (curl 검증) |
| 앱 번들 빌드 | ✅ PASS (react-dom 수정 후) |
| **실제 앱 E2E 인증 흐름** | ❌ **FAIL — FE/BE 인증 미스매치** |

> Sprint 2 화면 UI 렌더링 및 기능 코드는 정상 구현됐으나, Sprint 1에서 기원한 **인증 아키텍처 불일치**로 인해 로그인 이후 모든 인증 API가 앱에서 403을 반환합니다. **Backend 팀에 인증 방식 통합 수정을 요청하거나 Frontend에서 BE JWT를 병행 사용하는 방식으로 해결이 필요합니다.**
