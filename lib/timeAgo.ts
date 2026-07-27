/** "3 minutes ago" / "in 2 hours" style relative timestamp, used anywhere a
 *  recent-recipe or saved-recipe row shows when it was last touched. */
export function timeAgo(timestamp: number, language: string): string {
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  const minutes = Math.round((timestamp - Date.now()) / 60_000);
  if (minutes > -60) return rtf.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours > -24) return rtf.format(hours, "hour");
  return rtf.format(Math.round(hours / 24), "day");
}
