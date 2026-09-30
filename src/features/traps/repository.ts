import { db, enqueueSync } from '@/lib/db'
import { createId, nowIso, parseOptionalCoordinate } from '@/lib/utils'
import type { Trap, TrapAreaType, TrapStatus } from '@/types/domain'

export interface TrapFormValues {
  code: string
  neighborhoodId: string
  district: string
  street: string
  number: string
  complement: string
  locationDetail: string
  responsible: string
  block: string
  areaType: TrapAreaType
  estratoLiraa: string
  latitude: string
  longitude: string
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

async function nextTrapId(preferred?: number): Promise<number> {
  if (preferred && preferred > 0 && !(await db.traps.get(preferred))) {
    return preferred
  }
  return ((await db.traps.orderBy('id').last())?.id ?? 1000) + 1
}

export function mapTrapDefaults(row: Partial<Trap> = {}): Trap {
  return {
    id: row.id ?? 0,
    code: row.code ?? '',
    qrCode: row.qrCode ?? row.code ?? null,
    trapTypeId: row.trapTypeId ?? 1,
    propertyId: row.propertyId ?? null,
    status: row.status ?? 'instalada',
    installedAt: row.installedAt ?? null,
    neighborhoodId: row.neighborhoodId ?? null,
    district: row.district ?? null,
    street: row.street ?? null,
    number: row.number ?? null,
    complement: row.complement ?? null,
    locationDetail: row.locationDetail ?? null,
    responsible: row.responsible ?? null,
    block: row.block ?? null,
    areaType: row.areaType ?? null,
    estratoLiraa: row.estratoLiraa ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    syncStatus: row.syncStatus ?? 'pending',
    deletedAt: row.deletedAt ?? null,
  }
}

export async function saveTrap(values: TrapFormValues, existing?: Trap | null): Promise<Trap> {
  const code = values.code.trim()
  if (!code) {
    throw new Error('Informe o número de identificação da ovitrampa.')
  }

  const duplicate = await db.traps.where('code').equals(code).first()
  if (duplicate && duplicate.id !== existing?.id && !duplicate.deletedAt) {
    throw new Error('Já existe uma ovitrampa com este número.')
  }

  const numericCode = Number.parseInt(code, 10)
  const id = existing?.id ?? (await nextTrapId(Number.isFinite(numericCode) ? numericCode : undefined))
  const neighborhoodId = values.neighborhoodId ? Number(values.neighborhoodId) : null

  const trap = mapTrapDefaults({
    ...existing,
    id,
    code,
    qrCode: code,
    neighborhoodId,
    district: emptyToNull(values.district),
    street: emptyToNull(values.street),
    number: emptyToNull(values.number),
    complement: emptyToNull(values.complement),
    locationDetail: emptyToNull(values.locationDetail),
    responsible: emptyToNull(values.responsible),
    block: emptyToNull(values.block),
    areaType: values.areaType,
    estratoLiraa: emptyToNull(values.estratoLiraa),
    latitude: parseOptionalCoordinate(values.latitude, 'latitude'),
    longitude: parseOptionalCoordinate(values.longitude, 'longitude'),
    status: existing?.status ?? 'instalada',
    syncStatus: 'pending',
    deletedAt: null,
  })

  await db.traps.put(trap)

  if (neighborhoodId && trap.street) {
    const propertyId = existing?.propertyId ?? ((await db.properties.orderBy('id').last())?.id ?? 5000) + 1
    await db.properties.put({
      id: existing?.propertyId ?? propertyId,
      street: trap.street,
      number: trap.number,
      neighborhoodId,
      complement: trap.complement,
      referencePoint: trap.locationDetail,
      latitude: trap.latitude,
      longitude: trap.longitude,
    })
    if (!existing?.propertyId) {
      await db.traps.update(trap.id, { propertyId })
      trap.propertyId = propertyId
    }
  }

  await enqueueSync({
    id: createId(),
    type: 'trap',
    payloadId: String(trap.id),
    createdAt: nowIso(),
  })

  return trap
}

export async function deleteTrap(trap: Trap): Promise<void> {
  await db.traps.update(trap.id, {
    deletedAt: nowIso(),
    syncStatus: 'pending',
  })
  await enqueueSync({
    id: createId(),
    type: 'trap',
    payloadId: String(trap.id),
    createdAt: nowIso(),
  })
}

export async function activeTraps(): Promise<Trap[]> {
  const rows = await db.traps.orderBy('code').toArray()
  return rows.filter((item) => !item.deletedAt)
}

export function situationToTrapStatus(situation: string | null | undefined): TrapStatus {
  if (situation === '2' || situation === '4' || situation === 'ausente') return 'perdida'
  if (situation === '3' || situation === 'danificada') return 'danificada'
  if (situation === '5' || situation === 'seca') return 'sem_alteracao'
  return 'instalada'
}
