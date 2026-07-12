"use client";

import { useState } from "react";
import type { Recipe } from "@/lib/types/recipe";

type CostUnit = "g" | "kg" | "ml" | "L" | "unit";

interface CostRow {
  name: string;
  qty: number;
  unit: CostUnit;
  /** Supplier cost in AUD: per kg for g/kg, per L for ml/L, per item for unit. */
  cost: number;
}

const UNIT_COST_SUFFIX: Record<CostUnit, string> = {
  g: "/kg",
  kg: "/kg",
  ml: "/L",
  L: "/L",
  unit: "/unit",
};

/** Best-effort parse of amounts like "1000g", "2 tbsp", "1/2 cup" — rows stay editable, so imperfect parses are fixable. */
function parseAmount(amount?: string): { qty: number; unit: CostUnit } {
  if (!amount) return { qty: 1, unit: "unit" };
  const text = amount.trim().toLowerCase();

  const numMatch = text.match(/(\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+))?/);
  let qty = 1;
  if (numMatch) {
    qty = parseFloat(numMatch[1].replace(",", "."));
    if (numMatch[2]) qty = qty / parseFloat(numMatch[2]);
    if (!Number.isFinite(qty) || qty <= 0) qty = 1;
  }

  // (\d\s*|\b) lets the unit sit flush against the number ("600ml") where \b alone fails.
  if (/(\d\s*|\b)kgs?\b|kilo/.test(text)) return { qty, unit: "kg" };
  if (/(\d\s*|\b)ml\b|millil/.test(text)) return { qty, unit: "ml" };
  if (/(\d\s*|\b)l\b|litres?|liters?/.test(text)) return { qty, unit: "L" };
  if (/(\d\s*|\b)g\b|grams?/.test(text)) return { qty, unit: "g" };
  return { qty, unit: "unit" };
}

function parsePortions(servings?: string): number {
  const m = servings?.match(/\d+/);
  const n = m ? parseInt(m[0], 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function rowCost(row: CostRow): number {
  switch (row.unit) {
    case "g":
    case "ml":
      return (row.qty / 1000) * row.cost;
    case "kg":
    case "L":
    case "unit":
      return row.qty * row.cost;
  }
}

function aud(n: number): string {
  return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

const inputClass =
  "w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-2.5 py-1.5 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-stone-500 tabular-nums";

export function MarginCalculator({ recipe }: { recipe: Recipe }) {
  const [rows, setRows] = useState<CostRow[]>(() =>
    recipe.ingredients.map((ing) => {
      const { qty, unit } = parseAmount(ing.amount);
      return { name: ing.name, qty, unit, cost: 0 };
    })
  );
  const [portions, setPortions] = useState(() => parsePortions(recipe.servings));
  const [mode, setMode] = useState<"gp" | "price">("gp");
  const [targetGp, setTargetGp] = useState(70);
  const [menuPriceIncGst, setMenuPriceIncGst] = useState(0);

  function updateRow(i: number, patch: Partial<CostRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const batchCost = rows.reduce((sum, r) => sum + rowCost(r), 0);
  const safePortions = portions > 0 ? portions : 1;
  const costPerPortion = batchCost / safePortions;

  const gpFraction = Math.min(targetGp, 95) / 100;
  const priceExGst = mode === "gp" ? costPerPortion / (1 - gpFraction) : menuPriceIncGst / 1.1;
  const priceIncGst = mode === "gp" ? priceExGst * 1.1 : menuPriceIncGst;
  const gstAmount = priceExGst * 0.1;
  const marginPerPortion = priceExGst - costPerPortion;
  const achievedGp = priceExGst > 0 ? (marginPerPortion / priceExGst) * 100 : 0;

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-8 flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-stone-900 dark:text-stone-50">
          Cost &amp; Margin Calculator
        </h3>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
          AUD · GST 10%
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              <th className="pb-2 pr-3 font-semibold">Ingredient</th>
              <th className="pb-2 pr-3 w-24 font-semibold">Qty</th>
              <th className="pb-2 pr-3 w-24 font-semibold">Unit</th>
              <th className="pb-2 pr-3 w-36 font-semibold">Supplier cost</th>
              <th className="pb-2 w-24 text-right font-semibold">Line cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-stone-100 dark:border-stone-800">
                <td className="py-2 pr-3 text-stone-800 dark:text-stone-200">{row.name}</td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={row.qty}
                    onChange={(e) => updateRow(i, { qty: parseFloat(e.target.value) || 0 })}
                    className={inputClass}
                  />
                </td>
                <td className="py-2 pr-3">
                  <select
                    value={row.unit}
                    onChange={(e) => updateRow(i, { unit: e.target.value as CostUnit })}
                    className={inputClass}
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="L">L</option>
                    <option value="unit">unit</option>
                  </select>
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-stone-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.cost}
                      onChange={(e) => updateRow(i, { cost: parseFloat(e.target.value) || 0 })}
                      className={inputClass}
                    />
                    <span className="text-xs text-stone-400 whitespace-nowrap">
                      {UNIT_COST_SUFFIX[row.unit]}
                    </span>
                  </div>
                </td>
                <td className="py-2 text-right tabular-nums text-stone-700 dark:text-stone-300">
                  {aud(rowCost(row))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-stone-200 dark:border-stone-700 font-medium">
              <td colSpan={4} className="py-2 pr-3 text-right text-stone-500">
                Batch food cost
              </td>
              <td className="py-2 text-right tabular-nums text-stone-900 dark:text-stone-100">
                {aud(batchCost)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-end gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Portions per batch
          </span>
          <input
            type="number"
            min="1"
            value={portions}
            onChange={(e) => setPortions(parseInt(e.target.value, 10) || 1)}
            className={`${inputClass} w-28`}
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
            Price by
          </span>
          <div className="flex rounded-full border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode("gp")}
              className={`rounded-full px-3.5 py-1.5 transition-colors ${
                mode === "gp"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                  : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
              }`}
            >
              Target GP %
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuPriceIncGst((p) => (p > 0 ? p : Math.round(priceIncGst * 100) / 100));
                setMode("price");
              }}
              className={`rounded-full px-3.5 py-1.5 transition-colors ${
                mode === "price"
                  ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm"
                  : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
              }`}
            >
              Menu price
            </button>
          </div>
        </div>

        {mode === "gp" ? (
          <label className="flex min-w-[220px] flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              Target gross profit — {targetGp}%
            </span>
            <input
              type="range"
              min="30"
              max="95"
              step="1"
              value={targetGp}
              onChange={(e) => setTargetGp(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-600"
            />
          </label>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
              Menu price (inc. GST)
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-stone-400">$</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={menuPriceIncGst}
                onChange={(e) => setMenuPriceIncGst(parseFloat(e.target.value) || 0)}
                className={`${inputClass} w-32`}
              />
            </div>
          </label>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Food cost / portion" value={aud(costPerPortion)} />
        <StatTile
          label="Gross profit / portion"
          value={aud(marginPerPortion)}
          sub={`${achievedGp.toFixed(1)}% GP`}
        />
        <StatTile label="GST (10%)" value={aud(gstAmount)} />
        <StatTile label="Menu price (inc. GST)" value={aud(priceIncGst)} highlight />
      </div>

      <p className="text-[11px] leading-relaxed text-stone-400">
        Enter your supplier costs in AUD. Gross profit is calculated on the GST-exclusive price;
        the recommended menu price adds 10% GST on top.
      </p>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        highlight
          ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40"
          : "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/40"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums ${
          highlight ? "text-emerald-700 dark:text-emerald-400" : "text-stone-900 dark:text-stone-100"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-stone-400 tabular-nums">{sub}</p>}
    </div>
  );
}
