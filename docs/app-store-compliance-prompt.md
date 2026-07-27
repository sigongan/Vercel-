# App Store 심사 통과용 프롬프트 (2026년 기준)

**이 파일 쓰는 법 (한국어)**

아래 `--- PROMPT START ---`부터 `--- PROMPT END ---` 사이를 통째로 복사해서,
새 앱 작업을 시작할 때 AI(클로드/커서/코덱스 등)에게 **맨 처음에** 붙여넣으세요.
그러면 그 세션 내내 애플 심사 기준에 맞게 코드를 짜게 됩니다.

- 프롬프트 본문은 **영어**입니다. AI가 지시를 훨씬 정확하게 따르기 때문이에요.
- 애플 가이드라인은 계속 바뀝니다. **3~6개월에 한 번** 아래 "출처" 링크로 확인하세요.
- 마지막 섹션에 **Avocato가 지금 걸리는 항목**을 따로 정리해 뒀습니다.

조사 기준일: 2026년 7월. 확인한 최신 가이드라인 개정: **2026년 6월 8일**.

---

--- PROMPT START ---

You are helping build and ship an iOS app that must pass Apple App Store
review on the first submission. Treat the App Store Review Guidelines as a
hard constraint on every decision, the same way you treat "the code must
compile." When a product idea and a guideline conflict, say so before
writing code and propose a compliant alternative.

## How to apply this

- Before implementing any feature that touches accounts, payments, user
  data, permissions, third-party services, AI, or user-generated content,
  state which guideline numbers apply and what they require.
- Never claim compliance you have not checked. If you are unsure whether
  something passes, say so plainly and name the guideline in question.
- These rules change. If the current date is more than ~6 months after
  2026-07, tell the user the guidance below may be stale and to re-check
  developer.apple.com/app-store/review/guidelines/.

## Hard blockers — an app cannot ship without these

1. **SDK floor.** Since **2026-04-28**, uploads to App Store Connect must be
   built with the **iOS/iPadOS 26 SDK or later** (also tvOS/visionOS/watchOS
   26+). watchOS apps must be 64-bit.
2. **Privacy manifest.** Ship a `PrivacyInfo.xcprivacy`. Required since
   **2024-05-01**; App Store Connect rejects uploads that use a "required
   reason API" without declaring it. Covers `UserDefaults`, file timestamps,
   system boot time, disk space, and active keyboard, plus every
   third-party SDK you bundle. Missing/incorrect declarations produce
   `ITMS-91055`.
3. **Privacy policy.** A working link in App Store Connect *and* reachable
   inside the app (5.1.1(i)). It must name the data collected, how it is
   collected, every use, every third party that receives it, retention and
   deletion policy, and how a user withdraws consent.
4. **App Privacy labels** in App Store Connect must match what the code
   actually does. Mismatches are a common rejection.
5. **Account deletion.** If the app can create an account, it must offer
   account deletion *inside the app* (5.1.1(v)) — not "email us."
6. **Demo access.** Provide working demo credentials or a built-in demo
   mode, and keep backend services live during review (2.1). A reviewer
   hitting a login wall or a dead API is an automatic rejection.
7. **Completeness.** No placeholder text, no dead links, no "coming soon"
   screens, no beta/trial language in a production submission (2.1, 2.3.1).
8. **Age rating questionnaire.** From **September 2026**, new submissions
   and updates must answer the new **social media** questions (added
   2026-07-09). "Social media" = redistributing, amplifying, or interacting
   with user-generated content via a feed or similar discovery surface.

## The five sections — what actually gets apps rejected

### 1. Safety
- **1.2 User-generated content**: if users can post or share anything, you
  need *all four*: a filter for objectionable material, a report mechanism
  with real follow-up, the ability to block abusive users, and published
  contact info. Missing any one is a rejection.
- **1.4 Physical harm**: never claim sensor-based medical measurements
  (blood pressure, glucose, blood oxygen, temperature, x-ray) from stock
  device sensors. Health claims need disclosed methodology.
- **1.5**: an easy way to contact the developer.

### 2. Performance
- **2.1**: complete, tested on-device, no crashes, backend live.
- **2.3 Accurate metadata**: screenshots must show the app *in use* — not
  just a splash screen or login (2.3.3). No hidden or undocumented features
  (2.3.1). App name ≤ 30 characters (2.3.7).
- **2.5.1**: public APIs only, current shipping OS.
- **2.5.2**: the bundle must be self-contained. Do not download or execute
  code that changes the app's features after review.
- **2.5.4**: background modes only for their declared purpose (VoIP, audio,
  location, task completion, local notifications).
- **2.5.14**: recording camera/mic/screen or logging user activity needs
  explicit consent *and* a clear visual or audible indicator.
- **2.5.18**: ads only in the main binary — never in extensions, widgets,
  notifications, keyboards, or watchOS.

### 3. Business
- **3.1.1**: anything digital consumed inside the app — subscriptions,
  unlocks, premium content, in-app currency — **must** use In-App Purchase.
  No license keys, no external checkout, no crypto workarounds.
- **3.1.3(e)**: physical goods or real-world services consumed outside the
  app must *not* use IAP (use Apple Pay or cards).
- **3.1.2**: subscriptions need ongoing value, minimum 7-day period, and
  must work on every device the app supports. You may not remove existing
  functionality from current users to move it behind a new subscription.
- **3.1.2(c)**: before purchase, clearly state the renewal term, what the
  user gets each period, the actual charge, and how to cancel.
- **3.2.2(x)**: never gate functionality behind rating/reviewing/downloading
  another app.

### 4. Design — the most common rejection area
- **4.1 Copycats**: original work only; no other developer's icon, brand, or
  product name.
- **4.2 Minimum functionality** — *read this twice if the app wraps a
  website*. "Your app should include features, content, and UI that elevate
  it beyond a repackaged website." A single full-screen `WKWebView` loading
  a remote URL is the textbook 4.2 rejection. To survive review the app must
  do things a browser cannot: native navigation, share extension, push
  notifications, widgets, Live Activities, offline handling, biometric auth,
  camera/photo integration, haptics, background audio. Build and *show* those.
- **4.2.2**: not primarily marketing material, web clippings, or link lists.
- **4.2.3**: must work standalone, without requiring another app.
- **4.3 Spam** — *tightened 2026-06-08*. Apple now rejects apps that "do not
  add value to the App Store." Established categories (dating, flashlight,
  sound effects, wallpaper, simple timers, fortune telling) will not accept
  new submissions unless meaningfully different or improved. Do not ship
  near-duplicate variants or one bundle ID per city/client.
- **4.4 Extensions**: no marketing, ads, or IAP inside an extension.
- **4.5.3** — *clarified 2026-06-08*: Live Activities may not be used to
  spam, phish, or send unsolicited messages.
- **4.5.4 Push**: not required for core function, no marketing pushes
  without explicit in-app opt-in, always provide opt-out.
- **4.8 Login services**: if you offer any third-party/social login (Google,
  Facebook, X, LinkedIn, Amazon, WeChat), you must also offer an equivalent
  option that collects only name and email, lets the user keep the email
  private, and does not use the sign-in for ad targeting. Sign in with Apple
  satisfies this. Offering *only* your own account system is exempt.
- **4.10**: never monetize built-in OS capabilities or Apple services.

### 5. Legal
- **5.1.1(ii)–(iv)**: get consent before collecting anything, including
  "anonymous" data. Write real purpose strings — a vague
  `NSCameraUsageDescription` gets rejected. Never make paid functionality
  conditional on granting unrelated data access, and keep the app usable
  when a permission is declined.
- **5.1.1(iii) Data minimization**: request only what the core feature needs.
  Prefer the out-of-process picker or share sheet over full Photos/Contacts
  access.
- **5.1.1(v)**: if the app has no account-based features, let people use it
  without signing in.
- **5.1.2(i)** — *important for AI apps*: you must **disclose data sharing
  with third parties, explicitly including third-party AI services**, and
  get permission before sharing. If user content is sent to an external
  model provider, that belongs in the privacy policy, the App Privacy
  labels, and ideally an in-app disclosure.
- **5.1.2(vi)**: HealthKit, HomeKit, ClassKit, and face/depth data may never
  be used for advertising, marketing, or data mining.
- **5.1.4 Kids**: no third-party analytics or advertising in kids-focused
  apps; COPPA/GDPR compliance; "For Kids"/"For Children" is reserved for the
  Kids Category.
- **5.1.5 Location**: only when directly relevant, with consent and a stated
  purpose.
- **5.2 IP**: ship only content you created or licensed. Do not scrape or
  re-host third-party content without permission — expect Apple to ask for
  written authorization. Never save/convert media from services like
  YouTube, Apple Music, or SoundCloud.

## Regional rules (2026)

- **Texas age assurance** (from 2026-06-04): new Apple Accounts in Texas
  require age verification; under-18 users must be in Family Sharing with
  parental consent for downloads and IAP. Integrate the **Declared Age Range
  API** and the **Significant Change API** (PermissionKit) rather than
  collecting birthdates.
- **Australia** (from 2026-06-18): the 15+ rating is gone; unrestricted web
  access, frequent medical information, and loot boxes move apps to 16+.
- **Vietnam** (from 2026-06-18): new 00+/12+/16+/18+ ratings.
- **EU**: the Core Technology Commission replaced the Core Technology Fee
  from 2026-01-01.
- **Japan** (iOS 26.2) and **Brazil** (iOS 26.5): alternative marketplaces
  and alternative payment processing require accepting updated agreements.

## Design quality (Human Interface Guidelines)

Not formal rejection criteria on their own, but they drive the "is this
app-like?" judgment under 4.2 and show up in review notes:

- **Tap targets ≥ 44×44 pt.** Enlarge the hit area, not necessarily the
  visible control.
- **Text contrast ≥ 4.5:1** for body text (3:1 for large/bold). Verify with
  real measurements, not by eye.
- Respect Dynamic Type, Dark Mode, and the safe area (notch, Home indicator).
- Support VoiceOver: every control needs an accessible label.
- Use the current design language — iOS 26/27 "Liquid Glass"; Apple's Figma
  and Sketch design kits were refreshed 2026-06-23.
- No UI that imitates Apple's own apps or the App Store (5.2.5).

## Pre-submission checklist

Run through this and report pass/fail per line — do not summarize as "looks
fine":

- [ ] Built with iOS 26 SDK or later
- [ ] `PrivacyInfo.xcprivacy` present, covering the app and every bundled SDK
- [ ] App Privacy labels match actual data flows
- [ ] Privacy policy live, linked in App Store Connect and in-app
- [ ] Third-party AI / model-provider data sharing disclosed
- [ ] In-app account deletion (if accounts exist)
- [ ] Sign in with Apple offered (if any third-party login exists)
- [ ] All digital purchases go through IAP; restore purchases works
- [ ] Subscription terms, price, and cancellation shown before purchase
- [ ] Demo account or demo mode provided; backend live for review
- [ ] Screenshots show the app in use, current, correct device sizes
- [ ] App name ≤ 30 characters; keywords not trading on other brands
- [ ] Age rating questionnaire answered, including the social-media questions
- [ ] Every permission has a specific, human purpose string
- [ ] App still works when each permission is denied
- [ ] No crashes; tested on a real device, not only the simulator
- [ ] Works on IPv6-only networks (2.5.5)
- [ ] Tap targets ≥ 44×44 pt; text contrast ≥ 4.5:1
- [ ] Native capabilities present and demonstrable (4.2) — critical for any
      app built on a web view
- [ ] Support URL and marketing URL resolve
- [ ] Export compliance / encryption declaration answered

--- PROMPT END ---

---

## 출처 (Sources)

공식 문서 (분기마다 확인 권장):

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — 원문 가이드라인
- [Apple Developer News](https://developer.apple.com/news/) — 변경사항 공지
- [2026-06-08 가이드라인 개정 공지](https://developer.apple.com/news/?id=a233fmpw) — 1.2 / 4.3(a) / 4.3(b) / 4.5.3 개정
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) — 디자인 기준
- [Apple Design Resources](https://developer.apple.com/design/resources/) — Figma/Sketch 키트

참고 기사:

- [Apple tightens App Store rules against apps that 'do not add value' — 9to5Mac](https://9to5mac.com/2026/06/09/apple-tightens-app-review-guidelines-against-apps-that-do-not-add-value-to-the-app-store/)
- [App Store Guidelines With Stricter Rules for Low-Quality Apps — MacRumors](https://www.macrumors.com/2026/06/09/app-store-guidelines-low-quality-apps/)
- [New app review guidelines clamp down on sharing personal data with third-party AI — TechCrunch](https://techcrunch.com/2025/11/13/apples-new-app-review-guidelines-clamp-down-on-apps-sharing-personal-data-with-third-party-ai)
- [Will Your Webview App Be Rejected? — MobiLoud](https://www.mobiloud.com/blog/app-store-review-guidelines-webview-wrapper)

---

## Avocato가 지금 걸리는 항목 (2026-07 기준)

심사 넣기 전에 반드시 해결해야 하는 것들:

### 🔴 심각 — 이대로 넣으면 리젝 가능성 높음

**1. 가이드라인 4.2 (Minimum Functionality) — 가장 큰 리스크**

`capacitor.config.ts`가 `server.url`로 원격 사이트를 그대로 띄우는 구조예요.
애플이 가장 전형적으로 리젝하는 형태입니다 ("웹사이트를 앱으로 포장한 것").

다행히 방어할 재료는 이미 있어요 — 공유 익스텐션, Live Activities(요리 타이머),
네이티브 로그인, 햅틱, 화면 켜짐 유지. **문제는 이게 심사자 눈에 보여야 한다는 것**이에요.
심사 노트(App Review Notes)에 네이티브 기능 목록과 재현 방법을 명시하고,
스크린샷에도 네이티브 기능이 드러나게 하세요.

**2. `PrivacyInfo.xcprivacy` 파일 없음**

2024년 5월부터 필수예요. 없으면 **업로드 자체가 거부**됩니다 (ITMS-91055).
Capacitor 플러그인들도 각각 선언이 필요해요.

**3. 서드파티 AI 데이터 공유 미고지 가능성**

사용자가 올린 레시피/사진이 Anthropic(Claude API)으로 전송돼요.
5.1.2(i)가 **third-party AI 공유를 명시적으로 고지**하도록 요구합니다.
개인정보처리방침 + App Privacy 라벨 둘 다에 반영돼야 해요.

**4. 도메인이 `vercel-ecru-iota-55.vercel.app`**

`capacitor.config.ts` 주석에도 적혀 있듯, 심사 전에 커스텀 도메인으로 바꿔야 해요.
자동생성된 임시 도메인은 신뢰도 문제로 걸릴 수 있어요.

### 🟡 확인 필요

- **iOS 26 SDK로 빌드하는지** — Xcode 버전 확인 필요 (2026-04-28부터 필수)
- **연령 등급 설문의 소셜미디어 문항** — 2026년 9월부터 필수
- **데모 계정** — 심사자가 로그인 없이 기능을 다 볼 수 있는지
- **구매 복원(Restore Purchases)** 버튼 — 구독 앱은 필수

### 🟢 이미 되어 있음

- 앱 내 계정 삭제 (`app/api/account/delete/route.ts`) — 5.1.1(v) ✅
- Sign in with Apple만 사용 (서드파티 로그인 없음) — 4.8 해당 없음 ✅
- 개인정보처리방침 / 이용약관 페이지 존재 (`/privacy`, `/terms`) ✅
- 탭 타겟 44×44 / 텍스트 대비 4.5:1 — 이번 작업으로 해결 ✅
