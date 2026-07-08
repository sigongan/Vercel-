import type { Recipe } from "@/lib/types/recipe";

const CONFIDENCE_LABEL: Record<NonNullable<Recipe["confidence"]>, string> = {
  high: "정확도 높음",
  medium: "정확도 보통",
  low: "정확도 낮음 (직접 확인 필요)",
};

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <article className="w-full max-w-2xl rounded-2xl border border-black/10 dark:border-white/15 p-6 flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{recipe.title}</h2>
          {recipe.confidence && (
            <span className="shrink-0 text-xs rounded-full px-2 py-1 bg-black/5 dark:bg-white/10">
              {CONFIDENCE_LABEL[recipe.confidence]}
            </span>
          )}
        </div>
        {recipe.description && (
          <p className="text-sm text-black/70 dark:text-white/70">{recipe.description}</p>
        )}
        <div className="flex flex-wrap gap-3 text-sm text-black/60 dark:text-white/60 mt-1">
          {recipe.servings && <span>인분: {recipe.servings}</span>}
          {recipe.prepTime && <span>준비: {recipe.prepTime}</span>}
          {recipe.cookTime && <span>조리: {recipe.cookTime}</span>}
        </div>
      </header>

      {recipe.ingredients.length > 0 && (
        <section>
          <h3 className="font-medium mb-2">재료</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>{ing.name}</span>
                {ing.amount && <span className="text-black/60 dark:text-white/60">{ing.amount}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {recipe.steps.length > 0 && (
        <section>
          <h3 className="font-medium mb-2">조리 순서</h3>
          <ol className="flex flex-col gap-2 text-sm list-decimal list-inside">
            {recipe.steps
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((step) => (
                <li key={step.order}>{step.instruction}</li>
              ))}
          </ol>
        </section>
      )}

      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <span key={tag} className="text-xs rounded-full px-2 py-1 bg-black/5 dark:bg-white/10">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {recipe.notes && (
        <p className="text-xs text-amber-700 dark:text-amber-400 whitespace-pre-line">{recipe.notes}</p>
      )}

      {recipe.sourceUrl && (
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-black/50 dark:text-white/50 underline underline-offset-2"
        >
          원본 보기
        </a>
      )}
    </article>
  );
}
