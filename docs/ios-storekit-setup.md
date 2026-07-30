# Pro 구독을 애플 인앱결제(StoreKit)로 — 설정 가이드

**Avocato는 결제를 애플 인앱결제(StoreKit)로만 처리해요 — Stripe/Apple Pay는
쓰지 않아요.** 웹에는 결제 수단이 없고, Pro 구독은 iOS 앱에서만 구매할 수
있어요 (애플 심사 규정 3.1.1 대응이자, 결제 시스템을 하나로 단순화하기
위한 결정). 코드/서버 쪽은 다 준비돼서 푸시했고, 아래는 애플 개발자
콘솔 + Vercel + Xcode에서 직접 해야 하는 부분이에요. 순서대로 하면 돼요.

> 네이티브 앱은 이제 완전한 SwiftUI라 예전 Capacitor 브릿지가 없어요.
> `StoreKitPlugin.swift`를 Xcode로 드래그하던 단계는 사라졌고,
> `PurchaseStore.swift`가 앱 코드에 이미 포함돼 있어요 — git pull만
> 하면 돼요.

## 1. 애플 루트 인증서 다운받기 (5분)

서버가 "이 결제가 진짜 애플에서 온 게 맞다"를 확인할 때 필요한 공개
파일이에요 (비밀값 아님). 이미 해뒀으면 건너뛰어도 돼요.

1. https://www.apple.com/certificateauthority/ 접속
2. **Apple Root Certificates** 아래 **Apple Root CA - G3** 다운로드
3. 받은 파일을 `lib/apple/certs/AppleRootCA-G3.cer` 로 저장
4. 커밋 & 푸시:
   ```bash
   cd /Users/hyounggyunbaek/Desktop/Vercel-
   git add lib/apple/certs/AppleRootCA-G3.cer
   git commit -m "Add Apple root certificate for StoreKit verification"
   git push origin claude/recipe-extraction-tool-hui8ci
   ```

## 2. App Store Connect에서 구독 상품 만들기

1. [App Store Connect](https://appstoreconnect.apple.com) → 본인 앱 →
   **자동 갱신 구독(Auto-Renewable Subscriptions)** 메뉴
2. 구독 그룹이 없으면 하나 생성 (예: "Avocato Pro")
3. 새 구독 추가:
   - **Product ID**: 예) `app.avocato.ios.pro.monthly`
     (여기 적은 값을 그대로 기억해두세요 — 3, 5단계에서 그대로 씀)
   - 가격, 구독 기간(1개월), 표시 이름/설명 등 채우기
   - 심사에 필요한 스크린샷/현지화 정보도 요구하면 채워주세요
4. 저장은 되지만 **"입금 계좌 정보(Agreements, Tax, and Banking)"가
   완료돼야 실제로 판매 가능**해요 — 아직 안 했으면 App Store Connect
   상단 배너에서 진행해주세요

## 3. 환경변수 설정 (Vercel)

Vercel 프로젝트 설정 → Environment Variables 에 아래 값들 추가:

| 변수 | 값 |
|---|---|
| `APPLE_BUNDLE_ID` | 앱의 Bundle ID (`app.avocato.ios`) — 이미 있으면 건너뛰기 |
| `APPLE_PRO_PRODUCT_ID` | 2단계에서 만든 Product ID (예: `app.avocato.ios.pro.monthly`) |
| `APPLE_APP_APPLE_ID` | App Store Connect 앱 정보에 있는 숫자 App ID — 아직 심사 제출 전이면 비워둬도 됨 |
| `APPLE_IAP_ENVIRONMENT` | 테스트 중엔 `Sandbox`, 실제 출시 후엔 `Production` |

`NEXT_PUBLIC_APPLE_PRO_PRODUCT_ID`는 예전 Capacitor 웹 브릿지용이라 새
앱에서는 더 이상 안 읽어요 — 설정 안 해도 돼요.

값 저장(Production/Preview 다 체크) 후 **재배포(Redeploy)** 한 번
해주세요.

## 4. 서버 알림(Server Notifications) 등록

구독 갱신/취소/환불 같은 이벤트를 애플이 서버로 바로 알려주게 하는
설정이에요 (사람이 앱을 안 켜도 자동으로 처리됨).

1. App Store Connect → 앱 → **App Information** → **App Store Server
   Notifications**
2. **Production Server URL**: `https://vercel-ecru-iota-55.vercel.app/api/apple/notifications`
3. **Sandbox Server URL**: 같은 주소로 등록 (테스트용 알림도 여기로 옴)
4. Version: **Version 2** 선택

## 5. Xcode: Product ID를 Info.plist에 추가 (필수)

앱이 어떤 상품을 구매창에 띄울지 알아야 해요. 2단계에서 만든 Product ID를
**정확히 똑같이** 입력해주세요 — 한 글자라도 다르면 "상품을 찾을 수
없음" 에러가 나요.

1. TARGETS → Avocato → **Info** 탭
2. 아무 줄에서 **+** 눌러서 한 줄 추가:

| Key | Type | Value |
|---|---|---|
| `AppleProProductId` | String | `app.avocato.ios.pro.monthly` (2단계에서 실제로 만든 값) |

## 6. Capability 추가

1. Xcode에서 프로젝트 선택 → 타겟 **Avocato** → **Signing & Capabilities**
2. **+ Capability** → **In-App Purchase** 추가 (이미 있으면 건너뛰기)

## 7. 테스트

실제 결제 없이 테스트하려면 App Store Connect의 **Sandbox 테스트
계정**을 하나 만들어서, 아이폰의 설정 → App Store → Sandbox 계정에
로그인한 뒤 앱에서 구독을 눌러보면 돼요. 실제 카드 청구 없이 결제
흐름을 그대로 테스트할 수 있어요.

1. `git pull` 하고 ⌘R
2. Profile → **Settings** → **Subscription** 섹션에서 상품 이름/가격이
   뜨는지 확인 (안 뜨면 5단계 Product ID 오타 의심)
3. **Subscribe** 눌러서 Sandbox 결제창이 뜨는지, 완료 후 "Pro"로
   바뀌는지 확인
4. **Restore Purchases**도 눌러서 정상 동작하는지 확인 — 애플 심사에서
   필수로 요구하는 버튼이라 이미 앱에 추가해뒀어요

## 참고 — 웹에는 결제 자체가 없음

웹사이트에는 구독 버튼이 없어요. 실제 결제는 iOS 앱 안 StoreKit 한
곳에서만 일어나요. 이미 iOS에서 Pro로 가입한 계정은 웹에서 로그인해도
저장한 레시피 등 Pro 기능이 그대로 보여요(같은 계정 기준) — 웹에서
새로 구매하는 경로만 없는 거예요.
