import type { Recipe } from "@/lib/types/recipe";

const CONFIDENCE_LABEL: Record<NonNullable<Recipe["confidence"]>, string> = {
  high: "정확도 높음 ⭐",
  medium: "정확도 보통 ⭐⭐",
  low: "정확도 낮음 ⚠️",
};

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <article className="w-full rounded-3xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 p-8 flex flex-col gap-6 shadow-xl">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-3xl font-bold text-amber-950 dark:text-amber-50">{recipe.title}</h2>
          {recipe.confidence && (
            <span className="shrink-0 text-xs font-semibold rounded-full px-3 py-1 bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100">
              {CONFIDENCE_LABEL[recipe.confidence]}
            </span>
          )}
        </div>
        {recipe.description && (
          <p className="text-base text-amber-800 dark:text-amber-200 italic">{recipe.description}</p>
        )}
        <div className="flex flex-wrap gap-4 text-sm text-amber-900 dark:text-amber-200 mt-2">
          {recipe.servings && <span>👥 {recipe.servings}</span>}
          {recipe.prepTime && <span>⏱️ 준비: {recipe.prepTime}</span>}
          {recipe.cookTime && <span>🔥 조리: {recipe.cookTime}</span>}
        </div>
      </header>

      {recipe.ingredients.length > 0 && (
        <section className="border-t border-amber-200 dark:border-amber-800 pt-4">
          <h3 className="text-xl font-bold text-amber-950 dark:text-amber-100 mb-3">🥘 재료</h3>
          <ul className="flex flex-col gap-2">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex justify-between gap-4 text-sm">
                <span className="text-amber-900 dark:text-amber-200">{ing.name}</span>
                {ing.amount && (
                  <span className="font-medium text-amber-700 dark:text-amber-300">{ing.amount}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {recipe.steps.length > 0 && (
        <section className="border-t border-amber-200 dark:border-amber-800 pt-4">
          <h3 className="text-xl font-bold text-amber-950 dark:text-amber-100 mb-3">👨‍🍳 조리 순서</h3>
          <ol className="flex flex-col gap-3">
            {recipe.steps
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((step) => (
                <li key={step.order} className="flex gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-center font-semibold text-xs">
                    {step.order}
                  </span>
                  <span className="text-amber-900 dark:text-amber-200 pt-0.5">{step.instruction}</span>
                </li>
              ))}
          </ol>
        </section>
      )}

      {recipe.tags.length > 0 && (
        <div className="border-t border-amber-200 dark:border-amber-800 pt-4 flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-medium rounded-full px-3 py-1 bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {recipe.notes && (
        <div className="border-t border-amber-200 dark:border-amber-800 pt-4">
          <p className="text-xs text-amber-800 dark:text-amber-300 whitespace-pre-line bg-amber-100/50 dark:bg-amber-900/30 p-3 rounded-lg">
            📝 {recipe.notes}
          </p>
        </div>
      )}

      {recipe.sourceUrl && (
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-amber-700 dark:text-amber-400 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200"
        >
          🔗 원본 보기
        </a>
      )}
    </article>
  );
}
