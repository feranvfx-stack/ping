import { Link } from 'react-router-dom'
import SeoHead from './SeoHead'

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100%', overflowY: 'auto', backgroundColor: '#F0F2F5', color: '#111B21' }}>
      <SeoHead
        title="About Ping — The Direct Messaging Philosophy"
        description="Learn about Ping, an authentic direct messaging experience designed for intentional, private correspondence without feeds or bloated AI."
        keywords="about ping, private messenger, direct messenger, fast chat, P2P calling, 24h status"
      />

      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
        borderBottom: '1px solid #E9EDEF',
        backgroundColor: '#FFFFFF'
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#0084FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 132, 255, 0.3)'
          }}>
            <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', color: '#FFFFFF' }} fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#111B21', letterSpacing: '-0.5px' }}>Ping</span>
        </Link>
        <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
          <Link to="/" style={{ color: '#667781', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>Home</Link>
          <Link to="/messages" style={{
            backgroundColor: '#0084FF',
            color: '#FFFFFF',
            textDecoration: 'none',
            padding: '8px 18px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(0, 132, 255, 0.3)'
          }}>Open App</Link>
        </div>
      </header>

      {/* Content */}
      <article style={{
        maxWidth: '720px',
        margin: '48px auto',
        padding: '0 24px'
      }}>
        <h1 style={{ fontSize: '34px', fontWeight: 800, color: '#111B21', marginBottom: '16px', letterSpacing: '-0.5px' }}>
          Direct messaging. Simplified.
        </h1>

        <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#4B5563', marginBottom: '24px' }}>
          Ping is a standalone direct messenger designed for authentic, private correspondence. No bloated feeds, no intrusive algorithms, and no unnecessary complexity.
        </p>

        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111B21', margin: '32px 0 12px' }}>
          Why Ping?
        </h2>
        <ul style={{ paddingLeft: '20px', lineHeight: 1.8, color: '#4B5563', fontSize: '15px' }}>
          <li><strong>Direct Contact Access:</strong> View all your contacts directly in the sidebar without searching through hidden menus.</li>
          <li><strong>Real-Time P2P Calling:</strong> Crystal-clear voice and video calling powered by direct WebRTC connections.</li>
          <li><strong>24-Hour Status Stories:</strong> Share moments with your Gmail contacts that disappear after 24 hours, with full reshare support.</li>
          <li><strong>Cross-Device Freedom:</strong> Use Ping seamlessly on your desktop, laptop, tablet, or phone over any network.</li>
        </ul>

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '20px', fontSize: '13px' }}>
          <Link to="/privacy" style={{ color: '#0084FF', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link to="/terms" style={{ color: '#0084FF', textDecoration: 'none' }}>Terms of Service</Link>
          <Link to="/messages" style={{ color: '#0084FF', textDecoration: 'none' }}>Open Ping</Link>
        </div>
      </article>
    </div>
  )
}
