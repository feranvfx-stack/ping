import { useState } from 'react'
import { socket } from '../socketClient'

const BACKGROUND_PRESETS = [
  { id: 'wa-blue', label: 'Ping Blue', bg: 'linear-gradient(135deg, #0084FF 0%, #0052CC 100%)' },
  { id: 'royal', label: 'Royal Navy', bg: 'linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%)' },
  { id: 'cyan', label: 'Aqua Glow', bg: 'linear-gradient(135deg, #0284C7 0%, #06B6D4 100%)' },
  { id: 'indigo', label: 'Deep Indigo', bg: 'linear-gradient(135deg, #4F46E5 0%, #312E81 100%)' },
  { id: 'violet', label: 'Electric Purple', bg: 'linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)' },
  { id: 'emerald', label: 'Emerald', bg: 'linear-gradient(135deg, #059669 0%, #064E3B 100%)' },
  { id: 'sunset', label: 'Sunset Orange', bg: 'linear-gradient(135deg, #EA580C 0%, #9A3412 100%)' }
]

const FONT_PRESETS = [
  { id: 'sans', label: 'Modern', font: "'Inter', sans-serif" },
  { id: 'serif', label: 'Serif', font: "'Fraunces', Georgia, serif" },
  { id: 'mono', label: 'Code', font: "'JetBrains Mono', monospace" }
]

export default function CreateStatusModal({ isOpen, onClose, currentUser, onStatusPosted }) {
  const [activeTab, setActiveTab] = useState('text') // 'text' | 'image'
  const [textContent, setTextContent] = useState('')
  const [selectedBg, setSelectedBg] = useState(BACKGROUND_PRESETS[0].bg)
  const [selectedFont, setSelectedFont] = useState(FONT_PRESETS[0].font)
  const [imagePreview, setImagePreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  function handleImageChange(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (activeTab === 'text' && !textContent.trim()) return
    if (activeTab === 'image' && !imagePreview) return

    setIsSubmitting(true)

    const statusData = {
      authorUid: currentUser.uid,
      authorName: currentUser.displayName,
      authorEmail: currentUser.email,
      authorPhoto: currentUser.photoURL || '',
      type: activeTab,
      content: activeTab === 'text' ? textContent.trim() : imagePreview,
      caption: activeTab === 'image' ? caption.trim() : '',
      backgroundColor: selectedBg,
      fontStyle: selectedFont
    }

    socket.emit('post_status', statusData)
    if (onStatusPosted) onStatusPosted(statusData)

    setIsSubmitting(false)
    setTextContent('')
    setImagePreview(null)
    setCaption('')
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 800
      }}
      onClick={onClose}
    >
      <div
        className="animate-fade-in"
        style={{
          backgroundColor: 'var(--color-panel, #FFFFFF)',
          color: 'var(--color-ink, #111B21)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '460px',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          border: '1px solid var(--color-line, #E9EDEF)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-line, #E9EDEF)'
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: activeTab === 'text' ? '#0084FF' : 'transparent',
                color: activeTab === 'text' ? '#FFFFFF' : 'var(--color-inkmuted, #667781)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              ✏️ Text Status
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('image')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: activeTab === 'image' ? '#0084FF' : 'transparent',
                color: activeTab === 'image' ? '#FFFFFF' : 'var(--color-inkmuted, #667781)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              📷 Photo Status
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              color: 'var(--color-inkmuted, #667781)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {activeTab === 'text' ? (
            <div>
              {/* Text Status Canvas Preview */}
              <div
                style={{
                  height: '240px',
                  background: selectedBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px',
                  position: 'relative'
                }}
              >
                <textarea
                  placeholder="Type your status update…"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  maxLength={300}
                  autoFocus
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#FFFFFF',
                    fontFamily: selectedFont,
                    fontSize: '20px',
                    fontWeight: 600,
                    textAlign: 'center',
                    resize: 'none',
                    textShadow: '0 1px 3px rgba(0,0,0,0.4)'
                  }}
                />
                <span style={{
                  position: 'absolute',
                  bottom: '10px',
                  right: '16px',
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.7)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {textContent.length}/300
                </span>
              </div>

              {/* Color Preset Palette */}
              <div style={{ padding: '16px 20px 8px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-inkmuted, #667781)', marginBottom: '8px' }}>
                  BACKGROUND COLOR
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {BACKGROUND_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedBg(p.bg)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: p.bg,
                        border: selectedBg === p.bg ? '2.5px solid #0084FF' : '2px solid rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transform: selectedBg === p.bg ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.1s ease'
                      }}
                      title={p.label}
                    />
                  ))}
                </div>
              </div>

              {/* Font Choice */}
              <div style={{ padding: '8px 20px 16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-inkmuted, #667781)', marginBottom: '8px' }}>
                  FONT STYLE
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {FONT_PRESETS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFont(f.font)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--color-line, #E9EDEF)',
                        backgroundColor: selectedFont === f.font ? 'var(--color-active-item, #EBF5FF)' : 'transparent',
                        color: selectedFont === f.font ? '#0084FF' : 'var(--color-ink, #111B21)',
                        fontSize: '12px',
                        fontFamily: f.font,
                        cursor: 'pointer'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Photo Status Tab */
            <div style={{ padding: '20px' }}>
              {imagePreview ? (
                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', maxHeight: '260px', backgroundColor: '#000000', marginBottom: '16px' }}>
                  <img
                    src={imagePreview}
                    alt="Status preview"
                    style={{ width: '100%', height: '220px', objectFit: 'contain' }}
                  />
                  <button
                    type="button"
                    onClick={() => setImagePreview(null)}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      cursor: 'pointer'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '180px',
                  border: '2px dashed var(--color-line, #D1D5DB)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  marginBottom: '16px',
                  backgroundColor: 'var(--color-input-bg, #F9FAFB)'
                }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0084FF" strokeWidth="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#0084FF', marginTop: '8px' }}>
                    Click to select photo
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-inkmuted, #667781)', marginTop: '2px' }}>
                    JPG, PNG, or GIF up to 10MB
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                </label>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-inkmuted, #667781)', marginBottom: '6px' }}>
                  CAPTION
                </label>
                <input
                  type="text"
                  placeholder="Add a caption to your photo…"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-line, #D1D5DB)',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: 'var(--color-input-bg, #F9FAFB)',
                    color: 'var(--color-ink, #111B21)'
                  }}
                />
              </div>
            </div>
          )}

          {/* Footer controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: '1px solid var(--color-line, #E9EDEF)',
            backgroundColor: 'var(--color-panel-header, #F9FAFB)'
          }}>
            <span style={{ fontSize: '12px', color: 'var(--color-inkmuted, #667781)' }}>
              Visible for 24 hours to contacts
            </span>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-line, #D1D5DB)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-inkmuted, #667781)',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (activeTab === 'text' ? !textContent.trim() : !imagePreview)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#0084FF',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: (isSubmitting || (activeTab === 'text' ? !textContent.trim() : !imagePreview)) ? 'not-allowed' : 'pointer',
                  opacity: (activeTab === 'text' ? !textContent.trim() : !imagePreview) ? 0.5 : 1,
                  boxShadow: '0 2px 8px rgba(0, 132, 255, 0.3)'
                }}
              >
                {isSubmitting ? 'Posting…' : 'Share to Status'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
