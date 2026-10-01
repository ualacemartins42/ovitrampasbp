import { db, enqueueSync } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { createId, nowIso } from '@/lib/utils'
import type {
  EducacaoPhotoRef,
  EducacaoSaudeFormValues,
  EducacaoSaudeKind,
  EducacaoSaudeRecord,
} from '@/types/educacao'
import type { AppRole, CycleRecord, Profile, Trap } from '@/types/domain'

export const MAX_EDUCACAO_PHOTOS = 5

const STAFF_ROLES: AppRole[] = ['lab', 'supervisor', 'admin']

interface TrapAddress {
  street: string | null
  number: string | null
  neighborhoodName: string | null
  district: string | null
}

async function storeLocalPhotos(photos: Blob[]): Promise<string[]> {
  const ids: string[] = []
  for (const photo of photos) {
    const photoId = createId()
    ids.push(photoId)
    await db.photos.put({
      id: photoId,
      blob: photo,
      mimeType: photo.type || 'image/jpeg',
      createdAt: nowIso(),
    })
  }
  return ids
}

/** Mesma regra das políticas RLS: o próprio agente ou laboratório/supervisão/administração. */
export function canManageEducacao(profile: Profile | null, record: EducacaoSaudeRecord): boolean {
  if (!profile) return false
  return record.agentId === profile.id || STAFF_ROLES.includes(profile.role)
}

/** Novas fotos só podem ir para a pasta do dono do registro no Storage. */
export function canAddEducacaoPhotos(profile: Profile | null, record: EducacaoSaudeRecord | null): boolean {
  if (!profile) return false
  return !record || record.agentId === profile.id
}

export function educacaoPhotoRefs(record: EducacaoSaudeRecord): EducacaoPhotoRef[] {
  const refs: EducacaoPhotoRef[] = record.localPhotoIds.map((localId) => ({
    key: localId,
    localId,
    remotePath: record.photoPaths.find((path) => path.includes(localId)) ?? null,
  }))
  for (const path of record.photoPaths) {
    if (refs.some((ref) => ref.remotePath === path)) continue
    refs.push({ key: path, localId: null, remotePath: path })
  }
  return refs
}

export async function saveEducacaoSaude(
  profile: Profile,
  trap: Trap,
  cycle: CycleRecord | null,
  values: EducacaoSaudeFormValues,
  photos: Blob[],
  address: TrapAddress,
  kind: EducacaoSaudeKind = 'educacao',
): Promise<EducacaoSaudeRecord> {
  if (photos.length > MAX_EDUCACAO_PHOTOS) {
    throw new Error('É permitido anexar no máximo 5 fotos.')
  }

  if (!values.analysisDate) {
    throw new Error('Informe a data da análise.')
  }

  const eggRaw = values.eggCount.trim()
  const eggCount = eggRaw ? Number.parseInt(eggRaw, 10) : null
  if (eggRaw && (Number.isNaN(eggCount) || eggCount! < 0)) {
    throw new Error('Informe um número de ovos válido.')
  }

  const localPhotoIds = await storeLocalPhotos(photos)

  const record: EducacaoSaudeRecord = {
    id: createId(),
    kind,
    trapCode: trap.code,
    trapId: trap.id,
    cycleId: cycle?.id ?? null,
    street: address.street,
    number: address.number,
    neighborhoodName: address.neighborhoodName,
    district: address.district,
    analysisDate: values.analysisDate,
    eggCount,
    observation: values.observation.trim() || null,
    photoPaths: [],
    localPhotoIds,
    agentId: profile.id,
    syncStatus: 'pending',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }

  await db.educacaoSaude.put(record)
  await enqueueSync({
    id: createId(),
    type: 'educacao_saude',
    payloadId: record.id,
    createdAt: nowIso(),
  })

  return record
}

export async function updateEducacaoSaude(
  profile: Profile,
  record: EducacaoSaudeRecord,
  changes: {
    trap: Trap
    actionDate: string
    actionTaken: string
    address: TrapAddress
    keptPhotos: EducacaoPhotoRef[]
    newPhotos: Blob[]
  },
): Promise<EducacaoSaudeRecord> {
  if (!canManageEducacao(profile, record)) {
    throw new Error('Você não tem permissão para editar este registro.')
  }
  if (!changes.actionDate) throw new Error('Informe a data da ação.')
  if (!changes.actionTaken.trim()) throw new Error('Informe a ação tomada.')
  if (changes.newPhotos.length > 0 && !canAddEducacaoPhotos(profile, record)) {
    throw new Error('Só o agente que registrou a ação pode anexar novas fotos.')
  }
  if (changes.keptPhotos.length + changes.newPhotos.length > MAX_EDUCACAO_PHOTOS) {
    throw new Error('É permitido anexar no máximo 5 fotos.')
  }

  const keptLocal = new Set(changes.keptPhotos.map((ref) => ref.localId).filter(Boolean))
  const keptRemote = new Set(changes.keptPhotos.map((ref) => ref.remotePath).filter(Boolean))
  const removedLocal = record.localPhotoIds.filter((id) => !keptLocal.has(id))
  const removedRemote = record.photoPaths.filter((path) => !keptRemote.has(path))

  const addedIds = await storeLocalPhotos(changes.newPhotos)

  const updated: EducacaoSaudeRecord = {
    ...record,
    trapCode: changes.trap.code,
    trapId: changes.trap.id,
    street: changes.address.street,
    number: changes.address.number,
    neighborhoodName: changes.address.neighborhoodName,
    district: changes.address.district,
    analysisDate: changes.actionDate,
    observation: changes.actionTaken.trim(),
    localPhotoIds: [...record.localPhotoIds.filter((id) => keptLocal.has(id)), ...addedIds],
    photoPaths: record.photoPaths.filter((path) => keptRemote.has(path)),
    syncStatus: 'pending',
    updatedAt: nowIso(),
  }

  await db.educacaoSaude.put(updated)
  if (removedLocal.length) await db.photos.bulkDelete(removedLocal)
  await enqueueSync({
    id: createId(),
    type: 'educacao_saude',
    payloadId: updated.id,
    actorId: profile.id,
    createdAt: nowIso(),
  })

  if (removedRemote.length && supabase && navigator.onLine) {
    void supabase.storage.from('educacao_fotos').remove(removedRemote)
  }

  return updated
}

export async function deleteEducacaoSaude(profile: Profile, record: EducacaoSaudeRecord): Promise<void> {
  if (!canManageEducacao(profile, record)) {
    throw new Error('Você não tem permissão para excluir este registro.')
  }
  await db.educacaoSaude.delete(record.id)
  if (record.localPhotoIds.length) await db.photos.bulkDelete(record.localPhotoIds)
  await enqueueSync({
    id: createId(),
    type: 'educacao_saude',
    payloadId: record.id,
    actorId: profile.id,
    createdAt: nowIso(),
  })
}
