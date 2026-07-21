# 네이티브 로그인 — 잘나가는 앱들처럼 (브라우저 없이)

지금까지는 Google/Apple 로그인을 누르면 브라우저 창이 뜨고 supabase
주소가 보이는 방식이었는데, 이걸 다른 유명 앱들과 똑같은 **완전
네이티브 방식**으로 바꿨어요:

- **Apple**: 앱 화면 위로 Face ID 시트가 바로 올라옴 (브라우저 X)
- **Google**: 구글 계정 선택 시트가 바로 올라옴 (브라우저 X)

코드는 다 준비돼서 푸시했고, 아래 절차만 마치면 돼요. **Part A(Apple)를
먼저** 끝내고 테스트한 다음 Part B(Google)로 넘어가는 걸 추천해요.

---

## Part A — Apple 네이티브 로그인 (~10분)

### A-1. Supabase에 앱 Bundle ID 추가

네이티브 로그인은 웹 로그인과 다른 ID(`app.avocato.ios`)로 토큰이
발급돼서, Supabase가 그것도 신뢰하게 등록해야 해요:

1. Supabase 대시보드 → **Authentication → Providers → Apple**
2. **Client IDs** 칸을 이렇게 수정 (쉼표로 구분, 순서 중요 — 웹용이 먼저):
   ```
   app.avocato.ios.web,app.avocato.ios
   ```
3. Save

### A-2. Xcode 설정

1. 최신 코드 받기:
   ```bash
   cd ~/Desktop/avocato-app
   git pull
   npm install
   npm run cap:sync
   ```
2. Finder에서 `~/Desktop/avocato-app/native/App/AppleSignInPlugin.swift`
   를 Xcode 왼쪽 **App 폴더**(AppDelegate.swift 있는 곳)로 드래그
   - 팝업: **Copy files to destination** ✅, Add to targets: **App만** ✅
3. `AvocatoViewController.swift`가 새 버전으로 바뀌었어요 — Xcode에서
   그 파일을 열고, Finder의 `native/App/AvocatoViewController.swift`
   내용을 통째로 복사해서 덮어쓰기 (이전에 하던 방식 그대로)
4. **App 타겟 → Signing & Capabilities → + Capability → Sign in with
   Apple** 추가 (이미 있으면 건너뛰기)
5. `Cmd + R`로 빌드 & 설치

### A-3. 테스트

앱에서 **Continue with Apple** → 브라우저 없이 Face ID 시트가 바로
뜨고, 확인하면 곧바로 로그인된 상태가 되면 성공! 🎉

---

## Part B — Google 네이티브 로그인 (~15분)

### B-1. Google Cloud에서 iOS용 클라이언트 만들기

(기존에 만든 건 "웹용"이라 iOS용이 하나 더 필요해요 — 웹용은 그대로 둠)

1. [console.cloud.google.com](https://console.cloud.google.com) →
   **APIs & Services → Credentials → + Create Credentials → OAuth client ID**
2. **Application type**: **iOS** 선택
3. 입력:
   - Name: `Avocato iOS`
   - **Bundle ID**: `app.avocato.ios`
4. **Create** → 두 가지 값을 복사해두기:
   - **Client ID** (`xxxx.apps.googleusercontent.com` 형태)
   - **iOS URL scheme** (`com.googleusercontent.apps.xxxx` 형태 —
     화면에 같이 표시돼요. 안 보이면 Client ID의 앞뒤를 뒤집은 것)

### B-2. Supabase에 iOS Client ID 추가

1. Supabase 대시보드 → **Authentication → Providers → Google**
2. **Client IDs** 칸의 기존 값 **뒤에** 쉼표 찍고 iOS Client ID 추가:
   ```
   (기존 웹 Client ID),(방금 만든 iOS Client ID)
   ```
3. 같은 화면에 **Skip nonce checks** 옵션이 있으면 **켜기**
   (구글 iOS SDK가 nonce를 지원 안 해서 필요한 설정이에요)
4. Save

### B-3. Vercel 환경변수

Vercel → 프로젝트 → Settings → Environment Variables:

| 변수 | 값 |
|---|---|
| `NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID` | B-1의 iOS Client ID |

저장 후 **Redeploy** 한 번.

### B-4. Xcode에 구글 SDK + 파일 추가

1. Xcode 메뉴 **File → Add Package Dependencies...**
2. 오른쪽 위 검색창에 붙여넣기:
   ```
   https://github.com/google/GoogleSignIn-iOS
   ```
3. **Add Package** → 패키지 목록에서 **GoogleSignIn**을 **App** 타겟에
   추가 → Add Package
4. Finder에서 `native/App/GoogleSignInPlugin.swift`를 Xcode의 **App
   폴더**로 드래그 (Copy ✅, target App ✅)
5. **App 타겟 → Info 탭 → URL Types** → **+** 눌러서 추가:
   - **Identifier**: `google-signin`
   - **URL Schemes**: B-1에서 복사한 iOS URL scheme
     (`com.googleusercontent.apps.xxxx`)
6. `Cmd + R`로 빌드 & 설치

### B-5. 테스트

앱에서 **Continue with Google** → 브라우저 없이 구글 계정 시트가 바로
뜨고, 계정 선택하면 곧바로 로그인되면 성공! 🎉

---

## 참고

- **순서 주의**: B-4에서 SDK 패키지(1~3번)를 추가하기 **전에**
  `GoogleSignInPlugin.swift` 파일부터 넣으면 빌드가 깨져요. 꼭 패키지
  먼저.
- Part B를 아직 안 했어도 앱은 정상 작동해요 — 구글 버튼만 이전
  방식(브라우저)으로 열릴 뿐이에요. Part A만으로도 Apple 로그인은
  네이티브로 바뀌어요.
- 웹사이트(사파리에서 직접 접속)는 원래 방식(정상적인 리디렉션) 그대로
  작동하고, 바꿀 필요 없어요.
- 이메일(매직링크) 로그인도 그대로예요.
