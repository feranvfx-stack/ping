import { useState } from 'react'
import VoiceRecorderButton from './VoiceRecorderButton'
export default function MessageComposer({ onSend, onVoice }) {
  const [value, setValue] = useState('')
  function submit(event) { event.preventDefault(); if (value.trim()) { onSend(value.trim()); setValue('') } }
  function handleKeyDown(event) { if (event.key === 'Enter' && !event.shiftKey && localStorage.getItem('ping_enter_to_send') !== 'false') { event.preventDefault(); submit(event) } }
  return <form className="composer" onSubmit={submit}><VoiceRecorderButton onComplete={onVoice} /><textarea value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={handleKeyDown} placeholder={localStorage.getItem('ping_enter_to_send') === 'false' ? 'Write something real... (Enter for a new line)' : 'Write something real...'} rows="1" /><button className="send-button" type="submit" aria-label="Send message">↗</button></form>
}