import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { StaffProfile } from '../lib/types'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: StaffProfile | null
  loading: boolean
  signIn: (identifier: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  changePassword: (newPassword: string) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
  isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  changePassword: async () => ({ error: null }),
  refreshProfile: async () => {},
  isAuthenticated: false,
})

export function useAuth() {
  return useContext(AuthContext)
}

const DEMO_PROFILE: StaffProfile = {
  id: 'demo-profile-id',
  user_id: 'demo-user-id',
  full_name: 'Dr. Swechchha Rajput',
  email: 'admin@rehabme.com',
  role: 'admin',
  specialty: 'Physiotherapy',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

/**
 * The login form accepts a phone number or an email. Phone sign-in expects
 * international format; bare 10-digit numbers are assumed to be Indian (+91).
 */
export function normalizeIdentifier(identifier: string): { phone: string } | { email: string } {
  const trimmed = identifier.trim()
  const compact = trimmed.replace(/[\s-]/g, '')
  if (/^\+?\d{8,15}$/.test(compact)) {
    const withCountry = compact.startsWith('+')
      ? compact
      : compact.length === 10
        ? `+91${compact}`
        : `+${compact}`
    return { phone: withCountry }
  }
  return { email: trimmed }
}

export function useAuthProvider(): AuthContextType {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<StaffProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (forUser: User | null) => {
    if (!isSupabaseConfigured || !forUser) {
      setProfile(!isSupabaseConfigured && forUser ? DEMO_PROFILE : null)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', forUser.id)
      .single()
    setProfile((data as StaffProfile | null) ?? null)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const demoUser = localStorage.getItem('demo_user')
      if (demoUser) {
        const parsed = JSON.parse(demoUser) as User
        setUser(parsed)
        setProfile(DEMO_PROFILE)
      }
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      await loadProfile(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      void loadProfile(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const signIn = async (identifier: string, password: string): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      if (identifier.trim() === 'admin@rehabme.com' && password === 'demo1234') {
        const demoUser = {
          id: 'demo-user-id',
          email: 'admin@rehabme.com',
          user_metadata: { full_name: 'Dr. Swechchha Rajput' },
          created_at: new Date().toISOString(),
        } as unknown as User
        setUser(demoUser)
        setProfile(DEMO_PROFILE)
        localStorage.setItem('demo_user', JSON.stringify(demoUser))
        return { error: null }
      }
      return { error: new Error('Invalid credentials. Use admin@rehabme.com / demo1234') }
    }

    const credentials = normalizeIdentifier(identifier)
    const { error } = await supabase.auth.signInWithPassword({ ...credentials, password })
    return { error: error ? new Error(error.message) : null }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      setUser(null)
      setProfile(null)
      localStorage.removeItem('demo_user')
      return
    }
    await supabase.auth.signOut()
  }

  const changePassword = async (newPassword: string): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) return { error: null }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: new Error(error.message) }

    if (profile?.must_change_password) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', profile.id)
      setProfile({ ...profile, must_change_password: false })
    }
    return { error: null }
  }

  const refreshProfile = useCallback(async () => {
    await loadProfile(user)
  }, [loadProfile, user])

  return {
    user,
    session,
    profile,
    loading,
    signIn,
    signOut,
    changePassword,
    refreshProfile,
    isAuthenticated: !!user,
  }
}
