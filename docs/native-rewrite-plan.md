# SwiftUI 네이티브 전환 계획

## 왜 하는가

지금 iOS 앱은 Capacitor가 원격 URL(`capacitor.config.ts`의 `server.url`)을
그대로 띄우는 구조예요. 전체화면 `WKWebView` 하나가 원격 사이트를 로드하는 형태는
애플이 **가이드라인 4.2(Minimum Functionality)로 리젝하는 가장 전형적인 모양**입니다.

> "Your app should include features, content, and UI that elevate it beyond a
> repackaged website."

공유 익스텐션·Live Activities·네이티브 로그인 같은 방어 재료가 이미 있지만,
심사자가 처음 보는 건 웹사이트예요. 그래서 앱 껍데기를 SwiftUI로 다시 만듭니다.

**웹은 없어지지 않아요.** Next.js 배포는 계속 유지되고 역할만 바뀝니다:

| | 이전 | 이후 |
|---|---|---|
| Next.js | 앱 UI + API + 마케팅 | **API + 마케팅 사이트** |
| iOS 앱 | 웹뷰가 원격 URL 로드 | **SwiftUI, API만 호출** |

API 라우트 11개는 그대로 쓰니 서버 로직을 다시 짤 필요가 없어요.

---

## 진행 상황

### ✅ 완료

**1. API가 Bearer 토큰 인증을 받도록 변경** (`lib/supabase/server.ts`)

이게 네이티브 전환의 첫 관문이었어요. 기존 API는 Supabase SSR **쿠키로만**
인증했는데, 네이티브 앱은 `URLSession`과 공유하는 쿠키 저장소가 없어서
API를 아예 호출할 수 없었어요.

`getSupabaseUser()`를 추가해서 `Authorization: Bearer <token>` 헤더가 있으면
그걸로, 없으면 기존대로 쿠키로 인증합니다. `getSessionUser()`가 이걸 거치므로
**라우트 11개가 한 번에** 네이티브를 지원하게 됐어요. 웹 동작은 그대로입니다.

토큰은 로컬에서 디코딩하지 않고 인증 서버에 매번 검증해요 — 로컬 디코딩만 하면
로그아웃했거나 폐기된 토큰도 유효해 보이기 때문입니다.

**2. SwiftUI 기반 코드** (`native/Avocato/`)

```
native/Avocato/
├── AvocatoApp.swift              앱 진입점, 의존성 주입
├── Models/Recipe.swift           lib/types/recipe.ts의 Swift 대응
├── Services/
│   ├── AuthStore.swift           Keychain 세션 저장
│   └── APIClient.swift           타입 있는 API 클라이언트
├── Design/Theme.swift            색상 토큰 (대비 검증된 값)
└── Views/RootTabView.swift       네이티브 탭바 + 화면 자리표시자
```

`Theme.swift`에는 이번에 접근성 작업으로 고친 대비 값이 그대로 들어가 있어요
(본문 4.5:1 이상). 새 색을 넣을 때 이 기준 아래로 내려가지 않게 해주세요.

> ⚠️ **이 Swift 코드는 아직 컴파일된 적이 없어요.** 이 작업 환경에 Swift
> 툴체인이 없어서, Xcode에서 처음 빌드할 때 자잘한 수정이 필요할 수 있습니다.

---

## 남은 작업

순서대로 진행하는 걸 권장해요. 각 단계는 그 앞 단계에 의존합니다.

### 1단계 — Xcode 프로젝트 세팅
- [ ] 새 Xcode 프로젝트 생성 (iOS 26 SDK — 2026-04-28부터 필수)
- [ ] `native/Avocato/` 파일들 추가, 첫 빌드 통과시키기
- [ ] `Info.plist`에 `AvocatoAPIBaseURL` 추가 (디버그는 로컬 서버로)
- [ ] `native/App/PrivacyInfo.xcprivacy`를 앱 타겟에 포함

### 2단계 — 인증
- [ ] Sign in with Apple (`AuthenticationServices`)
- [ ] 애플 identity token을 Supabase GoTrue의
      `/auth/v1/token?grant_type=id_token`으로 교환 → access/refresh 토큰
- [ ] 만료 전 자동 토큰 갱신
- [ ] 앱 내 계정 삭제 연결 (`/api/account/delete`) — 가이드라인 5.1.1(v) 필수

### 3단계 — 핵심 화면 (자리표시자 → 실제 화면)
- [ ] Extract — 링크/텍스트/파일 입력, 추출 진행 화면
- [ ] 레시피 상세 — 재료·단계·서브레시피·영양
- [ ] Library — 저장/최근/만들고 싶은 목록
- [ ] Home
- [ ] Search (Recipe Scout)
- [ ] Profile + 설정

### 4단계 — 네이티브 기능 이식 (4.2 방어의 핵심)
- [ ] 공유 익스텐션 (`native/ShareExtension/` 재사용)
- [ ] Live Activities 요리 타이머 (`native/CookTimerWidget/` 재사용)
- [ ] StoreKit 2 구독 + **구매 복원** (3.1.1 필수)
- [ ] 홈 화면 위젯
- [ ] **오프라인 지원** — 저장된 레시피를 네트워크 없이 열기.
      지금 앱의 진짜 약점이자, 4.2에서 "브라우저로는 못 하는 것"의 가장 좋은 근거

### 5단계 — 제출 준비
- [ ] `docs/app-store-compliance-prompt.md`의 체크리스트 전부 통과
- [ ] 심사 노트에 네이티브 기능 목록 + 재현 방법 명시
- [ ] 스크린샷에 네이티브 기능이 드러나게
- [ ] 커스텀 도메인 연결 (지금은 `vercel-ecru-iota-55.vercel.app`)
- [ ] 데모 계정 준비

---

## 정리 대상 (전환 완료 후)

전환이 끝나기 전에는 지우지 마세요 — 웹 앱이 계속 써요.

- `capacitor.config.ts`, `@capacitor/*` 의존성
- `lib/nativeApp.ts` (Capacitor 브릿지)
- `native/App/*.swift` 중 Capacitor 플러그인들
  (`AppleSignInPlugin`, `StoreKitPlugin`, `CookActivityPlugin`,
  `SplashReadyPlugin`, `PrintPlugin`) — 기능은 SwiftUI 쪽에서 다시 구현
