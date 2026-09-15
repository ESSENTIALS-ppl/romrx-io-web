import { useEffect, useState } from 'react'

// One-click marketing opt-out. Calls the `unsubscribe` edge function, which flips
// users.marketing_opt_out with the service role. The previous client-side update targeted a
// `profiles` table that does not exist and was blocked by RLS anyway, so every unsubscribe
// click errored and nobody was actually opted out (Base audit 2026-09-15).
const UNSUBSCRIBE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/unsubscribe`

export function Unsubscribe() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'missing'>('loading')
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get('email')

    if (!raw) {
      setStatus('missing')
      return
    }

    const decoded = decodeURIComponent(raw).trim().toLowerCase()
    setEmail(decoded)

    fetch(UNSUBSCRIBE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email: decoded }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setStatus('success')
      })
      .catch((err) => {
        console.error('Unsubscribe error:', err)
        setStatus('error')
      })
  }, [])

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <img
          src="/romrx-logo.png"
          alt="ROMRx"
          style={styles.logo}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />

        {status === 'loading' && (
          <>
            <h1 style={styles.heading}>Unsubscribing…</h1>
            <p style={styles.body}>Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 style={styles.heading}>You're unsubscribed.</h1>
            <p style={styles.body}>
              <strong>{email}</strong> has been removed from ROMRx marketing emails.
              You will no longer receive follow-up or renewal reminder emails.
            </p>
            <p style={styles.note}>
              Changed your mind? Re-enable emails anytime in your{' '}
              <a href="/app/dashboard/settings" style={styles.link}>account settings</a>.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 style={styles.heading}>Something went wrong.</h1>
            <p style={styles.body}>
              We couldn’t process your request. Email us at{' '}
              <a href="mailto:support@romrx.io" style={styles.link}>support@romrx.io</a>{' '}
              and we’ll remove you manually.
            </p>
          </>
        )}

        {status === 'missing' && (
          <>
            <h1 style={styles.heading}>Invalid link.</h1>
            <p style={styles.body}>
              This unsubscribe link is missing the email address. Please use the link
              directly from your email.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    fontFamily: 'Inter Tight, Inter, sans-serif',
    padding: '24px',
  },
  card: {
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '48px 40px',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
  },
  logo: {
    height: '48px',
    marginBottom: '32px',
  },
  heading: {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: 700,
    marginBottom: '16px',
  },
  body: {
    color: '#94A3B8',
    fontSize: '16px',
    lineHeight: 1.6,
    marginBottom: '16px',
  },
  note: {
    color: '#64748B',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  link: {
    color: '#60A5FA',
    textDecoration: 'underline',
  },
}
