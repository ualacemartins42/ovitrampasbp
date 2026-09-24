import { Pencil, Plus, Search, MapPinned, UserCheck, UserX, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { BairroModal } from '@/components/admin/BairroModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/field'
import { formatNeighborhoodLabel, districtGroupLabel, BAIRROS_ATIVOS_OFICIAIS } from '@/constants/bairros'
import { useAuth } from '@/features/auth/auth-context'
import { foldSearchText } from '@/lib/utils'
import {
  applyActiveBairrosCatalog,
  createBairro,
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
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [selected, setSelected] = useState<Bairro | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)

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
    const term = foldSearchText(query)
    const source = term
      ? bairros.filter((item) => {
          const nome = foldSearchText(item.nome)
          const distrito = foldSearchText(item.distrito)
          return nome.includes(term) || distrito.includes(term)
        })
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

  const activeCount = bairros.filter((item) => item.ativo).length
  const inactiveCount = bairros.length - activeCount

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

  function openDeactivate(bairro: Bairro) {
    setSelected(bairro)
    setDeactivateError(null)
    setDeactivateOpen(true)
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
    setDeactivateError(null)
    try {
      await setBairroActive(selected.id, false)
      toast.success('Bairro inativado. O histórico de coletas anteriores é preservado.')
      setDeactivateOpen(false)
      await loadBairros()
    } catch (error) {
      setDeactivateError(error instanceof Error ? error.message : 'Falha ao inativar.')
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

  async function handleApplyOfficialList() {
    if (!isAdmin) return
    setSubmitting(true)
    try {
      const result = await applyActiveBairrosCatalog()
      toast.success(
        `Lista oficial aplicada: ${result.activated} ativados, ${result.deactivated} inativados, ${result.inserted} inseridos. Nenhum registro foi apagado.`,
      )
      await loadBairros()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao aplicar lista oficial.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Gerenciar bairros</h1>
          <p className="text-sm text-muted">
            Soft-disable: {activeCount} ativos · {inactiveCount} inativos · lista oficial com {BAIRROS_ATIVOS_OFICIAIS.length}{' '}
            bairros.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Button size="sm" variant="secondary" disabled={!isAdmin || submitting} onClick={() => void handleApplyOfficialList()}>
            <RefreshCw className="size-4" />
            Aplicar lista oficial
          </Button>
          <Button size="sm" className="shrink-0" onClick={openCreate} disabled={!isAdmin}>
            <Plus className="size-4" />
            Novo
          </Button>
        </div>
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
                    <Button size="sm" variant="ghost" disabled={!isAdmin} onClick={() => openDeactivate(bairro)}>
                      <UserX className="size-3.5" />
                      Inativar
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" disabled={!isAdmin} onClick={() => void handleActivate(bairro)}>
                      <UserCheck className="size-3.5" />
                      Ativar
                    </Button>
                  )}
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

      {deactivateOpen && selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={() => setDeactivateOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-ink">Inativar bairro</h2>
            <p className="mt-2 text-sm text-muted">
              <span className="font-medium text-ink">{selected.nome}</span> · {selected.distrito}. O cadastro permanece no
              banco para preservar coletas e ovitrampas já registradas; apenas deixa de aparecer nos formulários.
            </p>
            {deactivateError ? <p className="mt-3 text-sm text-danger">{deactivateError}</p> : null}
            <div className="mt-5 space-y-2">
              <Button className="w-full" variant="secondary" disabled={submitting} onClick={() => void handleDeactivate()}>
                {submitting ? 'Processando...' : 'Inativar bairro'}
              </Button>
              <Button className="w-full" variant="ghost" disabled={submitting} onClick={() => setDeactivateOpen(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
