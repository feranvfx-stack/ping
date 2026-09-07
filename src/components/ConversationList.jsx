import ConversationListItem from './ConversationListItem'
export default function ConversationList({ conversations, loading, selectedId, isOnline, onSelect, contactNames, onRename }) {
  if (loading) return <div className="list-empty">Loading conversations...</div>
  if (!conversations.length) return <div className="list-empty"><span className="empty-mark">✦</span><strong>No conversations yet</strong><p>Use New conversation to find someone by email.</p></div>
  return <div className="conversation-list">{conversations.map((conversation) => <ConversationListItem key={conversation.id} conversation={conversation} customName={contactNames[conversation.other?.id]} active={conversation.id === selectedId} online={isOnline(conversation.other?.id)} onClick={() => onSelect(conversation.id)} onRename={onRename} />)}</div>
}