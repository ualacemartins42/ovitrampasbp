import { db, enqueueSync, seedReferenceDataIfEmpty } from '@/lib/db'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { CollectionRecord, LabResult, Neighborhood, Profile, Property, Trap, TrapType } from '@/types/domain'
import { createId, nowIso } from '@/lib/utils'

function mapProfile(row: {
  id: string
  full_name: string
  registration_number: string | null
  cpf: string | null
  role: Profile['role']
  neighborhood_id: number | null
  zone: string | null
  phone: string | null
}): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    registrationNumber: row.registration_number,
    cpf: row.cpf,
    role: row.role,
    neighborhoodId: row.neighborhood_id,
    zone: row.zone,
    phone: row.phone,
  }
}

async function pullReferenceTables(): Promise<void> {
  if (!supabase) return

  const [neighborhoods, trapTypes, properties, traps] = await Promise.all([
    supabase.from('neighborhoods').select('*').order('name'),
    supabase.from('trap_types').select('*').order('name'),
    supabase.from('properties').select('*'),
    supabase.from('traps').select('*'),
  ])

  if (neighborhoods.error) throw neighborhoods.error
  if (trapTypes.error) throw trapTypes.error
  if (properties.error) throw properties.error
  if (traps.error) throw traps.error

  await db.transaction('rw', db.neighborhoods, db.trapTypes, db.properties, db.traps, async () => {
    await db.neighborhoods.clear()
    await db.trapTypes.clear()
    await db.properties.clear()
    await db.traps.clear()

    await db.neighborhoods.bulkAdd(
      (neighborhoods.data ?? []).map(
        (row): Neighborhood => ({
          id: row.id,
          name: row.name,
          zone: row.zone,
        }),
      ),
    )
    await db.trapTypes.bulkAdd(
      (trapTypes.data ?? []).map(
        (row): TrapType => ({
          id: row.id,
          code: row.code,
          name: row.name,
          description: row.description,
        }),
      ),
    )
    await db.properties.bulkAdd(
      (properties.data ?? []).map(
        (row): Property => ({
          id: row.id,
          street: row.street,
          number: row.number,
          neighborhoodId: row.neighborhood_id,
          complement: row.complement,
          referencePoint: row.reference_point,
          latitude: row.latitude,
          longitude: row.longitude,
        }),
      ),
    )
    await db.traps.bulkAdd(
      (traps.data ?? []).map(
        (row): Trap => ({
          id: row.id,
          code: row.code,
          qrCode: row.qr_code,
          trapTypeId: row.trap_type_id,
          propertyId: row.property_id,
          status: row.status,
          installedAt: row.installed_at,
        }),
      ),
    )
  })
}

async function pullCollections(agentId: string, isStaff: boolean): Promise<void> {
  if (!supabase) return

  let query = supabase.from('collections').select('*').order('occurred_at', { ascending: false })
  if (!isStaff) {
    query = query.eq('agent_id', agentId)
  }

  const { data, error } = await query
  if (error) throw error

  const remote = data ?? []
  const local = await db.collections.toArray()
  const localByClient = new Map(local.map((item) => [item.clientId, item]))

  for (const row of remote) {
    const existing = localByClient.get(row.client_id)
    if (existing?.syncStatus === 'pending' || existing?.syncStatus === 'error') {
      continue
    }

    const mapped: CollectionRecord = {
      id: row.id,
      clientId: row.client_id,
      trapId: row.trap_id,
      trapCode: row.trap_code,
      trapTypeId: row.trap_type_id,
      agentId: row.agent_id,
      kind: row.kind,
      occurredAt: row.occurred_at,
      trapStatus: row.trap_status,
      paddleCode: row.paddle_code,
      estimatedEggs: row.estimated_eggs,
      observations: row.observations,
      photoPath: row.photo_path,
      latitude: row.latitude,
      longitude: row.longitude,
      street: row.street,
      number: row.number,
      neighborhoodId: row.neighborhood_id,
      complement: row.complement,
      referencePoint: row.reference_point,
      syncStatus: 'synced',
      localPhotoId: existing?.localPhotoId ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }

    await db.collections.put(mapped)
  }
}

async function pullLabResults(): Promise<void> {
  if (!supabase) return
  const { data, error } = await supabase.from('lab_results').select('*')
  if (error) throw error

  const local = await db.labResults.toArray()
  const pendingIds = new Set(
    local.filter((item) => item.syncStatus !== 'synced').map((item) => String(item.collectionId)),
  )

  for (const row of data ?? []) {
    if (pendingIds.has(row.collection_id)) continue
    const mapped: LabResult = {
      id: row.id,
      collectionId: row.collection_id,
      exactEggCount: row.exact_egg_count,
      species: row.species,
      speciesNotes: row.species_notes,
      analyzedAt: row.analyzed_at,
      analystId: row.analyst_id,
      notes: row.notes,
      syncStatus: 'synced',
    }
    await db.labResults.put(mapped)
  }
}

async function uploadPhoto(agentId: string, collectionClientId: string): Promise<string | null> {
  if (!supabase) return null
  const photo = await db.photos.get(collectionClientId)
  if (!photo) return null

  const extension = photo.mimeType.includes('png') ? 'png' : photo.mimeType.includes('webp') ? 'webp' : 'jpg'
  const path = `${agentId}/${collectionClientId}.${extension}`

  const { error } = await supabase.storage.from('collection-photos').upload(path, photo.blob, {
    upsert: true,
    contentType: photo.mimeType,
  })
  if (error) throw error
  return path
}

async function pushCollection(collectionId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado')
  const collection = await db.collections.get(collectionId)
  if (!collection) return

  const photoPath = collection.localPhotoId
    ? await uploadPhoto(collection.agentId, collection.localPhotoId)
    : collection.photoPath

  const payload = {
    id: collection.id,
    client_id: collection.clientId,
    trap_id: collection.trapId,
    trap_code: collection.trapCode,
    trap_type_id: collection.trapTypeId,
    agent_id: collection.agentId,
    kind: collection.kind,
    occurred_at: collection.occurredAt,
    trap_status: collection.trapStatus,
    paddle_code: collection.paddleCode,
    estimated_eggs: collection.estimatedEggs,
    observations: collection.observations,
    photo_path: photoPath,
    latitude: collection.latitude,
    longitude: collection.longitude,
    street: collection.street,
    number: collection.number,
    neighborhood_id: collection.neighborhoodId,
    complement: collection.complement,
    reference_point: collection.referencePoint,
  }

  const { error } = await supabase.from('collections').upsert(payload, { onConflict: 'client_id' })
  if (error) throw error

  await db.collections.update(collection.id, {
    syncStatus: 'synced',
    photoPath,
    updatedAt: nowIso(),
  })
}

async function pushLabResult(resultId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado')
  const result = await db.labResults.get(resultId)
  if (!result) return

  const { error } = await supabase.from('lab_results').upsert(
    {
      collection_id: result.collectionId,
      exact_egg_count: result.exactEggCount,
      species: result.species,
      species_notes: result.speciesNotes,
      analyzed_at: result.analyzedAt,
      analyst_id: result.analystId,
      notes: result.notes,
    },
    { onConflict: 'collection_id' },
  )
  if (error) throw error

  await db.labResults.update(resultId, { syncStatus: 'synced' })
}

async function pushProfile(profileId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado')
  const profile = await db.profiles.get(profileId)
  if (!profile) return

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: profile.fullName,
      registration_number: profile.registrationNumber,
      cpf: profile.cpf,
      neighborhood_id: profile.neighborhoodId,
      zone: profile.zone,
      phone: profile.phone,
    })
    .eq('id', profile.id)

  if (error) throw error
}

export async function processSyncQueue(): Promise<{ processed: number; failed: number }> {
  if (!navigator.onLine || !isSupabaseConfigured() || !supabase) {
    return { processed: 0, failed: 0 }
  }

  const items = await db.syncQueue.orderBy('createdAt').toArray()
  let processed = 0
  let failed = 0

  for (const item of items) {
    try {
      await db.syncQueue.update(item.id, { status: 'processing' })
      if (item.type === 'collection' || item.type === 'photo') {
        await pushCollection(item.payloadId)
      } else if (item.type === 'lab_result') {
        await pushLabResult(item.payloadId)
      } else if (item.type === 'profile') {
        await pushProfile(item.payloadId)
      }
      await db.syncQueue.delete(item.id)
      processed += 1
    } catch (error) {
      failed += 1
      await db.syncQueue.update(item.id, {
        status: 'error',
        attempts: item.attempts + 1,
        lastError: error instanceof Error ? error.message : 'Falha ao sincronizar',
      })
    }
  }

  return { processed, failed }
}

export async function pullRemoteData(profile: Profile): Promise<void> {
  if (!navigator.onLine || !supabase) {
    await seedReferenceDataIfEmpty()
    return
  }

  await pullReferenceTables()
  await pullCollections(profile.id, profile.role !== 'ace')
  if (profile.role !== 'ace') {
    await pullLabResults()
  }
  await db.meta.put({ key: 'lastPullAt', value: nowIso() })
}

export async function syncAll(profile: Profile): Promise<{ processed: number; failed: number }> {
  const result = await processSyncQueue()
  await pullRemoteData(profile)
  return result
}

export async function cacheProfile(profile: Profile): Promise<void> {
  await db.profiles.put(profile)
}

export async function loadCachedProfile(userId: string): Promise<Profile | undefined> {
  return db.profiles.get(userId)
}

export async function fetchRemoteProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  if (!data) return null
  const profile = mapProfile(data)
  await cacheProfile(profile)
  return profile
}

export { enqueueSync, createId }
