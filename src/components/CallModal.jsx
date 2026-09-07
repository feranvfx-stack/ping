import { useEffect, useRef } from 'react'
import { getFallbackAvatar, formatDuration } from '../utils/avatar'

export default function CallModal({
  activeCall, // { callId, peerUid, peerName, peerPhoto, callType, status }
  incomingCall, // { callId, callerUid, callerName, callerPhoto, callType, offer }
  localStream,
  remoteStream,
  callDuration = 0,
  p2pStats = 'Direct P2P',
  isMicMuted = false,
  isCameraOff = false,
  onToggleMic,
  onToggleCamera,
  onHangUp,
  onAcceptCall,
  onDeclineCall
}) {
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)

  // Bind local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
      localVideoRef.current.play().catch((err) => console.warn('Local video play error', err))
    }
  }, [localStream, activeCall?.status])

  // Bind remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
      remoteVideoRef.current.play().catch((err) => console.warn('Remote video play error', err))
    }
  }, [remoteStream, activeCall?.status])

  // Bind remote audio stream
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream
      remoteAudioRef.current.play().catch((err) => console.warn('Remote audio play error', err))
    }
  }, [remoteStream, activeCall?.status])

  // ================= 1. INCOMING CALL MODAL =================
  if (incomingCall) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(11, 20, 26, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 950
        }}
      >
        <div
          className="animate-fade-in"
          style={{
            backgroundColor: 'var(--color-panel, #111B21)',
            border: '1px solid var(--color-line, #222D34)',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            padding: '36px 28px',
            maxWidth: '340px',
            width: '100%',
            textAlign: 'center',
            color: 'var(--color-ink, #E9EDEF)'
          }}
        >
          <div style={{ position: 'relative', width: '84px', height: '84px', margin: '0 auto 20px' }}>
            <div className="call-pulsing" style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 132, 255, 0.2)'
            }} />
            <img
              src={incomingCall.callerPhoto || getFallbackAvatar(incomingCall.callerName)}
              alt=""
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                objectFit: 'cover',
                position: 'relative',
                zIndex: 2,
                border: '3px solid #0084FF'
              }}
            />
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
            {incomingCall.callerName}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-inkmuted, #8696A0)', marginBottom: '32px' }}>
            Incoming {incomingCall.callType === 'video' ? 'Video' : 'Voice'} Call…
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={onDeclineCall}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '14px',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.684A1 1 0 008.279 3H5z" />
              </svg>
              Decline
            </button>
            <button
              type="button"
              onClick={onAcceptCall}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '14px',
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Accept
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!activeCall) return null

  // ================= 2. OUTGOING RINGING OVERLAY =================
  if (activeCall.status === 'ringing') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(11, 20, 26, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 950
        }}
      >
        <div
          className="animate-fade-in"
          style={{
            backgroundColor: 'var(--color-panel, #111B21)',
            border: '1px solid var(--color-line, #222D34)',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            padding: '40px 28px',
            maxWidth: '340px',
            width: '100%',
            textAlign: 'center',
            color: 'var(--color-ink, #E9EDEF)'
          }}
        >
          <div style={{ position: 'relative', width: '84px', height: '84px', margin: '0 auto 20px' }}>
            <div className="call-pulsing" style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 132, 255, 0.25)'
            }} />
            <img
              src={activeCall.peerPhoto || getFallbackAvatar(activeCall.peerName)}
              alt=""
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                objectFit: 'cover',
                position: 'relative',
                zIndex: 2,
                border: '3px solid #0084FF'
              }}
            />
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
            {activeCall.peerName}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-inkmuted, #8696A0)', marginBottom: '32px' }}>
            Ringing {activeCall.callType === 'video' ? 'Video' : 'Voice'} Call…
          </p>

          <button
            type="button"
            onClick={onHangUp}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '14px',
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}
          >
            Cancel Call
          </button>
        </div>
      </div>
    )
  }

  // ================= 3. CONNECTED VOICE CALL MODAL =================
  if (activeCall.status === 'connected' && activeCall.callType === 'audio') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(11, 20, 26, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 950
        }}
      >
        <audio ref={remoteAudioRef} autoPlay playsInline />

        <div
          className="animate-fade-in"
          style={{
            backgroundColor: '#111B21',
            border: '1px solid #222D34',
            borderRadius: '28px',
            boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
            padding: '44px 32px 36px',
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center',
            color: '#E9EDEF'
          }}
        >
          {/* Avatar with Sound Waves */}
          <div style={{ position: 'relative', width: '96px', height: '96px', margin: '0 auto 20px' }}>
            <div className="call-pulsing" style={{
              position: 'absolute',
              inset: '-8px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 132, 255, 0.2)'
            }} />
            <img
              src={activeCall.peerPhoto || getFallbackAvatar(activeCall.peerName)}
              alt=""
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '50%',
                objectFit: 'cover',
                position: 'relative',
                zIndex: 2,
                border: '3px solid #0084FF'
              }}
            />
          </div>

          <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>
            {activeCall.peerName}
          </h3>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(0, 132, 255, 0.15)',
            color: '#0084FF',
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            marginBottom: '10px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            {formatDuration(callDuration)}
          </div>

          <p style={{ fontSize: '11px', color: '#8696A0', marginBottom: '36px' }}>
            🔒 Ping Direct P2P Audio Call · {p2pStats}
          </p>

          {/* Controls Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
            {/* Mute Mic */}
            <button
              type="button"
              onClick={onToggleMic}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: isMicMuted ? '#EF4444' : 'rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMicMuted ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  <line x1="1" y1="1" x2="23" y2="23" stroke="#FFFFFF" strokeWidth="2.5" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>

            {/* End Call Button */}
            <button
              type="button"
              onClick={onHangUp}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(239, 68, 68, 0.4)',
                transform: 'scale(1.05)'
              }}
              title="Hang up"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.684A1 1 0 008.279 3H5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ================= 4. CONNECTED VIDEO CALL MODAL =================
  if (activeCall.status === 'connected' && activeCall.callType === 'video') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#0B141A',
          zIndex: 950,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Remote Video Stream (Full Screen) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />

        {/* Hidden Audio element backup for audio stream */}
        <audio ref={remoteAudioRef} autoPlay playsInline />

        {/* Top Header Bar */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)'
        }}>
          <div style={{
            backgroundColor: 'rgba(17, 27, 33, 0.75)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            padding: '8px 16px',
            color: '#FFFFFF'
          }}>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>{activeCall.peerName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', opacity: 0.85, fontFamily: 'var(--font-mono)' }}>
              <span>{formatDuration(callDuration)}</span>
              <span>·</span>
              <span>{p2pStats}</span>
            </div>
          </div>
        </div>

        {/* Local Video Stream (Picture-in-Picture) */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute',
            bottom: '104px',
            right: '24px',
            width: '130px',
            height: '175px',
            borderRadius: '16px',
            objectFit: 'cover',
            border: '2px solid rgba(255,255,255,0.4)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            zIndex: 10,
            backgroundColor: '#1F2937',
            display: isCameraOff ? 'none' : 'block'
          }}
        />

        {/* Bottom Control Bar */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          marginTop: 'auto',
          marginBottom: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '18px'
        }}>
          {/* Mute Mic */}
          <button
            type="button"
            onClick={onToggleMic}
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: isMicMuted ? '#EF4444' : 'rgba(255,255,255,0.25)',
              color: '#FFFFFF',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)'
            }}
            title={isMicMuted ? 'Unmute mic' : 'Mute mic'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>

          {/* Toggle Camera */}
          <button
            type="button"
            onClick={onToggleCamera}
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              backgroundColor: isCameraOff ? '#EF4444' : 'rgba(255,255,255,0.25)',
              color: '#FFFFFF',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)'
            }}
            title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.55-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.45.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Hang Up */}
          <button
            type="button"
            onClick={onHangUp}
            style={{
              padding: '14px 28px',
              borderRadius: '28px',
              backgroundColor: '#EF4444',
              color: '#FFFFFF',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 6px 24px rgba(239, 68, 68, 0.4)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.684A1 1 0 008.279 3H5z" />
            </svg>
            End Call
          </button>
        </div>
      </div>
    )
  }

  return null
}
