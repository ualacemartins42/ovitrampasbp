import Dexie, { type EntityTable } from 'dexie'
import { BAIRROS_CATALOG_VERSION, BARRA_DO_PIRAI_BAIRROS } from '@/constants/bairros'
import { createId, nowIso } from '@/lib/utils'
import type { EducacaoSaudeRecord } from '@/types/educacao'
import type {
  CollectionRecord,
  CycleRecord,
  LabResult,
  LocalPhoto,
  Neighborhood,
  Profile,
  Property,
  SyncQueueItem,
  Trap,
  TrapType,
} from '@/types/domain'

interface MetaRow {
  key: string
  value: unknown
}

class OvitrampasDatabase extends Dexie {
  neighborhoods!: EntityTable<Neighborhood, 'id'>
  trapTypes!: EntityTable<TrapType, 'id'>
  properties!: EntityTable<Property, 'id'>
  traps!: EntityTable<Trap, 'id'>
  cycles!: EntityTable<CycleRecord, 'id'>
  educacaoSaude!: EntityTable<EducacaoSaudeRecord, 'id'>
  profiles!: EntityTable<Profile, 'id'>
  collections!: EntityTable<CollectionRecord, 'id'>
  labResults!: EntityTable<LabResult, 'id'>
  photos!: EntityTable<LocalPhoto, 'id'>
  syncQueue!: EntityTable<SyncQueueItem, 'id'>
  meta!: EntityTable<MetaRow, 'key'>

  constructor() {
    super('ovitrampasbp')
    this.version(1).stores({
      neighborhoods: 'id, name, zone',
      trapTypes: 'id, code',
      properties: 'id, neighborhoodId',
      traps: 'id, code, status',
      profiles: 'id, role',
      collections: 'id, clientId, agentId, occurredAt, syncStatus, paddleCode',
      labResults: 'id, collectionId, syncStatus',
      photos: 'id',
      syncQueue: 'id, type, status, createdAt, payloadId',
      meta: 'key',
    })
    this.version(2).stores({
      trapTypes: 'id, code, name',
    })
    this.version(3).stores({
      traps: 'id, code, status, neighborhoodId, syncStatus',
      cycles: 'id, trapCode, status, agentId, syncStatus, createdAt',
    })
    this.version(4).stores({
      neighborhoods: 'id, name, zone, remoteId, active',
    })
    this.version(5).stores({
      educacaoSaude: 'id, trapCode, agentId, syncStatus, actionDate, createdAt',
    })
    this.version(6)
      .stores({})
      .upgrade(async (tx) => {
        const cycles = (await tx.table('cycles').orderBy('createdAt').toArray()) as Array<
          CycleRecord & { estratoLiraa?: string | null }
        >
        const latestByTrap = new Map<string, { value: string; synced: boolean }>()
        for (const cycle of cycles) {
          const value = cycle.estratoLiraa?.trim()
          if (value) latestByTrap.set(cycle.trapCode, { value, synced: cycle.syncStatus === 'synced' })
        }

        const traps = tx.table('traps')
        const queue = tx.table('syncQueue')
        for (const [trapCode, { value, synced }] of latestByTrap) {
          const trap = (await traps.where('code').equals(trapCode).first()) as Trap | undefined
          if (!trap || trap.estratoLiraa?.trim()) continue
          await traps.update(trap.id, { estratoLiraa: value, ...(synced ? {} : { syncStatus: 'pending' }) })
          if (!synced) {
            await queue.add({
              id: createId(),
              type: 'trap',
              payloadId: String(trap.id),
              createdAt: nowIso(),
              attempts: 0,
              lastError: null,
              status: 'pending',
            })
          }
        }

        await tx
          .table('cycles')
          .toCollection()
          .modify((cycle: Record<string, unknown>) => {
            delete cycle.estratoLiraa
          })
      })
    this.version(7)
      .stores({
        educacaoSaude: 'id, kind, trapCode, agentId, syncStatus, actionDate, createdAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('educacaoSaude')
          .toCollection()
          .modify((record: EducacaoSaudeRecord) => {
            if (!record.kind) record.kind = record.eggCount != null ? 'contagem' : 'educacao'
          })
      })
  }
}

export const db = new OvitrampasDatabase()

export async function enqueueSync(item: Omit<SyncQueueItem, 'attempts' | 'lastError' | 'status'>): Promise<void> {
  const existing = await db.syncQueue.where('payloadId').equals(item.payloadId).and((row) => row.type === item.type).first()
  if (existing) {
    await db.syncQueue.update(existing.id, {
      createdAt: item.createdAt,
      ...(item.actorId ? { actorId: item.actorId } : {}),
      status: 'pending',
      lastError: null,
    })
    return
  }

  await db.syncQueue.add({
    ...item,
    attempts: 0,
    lastError: null,
    status: 'pending',
  })
}

export async function pendingSyncCount(): Promise<number> {
  return db.syncQueue.count()
}

export async function seedOfficialNeighborhoods(): Promise<void> {
  await db.transaction('rw', db.neighborhoods, db.meta, async () => {
    await db.neighborhoods.clear()
    await db.neighborhoods.bulkPut(BARRA_DO_PIRAI_BAIRROS)
    await db.meta.put({ key: 'neighborhoodsCatalogVersion', value: BAIRROS_CATALOG_VERSION })
  })
}

const DEFAULT_TRAP_TYPES: TrapType[] = [
  {
    id: 1,
    code: 'OVITRAMPA',
    name: 'Ovitrampa padrão',
    description: 'Armadilha de ovos com palheta para Aedes spp.',
  },
  {
    id: 2,
    code: 'OVITRAMPA_MOD',
    name: 'Ovitrampa modificada',
    description: 'Variação com cobertura e palheta identificada.',
  },
]

export async function seedReferenceDataIfEmpty(): Promise<void> {
  const count = await db.neighborhoods.count()
  if (count === 0) {
    await seedOfficialNeighborhoods()
  }

  await db.transaction('rw', db.trapTypes, async () => {
    if ((await db.trapTypes.count()) === 0) {
      await db.trapTypes.bulkPut(DEFAULT_TRAP_TYPES)
    }
  })
}
