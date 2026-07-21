"use client";

import type { Recipe } from "@/lib/types/recipe";

/**
 * "Add to Calendar" for a recipe — no native plugin needed. Navigating to a
 * data: URI with a text/calendar payload is the standard way to hand a
 * one-off event to the OS Calendar app from a web page, and it works the
 * same way inside the Capacitor WKWebView (the wrapper falls back to the OS
 * for content types it doesn't render itself) as it does in mobile Safari.
 */

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

function formatIcsDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function formatIcsTimestamp(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const s = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

export function buildRecipeIcs(recipe: Recipe, date: Date): string {
  const descriptionRaw = [
    recipe.description,
    recipe.ingredients.length > 0
      ? `Ingredients: ${recipe.ingredients.map((i) => i.name).join(", ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}@avocato.app`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Avocato//Recipe//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsTimestamp(new Date())}`,
    `DTSTART;VALUE=DATE:${formatIcsDate(date)}`,
    `SUMMARY:${escapeIcsText(`Cook: ${recipe.title}`)}`,
    descriptionRaw ? `DESCRIPTION:${escapeIcsText(descriptionRaw)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => line !== null);

  return lines.join("\r\n");
}

export function openAddToCalendar(recipe: Recipe, date: Date) {
  const ics = buildRecipeIcs(recipe, date);
  window.location.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
