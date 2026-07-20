# 프린트 기능 — Xcode 설정

지금까지 Print 버튼이 앱에서 안 먹혔던 이유: `window.print()`는 표준
웹 API지만, 아이폰 앱을 감싸는 WKWebView는 이걸 구현 안 해요 (모바일
사파리는 되는데 앱 안의 웹뷰는 조용히 아무 반응 없음). 그래서
`UIPrintInteractionController`라는 네이티브 프린트 기능을 직접
연결하는 파일 하나 추가했어요.

Swift 파일은 준비돼서 푸시돼 있어요. 애니메이션 스플래시 설정하실 때
(`docs/ios-animated-splash.md`) 같이 하시면 편해요 — 지금 Xcode Add
Files 창을 이미 열어놓으셨다면 이 파일도 같이 선택하시면 돼요.

## 1. 최신 코드 받기

```bash
cd ~/Desktop/avocato-app
git pull
npm install
```

## 2. Swift 파일 1개 추가

1. Xcode 왼쪽 **App 폴더**(AppDelegate.swift가 있는 곳)에서 오른쪽
   클릭 → **Add Files to "App"...**
2. `~/Desktop/avocato-app/native/App/` 폴더로 이동해서
   **`PrintPlugin.swift`** 선택
3. **Copy items if needed** 체크 ✅, **Add to targets: App** 체크 ✅ →
   **Add**

> 이미 애니메이션 스플래시 3개 파일 추가하는 중이면, 그때 이 파일도
> 같이 Cmd 클릭해서 한 번에 추가하셔도 돼요.

## 3. 빌드 & 확인

1. 스킴 **App**, 본인 아이폰(또는 시뮬레이터) 선택 → `Cmd + R`
2. 레시피 화면에서 **Print** 버튼 탭
3. iOS 프린트 미리보기 화면이 뜨면 성공 (실제 프린터가 없어도 미리보기
   화면이 뜨는 것 자체로 연결 확인 가능 — 화면 오른쪽 위 X로 닫으면 됨)

## 참고

- 이 파일을 아직 안 넣은 빌드에서는 Print 버튼이 예전처럼 조용히 아무
  반응 없어요 (에러는 안 남).
- 웹사이트(브라우저)에서는 원래부터 잘 됐고, 이번 변경과 무관하게
  그대로 동작해요.
