/** Matches the Apps Script calendar: week 1 starts on 4 Jan 2026. */
const WEEK_ONE_START = Date.UTC(2026, 0, 4)

export function epidemiologicalWeek(date: Date = new Date()): number | null {
  const focal = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((focal - WEEK_ONE_START) / 86_400_000)
  if (diffDays < 0) return null
  return Math.floor(diffDays / 7) + 1
}

export function epidemiologicalWeekLabel(date: Date = new Date()): string {
  const week = epidemiologicalWeek(date)
  return week == null ? 'Inválida' : String(week)
}
