import { useState, useEffect, createContext, useContext } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  isAuthenticated: false,
})

export function useAuth() {
  return useContext(AuthContext)
}

export function useAuthProvider(): AuthContextType {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Check localStorage for demo session
      const demoUser = localStorage.getItem('demo_user')
      if (demoUser) {
        setUser(JSON.parse(demoUser))
      }
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    if (!isSupabaseConfigured) {
      // Demo authentication
      if (email === 'admin@rehabme.com' && password === 'demo1234') {
        const demoUser = {
          id: 'demo-user-id',
          email: 'admin@rehabme.com',
          user_metadata: { full_name: 'Dr. Swechchha Rajput' },
          created_at: new Date().toISOString(),
        } as unknown as User
        setUser(demoUser)
        localStorage.setItem('demo_user', JSON.stringify(demoUser))
        return { error: null }
      }
      return { error: new Error('Invalid credentials. Use admin@rehabme.com / demo1234') }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error ? new Error(error.message) : null }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      setUser(null)
      localStorage.removeItem('demo_user')
      return
    }
    await supabase.auth.signOut()
  }

  return {
    user,
    session,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user,
  }
}
