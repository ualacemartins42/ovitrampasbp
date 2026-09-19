import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { PasswordInput } from '@/components/ui/password-input'
import type { AgentFormRole, AgentFormValues, ManagedAgent } from '@/services/agentService'
import { formRoleFromAppRole } from '@/services/agentService'
import { generateUsername, toInternalEmail } from '@/utils/formatUsername'

interface AgentFormModalProps {
  open: boolean
  agent: ManagedAgent | null
  submitting: boolean
  error: string | null
  onClose: () => void
  onSubmit: (values: AgentFormValues) => Promise<void>
}

export function AgentFormModal({ open, agent, submitting, error, onClose, onSubmit }: AgentFormModalProps) {
  const editing = Boolean(agent)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<AgentFormRole>('agente')

  useEffect(() => {
    if (!open) return
    setFullName(agent?.fullName ?? '')
    setUsername(agent?.username ?? '')
    setUsernameTouched(Boolean(agent))
    setRegistrationNumber(agent?.registrationNumber ?? '')
    setPassword('')
    setRole(agent ? formRoleFromAppRole(agent.role) : 'agente')
  }, [open, agent])

  if (!open) return null

  function onFullNameChange(value: string) {
    setFullName(value)
    if (!usernameTouched) {
      setUsername(generateUsername(value))
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await onSubmit({
      fullName,
      username,
      registrationNumber,
      password: password || undefined,
      role,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={onClose}>
      <form
        className="max-h-[90svh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <h2 className="text-lg font-semibold text-ink">{editing ? 'Editar usuário' : 'Novo agente'}</h2>
        <p className="mt-1 text-sm text-muted">
          Login no padrão <code>primeiro.ultimo</code>, convertido para e-mail interno.
        </p>

        <div className="mt-4 space-y-3">
          <Field label="Nome Completo">
            <Input
              value={fullName}
              placeholder="Harranuza de Oliveira Assis"
              onChange={(event) => onFullNameChange(event.target.value)}
              required
            />
          </Field>
          <Field label="Login / Usuário">
            <Input
              value={username}
              placeholder="harranuza.assis"
              onChange={(event) => {
                setUsernameTouched(true)
                setUsername(event.target.value.toLowerCase())
              }}
              required
            />
          </Field>
          {username ? <p className="text-xs text-muted">E-mail interno: {toInternalEmail(username)}</p> : null}
          <Field label="Matrícula">
            <Input
              value={registrationNumber}
              placeholder="MAT-12345"
              onChange={(event) => setRegistrationNumber(event.target.value.toUpperCase())}
              required
            />
          </Field>
          <Field label={editing ? 'Redefinir senha (opcional)' : 'Senha inicial'}>
            <PasswordInput
              autoComplete="new-password"
              value={password}
              minLength={editing ? undefined : 8}
              required={!editing}
              placeholder={editing ? 'Deixe em branco para manter' : 'Mínimo 8 caracteres'}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <Field label="Perfil / Role">
            <Select value={role} onChange={(event) => setRole(event.target.value as AgentFormRole)}>
              <option value="agente">Agente</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>

        <div className="mt-5 flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
