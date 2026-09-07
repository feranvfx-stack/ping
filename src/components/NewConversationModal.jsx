import { useState } from 'react'
import { supabase } from '../lib/supabase'
export default function NewConversationModal({ currentUserId, onClose, onOpen }) {
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    async function find(event) {
        event.preventDefault()
        const cleanEmail = email.trim().toLowerCase()
        if (!cleanEmail || !cleanEmail.includes('@')) {
            setError('Enter a valid email address.')
            return
        }

        setBusy(true)
        setError('')

        try {
            const { data, error: lookupError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', cleanEmail)
                .neq('id', currentUserId)
                .maybeSingle()

            if (lookupError) throw lookupError
            if (!data) {
                setError('No Ping user found with that email.')
                return
            }

            await onOpen(data.id)
        } catch (lookupError) {
            setError(lookupError?.message || 'Could not open that conversation.')
        } finally {
            setBusy(false)
        }
    }

    return <div className="modal-backdrop"><form className="modal-panel" onSubmit={find}><button type="button" className="modal-close" onClick={onClose}>×</button><p className="eyebrow">New thread</p><h2>Find someone.</h2><p className="muted-copy">Use their exact email address to start a private conversation.</p><input autoFocus type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@example.com" required />{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? 'Looking...' : 'Open conversation'}</button></form></div>
}