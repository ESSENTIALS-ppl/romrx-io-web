# Resend notes for the PRP email (read-only research, Mon Oct 26 2026, about 8:45 PM ET)
I used only the public docs. I did not open the account, use an API key or make any live change.

## What the code sends
- The PRP email goes through Resend: `fetch("https://api.resend.com/emails")` at submit-assessment v38 index.ts:136. The Base sender is `Jim Scott <jim@romrx.io>` with reply_to jim@romrx.io (index.ts:84-85).
- The request body (v38 index.ts:139-147) holds from, to, reply_to, subject, html, a custom header `X-Entity-Ref-ID` and three tags (stage, email_id, sport). No tracking field is set, and the send-email API has none (see 1). The new mood block adds nothing to the subject, tags, headers or URLs. A deno test checks this (mood_block.test.ts, last test).

## 1. Open and click tracking: set PER DOMAIN, not per send
- "Open and click tracking is disabled by default for all domains. These settings apply to all emails sent from that domain." https://resend.com/docs/dashboard/domains/tracking
- Tracking is active only when open_tracking or click_tracking is on for the domain AND a tracking subdomain is configured and verified (same page). The setting is changed with `PATCH /domains/:domain_id` (`open_tracking`, `click_tracking`): https://resend.com/docs/api-reference/domains/update-domain and https://resend.com/changelog/update-click-open-tracking-via-api
- The send-email API (https://resend.com/docs/api-reference/emails/send-email) has no per-email tracking field. Its options are headers, tags, attachments and similar.
- So: if romrx.io has tracking on, it covers every email from that domain, including the PRP email. Turning it off is a live account change on the romrx.io domain, so Jim must OK it (or do it himself in Dashboard > Domains > romrx.io > Configuration). The code can't tell whether it's on, because we can't read the account. Jim, or someone he names, should check the romrx.io domain's Configuration tab. If no tracking subdomain is set up, tracking is off by default.
- Our CTA links are plain `${c.domain}${c.ctaPath}` (index.ts:104, :122). With click tracking on, Resend would rewrite them through a tracking subdomain.

## 2. Retention: no customer-set shorter retention on Free/Pro/Scale
- "While your account is active, email and log data is retained for 30 days on Free, Pro, and Scale plans. Enterprise plans include flexible data retention." "When you terminate your use of the Services, remaining customer data is deleted within 90 days of account termination ... Backups persist for 7 days." "If you need a specific message removed before the retention window ends, contact us." https://resend.com/security/gdpr
- "Backups are persisted for 7 days." https://resend.com/security
- API request logs keep "the full request and response bodies", and "Resend keeps 30 days of activity." https://resend.com/docs/knowledge-base/how-to-handle-a-leaked-api-key That means the mood averages in the html also sit in the request log for about 30 days.
- The pricing page lists "30-day data retention" on Free and "flexible data retention" on Enterprise only. https://resend.com/pricing
- I found no dashboard setting for a shorter retention. The only options are 30 days (fixed), Enterprise, or asking support to remove specific messages.
- Updated Oct 26 2026, 8:57 PM ET: the 7A deletion line now says "our email provider keeps a copy of sent emails for up to 30 days", which matches the public docs (30 days while the account is active; it was "a limited time" before). Caveat: the API request log (with the html) and 7-day backups follow the same 30-day window, and Enterprise plans can differ, so "up to 30 days" holds on Free, Pro and Scale only.

## Also worth knowing (not asked)
- The Resend Free plan allows 100 emails a day (https://resend.com/pricing). If the romrx.io account is on Free, hundreds of users would hit that cap whether or not mood is included. Which plan the account is on can't be read without access, so Jim needs to check.

## Decisions for Jim
- Check, and if needed turn off, open and click tracking on the romrx.io domain in Resend. This is a live change.
- Confirm the Resend plan and which account owns the key (Stacy's low-priority item).
