import Dexie, { type EntityTable } from 'dexie'
import type {
  CollectionRecord,
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
  }
}

export const db = new OvitrampasDatabase()

export async function enqueueSync(item: Omit<SyncQueueItem, 'attempts' | 'lastError' | 'status'>): Promise<void> {
  const existing = await db.syncQueue.where('payloadId').equals(item.payloadId).and((row) => row.type === item.type).first()
  if (existing) {
    await db.syncQueue.update(existing.id, {
      createdAt: item.createdAt,
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

const DEFAULT_NEIGHBORHOODS: Neighborhood[] = [
  { id: 1, name: 'Centro', zone: 'Zona Central' },
  { id: 2, name: 'Caimbé', zone: 'Zona Oeste' },
  { id: 3, name: '13 de Setembro', zone: 'Zona Sul' },
  { id: 4, name: 'Liberdade', zone: 'Zona Norte' },
  { id: 5, name: 'Asa Branca', zone: 'Zona Leste' },
  { id: 6, name: 'São Vicente', zone: 'Zona Oeste' },
  { id: 7, name: 'Mecejana', zone: 'Zona Oeste' },
  { id: 8, name: 'Pricumã', zone: 'Zona Norte' },
]

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
  await db.transaction('rw', db.neighborhoods, db.trapTypes, async () => {
    if ((await db.neighborhoods.count()) === 0) {
      await db.neighborhoods.bulkPut(DEFAULT_NEIGHBORHOODS)
    }
    if ((await db.trapTypes.count()) === 0) {
      await db.trapTypes.bulkPut(DEFAULT_TRAP_TYPES)
    }
  })
}
