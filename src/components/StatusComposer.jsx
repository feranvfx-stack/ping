import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function StatusComposer({ user, onClose, onCreated }) {
    const [type, setType] = useState('text')
    const [text, setText] = useState('')
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    function chooseFile(event) {
        const next = event.target.files?.[0]
        if (!next) return
        setFile(next)
        setType(next.type.startsWith('video/') ? 'video' : 'image')
        setPreview(URL.createObjectURL(next))
    }

    async function submit(event) {
        event.preventDefault()
        if (type === 'text' && !text.trim()) return
        if (type !== 'text' && !file) return

        setBusy(true)
        setError('')

        try {
            let mediaUrl = null
            if (file) {
                const path = `${user.id}/${crypto.randomUUID()}-${file.name}`
                const upload = await supabase.storage.from('status-media').upload(path, file, { contentType: file.type })
                if (upload.error) throw upload.error
                mediaUrl = supabase.storage.from('status-media').getPublicUrl(path).data.publicUrl
            }

            const { data, error: insertError } = await supabase.from('statuses').insert({
                author_id: user.id,
                type,
                content: type === 'text' ? text.trim() : null,
                media_url: mediaUrl,
                caption: type === 'text' ? null : text.trim() || null
            }).select().single()

            if (insertError) throw insertError
            onCreated(data)
            onClose()
        } catch (submitError) {
            setError(submitError?.message || 'Could not post the status.')
        } finally {
            setBusy(false)
        }
    }

    return <div className="modal-backdrop"><form className="modal-panel status-composer" onSubmit={submit}><button type="button" className="modal-close" onClick={onClose}>×</button><p className="eyebrow">24-hour status</p><h2>Share a little life.</h2><div className="status-type-tabs"><button type="button" className={type === 'text' ? 'selected' : ''} onClick={() => setType('text')}>Text</button><label className={type !== 'text' ? 'selected' : ''}>Photo or video<input type="file" accept="image/*,video/*" onChange={chooseFile} /></label></div>{type === 'text' ? <textarea autoFocus value={text} onChange={(event) => setText(event.target.value)} maxLength={300} placeholder="What is happening?" /> : <div className="status-media-preview">{type === 'video' ? <video src={preview} controls /> : <img src={preview} alt="Status preview" />}</div>}{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? 'Posting...' : 'Post status'}</button><p className="muted-copy">Create a `status-media` Storage bucket in Supabase before uploading media.</p></form></div>
}
