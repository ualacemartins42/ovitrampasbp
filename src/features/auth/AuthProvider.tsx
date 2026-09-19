import { QueryClientProvider } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from '@/features/auth/auth-context'
import { DEMO_AGENT_ID, isAdminEmail } from '@/lib/constants'
import { db, seedReferenceDataIfEmpty } from '@/lib/db'
import { queryClient } from '@/lib/queryClient'
import { cacheProfile, fetchRemoteProfile, loadCachedProfile, pullRemoteData, startBackgroundSync } from '@/lib/sync'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { toInternalEmail } from '@/utils/formatUsername'
import type { Profile } from '@/types/domain'

export function AppProviders({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  const hydrate = useCallback(async () => {
    setLoading(true)
    try {
      await seedReferenceDataIfEmpty()

      if (!supabase) {
        const demo = await loadCachedProfile(DEMO_AGENT_ID)
        if (demo) {
          setProfile(demo)
          setIsDemo(true)
        }
        setEmail(null)
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      const userId = session?.user.id
      setEmail(session?.user.email ?? null)
      if (!userId) {
        setProfile(null)
        setIsDemo(false)
        return
      }

      const cached = await loadCachedProfile(userId)
      if (cached) setProfile(cached)

      if (navigator.onLine) {
        try {
          const remote = await fetchRemoteProfile(userId)
          if (remote?.isActive === false) {
            await supabase.auth.signOut()
            setProfile(null)
            setEmail(null)
            return
          }
          if (remote) {
            setProfile(remote)
            await pullRemoteData(remote)
          } else if (cached) {
            setProfile(cached)
          } else {
            const fallback: Profile = {
              id: userId,
              fullName: session?.user.email?.split('@')[0] ?? 'Agente',
              username: null,
              registrationNumber: null,
              role: isAdminEmail(session?.user.email) ? 'admin' : 'ace',
              neighborhoodId: null,
              zone: null,
              phone: null,
              isActive: true,
            }
            await cacheProfile(fallback)
            setProfile(fallback)
          }
        } catch {
          if (cached) setProfile(cached)
        }
      } else if (cached) {
        setProfile(cached)
      }
      setIsDemo(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void hydrate()
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        void hydrate()
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
      throw new Error('Supabase não configurado. Use o modo demonstração.')
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: toInternalEmail(email),
      password,
    })
    if (error) throw error
  }, [])

  const signInDemo = useCallback(async () => {
    const demoProfile: Profile = {
      id: DEMO_AGENT_ID,
      fullName: 'Agente Demonstração',
      username: 'agente.demo',
      registrationNumber: 'ACE-0001',
      role: 'ace',
      neighborhoodId: 1,
      zone: 'Zona Central',
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
      isAdmin: isAdminEmail(email),
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
