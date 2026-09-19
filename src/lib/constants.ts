export type { AppRole } from '@/types/domain'
import type {
  AppRole,
  CollectionKind,
  CycleSituation,
  CycleStatus,
  MosquitoSpecies,
  TrapAreaType,
  TrapStatus,
} from '@/types/domain'

export const ROLE_LABELS: Record<AppRole, string> = {
  ace: 'Agente de Combate às Endemias',
  lab: 'Laboratório',
  supervisor: 'Supervisor',
  admin: 'Administrador',
}

export const ROLE_SHORT_LABELS: Record<AppRole, string> = {
  ace: 'Agente',
  lab: 'Lab',
  supervisor: 'Supervisor',
  admin: 'Admin',
}

export const TRAP_STATUS_LABELS: Record<TrapStatus, string> = {
  instalada: 'Instalada',
  recolhida: 'Recolhida',
  danificada: 'Danificada',
  perdida: 'Perdida',
  sem_alteracao: 'Sem alteração',
}

export const COLLECTION_KIND_LABELS: Record<CollectionKind, string> = {
  instalacao: 'Instalação',
  vistoria: 'Vistoria / troca de palheta',
  recolhimento: 'Retirada / recolhimento',
}

export const TRAP_AREA_LABELS: Record<TrapAreaType, string> = {
  urbana: 'Urbana',
  periurbana: 'Periurbana',
  rural: 'Rural',
}

export const CYCLE_STATUS_LABELS: Record<CycleStatus, string> = {
  instalada: 'Instalada',
  trocada: 'Trocada',
  finalizada: 'Finalizada',
}

export const CYCLE_STATUS_ACTION: Record<Exclude<CycleStatus, 'finalizada'>, string> = {
  instalada: 'Aguardando troca',
  trocada: 'Aguardando retirada',
}

export const CYCLE_SITUATION_LABELS: Record<CycleSituation, string> = {
  normal: 'Normal (com água)',
  seca: 'Seca',
  ausente: 'Ausente/Perdida',
  danificada: 'Danificada',
}

export const BARRA_DO_PIRAI_CENTER: [number, number] = [-22.4701, -43.8581]

export const SPECIES_LABELS: Record<MosquitoSpecies, string> = {
  aedes_aegypti: 'Aedes aegypti',
  aedes_albopictus: 'Aedes albopictus',
  culex: 'Culex spp.',
  outro: 'Outra espécie',
  nao_identificado: 'Não identificado',
}

export const STAFF_ROLES: AppRole[] = ['lab', 'supervisor', 'admin']

export function isStaffRole(role: AppRole | null | undefined): boolean {
  return !!role && STAFF_ROLES.includes(role)
}

export const ADMIN_EMAIL = 'ovitrampasbp@gmail.com'

export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === ADMIN_EMAIL
}

export const DEMO_AGENT_ID = '00000000-0000-4000-a000-000000000001'
