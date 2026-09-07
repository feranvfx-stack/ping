// Synthesized Minimalist Audio Cues via Web Audio API (Zero external assets)

let audioCtx = null

function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (AudioContext) {
      audioCtx = new AudioContext()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

// Gentle incoming message chime (soft bell tone)
export function playMessageChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, now) // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08) // A5

    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.35)
  } catch (err) {
    console.debug('Audio chime skipped', err)
  }
}

// Subtle calling ring tone
let ringInterval = null
export function startCallRingtone() {
  stopCallRingtone()
  const playRingPulse = () => {
    try {
      const ctx = getAudioContext()
      if (!ctx) return
      const now = ctx.currentTime

      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const gain = ctx.createGain()

      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(440, now) // A4
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(480, now) // Standard US ringtone pair

      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2)

      osc1.connect(gain)
      osc2.connect(gain)
      gain.connect(ctx.destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + 1.2)
      osc2.stop(now + 1.2)
    } catch {
      // Ignored
    }
  }

  playRingPulse()
  ringInterval = setInterval(playRingPulse, 3000)
}

export function stopCallRingtone() {
  if (ringInterval) {
    clearInterval(ringInterval)
    ringInterval = null
  }
}
