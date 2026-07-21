# Pro 구독을 애플 인앱결제(StoreKit)로 — 설정 가이드

지금까지 앱 안에서 Pro 구독은 Stripe로 결제됐는데, 애플 심사 규정(3.1.1)상
**앱 안에서 쓰는 구독은 애플 인앱결제(In-App Purchase)를 써야 해요.** Stripe로
그대로 냈으면 심사 반려 사유가 될 수 있어서, 이번에 앱 안에서는 애플
StoreKit으로 결제하고, 웹사이트에서는 그대로 Stripe로 결제하도록
분리했어요. 코드/서버 쪽은 다 준비돼서 푸시했고, 아래는 애플 개발자
콘솔 + Xcode에서 직접 해야 하는 부분이에요. 순서대로 하면 돼요.

## 1. 애플 루트 인증서 다운받기 (5분)

서버가 "이 결제가 진짜 애플에서 온 게 맞다"를 확인할 때 필요한 공개
파일이에요 (비밀값 아님).

1. https://www.apple.com/certificateauthority/ 접속
2. **Apple Root Certificates** 아래 **Apple Root CA - G3** 다운로드
3. 받은 파일을 `lib/apple/certs/AppleRootCA-G3.cer` 로 저장
4. 커밋 & 푸시:
   ```bash
   cd ~/Desktop/avocato-app
   git add lib/apple/certs/AppleRootCA-G3.cer
   git commit -m "Add Apple root certificate for StoreKit verification"
   git push
   ```

## 2. App Store Connect에서 구독 상품 만들기

1. [App Store Connect](https://appstoreconnect.apple.com) → 본인 앱 →
   **자동 갱신 구독(Auto-Renewable Subscriptions)** 메뉴
2. 구독 그룹이 없으면 하나 생성 (예: "Avocato Pro")
3. 새 구독 추가:
   - **Product ID**: 예) `app.avocato.ios.pro.monthly`
     (여기 적은 값을 그대로 기억해두세요 — 3단계에서 씀)
   - 가격, 구독 기간(1개월), 표시 이름/설명 등 채우기
   - 심사에 필요한 스크린샷/현지화 정보도 요구하면 채워주세요
4. 저장은 되지만 **"입금 계좌 정보(Agreements, Tax, and Banking)"가
   완료돼야 실제로 판매 가능**해요 — 아직 안 했으면 App Store Connect
   상단 배너에서 진행해주세요

## 3. 환경변수 설정 (Vercel)

Vercel 프로젝트 설정 → Environment Variables 에 아래 값들 추가:

| 변수 | 값 |
|---|---|
| `APPLE_BUNDLE_ID` | 앱의 Bundle ID (예: `app.avocato.ios`) |
| `APPLE_PRO_PRODUCT_ID` | 2단계에서 만든 Product ID (예: `app.avocato.ios.pro.monthly`) |
| `NEXT_PUBLIC_APPLE_PRO_PRODUCT_ID` | 위와 **똑같은 값** (앱 안에서 결제창 열 때 필요해서 하나 더 필요해요) |
| `APPLE_APP_APPLE_ID` | App Store Connect 앱 정보에 있는 숫자 App ID (예: `1234567890`) — 앱을 아직 심사 제출 전이면 비워둬도 됨, 나중에 채워도 OK |
| `APPLE_IAP_ENVIRONMENT` | 테스트 중엔 `Sandbox`, 실제 출시 후엔 `Production` |

값 저장 후 **재배포(Redeploy)** 한 번 해주세요.

## 4. 서버 알림(Server Notifications) 등록

구독 갱신/취소/환불 같은 이벤트를 애플이 서버로 바로 알려주게 하는
설정이에요 (사람이 앱을 안 켜도 자동으로 처리됨).

1. App Store Connect → 앱 → **App Information** → **App Store Server
   Notifications**
2. **Production Server URL**: `https://[본인 도메인]/api/apple/notifications`
3. **Sandbox Server URL**: 같은 주소로 등록 (테스트용 알림도 여기로 옴)
4. Version: **Version 2** 선택

## 5. Xcode에 파일 추가 (~5분)

1. 최신 코드 받기:
   ```bash
   cd ~/Desktop/avocato-app
   git pull
   npm install
   npm run cap:sync
   ```
2. Xcode에서 프로젝트 열고, Finder에서
   `~/Desktop/avocato-app/native/App/StoreKitPlugin.swift` 를 Xcode
   왼쪽 **App 폴더**(AppDelegate.swift가 있는 곳)로 드래그
3. 팝업에서: **Copy files to destination** 체크 ✅, Add to targets:
   **App만** 체크
4. `AvocatoViewController.swift`는 이미 있는 파일에 플러그인 등록 코드가
   추가된 버전으로 푸시됐어요 — 별도로 드래그할 필요 없이, git pull로
   이미 반영됨 (만약 Xcode에 옛날 버전이 열려 있었다면 파일 다시
   선택해서 최신 내용인지 확인만 해주세요)

## 6. Capability 추가

1. Xcode에서 프로젝트 선택 → 타겟 **App** → **Signing & Capabilities**
2. **+ Capability** → **In-App Purchase** 추가
   (이미 있으면 건너뛰기)

## 7. 테스트

실제 결제 없이 테스트하려면 App Store Connect의 **Sandbox 테스트
계정**을 하나 만들어서, 아이폰의 설정 → App Store → Sandbox 계정에
로그인한 뒤 앱에서 구독을 눌러보면 돼요. 실제 카드 청구 없이 결제
흐름을 그대로 테스트할 수 있어요.

1. 스킴 **App**, 본인 아이폰 선택 → `Cmd + R`
2. 프로필 탭 → 구독하기 눌러서 Sandbox 결제창 뜨는지 확인
3. 설정 탭 맨 아래 **Restore Purchases**(구매 복원) 버튼도 눌러서
   정상 동작하는지 확인 — 이건 애플 심사에서 필수로 요구하는
   버튼이라 이미 앱에 추가해뒀어요

## 참고 — 웹은 그대로 Stripe

이 앱을 웹 브라우저(사파리 등)에서 열었을 때는 지금처럼 Stripe로
결제돼요. iOS 앱 안에서 열렸을 때만 자동으로 StoreKit으로 전환되니까
따로 신경 쓸 부분은 없어요.
