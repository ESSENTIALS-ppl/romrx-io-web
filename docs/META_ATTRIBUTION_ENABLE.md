# Meta Pixel + CAPI: enable runbook

> **STATE AS OF 2026-10-01 (read this first; the rest of this file is the original enable runbook and is partly stale).**
> Pixel and CAPI are ENABLED in production, consent-gated, since Sep 24 (Jim GO). Spend is still on hold.
> - The three `META_ATTRIBUTION_ENABLED` flags are `true` on main (SPA, marketing JS, CAPI function).
> - Netlify production env has `VITE_META_PIXEL_ID`, `META_PIXEL_ID`, `META_CAPI_TOKEN` set (names only here; never print values).
> - Pixel ID `2284396799046573` is public and is in the live bundle.
> - Scope: US opt-out default and EU/UK opt-in, public signup pages only (`/app/signup`, `/app/signup/:sport`). GPC and Reject / Don't Sell turn off both Pixel and CAPI.
> - Events: PageView, Lead, CompleteRegistration (signup success only, PR #102). Browser Pixel and server CAPI share one `event_id` for dedupe. CAPI dedupe on our side is a best-effort in-memory set.
> - Test tooling (env only): `META_TEST_EVENT_CODE` sends to Events Manager Test Events; `META_CAPI_DRY_RUN=1` logs the request shape without sending.
> - Rollback: set the three flags to `false` and redeploy.
> - Live gate probes (Oct 1, no event sent): denied consent returns `consent_blocked`; non-signup path returns `path_not_allowed`; `Sec-GPC: 1` returns `gpc_opt_out`; foreign Origin returns 403; unknown event name returns 400.
> - NOT verified from our side: that Meta accepts the events with the stored token. Reid should confirm in Events Manager (use `META_TEST_EVENT_CODE`) before any ad spend.


**Status (Thu Sep 24, 2026):** Jim GO via Grant received. Pixel ID `2284396799046573` in hand (public; baked into `assets/meta-attribution.js`, inert while flag false). CAPI token received (secret, box only, never in repo). Consent gate hardened (see below). **BLOCKED on Netlify env:** no Netlify CLI auth on the ops box, so `VITE_META_PIXEL_ID`, `META_PIXEL_ID`, `META_CAPI_TOKEN` are not set. Hard flags stay `false` until env is set. SPEND HOLD: no ads, no Money GO.
**Sacred:** Do not invent Pixel IDs, CAPI tokens, or Jim Money GO / spend. Do not ship HOLD **1B** Pixel-ON banner until measurement is live.

## Consent gate hardening (2026-09-24)

- SPA + marketing: Meta runs only on public funnel routes (SPA: `/app/`, `/app/signup`, `/app/signup/:sport`, `/app/login`). Assessment, results, dashboard, unlock, and auth callbacks never send Pixel or CAPI.
- Any query key outside `utm_*`, `fbclid`, `sport`, `ref` (for example `email`, `name`, `lead`) blocks Meta on that page.
- SPA Pixel: `disablePushState = true` so fbevents never auto-fires PageView on in-app navigation.
- CAPI `event_source_url` is origin + path only (client and server), romrx.io hosts only.
- Server honors `Sec-GPC: 1` (returns `gpc_opt_out`) even if the body claims `granted`; rejects foreign `Origin`.
- Unchanged: GPC forces `denied` client-side, banner OK cannot override GPC, Reject / Don't Sell deny both paths, shared `event_id`, server allowlists `custom_data` to `content_name`, Advanced Matching OFF.

## Current live proof (keep green)

| Check | Expected |
|-------|----------|
| Page source / Network | No `fbevents.js`, no `connect.facebook.net` |
| `POST /api/attribution/meta` | `{"ok":true,"dispatched":false,"reason":"attribution_disabled"}` |
| Consent Reject / Don't Sell / GPC | Ads path denied; no Meta tags |

## Gates (all required)

1. Privacy + consent LIVE (done — Privacy B + kinder Don't Sell 1A).
2. Jim supplies **real** Pixel ID + CAPI token via Grant (never invent).
3. Reid Field PASS on consent + gated scaffold.
4. Separate enablement PR flipping hard flags (below).
5. HOLD 1B banner copy only after Pixel is actually on.
6. Spend / ads still needs separate Jim Money GO (not this doc).

## Env (empty = off)

| Var | Where | Role |
|-----|-------|------|
| `VITE_META_PIXEL_ID` | Netlify build (SPA) | Client Pixel ID; empty → no `fbevents.js` |
| `META_PIXEL_ID` | Netlify function env | CAPI pixel id |
| `META_CAPI_TOKEN` | Netlify function env (secret) | CAPI access token; server-only |

Optional marketing override (static pages): set `window.__ROMRX_META_PIXEL_ID` before `/assets/meta-attribution.js` — still blocked while hard flag is false.

## Code hard flags (must flip together)

| File | Constant |
|------|----------|
| `app/src/lib/metaAttribution.ts` | `META_ATTRIBUTION_ENABLED = false` |
| `netlify/functions/meta-capi.js` | `META_ATTRIBUTION_ENABLED = false` |
| `assets/meta-attribution.js` | `META_ATTRIBUTION_ENABLED = false` |

Consent must still be `granted` and Pixel ID non-empty. Reject / Don't Sell / GPC kill Pixel **and** CAPI.

## Enable checklist (future PR)

1. Receive Pixel ID + CAPI token from Jim via Grant.
2. Set Netlify env: `VITE_META_PIXEL_ID`, `META_PIXEL_ID`, `META_CAPI_TOKEN` (token secret).
3. Flip the three hard flags to `true` in one PR; redeploy.
4. Ship HOLD **1B** banner variant (names ads measurement) — separate copy GO.
5. Reid Field: Allow → Pixel + CAPI fire with shared `event_id`; Reject/GPC → zero Meta.
6. Rollback = set flags false + clear env IDs.

## Out of scope here

- Inventing IDs/tokens
- Enabling live measurement without Jim
- Money GO / paid Meta spend
- 1B banner while Pixel PARKED
