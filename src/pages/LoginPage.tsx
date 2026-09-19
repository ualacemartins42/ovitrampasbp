import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { BrandMark } from '@/components/brand/BrandMark'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { PasswordInput } from '@/components/ui/password-input'
import { useAuth } from '@/features/auth/auth-context'
import brasaoBarraDoPirai from '@/assets/brand/brasao-barra-do-pirai.png'

export function LoginPage() {
  const { profile, configured, signIn, signInDemo } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (profile) {
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
        <BrandMark size="lg" className="mb-5" />
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Ovitrampas</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
          Coleta de campo offline-first para Agentes de Combate às Endemias.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-sm">
        <Field label="Usuário ou E-mail">
          <Input
            type="text"
            autoComplete="username"
            required
            value={email}
            placeholder="harranuza.assis ou e-mail"
            onChange={(event) => setEmail(event.target.value)}
            disabled={!configured}
          />
        </Field>
        <Field label="Senha">
          <PasswordInput
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
            Usuários sem `@` viram `nome.sobrenome@ovitrampas.local`.
          </p>
        )}
      </form>

      <Button variant="secondary" className="mt-4 w-full" onClick={() => void signInDemo()}>
        Entrar no Modo Offline
      </Button>
      <div className="mt-6 flex flex-col items-center justify-center">
        <img
          src={brasaoBarraDoPirai}
          alt="Brasão de Barra do Piraí"
          className="mb-2 h-14 w-auto bg-transparent object-contain"
        />
        <p className="text-center text-xs text-gray-500">
          Desenvolvido por{' '}
          <a
            href="https://www.lealindie.com.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-teal-700 hover:underline"
          >
            Leal Indie
          </a>
        </p>
      </div>
    </div>
  )
}
