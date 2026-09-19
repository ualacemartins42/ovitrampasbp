export type AppRole = 'ace' | 'lab' | 'supervisor' | 'admin'

export type TrapStatus =
  | 'instalada'
  | 'recolhida'
  | 'danificada'
  | 'perdida'
  | 'sem_alteracao'

export type CollectionKind = 'instalacao' | 'vistoria' | 'recolhimento'

export type MosquitoSpecies =
  | 'aedes_aegypti'
  | 'aedes_albopictus'
  | 'culex'
  | 'outro'
  | 'nao_identificado'

export type LocalSyncStatus = 'pending' | 'synced' | 'error'

export interface Neighborhood {
  id: number
  name: string
  zone: string
}

export interface TrapType {
  id: number
  code: string
  name: string
  description: string | null
}

export interface Profile {
  id: string
  fullName: string
  registrationNumber: string | null
  cpf: string | null
  role: AppRole
  neighborhoodId: number | null
  zone: string | null
  phone: string | null
}

export interface Property {
  id: number
  street: string
  number: string | null
  neighborhoodId: number
  complement: string | null
  referencePoint: string | null
  latitude: number | null
  longitude: number | null
}

export interface Trap {
  id: number
  code: string
  qrCode: string | null
  trapTypeId: number
  propertyId: number | null
  status: TrapStatus
  installedAt: string | null
}

export interface CollectionRecord {
  id: string
  clientId: string
  trapId: number | null
  trapCode: string
  trapTypeId: number | null
  agentId: string
  kind: CollectionKind
  occurredAt: string
  trapStatus: TrapStatus
  paddleCode: string | null
  estimatedEggs: number | null
  observations: string | null
  photoPath: string | null
  latitude: number | null
  longitude: number | null
  street: string | null
  number: string | null
  neighborhoodId: number | null
  complement: string | null
  referencePoint: string | null
  syncStatus: LocalSyncStatus
  localPhotoId: string | null
  createdAt: string
  updatedAt: string
}

export interface LabResult {
  id: number | string
  collectionId: string
  exactEggCount: number | null
  species: MosquitoSpecies | null
  speciesNotes: string | null
  analyzedAt: string
  analystId: string
  notes: string | null
  syncStatus: LocalSyncStatus
}

export type SyncQueueType = 'collection' | 'photo' | 'lab_result' | 'profile'

export interface SyncQueueItem {
  id: string
  type: SyncQueueType
  payloadId: string
  createdAt: string
  attempts: number
  lastError: string | null
  status: 'pending' | 'processing' | 'error'
}

export interface LocalPhoto {
  id: string
  blob: Blob
  mimeType: string
  createdAt: string
}

export interface CollectionFormValues {
  kind: CollectionKind
  trapCode: string
  trapTypeId: string
  street: string
  number: string
  neighborhoodId: string
  complement: string
  referencePoint: string
  latitude: string
  longitude: string
  occurredAt: string
  trapStatus: TrapStatus
  paddleCode: string
  estimatedEggs: string
  observations: string
}
