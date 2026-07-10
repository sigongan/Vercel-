# Avocato — 레시피 추출기 (Recipe Extractor)

유튜브/인스타그램/틱톡/구글 Docs 링크, PDF, 스크린샷(이미지), 또는 레시피 텍스트를 넣으면
재료와 조리 순서를 정리해 주는 도구입니다. 업무 자동화 툴 모음의 첫 번째 기능입니다.
UI는 한국어/영어를 지원하며(우측 상단 토글), 선택한 언어로 레시피가 정리됩니다.

## 동작 방식

1. 사용자가 파일(이미지/PDF/동영상)을 업로드하거나 URL(유튜브/인스타그램/틱톡/구글 Docs)을
   붙여넣거나, 레시피 텍스트를 직접 붙여넣습니다.
2. `lib/extractors`가 소스 종류에 맞게 원본 콘텐츠를 텍스트/이미지로 정규화합니다.
   - 유튜브: 자막(캡션) 텍스트
   - 틱톡: oEmbed 캡션 텍스트
   - 인스타그램: `INSTAGRAM_OEMBED_TOKEN` 설정 시 캡션, 없으면 업로드 안내
   - 구글 Docs: 공개/링크 공유 문서의 텍스트 내보내기
   - PDF: 파일 그대로 Claude에 전달 (네이티브 PDF 이해 — 텍스트본/스캔본 모두 지원, 최대 4MB)
   - 이미지: base64 인코딩 후 비전 모델에 전달
   - 텍스트: 붙여넣은 내용 그대로 사용
   - 동영상 파일 업로드: 아직 프레임 분석 미구현 (파일명만 전달, UI에 안내 표시)
3. (Supabase 설정 시) 동일한 소스(파일 바이트/URL/텍스트 + 출력 언어)를 이미 추출한 적이
   있으면 캐시된 결과를 그대로 반환하고 AI 호출 자체를 건너뜁니다. 로그인/무료 한도와
   무관하게 항상 무료입니다.
4. (Supabase 설정 시) 로그인 여부와 이번 달 무료 사용량(기본 5회)을 확인하고, 초과 시
   구매한 크레딧을 차감합니다. 로그인 안 된 사용자는 로그인을 요청받습니다.
5. `lib/ai/recipeParser.ts`가 Claude(Anthropic API, `claude-haiku-4-5`)에 정규화된
   콘텐츠를 보내 구조화된 레시피 JSON을 UI 언어에 맞춰 받아옵니다. 재료에 분량이 없으면
   AI가 합리적인 값을 추정하고 `estimated: true`로 표시합니다 (UI에 `~` 표시).
6. `/api/extract-recipe`가 결과를 반환하고 캐시에 저장합니다. `RecipeCard`가 3가지
   디자인(클래식 / 매거진 ★ / 파인 다이닝 ★) 중 선택해 표시합니다. 복사 버튼으로 텍스트로
   내보낼 수 있습니다.

## 로컬 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인할 수 있습니다.

## 환경 변수

`.env.example`을 `.env.local`로 복사한 뒤 값을 채워주세요.

| 변수 | 필수 | 설명 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | 예 | 레시피 파싱에 사용하는 Claude API 키. 없으면 API가 `AI_NOT_CONFIGURED` 오류를 반환합니다 (UI는 정상 동작). |
| `INSTAGRAM_OEMBED_TOKEN` | 아니오 | 인스타그램 게시물 캡션을 가져오기 위한 Meta Graph API 토큰. 없으면 인스타그램 링크는 스크린샷 업로드를 안내합니다. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | 아니오 | 로그인, 무료 사용량 제한(월 5회), 결과 캐싱을 켜려면 셋 다 설정. 하나라도 비어 있으면 이 기능들은 전부 꺼지고 지금처럼 로그인 없이 무제한 사용됩니다. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | 아니오 | 크레딧 구매(결제)를 켜려면 설정. Supabase는 켰지만 Stripe가 없으면 로그인/무료 한도는 동작하되 크레딧 구매만 안 됩니다. |

### Supabase + Stripe 설정 순서 (선택 사항)

로그인 없이 계속 무제한으로 쓰셔도 됩니다. 사용량 제한과 결제를 켜고 싶을 때만 아래를 따라주세요.

1. [supabase.com](https://supabase.com) 가입 → New Project 생성
2. Project Settings → API 에서 Project URL, `anon` `public` 키, `service_role` 키 복사 →
   `.env.local`(로컬) 또는 Vercel 환경변수(배포)에 붙여넣기
3. Supabase 대시보드 → SQL Editor → New query → 이 저장소의 `supabase/schema.sql` 내용을
   전부 붙여넣고 실행 (테이블 2개 + 함수 2개 생성)
4. Authentication → Providers 에서 Email 로그인(매직링크)이 기본 활성화되어 있는지 확인
5. (결제까지 켜려면) [Stripe 대시보드](https://dashboard.stripe.com)에서 API 키 발급 →
   `STRIPE_SECRET_KEY`에 설정
6. Stripe 대시보드 → Developers → Webhooks → Add endpoint → URL은
   `https://<배포된 도메인>/api/stripe/webhook`, 이벤트는 `checkout.session.completed` 선택
   → 생성된 Signing secret을 `STRIPE_WEBHOOK_SECRET`에 설정

무료 한도(월 5회)와 크레딧팩 가격(20크레딧에 $3)은 `lib/billingConstants.ts`에서 바꿀 수 있습니다.

## 알려진 제약

- 틱톡/유튜브는 공개 API(oEmbed, 자막)만 사용하며, 실제 영상 파일을 다운로드하지 않습니다.
- 인스타그램은 공개 oEmbed가 폐지되어 토큰 없이는 자동으로 캡션을 가져올 수 없습니다.
- 업로드한 동영상 파일의 프레임 분석(ffmpeg 등)은 아직 구현되지 않았습니다. 정확도를 높이려면
  레시피가 보이는 장면의 스크린샷을 대신 업로드하세요.

## 다음 자동화 툴을 추가하려면

`lib/extractors`, `lib/ai`, `app/api` 아래에 같은 패턴(소스별 추출기 → AI 파서 → API 라우트)을
반복해서 새 도구를 붙여나가는 구조를 염두에 두고 설계했습니다.
