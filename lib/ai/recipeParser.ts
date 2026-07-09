import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedContent } from "@/lib/extractors";
import type { Language } from "@/lib/i18n";
import type { Recipe } from "@/lib/types/recipe";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY가 설정되지 않았습니다.");
  }
}

export class RecipeParseError extends Error {}

const SYSTEM_PROMPT = `당신은 유튜브, 인스타그램, 틱톡, PDF, 스크린샷 등에서 가져온 자료를 보고 요리 레시피를 정리하는 도우미입니다.
주어진 텍스트와 이미지를 분석해서 레시피를 아래 JSON 스키마에 맞춰 정리하세요.

분량(amount) 처리 규칙:
- 원문(재료 목록이든 조리 순서 설명이든)에 분량이 나와 있으면 그대로 사용하고 estimated는 false로 두세요.
- 원문에 특정 재료의 분량이 전혀 나와 있지 않으면, 절대 비워두지 말고 요리 상식과 다른 재료들의 분량·인분 수를 근거로 합리적인 분량을 추정해서 채우세요. 이 경우 그 재료의 estimated를 true로 표시하세요.
- 추정한 분량은 실제 요리에 쓸 수 있는 구체적인 값(예: "1큰술", "200g", "1/2개")으로 제시하고, "적당량"처럼 모호하게 쓰지 마세요.
- title, steps 등 분량 이외의 정보는 확실하지 않으면 비워두고 억지로 추측해서 채우지 마세요.
- 영상/이미지에 레시피 정보 자체가 부족하면(재료나 조리 순서를 알 수 없는 경우) confidence를 "low"로 표시하세요. 분량만 추정한 경우는 confidence를 낮출 필요 없습니다.

JSON 스키마:
{
  "title": string,
  "description": string (optional),
  "servings": string (optional, 예: "2인분"),
  "prepTime": string (optional),
  "cookTime": string (optional),
  "ingredients": [{ "name": string, "amount": string, "estimated": boolean }],
  "steps": [{ "order": number, "instruction": string }],
  "tags": string[],
  "confidence": "high" | "medium" | "low",
  "notes": string (optional, 추출 과정에서 참고할 점 — 분량을 추정한 재료가 있다면 여기서도 간단히 언급)
}

JSON 객체만 출력하세요. 다른 설명 텍스트는 포함하지 마세요.`;

const OUTPUT_LANGUAGE_INSTRUCTION: Record<Language, string> = {
  ko: "모든 출력 값(title, description, ingredients, steps, tags, notes)은 한국어로 작성하세요. 원본이 다른 언어라면 한국어로 번역하세요.",
  en: "Write every output value (title, description, ingredients, steps, tags, notes) in English. Translate the source content if it is in another language.",
};

function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function parseRecipeFromContent(content: ExtractedContent, lang: Language): Promise<Recipe> {
  if (!isConfigured()) {
    throw new AiNotConfiguredError();
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const contentBlocks: Anthropic.MessageParam["content"] = [];

  if (content.images) {
    for (const image of content.images) {
      contentBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: image.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data: image.base64,
        },
      });
    }
  }

  const textParts = [
    content.title ? `제목/출처: ${content.title}` : null,
    content.sourceUrl ? `원본 링크: ${content.sourceUrl}` : null,
    content.text ? `내용:\n${content.text}` : null,
  ].filter(Boolean);

  contentBlocks.push({ type: "text", text: textParts.join("\n\n") || "(텍스트 정보 없음, 이미지만 참고)" });

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    // The instruction text is identical across every request (per language), so
    // marking it cacheable avoids re-billing the full system prompt on every call.
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      { type: "text", text: OUTPUT_LANGUAGE_INSTRUCTION[lang], cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: contentBlocks }],
  });

  console.log(
    `[recipeParser] model=${message.model} input=${message.usage.input_tokens} output=${message.usage.output_tokens} cache_write=${message.usage.cache_creation_input_tokens ?? 0} cache_read=${message.usage.cache_read_input_tokens ?? 0}`
  );

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new RecipeParseError("AI 응답에서 텍스트를 찾을 수 없습니다.");
  }

  let parsed: Omit<Recipe, "sourceType" | "sourceUrl">;
  try {
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : textBlock.text);
  } catch {
    throw new RecipeParseError("AI 응답을 레시피 형식으로 해석하지 못했습니다.");
  }

  return {
    ...parsed,
    sourceType: content.sourceType,
    sourceUrl: content.sourceUrl,
  };
}
