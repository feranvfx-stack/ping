import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SeoHead from './SeoHead'
import GoogleAuthModal from './GoogleAuthModal'
import { getFallbackAvatar } from '../utils/avatar'

export default function LandingPage({ currentUser, onLogin }) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showGoogleModal, setShowGoogleModal] = useState(false)
  const navigate = useNavigate()

  function handleAuthenticate(userEmail) {
    setIsSubmitting(true)
    setErrorMessage('')

    const cleanEmail = userEmail.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.')
      setIsSubmitting(false)
      return
    }

    const uid = 'u_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')
    const name = cleanEmail.split('@')[0]
    const displayName = name.charAt(0).toUpperCase() + name.slice(1)

    const profile = {
      uid,
      displayName,
      email: cleanEmail,
      status: 'Hey there! I am using Ping.',
      photoURL: getFallbackAvatar(displayName)
    }

    onLogin(profile)
    navigate('/messages')
    setIsSubmitting(false)
  }

  function handleGoogleAccountSelected(profile) {
    onLogin(profile)
    navigate('/messages')
  }

  function handleFormSubmit(e) {
    e.preventDefault()
    handleAuthenticate(email)
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: '#F0F2F5' }}>
      <SeoHead
        title="Ping — WhatsApp-Speed Messenger"
        description="Fast, private real-time messaging, status stories, and crystal-clear voice/video calls."
        keywords="Ping, messenger, WhatsApp blue, real-time chat, video calls, status stories"
        canonical={window.location.origin}
      />

      <GoogleAuthModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSelectAccount={handleGoogleAccountSelected}
      />

      {/* Top Bar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
        borderBottom: '1px solid #E9EDEF',
        backgroundColor: '#FFFFFF'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#0084FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 132, 255, 0.3)'
          }}>
            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', color: '#FFFFFF' }} fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontSize: '22px', fontWeight: 700, color: '#111B21', letterSpacing: '-0.5px' }}>
            Ping
          </span>
        </div>

        <nav style={{ display: 'flex', gap: '20px', alignItems: 'center', fontSize: '13px' }}>
          <Link to="/about" style={{ color: '#667781', textDecoration: 'none', fontWeight: 500 }}>About</Link>
          <Link to="/privacy" style={{ color: '#667781', textDecoration: 'none', fontWeight: 500 }}>Privacy</Link>
          {currentUser && (
            <Link to="/messages" style={{
              backgroundColor: '#0084FF',
              color: '#FFFFFF',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 2px 6px rgba(0, 132, 255, 0.3)'
            }}>Open Ping →</Link>
          )}
        </nav>
      </header>

      {/* Main Centered Auth */}
      <main style={{
        minHeight: 'calc(100% - 130px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px'
      }}>
        <div style={{ width: '100%', maxWidth: '390px' }}>
          {/* Brand Mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#0084FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(0, 132, 255, 0.35)'
            }}>
              <svg viewBox="0 0 24 24" style={{ width: '24px', height: '24px', color: '#FFFFFF' }} fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ fontSize: '30px', fontWeight: 800, color: '#111B21', letterSpacing: '-0.5px' }}>
              Ping
            </span>
          </div>

          {/* Panel */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E9EDEF',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            padding: '36px 32px',
            textAlign: 'center'
          }}>
            <h1 style={{
              fontSize: '22px',
              fontWeight: 700,
              marginBottom: '8px',
              color: '#111B21',
              letterSpacing: '-0.3px'
            }}>Simple. Fast. Secure.</h1>

            <p style={{
              fontSize: '13px',
              color: '#667781',
              marginBottom: '26px',
              lineHeight: 1.5
            }}>
              Connect instantly by Gmail with WhatsApp speed, 24h status stories, and crystal-clear voice/video calls.
            </p>

            {currentUser ? (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  backgroundColor: '#F0F2F5',
                  borderRadius: '12px',
                  border: '1px solid #E9EDEF',
                  marginBottom: '18px',
                  textAlign: 'left'
                }}>
                  <img
                    src={currentUser.photoURL || getFallbackAvatar(currentUser.displayName)}
                    alt=""
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111B21' }}>{currentUser.displayName}</div>
                    <div style={{ fontSize: '12px', color: '#667781', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser.email}</div>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/messages')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#0084FF',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 132, 255, 0.3)'
                  }}
                >
                  Continue to Chats →
                </button>
              </div>
            ) : (
              <div>
                {/* Google Sign In Button */}
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(true)}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#1F2937',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#F9FAFB'
                    e.currentTarget.style.borderColor = '#D1D5DB'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF'
                    e.currentTarget.style.borderColor = '#E5E7EB'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z" />
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.9 19 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.6 3 24 3c-7.4 0-13.8 4.2-17.7 10.7z" />
                    <path fill="#4CAF50" d="M24 45c5.5 0 10.3-1.9 14-5.1l-6.5-5.4c-2 1.4-4.6 2.3-7.5 2.3-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.9 40.5 16.4 45 24 45z" />
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.5 5.4C41.4 36 44 30.5 44 24c0-1.4-.1-2.7-.4-3.5z" />
                  </svg>
                  Continue with Google
                </button>

                <div style={{
                  position: 'relative',
                  textAlign: 'center',
                  margin: '22px 0',
                  borderBottom: '1px solid #E9EDEF'
                }}>
                  <span style={{
                    position: 'absolute',
                    top: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#FFFFFF',
                    padding: '0 10px',
                    fontSize: '11px',
                    color: '#8696A0',
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 600
                  }}>OR EMAIL</span>
                </div>

                <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="email"
                    placeholder="name@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: '1px solid #E5E7EB',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: '#F9FAFB'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0084FF'
                      e.currentTarget.style.backgroundColor = '#FFFFFF'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#E5E7EB'
                      e.currentTarget.style.backgroundColor = '#F9FAFB'
                    }}
                  />

                  {errorMessage && (
                    <p style={{ fontSize: '12px', color: '#EF4444', textAlign: 'left' }}>{errorMessage}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: '12px',
                      backgroundColor: '#0084FF',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: isSubmitting ? 'wait' : 'pointer',
                      boxShadow: '0 2px 8px rgba(0, 132, 255, 0.3)'
                    }}
                  >
                    Continue
                  </button>
                </form>
              </div>
            )}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            marginTop: '28px',
            fontSize: '12px',
            color: '#8696A0'
          }}>
            <span>🔒 End-to-end P2P</span>
            <span>·</span>
            <span>📱 WhatsApp Blue</span>
            <span>·</span>
            <span>✨ 24h Status Stories</span>
          </div>
        </div>
      </main>
    </div>
  )
}
