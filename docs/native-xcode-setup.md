# Xcode 설정

앱이 동작하려면 Xcode에서 **한 번만** 해줘야 하는 설정이에요.
코드는 이미 다 올라가 있고, 아래는 Xcode에서 클릭으로 하는 부분이에요.

---

## 1. Sign in with Apple 기능 켜기 (필수 — 이것 하나면 끝)

1. 왼쪽 파란 프로젝트 아이콘 **Avocato** 클릭
2. TARGETS → **Avocato** 선택
3. **Signing & Capabilities** 탭
4. 왼쪽 위 **+ Capability** → **Sign in with Apple** 검색해서 더블클릭

이걸 안 켜면 로그인 버튼을 눌렀을 때 `AuthorizationError 1000` 에러가 나요.

---

## 2. 안 쓰는 권한 지우기 (권장)

Signing & Capabilities에 **Camera**와 **Face ID**가 노란 경고(⚠️)와 함께
남아 있으면 오른쪽 휴지통 아이콘으로 지워주세요.

지금 SwiftUI 코드 어디에서도 카메라나 Face ID를 쓰지 않아요 (예전 Capacitor
버전에서 남은 거예요). 안 쓰는데 권한만 선언돼 있으면 심사에서 "이 권한을 왜
요구하냐"는 지적을 받을 수 있어요.

---

## 3. 빌드

⌘B → ⌘R

---

## ~~Supabase 주소/키 넣기~~ (더 이상 필요 없음)

예전에는 Info.plist에 `SupabaseURL` / `SupabaseAnonKey`를 넣고, Supabase
대시보드에서 Apple 로그인을 켜야 했어요. **지금은 둘 다 필요 없어요.**

앱이 Supabase에 직접 로그인하지 않고 우리 서버(`/api/auth/apple`)에만
이야기하기 때문이에요. 애플이 준 토큰을 검증하는 걸 이제 우리 서버가 직접 해요.

이미 Info.plist에 그 두 값을 넣어뒀다면 지워도 되고 그냥 둬도 상관없어요
(앱이 읽지 않아요).

---

## 서버 쪽에서 해야 할 것 (한 번만)

Supabase 대시보드 → SQL Editor에서 `supabase/schema_09_own_auth.sql` 내용을
붙여넣고 실행해주세요. 계정/세션 테이블을 만드는 작업이에요.

이 스크립트는 **여러 번 실행해도 안전하고, 기존 사용자 데이터를 건드리지
않아요** — 기존 사용자의 ID를 그대로 유지하기 때문에 저장된 레시피가 사라지지
않아요.

Vercel 환경변수에 `APPLE_BUNDLE_ID`가 `app.avocato.ios`로 설정돼 있어야 해요
(결제 기능 때문에 이미 들어가 있을 거예요).

---

## 확인해볼 것

- [ ] 탭이 4개인지 (Home / Extract / Library / Profile)
- [ ] Profile에서 **Sign in with Apple** 버튼이 뜨고, 눌렀을 때 애플 시트가 뜨는지
- [ ] 로그인 후 이름/이메일이 보이는지
- [ ] Settings → Sign out 눌렀을 때 로그아웃되는지
- [ ] 로그아웃 후 다시 로그인했을 때 **이름이 그대로 남아 있는지**
      (애플은 이름을 첫 로그인 때만 주기 때문에, 두 번째 로그인에서 이름이
      사라진다면 서버가 이름을 저장 안 한 거예요)
- [ ] 레시피 하나 추출 → Home과 Library "Recent"에 뜨는지
- [ ] 비행기 모드로 바꾸고 앱 재실행 → Recent 레시피가 그대로 열리는지

> **시뮬레이터에서 테스트할 때**: 시뮬레이터의 설정 앱 → 맨 위 Apple 계정에
> 로그인돼 있어야 Sign in with Apple이 동작해요.

---

## 아직 안 된 것 (알고 있는 것)

- **저장(Save)은 Pro 계정만 가능해요.** 무료 계정이 북마크를 누르면
  "Pro 기능이에요"라는 안내가 떠요 — 서버 규칙(`app/api/recipes/route.ts`)이
  원래 그렇게 돼 있어요. 구독(StoreKit)을 아직 안 붙여서 지금은 Pro가 될
  방법이 없어요.
- 사진/PDF 추출 (지금은 링크·텍스트만)
- 구독 결제 + 구매 복원
