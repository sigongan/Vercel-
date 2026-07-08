import { RecipeExtractor } from "@/components/RecipeExtractor";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">레시피 추출기</h1>
        <p className="text-sm text-black/60 dark:text-white/60 max-w-md">
          유튜브 링크, 인스타그램/틱톡 링크, PDF, 스크린샷을 넣으면 재료와 조리 순서를 정리해 드립니다.
        </p>
      </div>
      <RecipeExtractor />
    </main>
  );
}
