# 레시피 추출기

유튜브 링크, 인스타그램/틱톡 링크, PDF, 스크린샷(이미지)을 넣으면 재료와 조리 순서를
정리해 주는 도구입니다. 업무 자동화 툴 모음의 첫 번째 기능입니다.

## 동작 방식

1. 사용자가 파일(이미지/PDF/동영상)을 업로드하거나 URL(유튜브/인스타그램/틱톡)을 붙여넣습니다.
2. `lib/extractors`가 소스 종류에 맞게 원본 콘텐츠를 텍스트/이미지로 정규화합니다.
   - 유튜브: 자막(캡션) 텍스트
   - 틱톡: oEmbed 캡션 텍스트
   - 인스타그램: `INSTAGRAM_OEMBED_TOKEN` 설정 시 캡션, 없으면 업로드 안내
   - PDF: 텍스트 추출 (`pdf-parse`)
   - 이미지: base64 인코딩 후 비전 모델에 전달
   - 동영상 파일 업로드: 아직 프레임 분석 미구현 (파일명만 전달, UI에 안내 표시)
3. `lib/ai/recipeParser.ts`가 Claude(Anthropic API)에 정규화된 콘텐츠를 보내 구조화된
   레시피 JSON을 받아옵니다.
4. `/api/extract-recipe`가 결과를 반환하고, `RecipeCard` 컴포넌트가 화면에 표시합니다.

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

## 알려진 제약

- 틱톡/유튜브는 공개 API(oEmbed, 자막)만 사용하며, 실제 영상 파일을 다운로드하지 않습니다.
- 인스타그램은 공개 oEmbed가 폐지되어 토큰 없이는 자동으로 캡션을 가져올 수 없습니다.
- 업로드한 동영상 파일의 프레임 분석(ffmpeg 등)은 아직 구현되지 않았습니다. 정확도를 높이려면
  레시피가 보이는 장면의 스크린샷을 대신 업로드하세요.

## 다음 자동화 툴을 추가하려면

`lib/extractors`, `lib/ai`, `app/api` 아래에 같은 패턴(소스별 추출기 → AI 파서 → API 라우트)을
반복해서 새 도구를 붙여나가는 구조를 염두에 두고 설계했습니다.
