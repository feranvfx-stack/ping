export const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }

export function createPeerConnection({ onIceCandidate, onTrack, onConnectionStateChange }) {
  const peer = new RTCPeerConnection(rtcConfig)
  peer.onicecandidate = ({ candidate }) => candidate && onIceCandidate(candidate)
  peer.ontrack = onTrack
  peer.onconnectionstatechange = () => onConnectionStateChange(peer.connectionState)
  return peer
}