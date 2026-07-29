# 로그인 시스템 재구축 계획 (Supabase Auth 제거 → 자체 Apple 로그인)

목표: **Supabase Auth(GoTrue)를 완전히 걷어내고, 애플 로그인만으로 동작하는
자체 인증 시스템을 만든다.** 사용자에게는 "Sign in with Apple" 버튼 하나만
보이고, 세션 관리·토큰 발급·계정 삭제까지 전부 우리 서버 코드가 처리한다.

---

## 조사 결과: 생각보다 작업량이 적다

코드베이스를 전수 조사한 결과, Supabase Auth에 대한 의존이 **인증 한 겹에만**
몰려 있다:

| 항목 | 상태 |
|---|---|
| 로그인 방식 | **이미 Apple 하나뿐** (`SignInSheet.tsx` — Google/이메일은 이전에 제거됨) |
| API 라우트의 인증 진입점 | **단 2개 함수** (`getSupabaseUser()`, `getSessionUser()`) — 11개 라우트가 전부 이 둘만 거침 |
| DB 접근 방식 | **대부분 service-role 클라이언트로 직접 접근** (13개 파일) — 즉 RLS에 거의 의존하지 않음 |
| RLS 정책 | 3개 파일에 9개뿐 (`profiles`, `subscriptions`, `meal_plan`) |

**즉 "인증 껍데기"만 교체하면 되고, 데이터 접근 로직은 거의 손댈 게 없다.**

---

## 범위: 무엇을 바꾸고 무엇을 두는가

### 바꾸는 것 (Supabase Auth 제거)
- Supabase GoTrue를 통한 애플 토큰 교환 → **우리 서버가 애플 공개키로 직접 검증**
- Supabase가 발급하던 세션 토큰 → **우리가 발급하는 자체 토큰**
- `auth.users` 테이블 의존 → **자체 `users` 테이블**
- 클라이언트의 `@supabase/supabase-js` auth 호출 전부 제거

### 그대로 두는 것 (이번 범위 아님)
- **Postgres 데이터베이스 자체** — 레시피, 사용량, 구독 데이터는 건드리지 않는다.
  DB 이전은 인증 교체와 완전히 별개 작업이며, 데이터 유실 위험이 가장 큰 작업이라
  분리한다. 나중에 원하면 인증 완료 후 독립적으로 진행 가능.
- 결제 — 별도 작업(아래 "이후 작업" 참고)

---

## 새 인증 구조

```
[iOS 앱]  Sign in with Apple (애플 시스템 시트)
   │       → identity token (애플이 서명한 JWT)
   ▼
[우리 서버]  POST /api/auth/apple
   │       1. 애플 공개키(appleid.apple.com/auth/keys)로 토큰 서명 검증
   │       2. aud(번들ID) / iss / exp / nonce 검증
   │       3. sub(애플 고유 사용자 ID)로 users 테이블 조회 또는 생성
   │       4. 우리 세션 발급
   ▼
[앱]  access token (짧은 수명) + refresh token (긴 수명)
        → Keychain 저장, 이후 모든 API 요청에 Bearer로 첨부
```

### 왜 이 구조인가
- **애플 공개키 직접 검증**: 애플 토큰의 진위를 우리가 직접 확인하므로 중개자가 없다.
- **access/refresh 분리**: access token은 짧게(1시간) 두어 유출 피해를 줄이고,
  refresh token은 DB에 저장해 **로그아웃/계정삭제 시 즉시 무효화**할 수 있게 한다.
  (지금 Supabase 방식으로는 서버에서 강제 무효화가 어렵다 — 오히려 개선되는 지점)

### 새 DB 테이블
```sql
users            -- id, apple_sub(고유), email, name, created_at
sessions         -- id, user_id, refresh_token_hash, expires_at, revoked_at
```
기존 `profiles`, `saved_recipes` 등은 `user_id`가 새 `users.id`를 가리키도록 연결만 바꾼다.

---

## 단계별 진행 (순서대로, 각 단계마다 검증)

각 단계는 이전 단계를 깨지 않고 독립적으로 배포 가능하도록 설계한다.
**기존 로그인은 새 로그인이 완전히 검증될 때까지 살려둔다** (동시 운영 후 전환).

- [ ] **1. 애플 토큰 검증기** — 애플 공개키 캐싱, JWT 서명/클레임 검증, 단위 테스트
- [ ] **2. 자체 세션 발급/검증** — 토큰 생성·검증·갱신·폐기 로직
- [ ] **3. 새 DB 테이블** — `users`, `sessions` 생성 + 기존 테이블 연결
- [ ] **4. 새 API 라우트** — `/api/auth/apple`, `/api/auth/refresh`, `/api/auth/signout`
- [ ] **5. 인증 진입점 교체** — `getSupabaseUser()` → 자체 검증으로 (11개 라우트가 자동으로 따라옴)
- [ ] **6. iOS 앱 연결** — `AppleAuth.swift`가 Supabase 대신 우리 서버 호출
- [ ] **7. 웹 연결** — `SignInSheet.tsx` 및 관련 클라이언트 코드 교체
- [ ] **8. 계정 삭제** — 세션 폐기 + 데이터 삭제 (App Store 5.1.1(v) 요건)
- [ ] **9. Supabase Auth 제거** — 남은 GoTrue 호출/RLS 정책/패키지 의존 정리
- [ ] **10. 전수 검증** — 로그인·갱신·로그아웃·삭제·오프라인·만료 시나리오

---

## 이후 작업 (이번 범위 아님, 별도 진행)

- **결제를 Stripe → Apple StoreKit로 전환.** 이미 이전에 결정된 방향이며
  (`native/App/StoreKitPlugin.swift` 존재), 앱 내 디지털 상품은 Apple 규정상
  StoreKit 필수다. 인증 작업과 독립적이므로 이후에 진행.
- 필요시 DB 자체 이전 (위 "그대로 두는 것" 참고)
