import { useState, useRef, useEffect } from 'react'
import { formatDuration } from '../utils/avatar'

const SPEEDS = [1, 1.5, 2]

export default function VoiceNotePlayer({ audioData, duration = 0, isMine = false }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(duration)
  const [speedIndex, setSpeedIndex] = useState(0)
  const audioRef = useRef(null)

  const speed = SPEEDS[speedIndex]

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setAudioDuration(audio.duration)
      }
    }
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.playbackRate = speed
      audio.play().then(() => setIsPlaying(true)).catch((e) => console.warn('Audio play error', e))
    }
  }

  function handleSpeedChange() {
    const nextIdx = (speedIndex + 1) % SPEEDS.length
    setSpeedIndex(nextIdx)
    if (audioRef.current) {
      audioRef.current.playbackRate = SPEEDS[nextIdx]
    }
  }

  // Calculate progress percentage
  const total = audioDuration || 1
  const progressPercent = Math.min(100, Math.max(0, (currentTime / total) * 100))

  // 18 pseudo waveform bars with static heights
  const bars = [40, 65, 30, 85, 95, 45, 70, 100, 60, 40, 80, 50, 90, 75, 40, 65, 80, 45]

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '4px 2px',
      minWidth: '240px',
      maxWidth: '300px'
    }}>
      <audio ref={audioRef} src={`data:audio/webm;base64,${audioData}`} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: isMine ? '#FFFFFF' : '#0084FF',
          color: isMine ? '#0084FF' : '#FFFFFF',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)'
        }}
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1.5" />
            <rect x="14" y="4" width="4" height="16" rx="1.5" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '2px' }}>
            <polygon points="6 3 20 12 6 21 6 3" />
          </svg>
        )}
      </button>

      {/* Waveform & Scrubber */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2.5px',
            height: '24px',
            cursor: 'pointer',
            position: 'relative'
          }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const clickX = e.clientX - rect.left
            const pct = clickX / rect.width
            if (audioRef.current) {
              const dur = audioDuration || 1
              audioRef.current.currentTime = pct * dur
              setCurrentTime(pct * dur)
            }
          }}
        >
          {bars.map((h, i) => {
            const barProgress = (i / bars.length) * 100
            const isPlayed = barProgress <= progressPercent
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  borderRadius: '2px',
                  backgroundColor: isMine
                    ? (isPlayed ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)')
                    : (isPlayed ? '#0084FF' : '#CBD5E1'),
                  transition: 'background-color 0.1s ease'
                }}
              />
            )
          })}
        </div>

        {/* Duration & Timer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: isMine ? 'rgba(255,255,255,0.85)' : 'var(--color-inkmuted, #667781)'
        }}>
          <span>{formatDuration(isPlaying ? currentTime : audioDuration)}</span>
        </div>
      </div>

      {/* Speed Selector */}
      <button
        type="button"
        onClick={handleSpeedChange}
        style={{
          padding: '2px 6px',
          borderRadius: '12px',
          border: 'none',
          backgroundColor: isMine ? 'rgba(255,255,255,0.25)' : 'rgba(0, 132, 255, 0.12)',
          color: isMine ? '#FFFFFF' : '#0084FF',
          fontSize: '10px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          cursor: 'pointer',
          flexShrink: 0
        }}
        title="Change playback speed"
      >
        {speed}x
      </button>
    </div>
  )
}
