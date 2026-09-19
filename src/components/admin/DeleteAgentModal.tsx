import { Button } from '@/components/ui/button'
import type { ManagedAgent } from '@/services/agentService'

interface DeleteAgentModalProps {
  open: boolean
  agent: ManagedAgent | null
  submitting: boolean
  error: string | null
  onClose: () => void
  onDeactivate: () => Promise<void>
  onDelete: () => Promise<void>
}

export function DeleteAgentModal({
  open,
  agent,
  submitting,
  error,
  onClose,
  onDeactivate,
  onDelete,
}: DeleteAgentModalProps) {
  if (!open || !agent) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-ink">Remover ou inativar acesso</h2>
        <p className="mt-2 text-sm text-muted">
          <span className="font-medium text-ink">{agent.fullName}</span>
          {agent.username ? ` (${agent.username})` : ''}. Escolha inativar o login ou excluir o cadastro.
        </p>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

        <div className="mt-5 space-y-2">
          <Button className="w-full" variant="secondary" disabled={submitting} onClick={() => void onDeactivate()}>
            {submitting ? 'Processando...' : 'Inativar acesso'}
          </Button>
          <Button className="w-full" variant="danger" disabled={submitting} onClick={() => void onDelete()}>
            Excluir cadastro
          </Button>
          <Button className="w-full" variant="ghost" disabled={submitting} onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
