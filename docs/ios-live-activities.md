# 다이나믹 아일랜드 요리 타이머 (Live Activities) — Xcode 설정

쿡 모드에서 단계 타이머를 켜면 **다이나믹 아일랜드와 잠금 화면에
카운트다운이 계속 표시**되는 기능. 요리하다 폰이 잠겨도, 다른 앱을
봐도 타이머가 보인다. 조사한 경쟁 앱 중 이걸 가진 앱은 없음.

웹 쪽(JS)과 Swift 파일은 전부 준비되어 푸시돼 있고, 아래 Xcode
작업만 하면 켜진다. 전부 맥북에서 하는 작업이고 약 15분 소요.

## 준비

```bash
cd ~/Desktop/avocato-app
git pull
```

## 1. Widget Extension 타겟 만들기

1. Xcode에서 프로젝트 열기 (`ios/App/App.xcodeproj`)
2. 메뉴 **File → New → Target...**
3. 검색창에 `widget` 입력 → **Widget Extension** 선택 → Next
4. 설정:
   - Product Name: `CookTimerWidget` (정확히 이 이름)
   - Team: Jess Baek
   - **"Include Live Activity" 체크박스: 체크** ✅
   - "Include Configuration App Intent" 체크박스: **해제** ❌
5. Finish → "Activate scheme?" 팝업이 뜨면 **Cancel** (App 스킴 유지)

## 2. 템플릿 파일 삭제하고 우리 파일 넣기

Xcode가 왼쪽에 `CookTimerWidget` 폴더를 만들고 템플릿 Swift 파일
몇 개를 넣어놨을 것.

1. 그 폴더 안의 **`.swift` 파일 전부** 오른쪽 클릭 → Delete →
   **Move to Trash** (Assets.xcassets와 Info.plist는 남겨두기)
2. Finder에서 `~/Desktop/avocato-app/native/CookTimerWidget/` 폴더를
   열고, 그 안의 Swift 파일 3개를 Xcode 왼쪽의 `CookTimerWidget`
   폴더로 **드래그**:
   - `CookTimerAttributes.swift`
   - `CookTimerLiveActivity.swift`
   - `CookTimerWidgetBundle.swift`
3. 드래그하면 뜨는 팝업에서:
   - "Copy files to destination" 체크 ✅
   - Add to targets: **`CookTimerWidget`만 체크**
4. **중요한 한 가지**: 방금 넣은 `CookTimerAttributes.swift` 파일을
   클릭 → 오른쪽 패널(File Inspector, 문서 아이콘 탭) → **Target
   Membership**에서 **`App`도 추가로 체크** ✅ (앱과 위젯이 같은
   데이터 모델을 공유해야 해서 이 파일만 양쪽 타겟 소속)

## 3. 앱 타겟에 브릿지 파일 넣기

1. Finder에서 `~/Desktop/avocato-app/native/App/` 폴더를 열고, Swift
   파일 2개를 Xcode 왼쪽 **App 폴더** (capacitor.config.json,
   AppDelegate.swift가 있는 곳)로 드래그:
   - `CookActivityPlugin.swift`
   - `AvocatoViewController.swift`
2. 팝업에서: Copy files ✅, Add to targets: **`App`만 체크**

## 3-1. 플러그인 등록 주석 해제

`AvocatoViewController.swift`를 열어 `capacitorDidLoad` 안의 주석 처리된
`bridge?.registerPluginInstance(CookActivityPlugin())` 줄의 **주석(//)을
제거**해주세요 (애니메이션 스플래시 기능과 파일을 공유해서, Live
Activities 파일을 추가하기 전까지는 주석 상태로 둬야 빌드가 돼요).

## 4. Main.storyboard 연결

웹 앱이 네이티브 타이머 기능을 부를 수 있게 하는 연결 고리.

1. 왼쪽에서 **Main** (Main.storyboard) 클릭
2. 가운데 편집기에서 **View Controller** 선택 (왼쪽 트리에서 "Bridge
   View Controller" 또는 "View Controller" 항목 클릭)
3. 오른쪽 패널에서 **Identity Inspector** (네모에 선 있는 아이콘,
   왼쪽에서 4번째쯤) 클릭
4. **Custom Class → Class** 칸에 `AvocatoViewController` 입력 후 엔터
   (Module은 자동으로 App이 됨)

## 5. Info.plist에 Live Activity 허용 추가

1. 왼쪽에서 **App 타겟의 Info.plist** 클릭 (App 폴더 안의 Info)
2. 아무 행에 마우스 올리면 나오는 **+** 클릭, 추가:
   - Key: `NSSupportsLiveActivities` (또는 목록에서 "Supports Live
     Activities" 선택) → Type: Boolean → Value: **YES**

## 6. 위젯 타겟 버전 맞추기

1. TARGETS에서 **CookTimerWidget** 클릭 → **General** 탭
2. **Minimum Deployments**를 **iOS 16.2**로 설정 (Live Activity 최소
   버전. 위젯만 이 버전이면 되고, 앱 본체는 15.0 유지 — iOS 16.2
   미만 기기에선 이 기능만 조용히 꺼짐)
3. **Signing & Capabilities** 탭에서 Team이 **Jess Baek**인지 확인

## 7. 빌드 & 테스트

1. 상단 스킴이 **App**인지 확인 (CookTimerWidget 아님) → `Cmd + R`
2. 아이폰에서: 레시피 추출 → **Cook** → 시간이 있는 단계 ("10분간
   끓인다" 등) → 타이머 **시작** 버튼
3. 홈으로 나가기 → **다이나믹 아일랜드에 타이머**가 보여야 함
4. 폰 잠그기 → **잠금 화면에도** 프라이팬 아이콘 + 카운트다운
5. 다이나믹 아일랜드를 **길게 누르면** 큰 화면 (레시피 이름, 단계,
   남은 시간)

## 문제 해결

- **다이나믹 아일랜드에 안 뜸**: 설정 → Avocato → **실시간 현재
  활동(Live Activities)** 켜져 있는지 확인. 그리고 다이나믹
  아일랜드는 iPhone 14 Pro 이상 전용 — 그 외 기기는 잠금 화면에만 표시됨 (정상).
- **빌드 에러 "Cannot find CookTimerAttributes"**: 2-4단계의 Target
  Membership 누락 — `CookTimerAttributes.swift`가 App과
  CookTimerWidget **양쪽 모두**에 체크되어 있어야 함.
- **`.v26` 에러가 또 나오면**: `npm run cap:sync` 다시 실행 (자동
  수정 스크립트가 처리해줌).
