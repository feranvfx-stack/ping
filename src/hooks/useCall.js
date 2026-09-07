import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { createPeerConnection } from '../lib/webrtc'

export function useCall({ conversationId, userId, peerId }) {
  const [active, setActive] = useState(false); const [incoming, setIncoming] = useState(null); const [duration, setDuration] = useState(0); const [callType, setCallType] = useState('voice'); const [localStream, setLocalStream] = useState(null); const [remoteStream, setRemoteStream] = useState(null); const [micMuted, setMicMuted] = useState(false); const [cameraOff, setCameraOff] = useState(false); const peer = useRef(null); const channel = useRef(null); const timer = useRef(null)

  const startTimer = useCallback(() => {
    clearInterval(timer.current)
    timer.current = setInterval(() => setDuration((value) => value + 1), 1000)
  }, [])

  const stopMedia = useCallback(() => {
    peer.current?.close(); localStream?.getTracks().forEach((track) => track.stop()); setLocalStream(null); setRemoteStream(null)
  }, [localStream])

  const handleSignal = useCallback(async (signal) => {
    if (signal.from === userId || (signal.to && signal.to !== userId)) return
    if (signal.type === 'offer') setIncoming(signal)
    if (signal.type === 'answer' && peer.current) { await peer.current.setRemoteDescription(signal.answer); setActive(true) }
    if (signal.type === 'ice' && peer.current) await peer.current.addIceCandidate(signal.candidate)
    if (signal.type === 'end') { stopMedia(); setActive(false); setDuration(0); clearInterval(timer.current) }
  }, [stopMedia, userId])

  useEffect(() => { if (!supabase || !conversationId) return undefined; const realtime = supabase.channel(`call:${conversationId}`).on('broadcast', { event: 'signal' }, ({ payload }) => handleSignal(payload)).subscribe(); channel.current = realtime; return () => { supabase.removeChannel(realtime); clearInterval(timer.current); peer.current?.close(); localStream?.getTracks().forEach((track) => track.stop()) } }, [conversationId, handleSignal, localStream])
  async function createConnection(type) { const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' }); setLocalStream(stream); const connection = createPeerConnection({ onIceCandidate: (candidate) => channel.current?.send({ type: 'broadcast', event: 'signal', payload: { type: 'ice', candidate, from: userId } }), onTrack: ({ streams }) => setRemoteStream(streams[0]), onConnectionStateChange: (state) => { if (state === 'connected') startTimer() } }); stream.getTracks().forEach((track) => connection.addTrack(track, stream)); peer.current = connection; return connection }
  async function startCall(type = 'voice') { setCallType(type); setMicMuted(false); setCameraOff(false); const connection = await createConnection(type); const offer = await connection.createOffer(); await connection.setLocalDescription(offer); channel.current?.send({ type: 'broadcast', event: 'signal', payload: { type: 'offer', offer, callType: type, from: userId, to: peerId } }); setActive(true) }
  async function acceptCall() { const type = incoming?.callType || 'voice'; setCallType(type); setMicMuted(false); setCameraOff(false); const connection = await createConnection(type); await connection.setRemoteDescription(incoming.offer); const answer = await connection.createAnswer(); await connection.setLocalDescription(answer); channel.current?.send({ type: 'broadcast', event: 'signal', payload: { type: 'answer', answer, from: userId } }); setIncoming(null); setActive(true) }
  function declineCall() { setIncoming(null); channel.current?.send({ type: 'broadcast', event: 'signal', payload: { type: 'end', from: userId } }) }
  function hangUp() { stopMedia(); setActive(false); setDuration(0); clearInterval(timer.current); channel.current?.send({ type: 'broadcast', event: 'signal', payload: { type: 'end', from: userId } }) }
  function toggleMic() { const next = !micMuted; localStream?.getAudioTracks().forEach((track) => { track.enabled = !next }); setMicMuted(next) }
  function toggleCamera() { const next = !cameraOff; localStream?.getVideoTracks().forEach((track) => { track.enabled = !next }); setCameraOff(next) }
  return { active, incoming, duration, callType, localStream, remoteStream, micMuted, cameraOff, startCall, acceptCall, declineCall, hangUp, toggleMic, toggleCamera }
}