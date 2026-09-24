import {
  BAIRROS_ATIVOS_SEED,
  BAIRROS_CATALOG_VERSION,
  BARRA_DO_PIRAI_BAIRROS,
  BARRA_DO_PIRAI_DISTRITO_OPTIONS,
  matchOfficialActiveBairro,
} from '@/constants/bairros'
import { db } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { createId, foldSearchText, nowIso } from '@/lib/utils'
import type { Bairro, Neighborhood } from '@/types/domain'

export interface BairroFormValues {
  nome: string
  distrito: string
}

function mapRow(row: { id: string; nome: string; distrito: string; ativo: boolean; created_at: string }): Bairro {
  return {
    id: row.id,
    nome: row.nome,
    distrito: row.distrito,
    ativo: row.ativo,
    createdAt: row.created_at,
  }
}

export function neighborhoodFromBairro(bairro: Bairro, id: number): Neighborhood {
  return {
    id,
    name: bairro.nome,
    zone: bairro.distrito,
    remoteId: bairro.id,
    active: bairro.ativo,
  }
}

export function bairroFromNeighborhood(neighborhood: Neighborhood): Bairro {
  return {
    id: neighborhood.remoteId ?? String(neighborhood.id),
    nome: neighborhood.name,
    distrito: neighborhood.zone,
    ativo: neighborhood.active !== false,
    createdAt: nowIso(),
  }
}

function foldName(value: string): string {
  return foldSearchText(value).replace(/['’`]/g, '')
}

/** IDs must match public.neighborhoods.id because traps.neighborhood_id is an FK to that table. */
export function mergeNeighborhoodCatalog(
  remoteNeighborhoods: Array<{ id: number; name: string; zone: string }>,
  bairros: Bairro[] = [],
): Neighborhood[] {
  const bairroByName = new Map<string, Bairro>()
  for (const bairro of bairros) {
    bairroByName.set(foldName(bairro.nome), bairro)
  }

  const usedNames = new Set<string>()
  const rows: Neighborhood[] = remoteNeighborhoods.map((row) => {
    const key = foldName(row.name)
    const bairro = bairroByName.get(key)
    if (bairro) usedNames.add(key)
    return {
      id: row.id,
      name: row.name,
      zone: row.zone,
      remoteId: bairro?.id ?? null,
      active: bairro?.ativo ?? true,
    }
  })

  let nextId = Math.max(0, ...rows.map((row) => row.id)) + 1
  for (const bairro of bairros) {
    const key = foldName(bairro.nome)
    if (usedNames.has(key)) continue
    rows.push(neighborhoodFromBairro(bairro, nextId))
    nextId += 1
  }

  return rows
}

async function persistNeighborhoods(rows: Neighborhood[]): Promise<Neighborhood[]> {
  await db.transaction('rw', db.neighborhoods, db.meta, async () => {
    await db.neighborhoods.clear()
    if (rows.length > 0) {
      await db.neighborhoods.bulkPut(rows)
    }
    await db.meta.put({ key: 'neighborhoodsCatalogVersion', value: BAIRROS_CATALOG_VERSION })
    await db.meta.put({ key: 'bairrosPulledAt', value: nowIso() })
  })
  return rows
}

export async function cacheNeighborhoodsFromRemote(
  remoteNeighborhoods: Array<{ id: number; name: string; zone: string }>,
  bairros: Bairro[] = [],
): Promise<Neighborhood[]> {
  return persistNeighborhoods(mergeNeighborhoodCatalog(remoteNeighborhoods, bairros))
}

export async function cacheBairrosLocally(bairros: Bairro[]): Promise<Neighborhood[]> {
  const local = await db.neighborhoods.toArray()
  const byRemote = new Map(local.filter((item) => item.remoteId).map((item) => [item.remoteId as string, item]))
  const byName = new Map(local.map((item) => [foldName(item.name), item]))
  let nextId = Math.max(0, ...local.map((item) => item.id)) + 1

  const claimed = new Set<number>()
  const rows: Neighborhood[] = []

  for (const bairro of bairros) {
    const existing = byRemote.get(bairro.id) ?? byName.get(foldName(bairro.nome))
    const id = existing && !claimed.has(existing.id) ? existing.id : nextId++
    claimed.add(id)
    rows.push({
      id,
      name: existing?.name ?? bairro.nome,
      zone: existing?.zone ?? bairro.distrito,
      remoteId: bairro.id,
      active: bairro.ativo,
    })
  }

  for (const item of local) {
    if (claimed.has(item.id)) continue
    rows.push(item)
    claimed.add(item.id)
  }

  return persistNeighborhoods(rows)
}

export async function listLocalBairros(): Promise<Bairro[]> {
  const rows = await db.neighborhoods.toArray()
  if (rows.length === 0) {
    return BARRA_DO_PIRAI_BAIRROS.map(bairroFromNeighborhood)
  }
  return rows
    .map(bairroFromNeighborhood)
    .sort((left, right) => {
      const byDistrict = left.distrito.localeCompare(right.distrito, 'pt-BR')
      if (byDistrict !== 0) return byDistrict
      return left.nome.localeCompare(right.nome, 'pt-BR')
    })
}

export async function listBairros(): Promise<Bairro[]> {
  if (navigator.onLine && supabase) {
    const { data, error } = await supabase
      .from('bairros')
      .select('*')
      .order('distrito', { ascending: true })
      .order('nome', { ascending: true })
    if (!error && data) {
      const mapped = data.map(mapRow)
      if (mapped.length === 0) {
        try {
          await seedRemoteBairrosIfEmpty()
          const retry = await supabase
            .from('bairros')
            .select('*')
            .order('distrito', { ascending: true })
            .order('nome', { ascending: true })
          const seeded = (retry.data ?? []).map(mapRow)
          if (seeded.length > 0) {
            await cacheBairrosLocally(seeded)
            return seeded
          }
        } catch {
          /* seed remoto exige perfil admin */
        }
      } else {
        await cacheBairrosLocally(mapped)
        return mapped
      }
    }
  }
  return listLocalBairros()
}

export async function seedRemoteBairrosIfEmpty(): Promise<void> {
  if (!supabase) return
  const { count, error } = await supabase.from('bairros').select('id', { count: 'exact', head: true })
  if (error || (count ?? 0) > 0) return

  const payload = BAIRROS_ATIVOS_SEED.map((item) => ({
    nome: item.nome,
    distrito: item.distrito,
    ativo: true,
  }))
  const { error: insertError } = await supabase.from('bairros').insert(payload)
  if (insertError) throw new Error(insertError.message)
}

function isMissingBairrosTable(message: string): boolean {
  return /could not find the table ['"]public\.bairros['"]/i.test(message) || /schema cache/i.test(message)
}

async function createLocalBairro(nome: string, distrito: string): Promise<Bairro> {
  const local = await db.neighborhoods.toArray()
  const nextId = Math.max(0, ...local.map((item) => item.id)) + 1
  const neighborhood: Neighborhood = {
    id: nextId,
    name: nome,
    zone: distrito,
    remoteId: createId(),
    active: true,
  }
  await db.neighborhoods.put(neighborhood)
  return bairroFromNeighborhood(neighborhood)
}

export async function createBairro(values: BairroFormValues): Promise<Bairro> {
  const nome = values.nome.trim()
  const distrito = values.distrito.trim()
  if (!nome) throw new Error('Informe o nome do bairro.')
  if (!distrito) throw new Error('Selecione o distrito.')

  if (supabase && navigator.onLine) {
    const { data, error } = await supabase
      .from('bairros')
      .insert({ nome, distrito, ativo: true })
      .select('*')
      .single()
    if (!error && data) {
      const created = mapRow(data)
      await listBairros()
      return created
    }
    if (error && !isMissingBairrosTable(error.message)) {
      throw new Error(error.message)
    }
  }

  return createLocalBairro(nome, distrito)
}

export async function updateBairro(id: string, values: BairroFormValues): Promise<Bairro> {
  const nome = values.nome.trim()
  const distrito = values.distrito.trim()
  if (!nome) throw new Error('Informe o nome do bairro.')
  if (!distrito) throw new Error('Selecione o distrito.')

  if (supabase && navigator.onLine && isUuid(id)) {
    const { data, error } = await supabase
      .from('bairros')
      .update({ nome, distrito })
      .eq('id', id)
      .select('*')
      .single()
    if (!error && data) {
      const updated = mapRow(data)
      await listBairros()
      return updated
    }
    if (error && !isMissingBairrosTable(error.message)) {
      throw new Error(error.message)
    }
  }

  const local = await db.neighborhoods.toArray()
  const current = local.find((item) => item.remoteId === id || String(item.id) === id)
  if (!current) throw new Error('Bairro não encontrado neste aparelho.')
  const next = { ...current, name: nome, zone: distrito }
  await db.neighborhoods.put(next)
  return bairroFromNeighborhood(next)
}

export async function setBairroActive(id: string, ativo: boolean): Promise<void> {
  if (supabase && navigator.onLine && isUuid(id)) {
    const { error } = await supabase.from('bairros').update({ ativo }).eq('id', id)
    if (!error) {
      await listBairros()
      return
    }
    if (!isMissingBairrosTable(error.message)) {
      throw new Error(error.message)
    }
  }
  const local = await db.neighborhoods.toArray()
  const current = local.find((item) => item.remoteId === id || String(item.id) === id)
  if (!current) throw new Error('Bairro não encontrado neste aparelho.')
  await db.neighborhoods.update(current.id, { active: ativo })
}

export interface ApplyActiveBairrosResult {
  activated: number
  deactivated: number
  inserted: number
}

/**
 * Soft-disable: marca ativo=true só para a lista oficial; não apaga registros.
 * Insere oficiais ausentes e preserva nomes históricos inativos.
 */
export async function applyActiveBairrosCatalog(): Promise<ApplyActiveBairrosResult> {
  const current = await listBairros()
  let activated = 0
  let deactivated = 0
  let inserted = 0

  const matchedSeedNames = new Set<string>()
  const remoteUpdates: Array<{ id: string; ativo: boolean }> = []
  const localRows = await db.neighborhoods.toArray()
  const localByRemoteOrId = new Map<string, Neighborhood>()
  for (const item of localRows) {
    if (item.remoteId) localByRemoteOrId.set(item.remoteId, item)
    localByRemoteOrId.set(String(item.id), item)
  }
  const localUpdates: Array<{ id: number; active: boolean }> = []

  for (const bairro of current) {
    const seed = matchOfficialActiveBairro(bairro.nome, bairro.distrito)
    const shouldBeActive = seed != null
    if (seed) matchedSeedNames.add(seed.nome)
    if (bairro.ativo === shouldBeActive) continue

    if (shouldBeActive) activated += 1
    else deactivated += 1

    if (isUuid(bairro.id) && supabase && navigator.onLine) {
      remoteUpdates.push({ id: bairro.id, ativo: shouldBeActive })
    }

    const local = localByRemoteOrId.get(bairro.id)
    if (local) localUpdates.push({ id: local.id, active: shouldBeActive })
  }

  if (supabase && navigator.onLine && remoteUpdates.length > 0) {
    for (const update of remoteUpdates) {
      const { error } = await supabase.from('bairros').update({ ativo: update.ativo }).eq('id', update.id)
      if (error && !isMissingBairrosTable(error.message)) {
        throw new Error(error.message)
      }
    }
  }

  if (localUpdates.length > 0) {
    await db.transaction('rw', db.neighborhoods, async () => {
      for (const update of localUpdates) {
        await db.neighborhoods.update(update.id, { active: update.active })
      }
    })
  }

  for (const seed of BAIRROS_ATIVOS_SEED) {
    if (matchedSeedNames.has(seed.nome)) continue
    const already = current.some((item) => matchOfficialActiveBairro(item.nome, item.distrito)?.nome === seed.nome)
    if (already) continue
    await createBairro({ nome: seed.nome, distrito: seed.distrito })
    inserted += 1
  }

  await listBairros()
  return { activated, deactivated, inserted }
}

export function distritoOptions(existing: Bairro[] = []): string[] {
  const extra = existing.map((item) => item.distrito).filter((item) => item.trim().length > 0)
  return [...new Set([...BARRA_DO_PIRAI_DISTRITO_OPTIONS, ...extra])]
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
