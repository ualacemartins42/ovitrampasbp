import { QueryClientProvider } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { AuthContext, type AuthContextValue } from '@/features/auth/auth-context'
import { DEMO_AGENT_ID, isAdminEmail } from '@/lib/constants'
import { db, seedReferenceDataIfEmpty } from '@/lib/db'
import { queryClient } from '@/lib/queryClient'
import { cacheProfile, fetchRemoteProfile, loadCachedProfile, pullRemoteData, startBackgroundSync } from '@/lib/sync'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { toInternalEmail } from '@/utils/formatUsername'
import type { Profile } from '@/types/domain'

async function enrichProfileAfterLogin(
  user: User,
  fallback: Profile,
  setProfile: Dispatch<SetStateAction<Profile | null>>,
) {
  try {
    await seedReferenceDataIfEmpty()
  } catch {
    /* IndexedDB must not block login */
  }

  let next = fallback
  try {
    const cached = await loadCachedProfile(user.id)
    if (cached) next = cached
  } catch {
    /* ignore cache errors */
  }

  if (navigator.onLine && supabase) {
    try {
      const remote = await fetchRemoteProfile(user.id)
      if (remote?.isActive === false && !isAdminEmail(user.email)) {
        await supabase.auth.signOut()
        return
      }
      if (remote) {
        next = isAdminEmail(user.email) ? { ...remote, isActive: true } : remote
      } else {
        await cacheProfile(next)
      }
    } catch {
      try {
        await cacheProfile(next)
      } catch {
        /* ignore */
      }
    }
  }

  setProfile(next)

  try {
    await pullRemoteData(next)
  } catch {
    /* sync after login is best-effort */
  }
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  const hydrate = useCallback(async () => {
    try {
      if (!supabase) {
        try {
          const demo = await loadCachedProfile(DEMO_AGENT_ID)
          if (demo) {
            setProfile(demo)
            setIsDemo(true)
          }
        } catch {
          /* IndexedDB must not block demo login */
        }
        setEmail(null)
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
      setEmail(user?.email ?? null)
      if (!user) {
        setProfile(null)
        setIsDemo(false)
        return
      }

      const fallback: Profile = {
        id: user.id,
        fullName: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Agente',
        username: user.user_metadata?.username ?? null,
        registrationNumber: user.user_metadata?.registration_number ?? null,
        role: isAdminEmail(user.email) ? 'admin' : 'ace',
        neighborhoodId: null,
        zone: null,
        phone: null,
        isActive: true,
      }

      setProfile((current) => (current?.id === user.id ? current : fallback))
      setIsDemo(false)
      setLoading(false)

      void enrichProfileAfterLogin(user, fallback, setProfile)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void hydrate()
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        void hydrate().catch(() => undefined)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [hydrate])

  useEffect(() => {
    startBackgroundSync(
      () => profile,
      () => isDemo,
    )
  }, [profile, isDemo])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase não configurado. Use o Modo Offline.')
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: toInternalEmail(email),
      password,
    })
    if (error) {
      const invalid = error.message.toLowerCase().includes('invalid')
      throw new Error(invalid ? 'Usuário ou senha inválidos.' : error.message)
    }
    await hydrate()
  }, [hydrate])

  const signInDemo = useCallback(async () => {
    const demoProfile: Profile = {
      id: DEMO_AGENT_ID,
      fullName: 'Agente Offline',
      username: 'agente.demo',
      registrationNumber: 'ACE-0001',
      role: 'ace',
      neighborhoodId: 1,
      zone: '1º Distrito - Sede / Centro e Adjacências',
      phone: null,
      isActive: true,
    }
    await cacheProfile(demoProfile)
    await seedReferenceDataIfEmpty()
    setIsDemo(true)
    setProfile(demoProfile)
  }, [])

  const signOut = useCallback(async () => {
    if (supabase && !isDemo) {
      await supabase.auth.signOut()
    }
    if (isDemo) {
      await db.profiles.delete(DEMO_AGENT_ID)
    }
    setIsDemo(false)
    setProfile(null)
    setEmail(null)
  }, [isDemo])

  const updateLocalProfile = useCallback(async (next: Profile) => {
    await cacheProfile(next)
    setProfile(next)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      email,
      isAdmin: isAdminEmail(email) || profile?.role === 'admin',
      loading,
      isDemo,
      configured: isSupabaseConfigured(),
      signIn,
      signInDemo,
      signOut,
      updateLocalProfile,
      refresh: hydrate,
    }),
    [profile, email, loading, isDemo, signIn, signInDemo, signOut, updateLocalProfile, hydrate],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  )
}
