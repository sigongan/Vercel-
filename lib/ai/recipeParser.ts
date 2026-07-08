import Anthropic from "@anthropic-ai/sdk";
import type { ExtractedContent } from "@/lib/extractors";
import type { Recipe } from "@/lib/types/recipe";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY가 설정되지 않았습니다.");
  }
}

export class RecipeParseError extends Error {}

const SYSTEM_PROMPT = `당신은 유튜브, 인스타그램, 틱톡, PDF, 스크린샷 등에서 가져온 자료를 보고 요리 레시피를 정리하는 도우미입니다.
주어진 텍스트와 이미지를 분석해서 레시피를 아래 JSON 스키마에 맞춰 한국어로 정리하세요.
확실하지 않은 값은 비워두고 억지로 추측해서 채우지 마세요. 영상/이미지에 레시피 정보가 부족하면 confidence를 "low"로 표시하세요.

JSON 스키마:
{
  "title": string,
  "description": string (optional),
  "servings": string (optional, 예: "2인분"),
  "prepTime": string (optional),
  "cookTime": string (optional),
  "ingredients": [{ "name": string, "amount": string (optional) }],
  "steps": [{ "order": number, "instruction": string }],
  "tags": string[],
  "confidence": "high" | "medium" | "low",
  "notes": string (optional, 추출 과정에서 참고할 점)
}

JSON 객체만 출력하세요. 다른 설명 텍스트는 포함하지 마세요.`;

function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function parseRecipeFromContent(content: ExtractedContent): Promise<Recipe> {
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
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: contentBlocks }],
  });

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
