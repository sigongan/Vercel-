# 네이티브 Apple 로그인 — 잘나가는 앱들처럼 (브라우저 없이)

로그인이 **Apple 하나로 통일**됐어요 (Google/이메일 버튼은 제거 — 앱이
애플 생태계 우선이라 하나의 확실한 네이티브 로그인이 더 좋아요).
이제 "Continue with Apple"을 누르면 브라우저 창 없이 앱 화면 위로
**Face ID 시트가 바로** 올라오고, 확인하는 순간 로그인이 끝나요.

코드는 다 준비돼서 푸시했고, 아래만 해주면 돼요 (~10분).

## 1. Supabase에 앱 Bundle ID 추가

네이티브 로그인은 웹 로그인과 다른 ID(`app.avocato.ios`)로 토큰이
발급돼서, Supabase가 그것도 신뢰하게 등록해야 해요:

1. Supabase 대시보드 → **Authentication → Providers → Apple**
2. **Client IDs** 칸을 이렇게 수정 (쉼표로 구분, 순서 중요 — 웹용이 먼저):
   ```
   app.avocato.ios.web,app.avocato.ios
   ```
3. Save

## 2. Xcode 설정

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

## 3. 테스트

앱에서 **Continue with Apple** → 브라우저 없이 Face ID 시트가 바로
뜨고, 확인하면 곧바로 로그인된 상태(프로필에 이름 표시)가 되면 성공! 🎉

## 참고

- **웹사이트**(사파리에서 직접 접속)에서도 Apple 로그인만 보여요 —
  거기서는 정상적인 애플 로그인 페이지로 넘어갔다 돌아오는 방식이고,
  이미 설정돼 있어서 추가 작업 없어요.
- 플러그인이 없는 옛날 빌드에서도 앱이 죽지 않아요 — 그 경우에만
  이전 방식(시스템 브라우저)으로 폴백해요.
- Google Cloud / Supabase의 Google 설정은 이제 안 쓰지만 지워둘 필요는
  없어요 — 나중에 안드로이드 버전 낼 때 그대로 다시 살릴 수 있어요.
