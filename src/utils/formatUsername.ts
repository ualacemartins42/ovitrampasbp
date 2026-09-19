const IGNORED_NAME_PARTS = new Set(['de', 'da', 'das', 'do', 'dos', 'e', 'di', 'du', 'del'])

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function sanitizeNameToken(value: string): string {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Gera o identificador de login a partir do nome completo do agente.
 *
 * @example
 * generateUsername('Harranuza de Oliveira Assis') // 'harranuza.assis'
 * generateUsername('  João  ') // 'joao'
 * generateUsername('Maria da Silva') // 'maria.silva'
 */
export function generateUsername(fullName: string): string {
  const tokens = fullName
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map(sanitizeNameToken)
    .filter((token) => token.length > 0)

  const firstName = tokens[0]
  if (!firstName) {
    return ''
  }

  if (tokens.length === 1) {
    return firstName
  }

  const lastName =
    [...tokens].reverse().find((token) => !IGNORED_NAME_PARTS.has(token)) ?? tokens[tokens.length - 1]

  if (!lastName || lastName === firstName) {
    return firstName
  }

  return `${firstName}.${lastName}`
}

/**
 * Converte o valor digitado na tela de login no e-mail interno do Supabase Auth.
 *
 * @example
 * toInternalEmail('ovitrampasbp@gmail.com') // 'ovitrampasbp@gmail.com'
 * toInternalEmail('harranuza.assis') // 'harranuza.assis@ovitrampas.local'
 * toInternalEmail('  Harranuza.Assis  ') // 'harranuza.assis@ovitrampas.local'
 */
export function toInternalEmail(input: string): string {
  const trimmed = input.trim()
  if (trimmed.includes('@')) {
    return trimmed
  }

  return `${trimmed.toLowerCase()}@ovitrampas.local`
}
