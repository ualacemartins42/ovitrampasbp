import type { LocalSyncStatus } from '@/types/domain'

export type EducacaoSaudeKind = 'educacao' | 'contagem'

export interface EducacaoSaudeRecord {
  id: string
  /** Ação educativa ou contagem de ovos (coluna record_type). */
  kind: EducacaoSaudeKind
  trapCode: string
  trapId: number | null
  cycleId: string | null
  street: string | null
  number: string | null
  neighborhoodName: string | null
  district: string | null
  /** Data da análise (coluna action_date). */
  analysisDate: string
  eggCount: number | null
  /** Observação da análise (coluna action_taken). */
  observation: string | null
  photoPaths: string[]
  localPhotoIds: string[]
  agentId: string
  syncStatus: LocalSyncStatus
  createdAt: string
  updatedAt: string
}

export interface EducacaoSaudeFormValues {
  trapCode: string
  analysisDate: string
  eggCount: string
  observation: string
}

/** Foto já gravada em um registro: local (IndexedDB), remota (Storage) ou ambas. */
export interface EducacaoPhotoRef {
  key: string
  localId: string | null
  remotePath: string | null
}
