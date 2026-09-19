import { Pencil, Plus, Search, Trash2, UserCheck, UserX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AgentFormModal } from '@/components/admin/AgentFormModal'
import { DeleteAgentModal } from '@/components/admin/DeleteAgentModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'
import { ROLE_SHORT_LABELS } from '@/lib/constants'
import {
  createManagedAgent,
  deleteManagedAgent,
  listManagedAgents,
  setManagedAgentActive,
  updateManagedAgent,
  type AgentFormValues,
  type ManagedAgent,
} from '@/services/agentService'

export function AgentesPage() {
  const { isAdmin, profile } = useAuth()
  const [agents, setAgents] = useState<ManagedAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<ManagedAgent | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    void loadAgents()
  }, [])

  async function loadAgents() {
    setLoading(true)
    try {
      setAgents(await listManagedAgents())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível listar os usuários.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return agents
    return agents.filter((agent) => {
      const haystack = `${agent.fullName} ${agent.username ?? ''} ${agent.registrationNumber ?? ''} ${agent.email ?? ''}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [agents, query])

  function openCreate() {
    setSelected(null)
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(agent: ManagedAgent) {
    setSelected(agent)
    setFormError(null)
    setFormOpen(true)
  }

  function openDelete(agent: ManagedAgent) {
    setSelected(agent)
    setDeleteError(null)
    setDeleteOpen(true)
  }

  async function handleSave(values: AgentFormValues) {
    if (!isAdmin) {
      setFormError('Apenas o administrador pode gerenciar usuários.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      if (selected) {
        await updateManagedAgent(selected.id, values)
        toast.success('Usuário atualizado.')
      } else {
        const created = await createManagedAgent(values)
        toast.success(`Agente ${created?.username ?? values.username} cadastrado.`)
      }
      setFormOpen(false)
      await loadAgents()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Falha ao salvar.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivate() {
    if (!selected) return
    setSubmitting(true)
    setDeleteError(null)
    try {
      await setManagedAgentActive(selected.id, false)
      toast.success('Acesso inativado.')
      setDeleteOpen(false)
      await loadAgents()
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Falha ao inativar.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!selected) return
    setSubmitting(true)
    setDeleteError(null)
    try {
      await deleteManagedAgent(selected.id)
      toast.success('Cadastro excluído.')
      setDeleteOpen(false)
      await loadAgents()
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Falha ao excluir.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleActivate(agent: ManagedAgent) {
    try {
      await setManagedAgentActive(agent.id, true)
      toast.success('Acesso reativado.')
      await loadAgents()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao reativar.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Gerenciar agentes</h1>
          <p className="text-sm text-muted">Cadastro, edição, inativação e exclusão de usuários.</p>
        </div>
        <Button size="sm" className="shrink-0" onClick={openCreate}>
          <Plus className="size-4" />
          Novo
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          className="pl-9"
          value={query}
          placeholder="Buscar por nome ou usuário"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {loading ? (
        <Card className="text-sm text-muted">Carregando usuários...</Card>
      ) : filtered.length === 0 ? (
        <Card className="text-sm text-muted">Nenhum usuário encontrado.</Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-white sm:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2 font-semibold">Nome completo</th>
                  <th className="px-3 py-2 font-semibold">Login</th>
                  <th className="px-3 py-2 font-semibold">Função</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((agent) => (
                  <tr key={agent.id} className="border-t border-line">
                    <td className="px-3 py-2 font-medium text-ink">{agent.fullName}</td>
                    <td className="px-3 py-2 text-muted">{agent.username ?? '—'}</td>
                    <td className="px-3 py-2">{ROLE_SHORT_LABELS[agent.role]}</td>
                    <td className="px-3 py-2">
                      <StatusBadge active={agent.isActive} />
                    </td>
                    <td className="px-3 py-2">
                      <AgentActions
                        agent={agent}
                        currentUserId={profile?.id}
                        onEdit={() => openEdit(agent)}
                        onDelete={() => openDelete(agent)}
                        onActivate={() => void handleActivate(agent)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 sm:hidden">
            {filtered.map((agent) => (
              <Card key={agent.id} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{agent.fullName}</p>
                    <p className="text-sm text-muted">
                      {agent.username ?? 'sem login'}
                      {agent.registrationNumber ? ` · ${agent.registrationNumber}` : ''}
                    </p>
                  </div>
                  <StatusBadge active={agent.isActive} />
                </div>
                <p className="text-sm text-muted">{ROLE_SHORT_LABELS[agent.role]}</p>
                <AgentActions
                  agent={agent}
                  currentUserId={profile?.id}
                  onEdit={() => openEdit(agent)}
                  onDelete={() => openDelete(agent)}
                  onActivate={() => void handleActivate(agent)}
                />
              </Card>
            ))}
          </div>
        </>
      )}

      <AgentFormModal
        open={formOpen}
        agent={formOpen ? selected : null}
        submitting={submitting}
        error={formError}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSave}
      />
      <DeleteAgentModal
        open={deleteOpen}
        agent={selected}
        submitting={submitting}
        error={deleteError}
        onClose={() => setDeleteOpen(false)}
        onDeactivate={handleDeactivate}
        onDelete={handleDelete}
      />
    </div>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge className={active ? 'bg-teal-50 text-ok' : 'bg-red-50 text-danger'}>
      {active ? 'Ativo' : 'Inativo'}
    </Badge>
  )
}

function AgentActions({
  agent,
  currentUserId,
  onEdit,
  onDelete,
  onActivate,
}: {
  agent: ManagedAgent
  currentUserId?: string
  onEdit: () => void
  onDelete: () => void
  onActivate: () => void
}) {
  const locked = agent.protected || agent.id === currentUserId

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button size="sm" variant="secondary" onClick={onEdit}>
        <Pencil className="size-3.5" />
        Editar
      </Button>
      {agent.isActive ? (
        <Button size="sm" variant="ghost" disabled={locked} onClick={onDelete}>
          <UserX className="size-3.5" />
          Inativar
        </Button>
      ) : (
        <Button size="sm" variant="ghost" disabled={locked} onClick={onActivate}>
          <UserCheck className="size-3.5" />
          Ativar
        </Button>
      )}
      <Button size="sm" variant="ghost" className="text-danger" disabled={locked} onClick={onDelete}>
        <Trash2 className="size-3.5" />
        Excluir
      </Button>
    </div>
  )
}

export { AgentesPage as AgentsAdminPage }
