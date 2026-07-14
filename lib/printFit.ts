/**
 * Shrinks the printed recipe card just enough to still fit one A4 page.
 * globals.css defines the compact print typography as `calc(base * var(--print-scale, 1))`;
 * this measures the rendered height right before printing and dials
 * --print-scale down until it fits (or hits a legibility floor), instead
 * of using one fixed size that only works for "typical" length recipes.
 */

const PAGE_HEIGHT_MM = 297; // A4
const VERTICAL_MARGIN_MM = 20; // matches @page margin: 10mm top + 10mm bottom in globals.css
const MM_TO_PX = 96 / 25.4;
const TARGET_HEIGHT_PX = (PAGE_HEIGHT_MM - VERTICAL_MARGIN_MM) * MM_TO_PX;

const MIN_SCALE = 0.65;
const STEP = 0.03;

export function fitPrintArea() {
  const area = document.querySelector<HTMLElement>(".print-area");
  if (!area) return;

  let scale = 1;
  area.style.setProperty("--print-scale", String(scale));

  // Each write forces a reflow on the next read — a handful of iterations,
  // and this only runs right before printing, never during normal use.
  while (scale > MIN_SCALE && area.scrollHeight > TARGET_HEIGHT_PX) {
    scale = Math.max(MIN_SCALE, scale - STEP);
    area.style.setProperty("--print-scale", String(scale));
  }
}

export function resetPrintArea() {
  document.querySelector<HTMLElement>(".print-area")?.style.removeProperty("--print-scale");
}
