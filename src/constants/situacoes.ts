import type { CycleSituation } from '@/types/domain'

/** Códigos padronizados de situação na troca/retirada (0–9). */
export const CYCLE_SITUATION_LABELS: Record<CycleSituation, string> = {
  '0': '0 - Sem observações',
  '1': '1 - Intervalo entre instalação e coleta maior que o previsto',
  '2': '2 - Ovitrampa ou paleta desaparecida',
  '3': '3 - Ovitrampa ou paleta quebrada',
  '4': '4 - Ovitrampa ou paleta removida',
  '5': '5 - Ovitrampa seca',
  '6': '6 - Casa fechada',
  '7': "7 - Ovitrampa cheia d'água",
  '8': '8 - Ovitrampa com pouca água',
  '9': '9 - Outra observação',
  '10': '10 - Ovitrampa com larvas',
}

export const CYCLE_SITUATION_OPTIONS = Object.entries(CYCLE_SITUATION_LABELS).map(([value, label]) => ({
  value: value as CycleSituation,
  label,
}))

/** Valores antigos do enum Postgres → código numerado. */
const LEGACY_CYCLE_SITUATION: Record<string, CycleSituation> = {
  normal: '0',
  seca: '5',
  ausente: '2',
  danificada: '3',
}

export function normalizeCycleSituation(value: string | null | undefined): CycleSituation | null {
  if (value == null || value === '') return null
  if (value in CYCLE_SITUATION_LABELS) return value as CycleSituation
  return LEGACY_CYCLE_SITUATION[value] ?? null
}

export function cycleSituationLabel(value: string | null | undefined): string {
  const normalized = normalizeCycleSituation(value)
  if (normalized) return CYCLE_SITUATION_LABELS[normalized]
  if (value) return value
  return '—'
}
