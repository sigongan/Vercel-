import { RecipeExtractor } from "@/components/RecipeExtractor";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center gap-12 px-6 py-16 bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-950 dark:via-black dark:to-orange-950">
      <div className="flex flex-col items-center gap-4 text-center max-w-2xl">
        <div className="text-6xl">👨‍🍳</div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-300 dark:to-orange-300 bg-clip-text text-transparent">
          레시피 추출기
        </h1>
        <p className="text-lg text-amber-900 dark:text-amber-200 max-w-xl">
          유튜브, 인스타그램, 틱톡, 구글 Docs 링크나 음식 사진, PDF를 올리면<br />
          <span className="font-semibold">재료와 조리 순서를 자동으로 정리</span>해 드립니다.
        </p>
      </div>
      <RecipeExtractor />
      <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
        💡 팁: 스크린샷이나 사진이 가장 정확해요. 링크는 공개 또는 링크 공유로 설정해 주세요.
      </p>
    </main>
  );
}
