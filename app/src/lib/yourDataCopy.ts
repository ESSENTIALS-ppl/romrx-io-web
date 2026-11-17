// P1-23 Settings "Your data" words: Stacy, /workspace/process/evidence/STACY-P1-23-WORDS-20261115-2056.md, character for character
// (also in Avery's CLIENT-API-CONTRACT-FOR-JULES.md). Jim yes needed before live (NEEDS JIM WORDING, Stacy note 1).
// Existing strings Stacy kept unchanged stay where they are: EXPORT_BUTTON_LABEL, EXPORT_REAUTH_COPY, EXPORT_ERROR_COPY
// (lib/exportMyData.ts), DELETION_SUCCESS_COPY (lib/accountDeletionRequest.ts), DELETION_STATUS_COPY (lib/deletionStatus.ts).
export const YOUR_DATA_COPY = {
  title: 'Your data',
  intro: 'Download a copy of your ROMRx data, or ask us to delete your account.',
  exportHelp: "Get a copy of your ROMRx data as a file. It includes your profile, assessments and results, plan, sessions, ROMBot chats, saved mood check-ins, feedback you've sent and settings.",
  exportBusy: 'Preparing your file...',
  exportSuccess: 'Your file is downloading. Keep it somewhere safe. It has your personal information in it.',
  deleteButton: 'Delete my account',
  deleteHelp: 'Sends a request to our privacy team. We finish within 30 days.',
  dialogTitle: 'Delete your account?',
  // Dialog body, in Stacy's order. The plan line (index 3) is the cancel-first line: Avery's function does not cancel Stripe.
  dialogBody: [
    "We'll delete your account and the personal information tied to you. That includes your profile, assessments and results, plan and session history, ROMBot chats, mood check-ins, feedback you've sent and settings.",
    'We finish within 30 days and email you to confirm.',
    'What we may keep: data that is already anonymized or combined so it no longer identifies you, such as group statistics. Emails we already sent stay in your inbox.',
    "Your plan: to make sure you aren't charged again, cancel your plan in Subscription before you send this request. All sales are final.",
    'Want a copy first? Export your data before you send this request.',
    "Once it's done, it can't be undone.",
  ],
  confirmLabel: 'Type DELETE to confirm',
  confirmPlaceholder: 'Type DELETE',
  cancel: 'Cancel',
  send: 'Send delete request',
  sending: 'Sending...',
  alreadyOpen: "You already have a delete request open. We'll email you when it's done.",
  error: "We couldn't send your request. Please try again, or email privacy@romrx.io.",
  emailFallback: 'Prefer email? Write to privacy@romrx.io from the email on your account. We respond within 30 days.',
} as const

/** Index of the cancel-first plan line in dialogBody (shown before the confirm field and the send button). */
export const PLAN_LINE_INDEX = 3
/** Index of the "Want a copy first? Export..." line. It and the intro point at export, so they are not shown while export
 *  is hidden (Vera F1, parent 9:45 PM ET): words removed from the screen only, nothing added. They return with export. */
export const EXPORT_LINE_INDEX = 4

/** Dialog lines to show: all of Stacy's lines in her order, minus the export line while export is hidden. */
export function dialogLines(exportOn: boolean): { line: string; index: number }[] {
  return YOUR_DATA_COPY.dialogBody.map((line, index) => ({ line, index })).filter(l => exportOn || l.index !== EXPORT_LINE_INDEX)
}
