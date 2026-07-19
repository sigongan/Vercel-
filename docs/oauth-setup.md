# Google / Apple 로그인 켜기 — 외부 설정 가이드

Google/Apple "Continue with..." 버튼과 화면 코드는 이미 완성돼서 배포됐어요.
근데 이건 코드만으로는 못 끝내는 부분이 있어요 — Google과 Apple이 "이
앱이 진짜 너희 거 맞다"는 걸 확인할 수 있게, 각자의 개발자 콘솔에서
OAuth 앱을 등록하고 발급되는 키를 Supabase에 넣어줘야 해요. 이건 보안
상 앱 소유자(본인)만 할 수 있는 절차라 제가 대신 못 해드려요.

지금은 버튼을 눌러도 "Unsupported provider" 같은 에러가 뜰 거예요 —
아래 설정을 마치기 전까지는 정상이에요. **이메일 로그인은 이미 100%
작동해요** (기존 매직링크 방식 그대로).

---

## 1. Google 로그인 설정 (~15분)

### 1-1. Google Cloud Console에서 OAuth 클라이언트 만들기

1. [console.cloud.google.com](https://console.cloud.google.com) 접속 →
   프로젝트 새로 만들기 (이름: Avocato)
2. 왼쪽 메뉴 **APIs & Services → OAuth consent screen**
   - User Type: **External** 선택
   - App name: `Avocato`, User support email: 본인 이메일, Developer
     contact: 본인 이메일 → Save and Continue (Scopes/Test users는
     기본값으로 넘어가도 됨)
3. 왼쪽 메뉴 **APIs & Services → Credentials → + Create Credentials →
   OAuth client ID**
   - Application type: **Web application**
   - Name: `Avocato Supabase`
   - **Authorized redirect URIs**에 추가 (Supabase 대시보드 → Authentication
     → Providers → Google 페이지에 있는 정확한 콜백 URL을 복사해서
     붙여넣기 — 보통 `https://<프로젝트ref>.supabase.co/auth/v1/callback`
     형태)
4. **Create** 누르면 **Client ID**와 **Client Secret**이 나옴 — 복사해두기

### 1-2. Supabase에 연결

1. [supabase.com](https://supabase.com) 대시보드 → 이 프로젝트 선택 →
   **Authentication → Providers → Google**
2. **Enable Sign in with Google** 켜기
3. 위에서 복사한 **Client ID**, **Client Secret** 붙여넣기 → Save

이제 웹사이트에서 "Continue with Google" 눌러보면 바로 작동해요.

---

## 2. Apple 로그인 설정 (~20분, 유료 개발자 계정 필요 — 이미 있음)

### 2-1. Apple Developer에서 Services ID 만들기

1. [developer.apple.com/account](https://developer.apple.com/account) →
   **Certificates, Identifiers & Profiles → Identifiers → +**
2. **Services IDs** 선택 → Continue
   - Description: `Avocato Web Login`
   - Identifier: `app.avocato.ios.web` (App의 Bundle ID `app.avocato.ios`와
     달라야 함 — 이건 "웹용" 별도 ID)
3. 만든 다음 그 항목 클릭 → **Sign in with Apple** 체크 → **Configure**
   - Primary App ID: `app.avocato.ios` (우리 앱) 선택
   - **Domains**: `<프로젝트ref>.supabase.co` (Supabase 프로젝트 도메인)
   - **Return URLs**: Supabase 대시보드의 Apple provider 페이지에 있는
     콜백 URL 붙여넣기 (`https://<프로젝트ref>.supabase.co/auth/v1/callback`)
   - Save → Continue → Save

### 2-2. Sign in with Apple용 키 만들기

1. **Certificates, Identifiers & Profiles → Keys → +**
2. Key Name: `Avocato Apple Sign In`
3. **Sign in with Apple** 체크 → Configure → Primary App ID로 `app.avocato.ios`
   선택 → Save
4. **Register** → **Download** (`.p8` 파일, **한 번만 다운로드 가능하니
   꼭 잘 보관**) → Key ID 메모해두기

### 2-3. Supabase에 연결

1. Supabase 대시보드 → **Authentication → Providers → Apple**
2. **Enable Sign in with Apple** 켜기
3. 입력:
   - **Services ID**: 2-1에서 만든 `app.avocato.ios.web`
   - **Team ID**: `RZVT4RBC7B` (이미 알고 있는 값)
   - **Key ID**: 2-2에서 메모한 값
   - **Private Key**: 다운로드한 `.p8` 파일 내용을 텍스트로 열어서 통째로
     붙여넣기
4. Save

### 2-4. iOS 앱에도 Sign in with Apple capability 추가 (Xcode, 한 번만)

네이티브 앱 안에서 Apple 로그인이 제대로 되려면 Xcode에서도 켜야 해요:

1. Xcode에서 **App** 타겟 → **Signing & Capabilities**
2. **+ Capability** → **Sign in with Apple** 추가
3. `npm run cap:sync` 다시 돌리고 재빌드

---

## 3. 확인하는 법

두 설정 다 끝나면:
1. 웹사이트(`vercel-ecru-iota-55.vercel.app`)에서 오른쪽 위 사람 아이콘
   클릭 → Continue with Google / Apple 눌러보기
2. 정상적으로 Google/Apple 로그인 화면으로 넘어가고, 로그인하면
   Avocato로 돌아오면서 로그인된 상태가 되면 성공
3. 앱(네이티브)에서도 똑같이 테스트 — 이땐 시스템 브라우저(Safari)가
   잠깐 떴다가 로그인 후 자동으로 앱으로 돌아와요

## 참고: 이메일 로그인은 이미 완전히 작동함

Google/Apple 설정을 미루더라도 **"Continue with email"**은 지금 바로
작동해요 (매직링크 방식, 별도 설정 필요 없음 — Supabase 프로젝트가
이미 이메일 발송을 처리하고 있어요).
