import { Bug } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { useAuth } from '@/features/auth/auth-context'

export function LoginPage() {
  const { profile, loading, configured, signIn, signInDemo } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && profile) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col justify-center bg-surface px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Bug className="size-7" />
        </div>
        <h1 className="text-2xl font-semibold text-ink">Ovitrampas</h1>
        <p className="mt-2 text-sm text-muted">
          Coleta de campo offline-first para Agentes de Combate às Endemias.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-sm">
        <Field label="E-mail institucional">
          <Input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={!configured}
          />
        </Field>
        <Field label="Senha">
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={!configured}
          />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" className="w-full" size="lg" disabled={submitting || !configured}>
          {submitting ? 'Entrando...' : 'Entrar e sincronizar bases'}
        </Button>
        {!configured ? (
          <p className="text-xs text-muted">
            Configure <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> para o login oficial.
          </p>
        ) : (
          <p className="text-xs text-muted">
            No primeiro acesso online o app baixa bairros, tipos de armadilha e imóveis para uso em campo.
          </p>
        )}
      </form>

      <Button variant="secondary" className="mt-4 w-full" onClick={() => void signInDemo()}>
        Entrar em modo demonstração (offline)
      </Button>
    </div>
  )
}
