import { useState, useEffect, useRef, useCallback } from 'react'
import { socket } from '../socketClient'
import { getFallbackAvatar, relativeTime } from '../utils/avatar'

export default function StatusViewerModal({
  isOpen,
  onClose,
  statuses = [],
  initialIndex = 0,
  currentUser,
  onReplyToStatus,
  onForwardToChat,
  onReshareToStatus,
  onDeleteStatus,
  allChats = []
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0) // 0 to 100
  const [replyText, setReplyText] = useState('')
  const [showViewersSheet, setShowViewersSheet] = useState(false)
  const [showForwardModal, setShowForwardModal] = useState(false)

  const timerRef = useRef(null)
  const currentStatus = statuses[currentIndex] || null
  const isMine = currentStatus && currentUser && currentStatus.authorUid === currentUser.uid

  const handleNext = useCallback(() => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setProgress(0)
    } else {
      onClose()
    }
  }, [currentIndex, statuses.length, onClose])

  // Record view event
  useEffect(() => {
    if (!isOpen || !currentStatus || !currentUser) return
    if (currentStatus.authorUid !== currentUser.uid) {
      socket.emit('view_status', {
        statusId: currentStatus.id,
        viewerUid: currentUser.uid,
        viewerName: currentUser.displayName,
        viewerEmail: currentUser.email,
        viewerPhoto: currentUser.photoURL || ''
      })
    }
  }, [currentIndex, isOpen, currentStatus, currentUser])

  // Progress Bar timer (5 seconds per slide)
  useEffect(() => {
    if (!isOpen || !currentStatus || isPaused || showViewersSheet || showForwardModal) return

    const stepMs = 50
    const durationMs = 5000
    const stepPercent = (stepMs / durationMs) * 100

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext()
          return 0
        }
        return prev + stepPercent
      })
    }, stepMs)

    return () => clearInterval(timerRef.current)
  }, [currentIndex, currentStatus, isPaused, showViewersSheet, showForwardModal, isOpen, statuses.length, handleNext])

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
      setProgress(0)
    }
  }

  function handleSendReply(e) {
    e.preventDefault()
    if (!replyText.trim() || !currentStatus) return

    if (onReplyToStatus) {
      onReplyToStatus({
        status: currentStatus,
        replyMessage: replyText.trim()
      })
    }
    setReplyText('')
    onClose()
  }

  function handleReshare() {
    if (!currentStatus) return
    const reshareData = {
      authorUid: currentUser.uid,
      authorName: currentUser.displayName,
      authorEmail: currentUser.email,
      authorPhoto: currentUser.photoURL || '',
      type: currentStatus.type,
      content: currentStatus.content,
      caption: currentStatus.caption,
      backgroundColor: currentStatus.backgroundColor,
      fontStyle: currentStatus.fontStyle,
      resharedFrom: {
        authorUid: currentStatus.authorUid,
        authorName: currentStatus.authorName,
        statusId: currentStatus.id
      }
    }
    socket.emit('post_status', reshareData)
    if (onReshareToStatus) onReshareToStatus(reshareData)
    alert('Reshared to your status!')
  }

  function handleForwardChat(chatId) {
    if (onForwardToChat && currentStatus) {
      onForwardToChat({
        chatId,
        status: currentStatus
      })
    }
    setShowForwardModal(false)
    onClose()
  }

  function handleDeleteCurrent() {
    if (!currentStatus || !isMine) return
    if (window.confirm('Delete this status update?')) {
      socket.emit('delete_status', {
        statusId: currentStatus.id,
        uid: currentUser.uid
      })
      if (onDeleteStatus) onDeleteStatus(currentStatus.id)
      handleNext()
    }
  }

  if (!isOpen || !currentStatus) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000000',
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none'
      }}
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Container (Phone/Story Aspect Ratio) */}
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          height: '100%',
          maxHeight: '840px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          backgroundColor: '#0F172A',
          overflow: 'hidden'
        }}
      >
        {/* Top Progress Bars (Segmented) */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          zIndex: 30,
          display: 'flex',
          gap: '4px'
        }}>
          {statuses.map((s, idx) => (
            <div
              key={s.id || idx}
              style={{
                flex: 1,
                height: '3px',
                borderRadius: '2px',
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: '100%',
                  backgroundColor: '#FFFFFF',
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                  transition: idx === currentIndex ? 'width 0.05s linear' : 'none'
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Header */}
        <div style={{
          position: 'absolute',
          top: '24px',
          left: '16px',
          right: '16px',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src={currentStatus.authorPhoto || getFallbackAvatar(currentStatus.authorName)}
              alt=""
              style={{ width: '38px', height: '38px', borderRadius: '50%', border: '2px solid #0084FF', objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                {isMine ? 'My Status' : currentStatus.authorName}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                {relativeTime(currentStatus.createdAt)}
                {currentStatus.resharedFrom && (
                  <span> · Reshared</span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Reshare Button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleReshare(); }}
              title="Reshare to My Status"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Forward to Chat Button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowForwardModal(true); }}
              title="Forward to Chat"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>

            {/* Delete button if mine */}
            {isMine && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDeleteCurrent(); }}
                title="Delete status"
                style={{
                  background: 'rgba(239,68,68,0.4)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tap zones for Left & Right Navigation */}
        <div
          style={{ position: 'absolute', top: '70px', bottom: '90px', left: 0, width: '30%', zIndex: 20 }}
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
        />
        <div
          style={{ position: 'absolute', top: '70px', bottom: '90px', right: 0, width: '30%', zIndex: 20 }}
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
        />

        {/* Content Area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: currentStatus.type === 'text' ? currentStatus.backgroundColor : '#000000',
            position: 'relative'
          }}
        >
          {currentStatus.resharedFrom && (
            <div style={{
              position: 'absolute',
              top: '80px',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              color: '#FFFFFF',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>🔄</span> Reshared from <strong>{currentStatus.resharedFrom.authorName}</strong>
            </div>
          )}

          {currentStatus.type === 'text' ? (
            <div style={{
              padding: '40px 28px',
              textAlign: 'center',
              color: '#FFFFFF',
              fontFamily: currentStatus.fontStyle || "'Inter', sans-serif",
              fontSize: '24px',
              fontWeight: 600,
              lineHeight: 1.4,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              wordBreak: 'break-word',
              maxWidth: '90%'
            }}>
              {currentStatus.content}
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={currentStatus.content}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              {currentStatus.caption && (
                <div style={{
                  position: 'absolute',
                  bottom: '90px',
                  left: '16px',
                  right: '16px',
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(4px)',
                  padding: '10px 16px',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  textAlign: 'center'
                }}>
                  {currentStatus.caption}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Bar: Reply (if contact) or Viewers (if mine) */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 30,
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
          {isMine ? (
            <button
              type="button"
              onClick={() => setShowViewersSheet(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Viewed by {currentStatus.viewers ? currentStatus.viewers.length : 0} contacts
            </button>
          ) : (
            <form onSubmit={handleSendReply} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Reply to status…"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => setIsPaused(true)}
                onBlur={() => setIsPaused(false)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                style={{
                  padding: '10px 18px',
                  borderRadius: '20px',
                  backgroundColor: '#0084FF',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: replyText.trim() ? 'pointer' : 'default',
                  opacity: replyText.trim() ? 1 : 0.5
                }}
              >
                Reply
              </button>
            </form>
          )}
        </div>

        {/* Viewers Bottom Sheet */}
        {showViewersSheet && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.85)',
              zIndex: 40,
              display: 'flex',
              flexDirection: 'column',
              padding: '24px 20px',
              color: '#FFFFFF'
            }}
            onClick={() => setShowViewersSheet(false)}
          >
            <div
              style={{
                marginTop: 'auto',
                backgroundColor: '#1E293B',
                borderRadius: '16px',
                padding: '20px',
                maxHeight: '60%',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>
                  Viewed by ({currentStatus.viewers ? currentStatus.viewers.length : 0})
                </h3>
                <button
                  type="button"
                  onClick={() => setShowViewersSheet(false)}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '16px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {currentStatus.viewers && currentStatus.viewers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {currentStatus.viewers.map((v, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' }}>
                      <img
                        src={v.photoURL || getFallbackAvatar(v.name)}
                        alt=""
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{v.name}</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>{v.email}</div>
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        {relativeTime(v.viewedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#94A3B8', textAlign: 'center', padding: '24px 0' }}>
                  No views yet. Contacts who have your email will appear here when they view your status.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Forward to Chat Modal */}
        {showForwardModal && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.85)',
              zIndex: 40,
              display: 'flex',
              flexDirection: 'column',
              padding: '24px 20px',
              color: '#FFFFFF'
            }}
            onClick={() => setShowForwardModal(false)}
          >
            <div
              style={{
                marginTop: 'auto',
                backgroundColor: '#1E293B',
                borderRadius: '16px',
                padding: '20px',
                maxHeight: '60%',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>
                  Forward Status to Chat
                </h3>
                <button
                  type="button"
                  onClick={() => setShowForwardModal(false)}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '16px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {allChats.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {allChats.map((chat) => (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => handleForwardChat(chat.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        backgroundColor: '#334155',
                        border: 'none',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>
                        {chat.peerName || chat.id}
                      </span>
                      <span style={{ fontSize: '12px', color: '#0084FF', fontWeight: 600 }}>
                        Send →
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#94A3B8', textAlign: 'center', padding: '20px 0' }}>
                  No active chats yet. Start a chat first to forward.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
