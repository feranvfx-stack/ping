import PresenceDot from './PresenceDot'
export default function ConversationListItem({ conversation, active, online, onClick, customName, onRename }) {
  const person = conversation.other || {}
  const name = customName || person.display_name || person.email || 'Unnamed contact'
  function rename(event) { event.stopPropagation(); const next = window.prompt('Name this contact', name); if (next?.trim()) onRename(person.id, next.trim()) }
  return <div className={`conversation-item-wrap ${active ? 'active' : ''}`}><button className={`conversation-item ${active ? 'active' : ''}`} onClick={onClick}><div className="avatar-wrap"><img src={person.avatar_url || '/favicon.svg'} alt="" /><PresenceDot online={online} /></div><div className="conversation-summary"><strong>{name}</strong><span>{conversation.lastMessage || 'Start a conversation'}</span></div><time>now</time></button><button className="contact-customize" onClick={rename} title="Customize contact name" aria-label={`Customize ${name}`}>•••</button></div>
}