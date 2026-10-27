# Where every Stacy string comes from
Source file for all of them: /workspace/beta-launch/proof-20261020/stacy-romood-daily-email-7a-20261026.md (checked word for word by script, Oct 26 2026, about 9:00 PM ET).
Section names are the headings in that file. "Code" is where the string lives in the repos.

| String | Source section | Code |
|---|---|---|
| legal.html:131 deletion line ("...our email provider keeps a copy of sent emails for up to 30 days.") | Addendum 2 (8:58:06 PM), "legal.html:131" | /workspace/romood-daily/legal.html:131. MATCH (exact). |
| notSaved "Saving check-ins isn't turned on yet, so this one won't be saved." | Addendum 2, ROMOOD_QUICK_COPY | app/src/lib/romoodCopy.ts, ROMOOD_QUICK_COPY.notSaved. MATCH |
| tickToSave "To save this check-in, tick the box below." | Addendum 2 | romoodCopy.ts ROMOOD_QUICK_COPY.tickToSave. MATCH |
| saved "Check-in saved." | Addendum 2 | romoodCopy.ts ROMOOD_QUICK_COPY.saved. MATCH |
| capReached "You've saved 4 check-ins today. You can check in again tomorrow." | Addendum 2 | romoodCopy.ts ROMOOD_QUICK_COPY.capReached. MATCH |
| saveFailed "We couldn't save this check-in. Please try again." | Addendum 2 | romoodCopy.ts ROMOOD_QUICK_COPY.saveFailed. MATCH |
| Plain strings "ROMood check", "Back to My Body", "Save check-in", "Done", "Quick ROMood check" | Addendum 2 ("Leave the plain strings as they are") | romoodCopy.ts ROMOOD_QUICK_COPY.heading, backToMyBody, save, done, myBodyButton. MATCH |
| Email block heading, body, crisis footer | main file, email block section | /workspace/romood-daily-backend/supabase/functions/submit-assessment/mood_block.ts (renderMoodBlock). Body now reads "1 time" or "N times" (Grant decision 8:55 PM, from Quinn's grammar nit). |
| New opt-in text | main file, opt-in section | romoodCopy.ts optInBefore |
| 7A mood paragraph | main file, section 3 (7A replacement) | legal.html:130 |
| Settings "Emails we already sent you are not affected." (after "This cannot be undone.") | main file, line 37 | romoodCopy.ts deleteConfirm (:82) |
Note: the Addendum 1 deletion line ("may keep a copy ... for a limited time", file line 36) is superseded by Addendum 2. Addendum 2 also says: if the Resend account is ever closed, check the 30-day line again (post-termination up to 90 days).
