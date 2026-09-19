import { BARRA_DO_PIRAI_BAIRROS, BARRA_DO_PIRAI_DISTRITO_OPTIONS } from '@/constants/bairros'
import { db } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { createId, nowIso } from '@/lib/utils'
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

export async function cacheBairrosLocally(bairros: Bairro[]): Promise<Neighborhood[]> {
  const local = await db.neighborhoods.toArray()
  const byRemote = new Map(local.filter((item) => item.remoteId).map((item) => [item.remoteId as string, item]))
  const byName = new Map(local.map((item) => [`${item.name.trim().toLowerCase()}|${item.zone.trim().toLowerCase()}`, item]))
  let nextId = Math.max(0, ...local.map((item) => item.id), ...BARRA_DO_PIRAI_BAIRROS.map((item) => item.id)) + 1

  const rows: Neighborhood[] = bairros.map((bairro) => {
    const key = `${bairro.nome.trim().toLowerCase()}|${bairro.distrito.trim().toLowerCase()}`
    const existing = byRemote.get(bairro.id) ?? byName.get(key)
    const id = existing?.id ?? nextId++
    return neighborhoodFromBairro(bairro, id)
  })

  await db.transaction('rw', db.neighborhoods, db.meta, async () => {
    await db.neighborhoods.clear()
    if (rows.length > 0) {
      await db.neighborhoods.bulkPut(rows)
    }
    await db.meta.put({ key: 'neighborhoodsCatalogVersion', value: 2 })
    await db.meta.put({ key: 'bairrosPulledAt', value: nowIso() })
  })

  return rows
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

  const payload = BARRA_DO_PIRAI_BAIRROS.map((item) => ({
    nome: item.name,
    distrito: item.zone,
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

export async function deleteBairro(id: string): Promise<void> {
  if (supabase && navigator.onLine && isUuid(id)) {
    const { error } = await supabase.from('bairros').delete().eq('id', id)
    if (error && !isMissingBairrosTable(error.message)) {
      throw new Error(error.message)
    }
    if (!error) {
      await listBairros()
      return
    }
  }
  const local = await db.neighborhoods.toArray()
  const current = local.find((item) => item.remoteId === id || String(item.id) === id)
  if (!current) throw new Error('Bairro não encontrado neste aparelho.')
  await db.neighborhoods.delete(current.id)
}

export function distritoOptions(existing: Bairro[] = []): string[] {
  const extra = existing.map((item) => item.distrito).filter((item) => item.trim().length > 0)
  return [...new Set([...BARRA_DO_PIRAI_DISTRITO_OPTIONS, ...extra])]
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
