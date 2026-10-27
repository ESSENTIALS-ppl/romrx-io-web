# ROMood daily: copy Stacy still needs to write (feat/romood-daily)

**Update Oct 26 2026, 8:45 PM ET: DONE. All 5 strings below are replaced with Stacy-final text (commit on feat/romood-daily); the drafts below are kept for history only.**
Every string still marked STACY-COPY-PENDING is in app/src/lib/romoodCopy.ts, in `ROMOOD_QUICK_COPY`. They appear on the quick check-in screen at /dashboard/mood (app/src/pages/QuickMood.tsx). The UI shows the text after the `STACY-COPY-PENDING: ` prefix. Today romoodDaily.test.tsx:149 checks that these 5 strings DO carry the prefix. When Stacy's text arrives, replace the strings and change that test to check they don't.

| Key (line) | When it shows | Draft |
|---|---|---|
| notSaved (157) | VITE_ROMOOD_SAVE is off, so the dial works but nothing is stored | Saving mood check-ins is not turned on yet, so this check-in is not saved. |
| tickToSave (159) | Saving is on, but the user has not ticked the current (v2, email) opt-in text | Tick the box below to save this check-in. |
| saved (161) | Save succeeded | Check-in saved. |
| capReached (163) | Database daily cap reached (4 per America/New_York day, error RM429) | You have saved 4 check-ins today. You can check in again tomorrow. |
| saveFailed (165) | Any other save error | We could not save this check-in. Please try again. |

These plain strings are not marked pending, but Stacy can change them: heading "ROMood check", "Back to My Body", "Save check-in", "Done", and the My Body button "Quick ROMood check".

## Already Stacy-final (used verbatim, no action needed)
- Opt-in text (romoodCopy.ts optInBefore): "...over time, in the app and in my results email. I can turn this off..." This text is consent version v2-email-20261026.
- legal.html 7A: the replacement paragraph from stacy-romood-daily-email-7a-20261026.md, plus the addendum deletion line "...Results emails we already sent you stay in your inbox, and our email provider keeps a copy of sent emails for up to 30 days." (Stacy Addendum 2, 8:58 PM ET; replaced "may keep ... for a limited time")
- Settings delete confirm: "Emails we already sent you are not affected." added after "This cannot be undone."
- PRP email mood block (heading, body, crisis footer) in submit-assessment/mood_block.ts.

## For Stacy to know about 7A
- Resend's public docs say sent email and logs are kept 30 days while the account is active (not just "deleted within 90 days after termination"). 7A now says "up to 30 days" (8:57 PM ET). See RESEND-NOTES.md.
