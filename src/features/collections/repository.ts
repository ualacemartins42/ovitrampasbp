import { db, enqueueSync } from '@/lib/db'
import { createId, nowIso } from '@/lib/utils'
import type { CollectionFormValues, CollectionRecord, Profile } from '@/types/domain'

export async function saveCollection(profile: Profile, values: CollectionFormValues, photo: Blob | null) {
  const id = createId()
  const photoId = photo ? id : null
  const occurredAt = new Date(values.occurredAt).toISOString()
  const record: CollectionRecord = {
    id,
    clientId: id,
    trapId: null,
    trapCode: values.trapCode.trim().toUpperCase(),
    trapTypeId: values.trapTypeId ? Number(values.trapTypeId) : null,
    agentId: profile.id,
    kind: values.kind,
    occurredAt,
    trapStatus: values.trapStatus,
    paddleCode: values.paddleCode.trim() || null,
    estimatedEggs: values.estimatedEggs.trim() ? Number.parseInt(values.estimatedEggs, 10) : null,
    observations: values.observations.trim() || null,
    photoPath: null,
    latitude: values.latitude ? Number(values.latitude) : null,
    longitude: values.longitude ? Number(values.longitude) : null,
    street: values.street.trim() || null,
    number: values.number.trim() || null,
    neighborhoodId: values.neighborhoodId ? Number(values.neighborhoodId) : null,
    complement: values.complement.trim() || null,
    referencePoint: values.referencePoint.trim() || null,
    syncStatus: 'pending',
    localPhotoId: photoId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }

  await db.collections.put(record)

  if (photo && photoId) {
    await db.photos.put({
      id: photoId,
      blob: photo,
      mimeType: photo.type || 'image/jpeg',
      createdAt: nowIso(),
    })
  }

  const existingTrap = await db.traps.where('code').equals(record.trapCode).first()
  if (!existingTrap) {
    const nextId = ((await db.traps.orderBy('id').last())?.id ?? 1000) + 1
    await db.traps.add({
      id: nextId,
      code: record.trapCode,
      qrCode: record.trapCode,
      trapTypeId: record.trapTypeId ?? 1,
      propertyId: null,
      status: record.trapStatus,
      installedAt: record.kind === 'instalacao' ? record.occurredAt : null,
    })
  } else {
    await db.traps.update(existingTrap.id, { status: record.trapStatus })
  }

  await enqueueSync({
    id: createId(),
    type: 'collection',
    payloadId: record.id,
    createdAt: nowIso(),
  })

  if (photoId) {
    await enqueueSync({
      id: createId(),
      type: 'photo',
      payloadId: record.id,
      createdAt: nowIso(),
    })
  }

  return record
}
