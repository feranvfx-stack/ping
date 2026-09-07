import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useConversations } from '../hooks/useConversations'
import { usePresence } from '../hooks/usePresence'
import ConversationList from '../components/ConversationList'
import ChatWindow from '../components/ChatWindow'
import NewConversationModal from '../components/NewConversationModal'
import ConnectCodeModal from '../components/ConnectCodeModal'
import StatusComposer from '../components/StatusComposer'
import { supabase } from '../lib/supabase'

export default function AppShell({ auth }) {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { conversations, loading, startConversation } = useConversations(auth.user?.id)
  const presence = usePresence(auth.user)
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [contactNames, setContactNames] = useState(() => JSON.parse(localStorage.getItem('ping_contact_names') || '{}'))
  const [statuses, setStatuses] = useState([])
  const profile = auth.user?.user_metadata || {}
  const currentProfile = { id: auth.user?.id, display_name: profile.full_name || profile.name || auth.user?.email?.split('@')[0], email: auth.user?.email, avatar_url: profile.avatar_url }
  useEffect(() => {
    document.documentElement.dataset.theme = localStorage.getItem('ping_theme') || 'dark'
    document.documentElement.dataset.wallpaper = localStorage.getItem('ping_wallpaper') || 'paper'
    document.documentElement.dataset.fontSize = localStorage.getItem('ping_font_size') || 'comfortable'
  }, [])
  useEffect(() => {
    if (!supabase || !auth.user?.id) return undefined

    async function loadStatuses() {
      const { data: myRows } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', auth.user.id)

      const conversationIds = (myRows || []).map((row) => row.conversation_id)
      if (!conversationIds.length) {
        setStatuses([])
        return
      }

      const { data: contactRows } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .in('conversation_id', conversationIds)
        .neq('user_id', auth.user.id)

      const contactIds = [...new Set((contactRows || []).map((row) => row.user_id))]
      if (!contactIds.length) {
        setStatuses([])
        return
      }

      const { data } = await supabase
        .from('statuses')
        .select('*, profiles(display_name, avatar_url)')
        .in('author_id', contactIds)
        .order('created_at', { ascending: false })

      setStatuses(data || [])
    }

    loadStatuses()

    const channel = supabase
      .channel('status-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'statuses' }, () => loadStatuses())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [auth.user?.id])

  async function openConversation(userId) {
    const id = await startConversation(userId)
    setModal(null); navigate(`/app/${id}`)
  }
  function renameContact(userId, name) { const next = { ...contactNames, [userId]: name }; setContactNames(next); localStorage.setItem('ping_contact_names', JSON.stringify(next)) }

  return <div className="app-layout">
    <aside className={`conversation-sidebar ${conversationId ? 'mobile-hidden' : ''}`}>
      <header className="sidebar-header"><div><span className="brand-mark small">ping<span>.</span></span><p className="sidebar-kicker">Your people, in focus</p></div><Link className="profile-button" to="/settings"><img src={currentProfile.avatar_url || '/favicon.svg'} alt="" /></Link></header>
      <div className="sidebar-actions"><button onClick={() => setModal('new')}>New conversation <span>+</span></button><button className="ghost-action" onClick={() => setModal('code')}>Connect code</button></div>
      <div className="status-rail"><button className="status-avatar create-status" onClick={() => setModal('status')}><img src={currentProfile.avatar_url || '/favicon.svg'} alt="" /><span>+</span></button>{statuses.filter((status) => status.author_id !== auth.user?.id).slice(0, 6).map((status) => <button className="status-avatar" key={status.id} onClick={() => setModal('status')}><img src={status.profiles?.avatar_url || '/favicon.svg'} alt="" /></button>)}<span className="status-label">Statuses</span></div>
      <label className="chat-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" /></label>
      <ConversationList conversations={conversations.filter((conversation) => `${contactNames[conversation.other?.id] || conversation.other?.display_name || ''} ${conversation.other?.email || ''}`.toLowerCase().includes(search.toLowerCase()))} contactNames={contactNames} onRename={renameContact} loading={loading} selectedId={conversationId} isOnline={presence.isOnline} onSelect={(id) => navigate(`/app/${id}`)} />
    </aside>
    <main className={`chat-stage ${!conversationId ? 'empty-stage' : ''}`}>
      {conversationId ? <ChatWindow conversationId={conversationId} user={auth.user} isOnline={presence.isOnline} onBack={() => navigate('/app')} /> : <div className="empty-chat"><span className="empty-mark">↗</span><h2>Pick a conversation.</h2><p>Start with a person, not a feed.</p></div>}
    </main>
    {modal === 'new' && <NewConversationModal currentUserId={auth.user?.id} onClose={() => setModal(null)} onOpen={openConversation} />}
    {modal === 'code' && <ConnectCodeModal userId={auth.user?.id} onClose={() => setModal(null)} onOpen={openConversation} />}
    {modal === 'status' && <StatusComposer user={auth.user} onClose={() => setModal(null)} onCreated={(status) => setStatuses((current) => [status, ...current])} />}
  </div>
}