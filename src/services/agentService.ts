import { supabase } from '@/lib/supabase'
import type { AppRole } from '@/types/domain'

export type AgentFormRole = 'agente' | 'admin'

export interface ManagedAgent {
  id: string
  fullName: string
  username: string | null
  registrationNumber: string | null
  email: string | null
  role: AppRole
  isActive: boolean
  protected: boolean
  updatedAt?: string
}

export interface AgentFormValues {
  fullName: string
  username: string
  registrationNumber: string
  password?: string
  role: AgentFormRole
}

type FunctionPayload = {
  ok?: boolean
  error?: string
  message?: string
  agents?: ManagedAgent[]
  agent?: ManagedAgent
  userId?: string
}

async function readFunctionError(error: unknown, data: unknown): Promise<string> {
  const payload = data as FunctionPayload | null
  if (payload?.error) return payload.error
  if (payload?.message) return payload.message

  const context =
    error && typeof error === 'object' && 'context' in error
      ? (error as { context?: Response }).context
      : undefined
  if (context && typeof context.json === 'function') {
    try {
      const body = (await context.json()) as FunctionPayload
      if (body?.error) return body.error
      if (body?.message) return body.message
    } catch {
      /* ignore */
    }
  }

  if (error instanceof Error && error.message) return error.message
  return 'Falha ao gerenciar agentes.'
}

async function invokeManageAgent(body: Record<string, unknown>): Promise<FunctionPayload> {
  if (!supabase) {
    throw new Error('Supabase não configurado.')
  }

  const { data, error } = await supabase.functions.invoke('create-agent', { body })
  const payload = (data ?? {}) as FunctionPayload
  if (error || payload.error) {
    throw new Error(await readFunctionError(error, data))
  }
  return payload
}

export async function listManagedAgents(): Promise<ManagedAgent[]> {
  const payload = await invokeManageAgent({ action: 'list' })
  return payload.agents ?? []
}

export async function createManagedAgent(values: AgentFormValues): Promise<ManagedAgent | null> {
  const payload = await invokeManageAgent({
    action: 'create',
    fullName: values.fullName.trim(),
    username: values.username.trim().toLowerCase(),
    registrationNumber: values.registrationNumber.trim().toUpperCase(),
    password: values.password,
    role: values.role,
  })
  return payload.agent ?? null
}

export async function updateManagedAgent(userId: string, values: AgentFormValues): Promise<void> {
  await invokeManageAgent({
    action: 'update',
    userId,
    fullName: values.fullName.trim(),
    username: values.username.trim().toLowerCase(),
    registrationNumber: values.registrationNumber.trim().toUpperCase(),
    password: values.password?.trim() ? values.password : undefined,
    role: values.role,
  })
}

export async function setManagedAgentActive(userId: string, active: boolean): Promise<void> {
  await invokeManageAgent({
    action: active ? 'activate' : 'deactivate',
    userId,
  })
}

export async function deleteManagedAgent(userId: string): Promise<void> {
  await invokeManageAgent({
    action: 'delete',
    userId,
  })
}

export function formRoleFromAppRole(role: AppRole): AgentFormRole {
  return role === 'admin' ? 'admin' : 'agente'
}
