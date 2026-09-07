import { useEffect, useRef, useState } from 'react'
import { useMessages } from '../hooks/useMessages'
import { supabase } from '../lib/supabase'
import MessageBubble from './MessageBubble'
import MessageComposer from './MessageComposer'
import PresenceDot from './PresenceDot'
import ActiveCallBar from './ActiveCallBar'
import IncomingCallModal from './IncomingCallModal'
import { useCall } from '../hooks/useCall'

export default function ChatWindow({ conversationId, user, isOnline, onBack }) {
  const { messages, loading, sendMessage } = useMessages(conversationId); const [peer, setPeer] = useState(null); const endRef = useRef(null)
  const call = useCall({ conversationId, userId: user.id, peerId: peer?.id })
  useEffect(() => { if (!supabase || !conversationId) return; supabase.from('conversation_participants').select('profiles(id, display_name, email, avatar_url)').eq('conversation_id', conversationId).neq('user_id', user.id).maybeSingle().then(({ data }) => setPeer(data?.profiles || null)) }, [conversationId, user.id])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  async function send(content) { await sendMessage({ senderId: user.id, content }) }
  async function sendVoice(blob, duration) { if (!supabase) return; const path = `${user.id}/${crypto.randomUUID()}.webm`; const upload = await supabase.storage.from('voice-notes').upload(path, blob, { contentType: blob.type }); if (!upload.error) { const { data } = supabase.storage.from('voice-notes').getPublicUrl(path); await sendMessage({ senderId: user.id, audioUrl: data.publicUrl, durationSeconds: duration }) } }
  return <section className="chat-window"><header className="chat-header"><button className="back-button" onClick={onBack}>←</button><div className="header-person"><img src={peer?.avatar_url || '/favicon.svg'} alt="" /><div><strong>{peer?.display_name || peer?.email || 'Conversation'}</strong><span><PresenceDot online={isOnline(peer?.id)} />{isOnline(peer?.id) ? 'Online now' : 'Away'}</span></div></div><div className="call-actions-header"><button className="call-button" onClick={() => call.startCall('voice')} disabled={!peer} title="Start voice call">Voice</button><button className="call-button" onClick={() => call.startCall('video')} disabled={!peer} title="Start video call">Video</button></div></header><div className="message-scroll">{loading ? <div className="list-empty">Loading messages...</div> : messages.map((message) => <MessageBubble key={message.id} message={message} mine={message.sender_id === user.id} />)}<div ref={endRef} /></div><MessageComposer onSend={send} onVoice={sendVoice} />{call.active && <ActiveCallBar peer={peer} callType={call.callType} localStream={call.localStream} remoteStream={call.remoteStream} micMuted={call.micMuted} cameraOff={call.cameraOff} duration={call.duration} onToggleMic={call.toggleMic} onToggleCamera={call.toggleCamera} onHangUp={call.hangUp} />}{call.incoming && <IncomingCallModal caller={peer} callType={call.incoming.callType} onAccept={call.acceptCall} onDecline={call.declineCall} />}</section>
}