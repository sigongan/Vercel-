# 앱 켜자마자 나오는 아보카도 애니메이션 — Xcode 설정

Tiimo처럼 **앱을 여는 순간부터** 아보카도가 통통 튀고 "Warming up the
kitchen…" 문구가 은은하게 깜빡이는 네이티브 스플래시. 애플 규정상
OS 런치 스크린 자체는 정적이어야 하지만, 앱 코드가 실행되는 첫
프레임부터는 애니메이션이 허용돼요 — 이 기능이 정확히 그 방식이에요.
웹앱이 뒤에서 로딩되는 동안 애니메이션이 보이다가, 준비되면 부드럽게
사라져요 (인터넷이 아무리 느려도 최대 8초 후엔 자동으로 넘어감).

Swift 파일은 전부 준비돼서 푸시돼 있어요. 맥북에서 ~5분 작업:

## 1. 최신 코드 받기

```bash
cd ~/Desktop/avocato-app
git pull
npm install
npm run cap:sync
```

(`cap:sync`가 필수예요 — 스플래시 설정이 바뀌어서 네이티브 프로젝트에
반영돼야 해요.)

## 2. Swift 파일 3개 추가

1. Xcode에서 프로젝트 열기
2. Finder에서 `~/Desktop/avocato-app/native/App/` 폴더를 열고, 다음
   3개 파일을 Xcode 왼쪽의 **App 폴더**(AppDelegate.swift가 있는 곳)로
   드래그:
   - `AnimatedSplashView.swift`
   - `SplashReadyPlugin.swift`
   - `AvocatoViewController.swift`
3. 팝업에서: **Copy files to destination** 체크 ✅, Add to targets:
   **App만 체크**

> 이미 Live Activities 설정을 해서 `AvocatoViewController.swift`가
> 프로젝트에 있다면: 그 파일만 드래그에서 빼고, 대신 기존 파일 내용을
> 새 버전(`native/App/AvocatoViewController.swift`)으로 교체하세요.

## 3. Main.storyboard 연결 (한 번만)

1. 왼쪽에서 **Main** (Main.storyboard) 클릭
2. 편집기에서 **View Controller** 선택 (왼쪽 트리 안 "Bridge View
   Controller" 항목)
3. 오른쪽 패널 **Identity Inspector** (네모에 선 있는 아이콘) 클릭
4. **Custom Class → Class**에 `AvocatoViewController` 입력 후 엔터

> Live Activities 설정을 이미 마쳐서 이 단계를 해놨다면 건너뛰세요.

## 4. 빌드 & 확인

1. 스킴 **App**, 본인 아이폰 선택 → `Cmd + R`
2. 설치 후 앱을 **완전히 종료**했다가 다시 켜기
3. 여는 순간부터 아보카도가 튀고 문구가 깜빡이다가, 화면이 준비되면
   스르륵 사라지면 성공

## 참고

- 웹 쪽 오버레이(기존 1초짜리 아보카도)도 같은 디자인이라, 네이티브
  스플래시가 사라진 직후 이어져도 위화감이 없어요.
- 이 파일들을 아직 안 넣은 빌드에서도 앱은 정상 작동해요 — 그냥
  로딩 중에 애니메이션 대신 브랜드 색 배경만 보일 뿐이에요.
