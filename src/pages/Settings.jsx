import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Settings({ auth }) {
  const metadata = auth.user?.user_metadata || {}
  const initialName = metadata.full_name || metadata.name || ''
  const initialAvatar = metadata.avatar_url || ''
  const [name, setName] = useState(initialName)
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [preferences, setPreferences] = useState(() => ({
    theme: localStorage.getItem('ping_theme') || 'dark',
    wallpaper: localStorage.getItem('ping_wallpaper') || 'paper',
    fontSize: localStorage.getItem('ping_font_size') || 'comfortable',
    enterToSend: localStorage.getItem('ping_enter_to_send') !== 'false',
    readReceipts: localStorage.getItem('ping_read_receipts') !== 'false',
    lastSeen: localStorage.getItem('ping_last_seen') !== 'false',
    notifications: localStorage.getItem('ping_notifications') !== 'false',
    sounds: localStorage.getItem('ping_sound') !== 'false',
    autoDownload: localStorage.getItem('ping_auto_download') || 'wifi'
  }))

  useEffect(() => {
    let active = true
    supabase.from('profiles').select('display_name, bio, avatar_url').eq('id', auth.user.id).maybeSingle().then(({ data }) => {
      if (!active || !data) return
      setName(data.display_name || initialName)
      setBio(data.bio || '')
      setAvatarUrl(data.avatar_url || initialAvatar)
      setLoading(false)
    })
    return () => { active = false }
  }, [auth.user.id, initialAvatar, initialName])

  function updatePreference(key, value) {
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    const storageKey = {
      theme: 'ping_theme', wallpaper: 'ping_wallpaper', fontSize: 'ping_font_size', enterToSend: 'ping_enter_to_send',
      readReceipts: 'ping_read_receipts', lastSeen: 'ping_last_seen', notifications: 'ping_notifications', sounds: 'ping_sound', autoDownload: 'ping_auto_download'
    }[key]
    localStorage.setItem(storageKey, String(value))
    if (key === 'theme') document.documentElement.dataset.theme = value
    if (key === 'wallpaper') document.documentElement.dataset.wallpaper = value
    if (key === 'fontSize') document.documentElement.dataset.fontSize = value
  }

  async function handleAvatar(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setStatus('Uploading photo...')
    const path = `${auth.user.id}/avatar-${Date.now()}.${file.name.split('.').pop()}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) { setStatus(uploadError.message); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(data.publicUrl)
    setStatus('Photo ready to save.')
  }

  async function saveProfile(event) {
    event.preventDefault(); setStatus('Saving...')
    const { error } = await supabase.from('profiles').update({ display_name: name.trim(), bio: bio.trim(), avatar_url: avatarUrl }).eq('id', auth.user.id)
    setStatus(error ? error.message : 'Profile saved.')
  }
  return <main className="simple-page"><Link className="back-link" to="/app">← Back to Ping</Link><div className="settings-page"><header className="settings-heading"><p className="eyebrow">Ping preferences</p><h1>Make it yours.</h1><p>Shape how Ping looks, sounds, and shares your presence.</p></header><section className="settings-section"><div className="settings-section-heading"><span className="settings-icon">✦</span><div><h2>Profile</h2><p>Your public identity on Ping.</p></div></div><div className="settings-profile"><img src={avatarUrl || '/favicon.svg'} alt="" /><div><strong>{name || 'Your profile'}</strong><span>{auth.user?.email}</span><small>{bio || 'Add a short about line below.'}</small></div><label className="photo-picker">Change photo<input type="file" accept="image/*" onChange={handleAvatar} /></label></div><form className="profile-form" onSubmit={saveProfile}><label>Display name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="How people should see you" /></label><label>About you<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} placeholder="A short line people will see on your profile" /></label><button className="primary-button" disabled={loading}>Save profile</button></form>{status && <p className="muted-copy">{status}</p>}</section><SettingsSection icon="◐" title="Privacy" description="Choose what other people can see." ><Toggle label="Read receipts" description="Show when messages have been read." checked={preferences.readReceipts} onChange={(value) => updatePreference('readReceipts', value)} /><Toggle label="Last seen" description="Let contacts see when you were last active." checked={preferences.lastSeen} onChange={(value) => updatePreference('lastSeen', value)} /></SettingsSection><SettingsSection icon="⌁" title="Chats" description="Make conversations feel like yours."><SettingChoice label="Wallpaper" value={preferences.wallpaper} options={[['paper', 'Warm paper'], ['midnight', 'Midnight'], ['plain', 'Plain']]} onChange={(value) => updatePreference('wallpaper', value)} /><SettingChoice label="Text size" value={preferences.fontSize} options={[['compact', 'Compact'], ['comfortable', 'Comfortable'], ['large', 'Large']]} onChange={(value) => updatePreference('fontSize', value)} /><Toggle label="Enter to send" description="Press Enter to send a message instead of adding a line." checked={preferences.enterToSend} onChange={(value) => updatePreference('enterToSend', value)} /></SettingsSection><SettingsSection icon="◒" title="Notifications" description="Keep interruptions under control."><Toggle label="Message notifications" description="Allow notification prompts for new messages." checked={preferences.notifications} onChange={(value) => updatePreference('notifications', value)} /><Toggle label="Sounds" description="Play tones for messages and calls." checked={preferences.sounds} onChange={(value) => updatePreference('sounds', value)} /></SettingsSection><SettingsSection icon="◈" title="Data and storage" description="Control how media is handled on this device."><SettingChoice label="Auto-download media" value={preferences.autoDownload} options={[['wifi', 'Wi-Fi only'], ['always', 'Wi-Fi and mobile'], ['never', 'Never']]} onChange={(value) => updatePreference('autoDownload', value)} /><button className="settings-action" onClick={() => { localStorage.removeItem('ping_contact_names'); setStatus('Local contact customizations cleared.') }}>Clear contact customizations <span>›</span></button></SettingsSection><SettingsSection icon="⌁" title="Calls" description="Camera and microphone access is requested only when you call."><button className="settings-action" onClick={() => navigator.mediaDevices?.getUserMedia({ audio: true, video: true }).then((stream) => { stream.getTracks().forEach((track) => track.stop()); setStatus('Camera and microphone are ready.') }).catch(() => setStatus('Camera or microphone permission was denied.'))}>Check camera and microphone <span>›</span></button></SettingsSection><p className="muted-copy">Profile photos require an `avatars` Supabase Storage bucket. Your account is managed by Supabase Auth.</p><button className="danger-button" onClick={auth.signOut}>Sign out</button></div></main>
}

function SettingsSection({ icon, title, description, children }) { return <section className="settings-section"><div className="settings-section-heading"><span className="settings-icon">{icon}</span><div><h2>{title}</h2><p>{description}</p></div></div><div className="settings-options">{children}</div></section> }

function Toggle({ label, description, checked, onChange }) { return <label className="settings-row"><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i /></label> }

function SettingChoice({ label, value, options, onChange }) { return <label className="settings-row choice-row"><span><strong>{label}</strong></span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label> }