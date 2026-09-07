import { Link } from 'react-router-dom'
import SeoHead from './SeoHead'

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100%', overflowY: 'auto', backgroundColor: '#F0F2F5', color: '#111B21' }}>
      <SeoHead
        title="Privacy Policy — Ping"
        description="Learn how Ping protects your personal privacy and direct communications."
        keywords="ping privacy, private messaging, secure chat, end to end"
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
          Privacy Policy
        </h1>
        <p style={{ fontSize: '15px', color: '#6B7280', marginBottom: '28px' }}>
          Last updated: September 2026
        </p>

        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111B21', margin: '24px 0 8px' }}>
          1. Direct Peer Communication
        </h2>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#4B5563', marginBottom: '16px' }}>
          Calls and audio/video media are routed peer-to-peer (P2P) via WebRTC where possible. We do not sell your personal data or read your private correspondence for advertising.
        </p>

        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111B21', margin: '24px 0 8px' }}>
          2. Contact Privacy & Status Updates
        </h2>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#4B5563', marginBottom: '16px' }}>
          Your 24-hour status stories are shared exclusively with registered contacts who have your Gmail address. Status updates automatically expire after 24 hours.
        </p>

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '20px', fontSize: '13px' }}>
          <Link to="/about" style={{ color: '#0084FF', textDecoration: 'none' }}>About Ping</Link>
          <Link to="/terms" style={{ color: '#0084FF', textDecoration: 'none' }}>Terms of Service</Link>
          <Link to="/messages" style={{ color: '#0084FF', textDecoration: 'none' }}>Open Ping</Link>
        </div>
      </article>
    </div>
  )
}
