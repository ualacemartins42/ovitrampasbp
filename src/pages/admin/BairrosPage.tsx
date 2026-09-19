import { Pencil, Plus, Search, Trash2, MapPinned, UserCheck, UserX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { BairroModal } from '@/components/admin/BairroModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/field'
import { formatNeighborhoodLabel, districtGroupLabel } from '@/constants/bairros'
import { useAuth } from '@/features/auth/auth-context'
import {
  createBairro,
  deleteBairro,
  listBairros,
  setBairroActive,
  updateBairro,
} from '@/services/bairroService'
import type { Bairro } from '@/types/domain'

export function BairrosPage() {
  const { isAdmin } = useAuth()
  const [bairros, setBairros] = useState<Bairro[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<Bairro | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    void loadBairros()
  }, [])

  async function loadBairros() {
    setLoading(true)
    try {
      setBairros(await listBairros())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível listar os bairros.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    const source = term
      ? bairros.filter((item) => `${item.nome} ${item.distrito}`.toLowerCase().includes(term))
      : bairros

    const groups = new Map<string, Bairro[]>()
    const order: string[] = []
    const sorted = [...source].sort((left, right) => {
      const byDistrict = left.distrito.localeCompare(right.distrito, 'pt-BR')
      if (byDistrict !== 0) return byDistrict
      return left.nome.localeCompare(right.nome, 'pt-BR')
    })
    for (const item of sorted) {
      const label = districtGroupLabel(item.distrito)
      if (!groups.has(label)) {
        groups.set(label, [])
        order.push(label)
      }
      groups.get(label)?.push(item)
    }
    return order.map((label) => ({ label, items: groups.get(label) ?? [] }))
  }, [bairros, query])

  function openCreate() {
    setSelected(null)
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(bairro: Bairro) {
    setSelected(bairro)
    setFormError(null)
    setFormOpen(true)
  }

  function openDelete(bairro: Bairro) {
    setSelected(bairro)
    setDeleteError(null)
    setDeleteOpen(true)
  }

  async function handleSave(values: { nome: string; distrito: string }) {
    if (!isAdmin) {
      setFormError('Apenas o administrador pode gerenciar bairros.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      if (selected) {
        await updateBairro(selected.id, values)
        toast.success('Bairro atualizado.')
      } else {
        await createBairro(values)
        toast.success('Bairro cadastrado.')
      }
      setFormOpen(false)
      await loadBairros()
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
      await setBairroActive(selected.id, false)
      toast.success('Bairro inativado. O histórico de coletas anteriores é preservado.')
      setDeleteOpen(false)
      await loadBairros()
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Falha ao inativar.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleActivate(bairro: Bairro) {
    try {
      await setBairroActive(bairro.id, true)
      toast.success('Bairro reativado.')
      await loadBairros()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao reativar.')
    }
  }

  async function handleDelete() {
    if (!selected) return
    setSubmitting(true)
    setDeleteError(null)
    try {
      await deleteBairro(selected.id)
      toast.success('Bairro excluído.')
      setDeleteOpen(false)
      await loadBairros()
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Não foi possível excluir. Inative para preservar o histórico.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Gerenciar bairros</h1>
          <p className="text-sm text-muted">Cadastro de bairros e distritos de Barra do Piraí.</p>
        </div>
        <Button size="sm" className="shrink-0" onClick={openCreate} disabled={!isAdmin}>
          <Plus className="size-4" />
          Novo
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <Input
          className="pl-9"
          value={query}
          placeholder="Buscar por bairro ou distrito"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {loading ? (
        <Card className="text-sm text-muted">Carregando bairros...</Card>
      ) : filtered.length === 0 ? (
        <Card className="text-sm text-muted">Nenhum bairro encontrado.</Card>
      ) : (
        filtered.map((group) => (
          <section key={group.label} className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-primary">
              <MapPinned className="size-4" />
              {group.label}
            </h2>
            {group.items.map((bairro) => (
              <Card key={bairro.id} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{bairro.nome}</p>
                    <p className="text-xs text-muted">{formatNeighborhoodLabel({ name: bairro.nome, zone: bairro.distrito })}</p>
                  </div>
                  <Badge className={bairro.ativo ? 'bg-teal-50 text-ok' : 'bg-red-50 text-danger'}>
                    {bairro.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="secondary" disabled={!isAdmin} onClick={() => openEdit(bairro)}>
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                  {bairro.ativo ? (
                    <Button size="sm" variant="ghost" disabled={!isAdmin} onClick={() => openDelete(bairro)}>
                      <UserX className="size-3.5" />
                      Inativar
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" disabled={!isAdmin} onClick={() => void handleActivate(bairro)}>
                      <UserCheck className="size-3.5" />
                      Ativar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    disabled={!isAdmin}
                    onClick={() => openDelete(bairro)}
                  >
                    <Trash2 className="size-3.5" />
                    Excluir
                  </Button>
                </div>
              </Card>
            ))}
          </section>
        ))
      )}

      <BairroModal
        open={formOpen}
        bairro={formOpen ? selected : null}
        existing={bairros}
        submitting={submitting}
        error={formError}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSave}
      />

      {deleteOpen && selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={() => setDeleteOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-ink">Remover ou inativar bairro</h2>
            <p className="mt-2 text-sm text-muted">
              <span className="font-medium text-ink">{selected.nome}</span> · {selected.distrito}. Inativar preserva
              coletas e armadilhas já registradas.
            </p>
            {deleteError ? <p className="mt-3 text-sm text-danger">{deleteError}</p> : null}
            <div className="mt-5 space-y-2">
              <Button className="w-full" variant="secondary" disabled={submitting} onClick={() => void handleDeactivate()}>
                {submitting ? 'Processando...' : 'Inativar bairro'}
              </Button>
              <Button className="w-full" variant="danger" disabled={submitting} onClick={() => void handleDelete()}>
                Excluir cadastro
              </Button>
              <Button className="w-full" variant="ghost" disabled={submitting} onClick={() => setDeleteOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
