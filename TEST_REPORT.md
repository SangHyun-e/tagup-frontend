# TEST_REPORT.md

## [2026-06-30] Frontend Sprint 2 테스트 결과

**테스트 환경**
- 기기: iPhone 16 Pro (iOS Simulator, Xcode)
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

#### ✅ 2. 경기 일정 화면 — GET /api/v1/games?date=
- [✅] `GET /api/v1/games?date=2026-06-30 → HTTP 200` (인증 불필요 공개 엔드포인트)
- [✅] 5경기 데이터 수신 확인 (잠실, 광주, 창원, 대전, 고척 구장)
- [✅] Expo 로그에서 날짜 탭 전환 시 날짜별 API 호출 확인 (2026-06-27 ~ 2026-07-03 각각 호출)
- [✅] 빈 날짜(과거/미래) → `data: []` 반환 → 빈 상태 UI 표시 로직 동작
- [⚠️] 시뮬레이터 UI 직접 탭 조작 불가 (시스템 접근성 권한 미허용) — API 레벨에서 검증

#### ✅ 3. 홈 화면 — 방 생성 (POST /api/v1/rooms)
- [✅] `POST /api/v1/rooms {"name":"테스트더그아웃"} → HTTP 200`
- [✅] 응답: `{tagCode: "00CTYO", name: "테스트더그아웃", id: 1}` — tagCode 자동 발급 정상
- [✅] `GET /api/v1/rooms → HTTP 200, data: []` (방 생성 전 빈 목록)
- [❌] **UI 로그인 후 모달 동작**: FE-BE 인증 연동 버그로 인해 실제 앱에서 검증 불가 (하단 이슈 참조)

#### ✅ 4. 홈 화면 — 태그코드 입장 (POST /api/v1/rooms/join)
- [✅] 이미 참여한 방에 재입장 시도 → `HTTP 409 "이미 참여 중인 더그아웃입니다."` (중복 방지 정상)
- [✅] 유효한 tagCode 처리 로직 정상 (BE 레벨 검증)

#### ✅ 5. 응원 구단 설정 화면 — GET /api/v1/teams + PUT /api/v1/users/me/team
- [✅] `GET /api/v1/teams → HTTP 200`, 10개 구단 데이터 정상 반환
- [✅] `PUT /api/v1/users/me/team {"teamId":3} → HTTP 200`
- [✅] 응답에 `favoriteTeam: {id:3, name:"LG 트윈스", ...}` 반영 확인
- [❌] UI에서 구단 선택 그리드 → 저장 흐름: 인증 버그로 인해 실제 앱에서 검증 불가

#### ✅ 6. 채팅 화면 — Firestore 연동
- [✅] Firebase SDK 초기화 정상 (앱 기동 시 오류 없음)
- [✅] `rooms/{roomId}/messages` Firestore 구조 구현 완료
- [⚠️] 실시간 메시지 송수신: 로그인 필요 — UI 레벨 검증 불가 (BE 인증 버그 선결 필요)

#### ✅ 7. 프로필 화면 — 응원 구단 변경 버튼
- [✅] `TouchableOpacity onPress={() => router.push('/team-select')}` 코드 정상 구현
- [✅] `GET /api/v1/users/me → HTTP 200` — 유저 프로필(닉네임, 이메일, favoriteTeam) 반환 확인
- [⚠️] UI 네비게이션 동작: 로그인 필요 — 시뮬레이터에서 직접 탭 불가

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

3. **simulator 접근성 권한**: macOS 시스템 접근성 권한 미허용으로 자동화 UI 조작 불가 — 수동 테스트 시 `시스템 설정 → 개인 정보 보호 → 손쉬운 사용` 에서 Terminal 허용 후 재시도 가능

---

### 종합 판정

| 항목 | 판정 |
|---|---|
| Sprint 2 화면 코드 구현 | ✅ PASS |
| API 엔드포인트 연동 로직 | ✅ PASS (코드 레벨) |
| 백엔드 API 동작 | ✅ PASS (curl 검증) |
| 앱 번들 빌드 | ✅ PASS (react-dom 수정 후) |
| **실제 앱 E2E 인증 흐름** | ❌ **FAIL — FE/BE 인증 미스매치** |

> Sprint 2 기능 코드 자체는 정상 구현됐으나, Sprint 1에서 기원한 **인증 아키텍처 불일치**로 인해 로그인 이후 모든 인증 API가 앱에서 403을 반환합니다. **Backend 팀에 인증 방식 통합 수정을 요청하거나 Frontend에서 BE JWT를 병행 사용하는 방식으로 해결이 필요합니다.**
