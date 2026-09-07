import { useState } from 'react'
import { getFallbackAvatar } from '../utils/avatar'

const PRESET_ACCOUNTS = [
  {
    name: 'Alex Johnson',
    email: 'alex.dev@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces'
  },
  {
    name: 'Jordan Lee',
    email: 'jordan.lee@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces'
  },
  {
    name: 'Morgan Smith',
    email: 'morgan.ping@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=faces'
  }
]

export default function GoogleAuthModal({ isOpen, onClose, onSelectAccount }) {
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customEmail, setCustomEmail] = useState('')
  const [customName, setCustomName] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  function handlePick(acc) {
    const cleanEmail = acc.email.trim().toLowerCase()
    const uid = 'u_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')
    onSelectAccount({
      uid,
      displayName: acc.name,
      email: cleanEmail,
      status: 'Hey there! I am using Ping.',
      photoURL: acc.avatar || getFallbackAvatar(acc.name),
      isGoogleAuth: true
    })
    onClose()
  }

  function handleCustomSubmit(e) {
    e.preventDefault()
    setError('')
    const cleanEmail = customEmail.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid Gmail address.')
      return
    }

    const defaultName = cleanEmail.split('@')[0]
    const displayName = (customName.trim() || defaultName.charAt(0).toUpperCase() + defaultName.slice(1))
    const uid = 'u_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')

    onSelectAccount({
      uid,
      displayName,
      email: cleanEmail,
      status: 'Hey there! I am using Ping.',
      photoURL: getFallbackAvatar(displayName),
      isGoogleAuth: true
    })
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 60px -10px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          border: '1px solid #E5E7EB'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '24px 28px 16px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <svg width="28" height="28" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.9 19 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.6 3 24 3c-7.4 0-13.8 4.2-17.7 10.7z" />
              <path fill="#4CAF50" d="M24 45c5.5 0 10.3-1.9 14-5.1l-6.5-5.4c-2 1.4-4.6 2.3-7.5 2.3-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.9 40.5 16.4 45 24 45z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.5 5.4C41.4 36 44 30.5 44 24c0-1.4-.1-2.7-.4-3.5z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>
            Sign in with Google
          </h2>
          <p style={{ fontSize: '13px', color: '#4B5563', marginTop: '4px' }}>
            Choose an account to continue to <strong style={{ color: '#0084FF' }}>Ping</strong>
          </p>
        </div>

        {/* Account List */}
        <div style={{ padding: '0 16px 8px' }}>
          {PRESET_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => handlePick(acc)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '10px 14px',
                border: '1px solid transparent',
                borderRadius: '10px',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.15s ease',
                marginBottom: '4px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#F3F4F6' }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <img
                src={acc.avatar}
                alt={acc.name}
                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1F2937' }}>
                  {acc.name}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {acc.email}
                </div>
              </div>
            </button>
          ))}

          {/* Toggle Custom Account */}
          {!showCustomInput ? (
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '10px 14px',
                border: 'none',
                borderRadius: '10px',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                marginTop: '4px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#F3F4F6' }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4B5563'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                Use another Gmail account
              </div>
            </button>
          ) : (
            <form onSubmit={handleCustomSubmit} style={{ marginTop: '12px', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
                  YOUR GMAIL ADDRESS
                </label>
                <input
                  type="email"
                  placeholder="username@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4B5563', marginBottom: '4px' }}>
                  DISPLAY NAME (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Connor"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {error && (
                <div style={{ fontSize: '12px', color: '#EF4444', marginBottom: '8px' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCustomInput(false)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    fontSize: '12px',
                    cursor: 'pointer',
                    color: '#4B5563'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#0084FF',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Sign In
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FAFAFA',
          fontSize: '11px',
          color: '#6B7280'
        }}>
          <span>English (United States)</span>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#0084FF', cursor: 'pointer', fontWeight: 500 }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
