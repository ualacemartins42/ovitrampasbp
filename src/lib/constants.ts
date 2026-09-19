export type { AppRole } from '@/types/domain'
import type { AppRole, CollectionKind, MosquitoSpecies, TrapStatus } from '@/types/domain'

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
  vistoria: 'Vistoria',
  recolhimento: 'Recolhimento de palheta',
}

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
