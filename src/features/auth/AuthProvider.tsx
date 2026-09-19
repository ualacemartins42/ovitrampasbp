import { QueryClientProvider } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from '@/features/auth/auth-context'
import { DEMO_AGENT_ID } from '@/lib/constants'
import { db, seedReferenceDataIfEmpty } from '@/lib/db'
import { queryClient } from '@/lib/queryClient'
import { cacheProfile, fetchRemoteProfile, loadCachedProfile, pullRemoteData } from '@/lib/sync'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Profile } from '@/types/domain'

export function AppProviders({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
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
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      const userId = session?.user.id
      if (!userId) {
        setProfile(null)
        setIsDemo(false)
        return
      }

      const cached = await loadCachedProfile(userId)
      if (cached) setProfile(cached)

      if (navigator.onLine) {
        const remote = await fetchRemoteProfile(userId)
        if (remote) {
          setProfile(remote)
          await pullRemoteData(remote)
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

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase não configurado. Use o modo demonstração.')
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signInDemo = useCallback(async () => {
    const demoProfile: Profile = {
      id: DEMO_AGENT_ID,
      fullName: 'Agente Demonstração',
      registrationNumber: 'ACE-0001',
      cpf: null,
      role: 'ace',
      neighborhoodId: 1,
      zone: 'Zona Central',
      phone: null,
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
  }, [isDemo])

  const updateLocalProfile = useCallback(async (next: Profile) => {
    await cacheProfile(next)
    setProfile(next)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      loading,
      isDemo,
      configured: isSupabaseConfigured(),
      signIn,
      signInDemo,
      signOut,
      updateLocalProfile,
      refresh: hydrate,
    }),
    [profile, loading, isDemo, signIn, signInDemo, signOut, updateLocalProfile, hydrate],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  )
}
