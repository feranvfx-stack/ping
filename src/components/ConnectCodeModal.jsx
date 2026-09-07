import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ConnectCodeModal({ userId, onClose, onOpen }) {
	const [code, setCode] = useState('')
	const [generated, setGenerated] = useState('')
	const [error, setError] = useState('')
	const [busy, setBusy] = useState(false)

	async function generate() {
		setBusy(true); setError('')
		const value = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()
		const { error: insertError } = await supabase.from('connect_codes').insert({ code: value, owner_id: userId, expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() })
		if (insertError) setError(insertError.message)
		else { setGenerated(value); setCode('') }
		setBusy(false)
	}

	async function redeem(event) {
		event.preventDefault()
		const normalizedCode = code.replace(/\s/g, '').toUpperCase()
		if (normalizedCode.length !== 8) { setError('Enter the complete 8-character code.'); return }
		setBusy(true); setError('')
		const { data, error: redeemError } = await supabase.rpc('redeem_connect_code', { input_code: normalizedCode })
		if (redeemError) setError(redeemError.message || 'That code is invalid, expired, already used, or belongs to this account.')
		else {
			try { await onOpen(data) } catch (openError) { setError(openError.message || 'Could not create the conversation.') }
		}
		setBusy(false)
	}

	return <div className="modal-backdrop"><div className="modal-panel"><button className="modal-close" onClick={onClose}>×</button><p className="eyebrow">One-time link</p><h2>Connect by code.</h2><button className="secondary-button" onClick={generate} disabled={busy}>{busy ? 'Working...' : 'Generate a code'}</button>{generated && <div className="generated-code">{generated}<button type="button" onClick={() => navigator.clipboard.writeText(generated)}>Copy</button></div>}<div className="modal-divider">or enter a code from another Ping user</div><form onSubmit={redeem}><input value={code} maxLength={8} autoCapitalize="characters" onChange={(event) => { setCode(event.target.value.replace(/\s/g, '').toUpperCase()); setError('') }} placeholder="AB12CD34" required /><button className="primary-button" disabled={busy}>{busy ? 'Connecting...' : 'Connect'}</button></form>{error && <p className="form-error">{error}</p>}</div></div>
}