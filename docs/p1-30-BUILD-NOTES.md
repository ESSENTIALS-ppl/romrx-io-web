# P1-30 BUILD-NOTES — CSP header for /app

STARTED: Sun Nov 15, 2026, 8:52 PM ET (America/New_York). Branch only, not deployed.

Branch: romrx-io-web `fix/p1-30-csp-header-20261115`.

- Policy built from live `/app` HTML + JS hosts, checked ~8:53 PM ET Nov 15, 2026. Live `/app` had no CSP (HSTS / nosniff / SAMEORIGIN / referrer / Permissions-Policy only).
- Hosts allowed: self, fonts.googleapis.com / fonts.gstatic.com, project supabase (https + wss), romrx.io, billing.stripe.com, connect.facebook.net and www.facebook.com (consent-gated pixel). No js.stripe.com (not in the bundle). Crisis and sport URLs are links, not fetches.
- The branch ships **Content-Security-Policy-Report-Only** on `/app`, `/app/`, and `/app/*`. No report-uri yet (browser console only). Enforce variant is `netlify.csp-enforce.snippet.toml`.
- style-src has 'unsafe-inline' (React style attributes + Google Fonts). script-src does not; Meta Pixel may show violations under report-only.
