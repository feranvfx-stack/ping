import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) { setLoading(false); return undefined }
    let active = true
    supabase.auth.getUser().then(({ data }) => {
      if (active) { setUser(data.user); setLoading(false) }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) { setUser(session?.user ?? null); setLoading(false) }
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  async function signInWithGoogle() {
    setError('')
    if (!supabase) { setError('Supabase is not configured yet.'); return }
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/app` }
    })
    if (authError) setError(authError.message)
  }

  async function signInWithEmail(email, password) {
    setError('')
    if (!supabase) { setError('Supabase is not configured yet.'); return false }
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (authError) { setError(authError.message); return false }
    return true
  }

  async function signUpWithEmail(email, password, displayName) {
    setError('')
    if (!supabase) { setError('Supabase is not configured yet.'); return false }
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: displayName.trim() }, emailRedirectTo: `${window.location.origin}/app` }
    })
    if (authError) { setError(authError.message); return false }
    if (!data.session) setError('Account created. Check your email to confirm your address.')
    return true
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
  }

  function clearError() { setError('') }

  return { user, loading, error, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, clearError }
}