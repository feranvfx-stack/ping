import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useConversations(userId) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(Boolean(userId))

  async function ensureProfileExists() {
    if (!supabase || !userId) return
    const { data: currentUser, error: userError } = await supabase.auth.getUser()
    if (userError || !currentUser.user) throw userError || new Error('You are not signed in.')

    const { data: profile, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', currentUser.user.id)
      .maybeSingle()

    if (lookupError) throw lookupError
    if (profile) return

    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: currentUser.user.id,
      email: currentUser.user.email,
      display_name: currentUser.user.user_metadata?.full_name || currentUser.user.user_metadata?.name || currentUser.user.email?.split('@')[0],
      avatar_url: currentUser.user.user_metadata?.avatar_url || null
    }, { onConflict: 'id' })

    if (upsertError) throw upsertError
  }

  async function load() {
    if (!supabase || !userId) return
    const { data } = await supabase.from('conversation_participants')
      .select('conversation_id, conversations(id, created_at, conversation_participants(user_id, profiles(id, display_name, email, avatar_url)))')
      .eq('user_id', userId)
    const mapped = (data || []).map(({ conversations: conversation }) => {
      const other = conversation?.conversation_participants?.find((participant) => participant.user_id !== userId)?.profiles
      return { ...conversation, other, lastMessage: '' }
    }).filter((conversation) => conversation?.id)
    setConversations(mapped); setLoading(false)
  }

  useEffect(() => {
    if (!userId || !supabase) { setConversations([]); setLoading(false); return undefined }
    load()
    const channel = supabase.channel(`conversations:${userId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_participants' }, load).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function startConversation(otherUserId) {
    if (!supabase || !userId || otherUserId === userId) throw new Error('Choose another Ping user.')

    await ensureProfileExists()

    const { data: existing } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', userId)
    for (const row of existing || []) {
      const { data: match } = await supabase.from('conversation_participants').select('user_id').eq('conversation_id', row.conversation_id).eq('user_id', otherUserId).maybeSingle()
      if (match) return row.conversation_id
    }
    const { data: conversation, error } = await supabase.from('conversations').insert({}).select().single()
    if (error) throw error
    const { error: participantError } = await supabase.from('conversation_participants').insert([{ conversation_id: conversation.id, user_id: userId }, { conversation_id: conversation.id, user_id: otherUserId }])
    if (participantError) throw participantError
    await load(); return conversation.id
  }

  return { conversations, loading, reload: load, startConversation }
}