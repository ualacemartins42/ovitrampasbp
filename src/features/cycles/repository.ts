import { saveCollection } from '@/features/collections/repository'
import { situationToTrapStatus } from '@/features/traps/repository'
import { db, enqueueSync } from '@/lib/db'
import { epidemiologicalWeek } from '@/lib/epiWeek'
import { createId, dateInputToIso, nowIso, parseDateInput, toDateTimeLocalValue } from '@/lib/utils'
import type {
  CollectionKind,
  CycleRecord,
  CycleSituation,
  Profile,
  Trap,
  TrapStatus,
} from '@/types/domain'

export interface CycleFormValues {
  trapCode: string
  neighborhoodName: string
  installDate: string
  installObs: string
  swapDate: string
  swapSituation: CycleSituation | ''
  swapObs: string
  removeSituation: CycleSituation | ''
  removeObs: string
}

function occurredFromDateInput(value: string | undefined): { iso: string; week: number | null } {
  const parsed = value ? parseDateInput(value) : null
  if (value && !parsed) {
    throw new Error('Informe uma data válida.')
  }
  const iso = parsed ? dateInputToIso(value) : new Date().toISOString()
  const date = parsed ?? new Date()
  return { iso, week: epidemiologicalWeek(date) }
}

export async function activeCycles(): Promise<CycleRecord[]> {
  const rows = await db.cycles.orderBy('createdAt').reverse().toArray()
  return rows.filter((item) => item.status !== 'finalizada')
}

export async function cycleForTrap(trapCode: string): Promise<CycleRecord | undefined> {
  const rows = await db.cycles.where('trapCode').equals(trapCode).toArray()
  return rows.find((item) => item.status !== 'finalizada')
}

export async function saveCycleStage(
  profile: Profile,
  trap: Trap | undefined,
  existing: CycleRecord | null,
  values: CycleFormValues,
): Promise<CycleRecord> {
  const trapCode = values.trapCode.trim()
  if (!trapCode) {
    throw new Error('Escolha a armadilha.')
  }

  let cycle = existing
  let kind: CollectionKind = 'instalacao'
  let trapStatus: TrapStatus = 'instalada'
  let occurredAt = new Date().toISOString()
  let week: number | null = epidemiologicalWeek(new Date())

  if (!cycle) {
    const open = await cycleForTrap(trapCode)
    if (open) {
      throw new Error('Esta ovitrampa já tem um ciclo em andamento.')
    }
    ;({ iso: occurredAt, week } = occurredFromDateInput(values.installDate))
    cycle = {
      id: createId(),
      trapCode,
      trapId: trap?.id ?? null,
      neighborhoodName: values.neighborhoodName.trim() || null,
      status: 'instalada',
      installAt: occurredAt,
      installEpiWeek: week,
      installObs: values.installObs.trim() || null,
      swapAt: null,
      swapEpiWeek: null,
      swapSituation: null,
      swapObs: null,
      removeAt: null,
      removeEpiWeek: null,
      removeSituation: null,
      removeObs: null,
      agentId: profile.id,
      syncStatus: 'pending',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
  } else if (cycle.status === 'instalada') {
    kind = 'vistoria'
    trapStatus = situationToTrapStatus(values.swapSituation)
    const installOccurred = occurredFromDateInput(values.installDate)
    ;({ iso: occurredAt, week } = occurredFromDateInput(values.swapDate))
    cycle = {
      ...cycle,
      status: 'trocada',
      installAt: installOccurred.iso,
      installEpiWeek: installOccurred.week,
      swapAt: occurredAt,
      swapEpiWeek: week,
      swapSituation: values.swapSituation || null,
      swapObs: values.swapObs.trim() || null,
      neighborhoodName: values.neighborhoodName.trim() || cycle.neighborhoodName,
      agentId: profile.id,
      syncStatus: 'pending',
      updatedAt: nowIso(),
    }
  } else if (cycle.status === 'trocada') {
    kind = 'recolhimento'
    trapStatus = values.removeSituation === 'normal' ? 'recolhida' : situationToTrapStatus(values.removeSituation)
    cycle = {
      ...cycle,
      status: 'finalizada',
      removeAt: occurredAt,
      removeEpiWeek: week,
      removeSituation: values.removeSituation || null,
      removeObs: values.removeObs.trim() || null,
      neighborhoodName: values.neighborhoodName.trim() || cycle.neighborhoodName,
      agentId: profile.id,
      syncStatus: 'pending',
      updatedAt: nowIso(),
    }
  } else {
    throw new Error('Este ciclo já foi finalizado.')
  }

  await db.cycles.put(cycle)

  if (trap) {
    await db.traps.update(trap.id, {
      status: trapStatus,
      installedAt: kind === 'instalacao' ? occurredAt : trap.installedAt,
      syncStatus: 'pending',
    })
    await enqueueSync({
      id: createId(),
      type: 'trap',
      payloadId: String(trap.id),
      createdAt: nowIso(),
    })
  }

  await enqueueSync({
    id: createId(),
    type: 'cycle',
    payloadId: cycle.id,
    createdAt: nowIso(),
  })

  const obs =
    kind === 'instalacao'
      ? values.installObs
      : kind === 'vistoria'
        ? values.swapObs
        : values.removeObs

  await saveCollection(
    profile,
    {
      kind,
      trapCode,
      trapTypeId: String(trap?.trapTypeId ?? 1),
      street: trap?.street ?? '',
      number: trap?.number ?? '',
      neighborhoodId: trap?.neighborhoodId ? String(trap.neighborhoodId) : '',
      complement: trap?.complement ?? '',
      referencePoint: trap?.locationDetail ?? '',
      latitude: trap?.latitude != null ? String(trap.latitude) : '',
      longitude: trap?.longitude != null ? String(trap.longitude) : '',
      occurredAt: toDateTimeLocalValue(occurredAt),
      trapStatus,
      paddleCode: '',
      estimatedEggs: '',
      observations: obs,
    },
    null,
  )

  return cycle
}

export async function deleteCycle(cycle: CycleRecord): Promise<void> {
  await db.cycles.delete(cycle.id)
  await enqueueSync({
    id: createId(),
    type: 'cycle',
    payloadId: cycle.id,
    createdAt: nowIso(),
  })
}

