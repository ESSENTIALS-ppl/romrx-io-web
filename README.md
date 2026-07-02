# romrx-io-web

Corporate marketing site for **ROMRx LLC**, the operating system for athletic mobility.

Live: [romrx.io](https://romrx.io)

## Stack

Plain HTML / CSS / JS. Client-side partial injection (nav, universe footer, legal footer) via `/assets/partials.js`. No build step. Deployed to Netlify with a small set of Netlify Functions for form handling.

## Pages

| Route | Purpose |
|---|---|
| `/` | Home, Protocol-as-moat story, universe stack, investor band |
| `/universe` | Full upgrade path, all sport packs (live + coming) |
| `/platform` | Engine deep-dive, 14 joints, Protocol layer, ROMBot™, 6-Week Cycle |
| `/science` | Peer-reviewed citations |
| `/investors` | Thesis, platform diagram, market, gated Request Access form |
| `/partners` | 3 tracks (Federations / Academies / Tactical), inquiry form |
| `/about` | Founder story + `#manifesto` anchor |
| `/assessment` | Free-assessment waitlist stub |
| `/legal` | Terms & Privacy |

## Netlify Functions

- `investor-request`, POST → Supabase `investor_requests` + email `investors@romrx.io`
- `partner-inquiry`, POST → Supabase `partner_inquiries` + email `partners@romrx.io`
- `waitlist`, POST → Supabase `sport_pack_waitlist`

## Required env vars (Netlify)

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
```

## Supabase tables to create

- `investor_requests`, name, email, firm, stage, notes, source, created_at
- `partner_inquiries`, name, email, org, track, athletes, notes, source, created_at
- `sport_pack_waitlist`, email, sport, sport_interest, notes, source, created_at (unique on email)

## Google Workspace aliases to create

- `investors@romrx.io` → forward to `send.jim.scott@gmail.com`
- `partners@romrx.io` → forward to `send.jim.scott@gmail.com`
- `hello@romrx.io` → forward to `send.jim.scott@gmail.com`
- `privacy@romrx.io` → forward to `send.jim.scott@gmail.com`
- `no-reply@romrx.io` → configured in Resend

## Design tokens

Cobalt `#3B5BFF` + Violet `#7C4DFF` on `#0A1020`. Inter Tight (display), Inter (body), JetBrains Mono (accents). See `/assets/design-tokens.css`.

## Legal locked-in

Trademark footer line (do not alter):

> © 2026 ROMRx LLC. Greenwood, Indiana. ROMRx™, ROMRx+BJJ™, ROMRx+BodyBuilding™, ROM Readiness Protocol™, Position Readiness Protocol™, Exercise Readiness Protocol™, ROMBot™, The 6-Week Reassessment Cycle™, Top 3 Priority Joints™ are trademarks of ROMRx LLC.
