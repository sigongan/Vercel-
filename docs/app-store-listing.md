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
| Price | Free (무료 출시 — 결제는 추후 IAP로) |

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
• Cook Mode: big type, one step at a time, screen stays awake
• Built-in step timers
• Scale, copy, share, or print any recipe
• Three beautiful recipe card styles
• Your recent recipes, saved on your device

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

- **Sign-in required?** → No (로그인 없이 전 기능 사용 가능 — 심사에 유리)
- **Notes 칸에 넣을 문구**:

```
Avocato extracts structured recipes from cooking videos and documents
using AI (Anthropic Claude).

To test the core flow: open the YouTube or TikTok app, find any cooking
video, tap Share, and select "Avocato" — the app opens and extracts the
recipe automatically. You can also paste a video URL directly on the
home screen. Example URL that works well:
https://www.youtube.com/watch?v=<아무 요리 영상이나 하나 넣기>

The app checks the clipboard for recipe links on launch (with the
standard iOS paste notice) to offer one-tap extraction — this is
described in our privacy policy.

No account is required. There are no purchases in this version.
```

## 6. 개인정보 보호 라벨 (App Privacy 설문 답변)

App Store Connect의 App Privacy 설문에서:

**Data Used to Track You**: 없음 (No)

**Data Linked to You**: 없음 (계정 기능이 숨겨져 있는 현재 기준)

**Data Not Linked to You**:
- **User Content → Other User Content**: 예 (추출용으로 제출한 링크/사진/문서 — 앱 기능 제공 목적, Analytics 아님, 추적 아님)
- **Usage Data → Product Interaction**: 예 (Vercel Analytics 익명 사용 통계 — Analytics 목적)

> 나중에 로그인/IAP를 켜면 이 설문을 업데이트해야 함 (이메일 →
> Data Linked to You에 추가).

## 7. 제출 전 체크리스트

- [ ] Xcode에서 **Version 1.0 / Build 1** 확인 (App 타겟 General 탭)
- [ ] 앱 아이콘 1024×1024가 Assets에 있는지 확인 (있음 — resources/icon.png에서 생성됨)
- [ ] `Product → Archive`로 아카이브 생성 (기기 선택을 "Any iOS Device (arm64)"로)
- [ ] Organizer 창에서 **Distribute App → App Store Connect → Upload**
- [ ] App Store Connect에서 위 문구들 입력 + 스크린샷 업로드
- [ ] TestFlight로 본인 폰에 먼저 설치해서 최종 확인 (심사 없이 바로 가능)
- [ ] **Submit for Review** — 첫 심사는 보통 24~48시간

## 8. 예상 거절 사유와 선제 대응 (이미 처리된 것들)

| 가이드라인 | 상태 |
| --- | --- |
| 3.1.1 외부 결제 링크 금지 | ✅ Stripe 버튼 전부 네이티브에서 숨김 처리됨 |
| 5.1.1 개인정보처리방침 | ✅ /privacy 페이지 (클립보드·분석도구 공개 포함) |
| 4.2 최소 기능성 ("웹사이트 래퍼") | ✅ 공유 익스텐션·햅틱·클립보드 감지·화면 꺼짐 방지 등 네이티브 기능 다수 |
| 2.1 크래시/미완성 | 제출 전 TestFlight에서 공유 플로우 한 번 더 확인 |
| 카메라/사진 권한 문구 | ✅ Info.plist에 설명 문자열 추가됨 |
