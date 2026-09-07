import { Navigate } from 'react-router-dom'
import { useState } from 'react'

export default function Landing({ auth }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  if (auth.user) return <Navigate to="/app" replace />
  async function submit(event) {
    event.preventDefault(); setBusy(true)
    if (mode === 'signin') await auth.signInWithEmail(email, password)
    else await auth.signUpWithEmail(email, password, name)
    setBusy(false)
  }
  return <main className="auth-page"><div className="auth-decoration" /><section className="auth-card"><div className="auth-brand"><span className="brand-symbol">↗</span><strong className="brand-mark">ping<span>.</span></strong></div><p className="eyebrow">Your conversations, in focus</p><h1>{mode === 'signin' ? 'Welcome back.' : 'Make an account.'}</h1><p className="auth-copy">A bright, private place for the people you actually talk to.</p><form className="auth-form" onSubmit={submit}>{mode === 'signup' && <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" required />}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" autoComplete="email" required /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password · 6 characters minimum" minLength="6" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required /><button className="primary-button" disabled={busy}>{busy ? 'Please wait...' : mode === 'signin' ? 'Open Ping' : 'Create account'}</button></form>{auth.error && <p className="form-error">{auth.error}</p>}<div className="auth-divider"><span>or</span></div><button className="google-button" onClick={auth.signInWithGoogle} disabled={busy}><span className="google-g">G</span> Continue with Google</button><button className="mode-switch" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); auth.clearError() }}>{mode === 'signin' ? 'Create a new account' : 'I already have an account'}</button></section><p className="auth-footer">Ping uses Supabase Auth. Your password never reaches this app.</p></main>
}