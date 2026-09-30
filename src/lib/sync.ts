import { db, enqueueSync, seedOfficialNeighborhoods, seedReferenceDataIfEmpty } from '@/lib/db'
import { normalizeCycleSituation } from '@/constants/situacoes'
import { cacheBairrosLocally, cacheNeighborhoodsFromRemote } from '@/services/bairroService'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { EducacaoSaudeRecord } from '@/types/educacao'
import type { CollectionRecord, CycleRecord, LabResult, Profile, Property, Trap, TrapType } from '@/types/domain'
import { createId, nowIso } from '@/lib/utils'

function mapProfile(row: {
  id: string
  full_name: string
  username: string | null
  registration_number: string | null
  role: Profile['role']
  neighborhood_id: number | null
  zone: string | null
  phone: string | null
  is_active?: boolean | null
}): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username ?? null,
    registrationNumber: row.registration_number,
    role: row.role,
    neighborhoodId: row.neighborhood_id,
    zone: row.zone,
    phone: row.phone,
    isActive: row.is_active ?? true,
  }
}

function mapTrap(row: {
  id: number
  code: string
  qr_code: string | null
  trap_type_id: number
  property_id: number | null
  status: Trap['status']
  installed_at: string | null
  neighborhood_id?: number | null
  district?: string | null
  street?: string | null
  number?: string | null
  complement?: string | null
  location_detail?: string | null
  responsible?: string | null
  block?: string | null
  area_type?: Trap['areaType']
  estrato_liraa?: string | null
  latitude?: number | null
  longitude?: number | null
}): Trap {
  return {
    id: row.id,
    code: row.code,
    qrCode: row.qr_code,
    trapTypeId: row.trap_type_id,
    propertyId: row.property_id,
    status: row.status,
    installedAt: row.installed_at,
    neighborhoodId: row.neighborhood_id ?? null,
    district: row.district ?? null,
    street: row.street ?? null,
    number: row.number ?? null,
    complement: row.complement ?? null,
    locationDetail: row.location_detail ?? null,
    responsible: row.responsible ?? null,
    block: row.block ?? null,
    areaType: row.area_type ?? null,
    estratoLiraa: row.estrato_liraa ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    syncStatus: 'synced',
  }
}

function mapCycle(row: {
  id: string
  trap_code: string
  trap_id: number | null
  neighborhood_name: string | null
  status: CycleRecord['status']
  install_at: string | null
  install_epi_week: number | null
  install_obs: string | null
  swap_at: string | null
  swap_epi_week: number | null
  swap_situation: string | null
  swap_obs: string | null
  remove_at: string | null
  remove_epi_week: number | null
  remove_situation: string | null
  remove_obs: string | null
  agent_id: string
  created_at: string
  updated_at: string
}): CycleRecord {
  return {
    id: row.id,
    trapCode: row.trap_code,
    trapId: row.trap_id,
    neighborhoodName: row.neighborhood_name,
    status: row.status,
    installAt: row.install_at,
    installEpiWeek: row.install_epi_week,
    installObs: row.install_obs,
    swapAt: row.swap_at,
    swapEpiWeek: row.swap_epi_week,
    swapSituation: normalizeCycleSituation(row.swap_situation),
    swapObs: row.swap_obs,
    removeAt: row.remove_at,
    removeEpiWeek: row.remove_epi_week,
    removeSituation: normalizeCycleSituation(row.remove_situation),
    removeObs: row.remove_obs,
    agentId: row.agent_id,
    syncStatus: 'synced',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function pullReferenceTables(): Promise<void> {
  if (!supabase) return

  const [bairros, neighborhoods, trapTypes, properties, traps] = await Promise.all([
    supabase.from('bairros').select('*').order('distrito', { ascending: true }).order('nome', { ascending: true }),
    supabase.from('neighborhoods').select('*').order('name'),
    supabase.from('trap_types').select('*').order('name'),
    supabase.from('properties').select('*'),
    supabase.from('traps').select('*'),
  ])

  if (trapTypes.error) throw trapTypes.error
  if (properties.error) throw properties.error
  if (traps.error) throw traps.error

  const remoteBairros = bairros.error ? [] : (bairros.data ?? [])
  const remoteNeighborhoods = neighborhoods.error ? [] : (neighborhoods.data ?? [])
  const mappedBairros = remoteBairros.map((row) => ({
    id: row.id,
    nome: row.nome,
    distrito: row.distrito,
    ativo: row.ativo,
    createdAt: row.created_at,
  }))

  if (remoteNeighborhoods.length > 0) {
    await cacheNeighborhoodsFromRemote(remoteNeighborhoods, mappedBairros)
  } else if (mappedBairros.length > 0) {
    await cacheBairrosLocally(mappedBairros)
  } else {
    await seedOfficialNeighborhoods()
  }

  const localTraps = await db.traps.toArray()
  const pendingTraps = localTraps.filter((item) => item.syncStatus === 'pending' || item.syncStatus === 'error')
  const pendingCodes = new Set(pendingTraps.map((item) => item.code))

  await db.transaction('rw', db.trapTypes, db.properties, db.traps, async () => {
    await db.trapTypes.clear()
    await db.properties.clear()

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

    for (const row of traps.data ?? []) {
      if (pendingCodes.has(row.code)) continue
      await db.traps.put(mapTrap(row))
    }
    for (const pending of pendingTraps) {
      await db.traps.put(pending)
    }
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
  if (!collection) {
    const { error } = await supabase.from('collections').delete().eq('id', collectionId)
    if (error) throw error
    return
  }

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

async function pushTrap(trapId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado')
  const trap = await db.traps.get(Number(trapId))
  if (!trap) {
    await supabase.from('traps').delete().eq('id', Number(trapId))
    return
  }
  if (trap.deletedAt) {
    const { error } = await supabase.from('traps').delete().eq('code', trap.code)
    if (error) throw error
    await db.traps.delete(trap.id)
    return
  }

  const payload = {
    code: trap.code,
    qr_code: trap.qrCode,
    trap_type_id: trap.trapTypeId,
    property_id: trap.propertyId && trap.propertyId < 5000 ? trap.propertyId : null,
    status: trap.status,
    installed_at: trap.installedAt,
    neighborhood_id: trap.neighborhoodId,
    district: trap.district,
    street: trap.street,
    number: trap.number,
    complement: trap.complement,
    location_detail: trap.locationDetail,
    responsible: trap.responsible,
    block: trap.block,
    area_type: trap.areaType,
    estrato_liraa: trap.estratoLiraa ?? null,
    latitude: trap.latitude,
    longitude: trap.longitude,
  }

  const { data, error } = await supabase.from('traps').upsert(payload, { onConflict: 'code' }).select('id').maybeSingle()
  if (error) throw error
  if (data?.id && data.id !== trap.id) {
    await db.traps.delete(trap.id)
    await db.traps.put({ ...trap, id: data.id, syncStatus: 'synced' })
    return
  }
  await db.traps.update(trap.id, { syncStatus: 'synced' })
}

async function uploadEducacaoPhoto(agentId: string, recordId: string, photoId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase não configurado')
  const photo = await db.photos.get(photoId)
  if (!photo) throw new Error('Foto local não encontrada.')

  const extension = photo.mimeType.includes('png') ? 'png' : photo.mimeType.includes('webp') ? 'webp' : 'jpg'
  const path = `${agentId}/${recordId}/${photoId}.${extension}`

  const { error } = await supabase.storage.from('educacao_fotos').upload(path, photo.blob, {
    upsert: true,
    contentType: photo.mimeType,
  })
  if (error) throw error
  return path
}

async function pushEducacaoSaude(recordId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado')
  const record = await db.educacaoSaude.get(recordId)
  if (!record) {
    const { error } = await supabase.from('educacao_saude').delete().eq('id', recordId)
    if (error) throw error
    return
  }

  const photoPaths: string[] = [...record.photoPaths]
  for (const photoId of record.localPhotoIds) {
    const already = photoPaths.some((path) => path.includes(photoId))
    if (already) continue
    photoPaths.push(await uploadEducacaoPhoto(record.agentId, record.id, photoId))
  }

  const { error } = await supabase.from('educacao_saude').upsert({
    id: record.id,
    trap_code: record.trapCode,
    trap_id: record.trapId,
    street: record.street,
    number: record.number,
    neighborhood_name: record.neighborhoodName,
    district: record.district,
    action_date: record.analysisDate,
    action_taken: record.observation,
    egg_count: record.eggCount,
    cycle_id: record.cycleId,
    photo_paths: photoPaths,
    agent_id: record.agentId,
    updated_at: nowIso(),
  })
  if (error) throw error

  await db.educacaoSaude.update(record.id, {
    syncStatus: 'synced',
    photoPaths,
    updatedAt: nowIso(),
  })
}

async function pullEducacaoSaude(agentId: string, allAgents: boolean): Promise<void> {
  if (!supabase) return
  let query = supabase.from('educacao_saude').select('*').order('action_date', { ascending: false })
  if (!allAgents) query = query.eq('agent_id', agentId)
  const { data, error } = await query
  if (error) throw error

  const local = await db.educacaoSaude.toArray()
  const pending = new Set(local.filter((item) => item.syncStatus !== 'synced').map((item) => item.id))

  for (const row of data ?? []) {
    if (pending.has(row.id)) continue
    const mapped: EducacaoSaudeRecord = {
      id: row.id,
      trapCode: row.trap_code,
      trapId: row.trap_id,
      cycleId: row.cycle_id ?? null,
      street: row.street,
      number: row.number,
      neighborhoodName: row.neighborhood_name,
      district: row.district,
      analysisDate: row.action_date,
      eggCount: row.egg_count ?? null,
      observation: row.action_taken,
      photoPaths: row.photo_paths ?? [],
      localPhotoIds: [],
      agentId: row.agent_id,
      syncStatus: 'synced',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
    await db.educacaoSaude.put(mapped)
  }
}

async function pushCycle(cycleId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado')
  const cycle = await db.cycles.get(cycleId)
  if (!cycle) {
    const { error } = await supabase.from('cycles').delete().eq('id', cycleId)
    if (error) throw error
    return
  }

  const { error } = await supabase.from('cycles').upsert({
    id: cycle.id,
    trap_code: cycle.trapCode,
    trap_id: cycle.trapId,
    neighborhood_name: cycle.neighborhoodName,
    status: cycle.status,
    install_at: cycle.installAt,
    install_epi_week: cycle.installEpiWeek,
    install_obs: cycle.installObs,
    swap_at: cycle.swapAt,
    swap_epi_week: cycle.swapEpiWeek,
    swap_situation: normalizeCycleSituation(cycle.swapSituation),
    swap_obs: cycle.swapObs,
    remove_at: cycle.removeAt,
    remove_epi_week: cycle.removeEpiWeek,
    remove_situation: normalizeCycleSituation(cycle.removeSituation),
    remove_obs: cycle.removeObs,
    agent_id: cycle.agentId,
  })
  if (error) throw error
  await db.cycles.update(cycle.id, { syncStatus: 'synced' })
}

async function pullCycles(): Promise<void> {
  if (!supabase) return
  const { data, error } = await supabase.from('cycles').select('*').order('created_at', { ascending: false })
  if (error) throw error

  const local = await db.cycles.toArray()
  const pending = new Set(local.filter((item) => item.syncStatus !== 'synced').map((item) => item.id))

  for (const row of data ?? []) {
    if (pending.has(row.id)) continue
    await db.cycles.put(mapCycle(row))
  }
}

async function pullProfiles(): Promise<void> {
  if (!supabase) return
  const { data, error } = await supabase.from('profiles').select('*')
  if (error) throw error
  for (const row of data ?? []) {
    await db.profiles.put(mapProfile(row))
  }
}

async function pushProfile(profileId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado')
  const profile = await db.profiles.get(profileId)
  if (!profile) return

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: profile.fullName,
      username: profile.username,
      registration_number: profile.registrationNumber,
      neighborhood_id: profile.neighborhoodId,
      zone: profile.zone,
      phone: profile.phone,
    })
    .eq('id', profile.id)

  if (error) throw error
}

let syncInFlight = false

export async function processSyncQueue(
  options: { retryErrors?: boolean; agentId?: string } = {},
): Promise<{ processed: number; failed: number }> {
  if (syncInFlight) {
    return { processed: 0, failed: 0 }
  }
  if (!navigator.onLine || !isSupabaseConfigured() || !supabase) {
    return { processed: 0, failed: 0 }
  }

  syncInFlight = true
  let processed = 0
  let failed = 0

  try {
    const items = await db.syncQueue.orderBy('createdAt').toArray()

    for (const item of items) {
      if (item.status === 'processing') continue
      if (item.status === 'error' && !options.retryErrors) continue

      if (item.type === 'collection' || item.type === 'photo') {
        const collection = await db.collections.get(item.payloadId)
        if (options.agentId && collection && collection.agentId !== options.agentId) {
          continue
        }
      }
      if (item.type === 'educacao_saude') {
        const record = await db.educacaoSaude.get(item.payloadId)
        if (options.agentId && record && record.agentId !== options.agentId) {
          continue
        }
      }

      try {
        await db.syncQueue.update(item.id, { status: 'processing' })
        if (item.type === 'collection' || item.type === 'photo') {
          await pushCollection(item.payloadId)
          const collection = await db.collections.get(item.payloadId)
          if (collection) {
            await db.collections.update(collection.id, { syncStatus: 'synced' })
          }
        } else if (item.type === 'lab_result') {
          await pushLabResult(item.payloadId)
        } else if (item.type === 'profile') {
          await pushProfile(item.payloadId)
        } else if (item.type === 'trap') {
          await pushTrap(item.payloadId)
        } else if (item.type === 'cycle') {
          await pushCycle(item.payloadId)
        } else if (item.type === 'educacao_saude') {
          await pushEducacaoSaude(item.payloadId)
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
  } finally {
    syncInFlight = false
  }

  return { processed, failed }
}

export async function pullRemoteData(profile: Profile): Promise<void> {
  if (!navigator.onLine || !supabase) {
    await seedReferenceDataIfEmpty()
    return
  }

  await Promise.allSettled([
    pullReferenceTables(),
    pullCollections(profile.id, profile.role !== 'ace'),
    pullCycles(),
    pullEducacaoSaude(profile.id, profile.role !== 'ace'),
    pullProfiles(),
    profile.role === 'ace' ? Promise.resolve() : pullLabResults(),
  ])
  await db.meta.put({ key: 'lastPullAt', value: nowIso() })
}

export async function syncAll(profile: Profile): Promise<{ processed: number; failed: number }> {
  const result = await processSyncQueue({ retryErrors: true, agentId: profile.id })
  await pullRemoteData(profile)
  return result
}

let autoSyncTimer: number | null = null
let getProfileForSync: () => Profile | null = () => null
let getIsDemoForSync: () => boolean = () => true

export function startBackgroundSync(getProfile: () => Profile | null, isDemo: () => boolean): void {
  getProfileForSync = getProfile
  getIsDemoForSync = isDemo
  if (autoSyncTimer != null || typeof window === 'undefined') return

  const tick = () => {
    const profile = getProfileForSync()
    if (!profile || getIsDemoForSync() || !navigator.onLine) return
    void processSyncQueue({ retryErrors: false, agentId: profile.id })
  }

  autoSyncTimer = window.setInterval(tick, 15000)
  window.addEventListener('online', tick)
  tick()
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
