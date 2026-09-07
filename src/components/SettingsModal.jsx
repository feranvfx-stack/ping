import { useState } from 'react'
import { socket } from '../socketClient'

export default function SettingsModal({ currentUser, onClose, onProfileUpdated }) {
  const [displayName, setDisplayName] = useState(currentUser.displayName || '')
  const [status, setStatus] = useState(currentUser.status || '')
  const [photoURL, setPhotoURL] = useState(currentUser.photoURL || '')
  const [theme, setTheme] = useState(() => localStorage.getItem('ping_theme') || 'light')
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('ping_sound') !== 'false')

  function handleThemeChange(newTheme) {
    setTheme(newTheme)
    localStorage.setItem('ping_theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  function handleAvatarUpload(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setPhotoURL(reader.result)
    }
    reader.readAsDataURL(file)
  }

  function handleSave(e) {
    e.preventDefault()
    const updated = {
      ...currentUser,
      displayName: displayName.trim() || currentUser.displayName,
      status: status.trim() || 'Hey there! I am using Ping.',
      photoURL
    }

    localStorage.setItem('ping_user', JSON.stringify(updated))
    localStorage.setItem('ping_sound', soundEnabled ? 'true' : 'false')

    // Broadcast updated profile to server and peers
    socket.emit('update_profile', updated)
    onProfileUpdated(updated)
    onClose()
  }

  const themes = [
    { id: 'light', label: 'WhatsApp Blue Light', bg: '#F0F2F5', border: '#E9EDEF' },
    { id: 'midnight', label: 'WhatsApp Midnight Dark', bg: '#0B141A', border: '#222D34' }
  ]

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      zIndex: 1000
    }}>
      <div
        className="animate-fade-in"
        style={{
          backgroundColor: 'var(--color-panel, #FFFFFF)',
          color: 'var(--color-ink, #111B21)',
          border: '1px solid var(--color-line, #E9EDEF)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-modal)',
          maxWidth: '440px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)' }}>
            Settings & Profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--color-inkmuted)' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Avatar Upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img
              src={photoURL || 'https://via.placeholder.com/64'}
              alt=""
              style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0084FF' }}
            />
            <div>
              <label
                style={{
                  display: 'inline-block',
                  padding: '6px 14px',
                  backgroundColor: 'var(--color-input-bg)',
                  border: '1px solid var(--color-line)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--color-ink)'
                }}
              >
                Change Photo
                <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
              </label>
              <div style={{ fontSize: '11px', color: 'var(--color-inkmuted)', marginTop: '4px' }}>
                JPG, PNG or GIF up to 5MB
              </div>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-inkmuted)', marginBottom: '6px' }}>
              YOUR NAME
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--color-line)',
                backgroundColor: 'var(--color-input-bg)',
                color: 'var(--color-ink)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {/* About / Status */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-inkmuted)', marginBottom: '6px' }}>
              ABOUT / BIO
            </label>
            <input
              type="text"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="Hey there! I am using Ping."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--color-line)',
                backgroundColor: 'var(--color-input-bg)',
                color: 'var(--color-ink)',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {/* Theme Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--color-inkmuted)', marginBottom: '8px' }}>
              THEME
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {themes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleThemeChange(t.id)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: theme === t.id ? '2px solid #0084FF' : '1px solid var(--color-line)',
                    backgroundColor: t.bg,
                    color: t.id === 'midnight' ? '#FFFFFF' : '#111B21',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sound alert toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Message Sounds</div>
              <div style={{ fontSize: '11px', color: 'var(--color-inkmuted)' }}>Play soft tone on new incoming messages</div>
            </div>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#0084FF', cursor: 'pointer' }}
            />
          </div>

          {/* Save & Cancel */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--color-line)',
                backgroundColor: 'transparent',
                color: 'var(--color-inkmuted)',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#0084FF',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 132, 255, 0.3)'
              }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
