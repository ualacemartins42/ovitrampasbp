import { db, enqueueSync } from '@/lib/db'
import { createId, nowIso } from '@/lib/utils'
import type { EducacaoSaudeFormValues, EducacaoSaudeRecord } from '@/types/educacao'
import type { CycleRecord, Profile, Trap } from '@/types/domain'

export async function saveEducacaoSaude(
  profile: Profile,
  trap: Trap,
  cycle: CycleRecord | null,
  values: EducacaoSaudeFormValues,
  photos: Blob[],
  address: {
    street: string | null
    number: string | null
    neighborhoodName: string | null
    district: string | null
  },
): Promise<EducacaoSaudeRecord> {
  if (photos.length > 5) {
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

  const id = createId()
  const localPhotoIds: string[] = []

  for (const photo of photos) {
    const photoId = createId()
    localPhotoIds.push(photoId)
    await db.photos.put({
      id: photoId,
      blob: photo,
      mimeType: photo.type || 'image/jpeg',
      createdAt: nowIso(),
    })
  }

  const record: EducacaoSaudeRecord = {
    id,
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
