import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useMessages(conversationId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(Boolean(conversationId))

  useEffect(() => {
    if (!supabase || !conversationId) { setMessages([]); setLoading(false); return undefined }
    let active = true
    setLoading(true)
    supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at')
      .then(({ data }) => { if (active) { setMessages(data || []); setLoading(false) } })
    const channel = supabase.channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, ({ new: message }) => {
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message])
      }).subscribe()
    return () => { active = false; supabase.removeChannel(channel) }
  }, [conversationId])

  async function sendMessage({ senderId, content, audioUrl, durationSeconds }) {
    if (!supabase || !conversationId) return { error: new Error('Messaging is unavailable.') }
    return supabase.from('messages').insert({
      conversation_id: conversationId, sender_id: senderId,
      type: audioUrl ? 'voice' : 'text', content: content || null,
      audio_url: audioUrl || null, duration_seconds: durationSeconds || null
    }).select().single()
  }

  return { messages, loading, sendMessage }
}