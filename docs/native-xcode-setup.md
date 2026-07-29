# Xcode 설정 (다음에 할 것)

새로 추가된 화면들이 동작하려면 Xcode에서 **한 번만** 해줘야 하는 설정이에요.
코드는 이미 다 올라가 있고, 아래는 Xcode에서 클릭으로 하는 부분이에요.

---

## 1. 새 파일 6개가 목록에 보이는지 확인

`git pull` 후 Xcode 왼쪽 `Views` / `Services` 폴더에 이게 다 있어야 해요:

- `Views/HomeView.swift`
- `Views/LibraryView.swift`
- `Views/ProfileView.swift`
- `Views/SharedComponents.swift`
- `Services/AppleAuth.swift`

폴더 레퍼런스(파란 폴더)로 연결해뒀으면 자동으로 보여요.
안 보이면 Xcode를 껐다 켜보세요.

---

## 2. Sign in with Apple 기능 켜기 (필수)

이걸 안 켜면 로그인 버튼을 눌러도 애플이 거부해요.

1. 왼쪽 파란 프로젝트 아이콘 **Avocato** 클릭
2. TARGETS → **Avocato** 선택
3. **Signing & Capabilities** 탭
4. 왼쪽 위 **+ Capability** 버튼 클릭
5. **Sign in with Apple** 검색해서 더블클릭

---

## 3. Supabase 주소/키 넣기 (필수)

로그인이 Supabase와 통신하려면 이 두 값이 앱 안에 있어야 해요.

1. TARGETS → Avocato → **Info** 탭
2. 목록에서 아무 줄에나 마우스 올리고 **+** 눌러서 두 줄 추가:

| Key | Type | Value |
|---|---|---|
| `SupabaseURL` | String | `https://<프로젝트ID>.supabase.co` |
| `SupabaseAnonKey` | String | `eyJ...` (anon public 키) |

두 값은 `.env.local` 파일에 이미 있어요:
- `NEXT_PUBLIC_SUPABASE_URL` → `SupabaseURL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `SupabaseAnonKey`

> anon 키는 원래 공개되는 값이라 앱에 넣어도 안전해요 (웹사이트에도 이미 들어가
> 있어요). **service role 키는 절대 넣으면 안 돼요** — 그건 서버 전용이에요.

---

## 4. Supabase 쪽에서 Apple 로그인 켜기 (필수)

1. Supabase 대시보드 → **Authentication → Providers → Apple**
2. 활성화하고, **Authorized Client IDs**에 앱의 Bundle ID 입력: `app.avocato.ios`

이걸 안 하면 로그인 시 "Unacceptable audience" 같은 에러가 나요.

---

## 5. 빌드

⌘B → ⌘R

---

## 확인해볼 것

- [ ] 탭이 4개로 줄었는지 (Home / Extract / Library / Profile — Search 없음)
- [ ] Home에 인사말 + 초록색 추출 버튼이 뜨는지
- [ ] 레시피 하나 추출 → Home과 Library "Recent"에 뜨는지
- [ ] 비행기 모드로 바꾸고 앱 재실행 → Recent 레시피가 그대로 열리는지 (오프라인)
- [ ] Profile에서 Sign in with Apple 버튼이 뜨는지
- [ ] 로그인 후 이름/이메일이 보이고, 로그아웃이 되는지

---

## 아직 안 된 것 (알고 있는 것)

- **저장(Save)은 Pro 계정만 가능해요.** 무료 계정이 북마크를 누르면
  "Pro 기능이에요"라는 안내가 떠요 — 서버 규칙(`app/api/recipes/route.ts`)이
  원래 그렇게 돼 있어서, 앱은 그걸 정확히 알려주기만 해요.
  구독(StoreKit)을 아직 안 붙여서 지금은 Pro가 될 방법이 없어요.
- 사진/PDF 추출 (지금은 링크·텍스트만)
- 구독 결제 + 구매 복원
