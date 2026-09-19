import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import type { Bairro } from '@/types/domain'
import { distritoOptions, type BairroFormValues } from '@/services/bairroService'

interface BairroModalProps {
  open: boolean
  bairro: Bairro | null
  existing: Bairro[]
  submitting: boolean
  error: string | null
  onClose: () => void
  onSubmit: (values: BairroFormValues) => Promise<void>
}

export function BairroModal({
  open,
  bairro,
  existing,
  submitting,
  error,
  onClose,
  onSubmit,
}: BairroModalProps) {
  const editing = Boolean(bairro)
  const [nome, setNome] = useState('')
  const [distrito, setDistrito] = useState('')
  const options = useMemo(() => distritoOptions(existing), [existing])

  useEffect(() => {
    if (!open) return
    setNome(bairro?.nome ?? '')
    setDistrito(bairro?.distrito || options[0] || '')
  }, [open, bairro, options])

  if (!open) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    await onSubmit({ nome, distrito })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={onClose}>
      <form
        className="max-h-[90svh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <h2 className="text-lg font-semibold text-ink">{editing ? 'Editar bairro' : 'Novo bairro'}</h2>
        <p className="mt-1 text-sm text-muted">
          O cadastro vale para os formulários de campo e fica disponível offline após a sincronização.
        </p>

        <div className="mt-4 space-y-3">
          <Field label="Nome do bairro / localidade">
            <Input
              value={nome}
              placeholder="Chácara Farani"
              onChange={(event) => setNome(event.target.value)}
              required
            />
          </Field>
          <Field label="Distrito">
            <Select value={distrito} onChange={(event) => setDistrito(event.target.value)} required>
              {options.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>

        <div className="mt-5 flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
