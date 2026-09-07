import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function usePresence(user) {
  const [onlineIds, setOnlineIds] = useState([])
  useEffect(() => {
    if (!supabase || !user) return undefined
    const channel = supabase.channel('ping-presence', { config: { presence: { key: user.id } } })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setOnlineIds(Object.keys(state))
      }).subscribe(async (status) => { if (status === 'SUBSCRIBED') await channel.track({ user_id: user.id }) })
    return () => { supabase.removeChannel(channel) }
  }, [user])
  return { onlineIds, isOnline: (id) => onlineIds.includes(id) }
}