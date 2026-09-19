import { createContext, useContext } from 'react'
import type { Profile } from '@/types/domain'

export interface AuthContextValue {
  profile: Profile | null
  email: string | null
  isAdmin: boolean
  loading: boolean
  isDemo: boolean
  configured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInDemo: () => Promise<void>
  signOut: () => Promise<void>
  updateLocalProfile: (profile: Profile) => Promise<void>
  refresh: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AppProviders')
  }
  return context
}
