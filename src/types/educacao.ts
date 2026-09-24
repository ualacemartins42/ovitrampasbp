import type { LocalSyncStatus } from '@/types/domain'

export interface EducacaoSaudeRecord {
  id: string
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
