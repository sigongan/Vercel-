# App Store 출시 준비 — 등록 정보 & 제출 체크리스트

App Store Connect(appstoreconnect.apple.com)에 앱을 등록할 때 그대로
복사해서 쓸 수 있게 정리한 문서.

**타겟: 영어권 (미국·영국·캐나다·호주 중심).** 메타데이터는
영어(English U.S.) 하나만 등록 — 다른 로컬라이제이션은 만들지 않음.
출시 국가(Availability)는 전 세계로 두는 게 유리함 (영어 메타데이터로
전 세계 노출, 비용 0. 나중에 특정 국가만 빼고 싶으면 그때 조정).

---

## 1. 앱 기본 정보

| 항목 | 값 |
| --- | --- |
| App Name | Avocato — Recipe Extractor |
| Primary Language | English (U.S.) |
| Bundle ID | `app.avocato.ios` |
| SKU | `avocato-ios-001` (내부 식별용, 아무거나 고유하면 됨) |
| Primary Category | Food & Drink |
| Secondary Category | Utilities |
| Age Rating | 4+ (설문에서 전부 "None" 선택하면 됨) |
| Price | Free (앱 자체는 무료, Pro는 IAP 구독) |
| In-App Purchases | Yes — Avocato Pro 월 구독 ($4/월). App Store Connect의 "In-App Purchases" 섹션에서 구독 상품을 만들고 **바이너리와 함께 "Ready to Submit" 상태**여야 심사가 진행됨 |

> 앱 이름이 이미 선점되어 있으면: "Avocato: Recipe Saver",
> "Avocato — Video to Recipe" 순으로 시도.

## 2. 스토어 문구

**Subtitle** (30자 이내):

```
Videos & photos → recipes
```

**Promotional Text** (170자 이내, 심사 없이 수시 수정 가능):

```
Saw a recipe on TikTok or YouTube? Share it to Avocato and get the full
ingredient list and steps in seconds. Free while in launch.
```

**Description**:

```
Stop screenshotting recipes you'll never find again.

Avocato turns cooking videos, photos, and documents into clean,
structured recipes — ingredients with amounts, step-by-step
instructions, cook times — in seconds.

HOW IT WORKS
• Share a TikTok, YouTube, or Instagram link straight to Avocato from
  the share sheet — the recipe appears automatically
• Or paste a link, snap a photo of a cookbook page, upload a
  screenshot or PDF
• AI reads the captions, description, and content and writes out the
  full recipe — even estimating amounts when the video doesn't say

MADE FOR ACTUAL COOKING
• Estimated nutrition per serving — calories, protein, carbs, fat
• Scale servings and every amount updates ("1/2 tsp" → "1 tsp")
• Convert cups & spoons to grams/ml with one tap
• One-tap grocery list — check items off at the store, share it
• Cook Mode: big type, one step at a time, screen stays awake
• Built-in step timers
• Your own notes on every recipe, saved on your device
• Three beautiful recipe card styles

WORKS WITH
YouTube · TikTok · Instagram · photos · screenshots · PDFs ·
Google Docs · plain text

Free during launch. No account required.
```

**Keywords** (100자 이내, 쉼표 구분 — 앱 이름/카테고리 단어는 넣지 말 것):

```
recipe,extract,tiktok,youtube,video,cooking,ingredients,save,import,scan,ai,chef
```

## 3. URL 항목

| 항목 | 값 |
| --- | --- |
| Support URL | `https://vercel-ecru-iota-55.vercel.app/terms` (추후 전용 지원 페이지로 교체 가능) |
| Privacy Policy URL | `https://vercel-ecru-iota-55.vercel.app/privacy` |
| Marketing URL (선택) | `https://vercel-ecru-iota-55.vercel.app` |

## 4. 스크린샷 (필수: 6.9" / 6.5" 두 사이즈)

아이폰 실기기에서 찍으면 됨 (설정 → 다크모드 꺼진 상태로).
필요 사이즈는 업로드 시 App Store Connect가 자동 안내.
**순서가 중요** — 첫 두 장이 검색 결과에 노출됨:

1. **공유 시트에서 Avocato 선택하는 장면** (틱톡/유튜브 위에 share sheet 열린 상태) — 핵심 차별점
2. **추출된 레시피 카드** (재료+단계가 예쁘게 보이는 것, Magazine 테마 추천)
3. 홈 화면 (링크 붙여넣기 입력창)
4. 쿡 모드 (큰 글씨 단계 화면)
5. 사진/PDF 업로드 장면

> 나중에 여유 되면 Figma/Canva로 문구 얹은 마케팅 스크린샷으로 교체.
> 출시 자체는 실기기 캡처만으로 충분.

## 5. 심사 관련 (App Review Information)

- **Sign-in required?** → No for extraction/search (로그인 없이 핵심 기능 사용 가능). **저장 기능(Library의 Saved 탭)과 Pro 기능은 로그인 + 구독 필요** — 로그인은 Sign in with Apple만 제공 (Google/이메일 로그인은 제거됨).
- **Demo account** — Sign in with Apple만 쓰므로 심사관이 본인 Apple ID로 직접 로그인 테스트 가능. 별도 데모 계정 불필요. Sandbox 결제 테스트는 App Store Connect에 등록된 Sandbox Tester 계정으로 진행됨(자동).
- **Notes 칸에 넣을 문구**:

```
Avocato extracts structured recipes from cooking videos and documents
using AI (Anthropic Claude).

To test the core flow: open the YouTube or TikTok app, find any cooking
video, tap Share, and select "Avocato" — the app opens and extracts the
recipe automatically. You can also paste a video URL directly on the
home screen. Example URL that works well:
https://www.youtube.com/watch?v=<아무 요리 영상이나 하나 넣기>

Extraction and recipe search work without an account. Signing in (Sign
in with Apple only) unlocks saving recipes and an optional Pro
subscription (via In-App Purchase) that adds unlimited saves,
collections, a weekly meal plan, higher daily limits, and a
magazine-style print/PDF export.

Account deletion: Profile → Delete Account (tap twice to confirm) —
immediately and permanently deletes the account and all associated
data from within the app, no support contact required.
```

## 6. 개인정보 보호 라벨 (App Privacy 설문 답변)

App Store Connect의 App Privacy 설문에서 (로그인 + IAP가 이미 켜진 현재 기준으로 업데이트됨):

**Data Used to Track You**: 없음 (No)

**Data Linked to You** (계정에 연결되는 데이터):
- **Contact Info → Email Address**: 예 (Apple 로그인 시 받는 이메일 — 계정 식별용)
- **Identifiers → User ID**: 예 (Supabase user id)
- **User Content → Other User Content**: 예 (저장한 레시피)
- **Purchases → Purchase History**: 예 (Pro 구독 상태 — Apple IAP)

**Data Not Linked to You**:
- **User Content → Other User Content**: 예 (추출용으로 제출한 링크/사진/문서 — 로그인 없이도 쓰는 기능이라 계정에 연결 안 됨, 앱 기능 제공 목적, Analytics/추적 아님)
- **Usage Data → Product Interaction**: 예 (Vercel Analytics 익명 사용 통계 — Analytics 목적)

> App Store Connect 설문에서 "Do you or your third-party partners collect
> data from this app?" → Yes로 답하고 위 항목들을 정확히 매핑해야 함.
> 실제 앱 동작과 라벨이 안 맞으면 그 자체로 심사 거절/이후 삭제 사유가 됨.

## 7. 제출 전 체크리스트

**App Store Connect (포털 작업)**
- [ ] **In-App Purchase 상품 등록** — Avocato Pro 구독($4/월) 만들고 상태를 "Ready to Submit"으로. 바이너리 제출과 별개로 이것도 준비돼 있어야 심사가 진행됨
- [ ] **Paid Apps Agreement 서명 + 은행/세금 정보 입력** (App Store Connect → Agreements, Tax, and Banking) — IAP 매출을 받으려면 필수, 안 해두면 IAP 자체가 심사 통과해도 활성화 안 됨
- [ ] App Privacy 설문 — 위 6번 항목대로 입력
- [ ] 위 2, 3, 5번 문구/스크린샷 업로드

**Xcode / 코드 쪽**
- [ ] `git pull`로 최신 코드 받기 (계정 삭제 기능, 로그인/결제 문구 수정 등 이번에 추가됨)
- [ ] **Version 1.0 / Build 1** 확인 (App 타겟 General 탭)
- [ ] 앱 아이콘 1024×1024가 Assets에 있는지 확인 (있음 — resources/icon.png에서 생성됨)
- [ ] 스킴이 **App**으로 되어있는지 확인 (다른 스킴 선택된 채로 빌드했던 적 있었으니 한 번 더 확인)
- [ ] TestFlight로 본인 폰에 먼저 설치해서 최종 확인 (심사 없이 바로 가능) — 특히:
  - [ ] Sign in with Apple로 로그인 → 로그아웃 → 재로그인 잘 되는지
  - [ ] Profile → **Delete Account** 두 번 탭 → 실제로 계정이 사라지고 로그아웃되는지
  - [ ] Sandbox 계정으로 Pro 구독 테스트 (App Store Connect에 Sandbox Tester 등록 후 로그인해서 테스트)
  - [ ] Library → Saved 탭에서 **Manage subscription**을 눌렀을 때 Stripe가 아니라 iOS 자체 구독 관리 화면으로 가는지
- [ ] `Product → Archive`로 아카이브 생성 (기기 선택을 "Any iOS Device (arm64)"로)
- [ ] Organizer 창에서 **Distribute App → App Store Connect → Upload**
- [ ] **Submit for Review** — 첫 심사는 보통 24~48시간

## 8. 예상 거절 사유와 선제 대응

| 가이드라인 | 상태 |
| --- | --- |
| 3.1.1 외부 결제 링크 금지 | ✅ Stripe 버튼/구독 관리 링크 전부 네이티브에서 숨겨지거나 iOS 자체 화면으로 대체됨 (Manage Subscription도 최근 수정) |
| 5.1.1(v) 앱 내 계정 삭제 필수 | ✅ Profile → Delete Account, 이메일 문의 없이 앱 안에서 즉시 삭제 (이번에 새로 추가) — **IAP 등록 전 이 항목이 제일 흔한 거절 사유라 특히 확인 필요** |
| 5.1.1 개인정보처리방침 | ✅ /privacy 페이지 — Apple 로그인 전용, IAP, 인앱 계정 삭제로 최신화됨 |
| App Privacy 설문 ↔ 실제 동작 일치 | ✅ 6번 항목대로 입력하면 일치 (이메일/유저ID/구매내역이 Data Linked to You로 반영됨) |
| 4.2 최소 기능성 ("웹사이트 래퍼") | ✅ 공유 익스텐션·햅틱·클립보드 감지·화면 꺼짐 방지·네이티브 Apple 로그인·StoreKit IAP 등 다수 |
| 2.1 크래시/미완성 | 제출 전 TestFlight에서 공유 플로우 + 로그인 + 삭제 + 구독 흐름 한 번씩 확인 |
| 카메라/사진 권한 문구 | ✅ Info.plist에 설명 문자열 추가됨 |
| 4.8 로그인 서비스 | ✅ Sign in with Apple만 제공(제3자 로그인 없음) — 이 가이드라인 자체가 적용 안 되는 가장 안전한 구성 |
