# Apple 로그인 켜기 — 외부 설정 가이드

로그인은 **Apple 전용**이에요 (`components/SignInSheet.tsx` 참고 — Google/이메일
매직링크는 의도적으로 제거됨, 하나의 강력한 네이티브 옵션이 여러 개보다
낫다는 판단). "Continue with Apple" 버튼과 화면 코드는 이미 완성돼서
배포됐어요. 근데 이건 코드만으로는 못 끝내는 부분이 있어요 — Apple이
"이 앱이 진짜 너희 거 맞다"는 걸 확인할 수 있게, Apple Developer
콘솔에서 Services ID/키를 만들고 Supabase에 넣어줘야 해요. 이건 보안상
앱 소유자(본인)만 할 수 있는 절차라 제가 대신 못 해드려요.

지금은 버튼을 눌러도 "Unsupported provider" 같은 에러가 뜰 거예요 —
아래 설정을 마치기 전까지는 정상이에요.

---

## Apple 로그인 설정 (~20분, 유료 개발자 계정 필요 — 이미 있음)

### 1. Apple Developer에서 Services ID 만들기

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

### 2. Sign in with Apple용 키 만들기

1. **Certificates, Identifiers & Profiles → Keys → +**
2. Key Name: `Avocato Apple Sign In`
3. **Sign in with Apple** 체크 → Configure → Primary App ID로 `app.avocato.ios`
   선택 → Save
4. **Register** → **Download** (`.p8` 파일, **한 번만 다운로드 가능하니
   꼭 잘 보관**) → Key ID 메모해두기

### 3. Supabase에 연결

1. Supabase 대시보드 → **Authentication → Providers → Apple**
2. **Enable Sign in with Apple** 켜기
3. 입력:
   - **Services ID**: 1에서 만든 `app.avocato.ios.web`
   - **Team ID**: `RZVT4RBC7B` (이미 알고 있는 값)
   - **Key ID**: 2에서 메모한 값
   - **Private Key**: 다운로드한 `.p8` 파일 내용을 텍스트로 열어서 통째로
     붙여넣기
4. Save

### 4. iOS 앱에도 Sign in with Apple capability 추가 (Xcode, 한 번만)

네이티브 앱 안에서 Apple 로그인이 제대로 되려면 Xcode에서도 켜야 해요:

1. Xcode에서 **App** 타겟 → **Signing & Capabilities**
2. **+ Capability** → **Sign in with Apple** 추가
3. `npm run cap:sync` 다시 돌리고 재빌드

---

## 확인하는 법

설정이 끝나면:
1. 웹사이트(`vercel-ecru-iota-55.vercel.app`)에서 하단 탭의 Profile
   클릭 → Continue with Apple 눌러보기
2. 정상적으로 Apple 로그인 화면으로 넘어가고, 로그인하면 Avocato로
   돌아오면서 로그인된 상태가 되면 성공
3. 앱(네이티브)에서도 똑같이 테스트 — 이땐 시스템 브라우저(Safari)가
   잠깐 떴다가 로그인 후 자동으로 앱으로 돌아와요
