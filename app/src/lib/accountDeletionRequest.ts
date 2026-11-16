// "Request account deletion" button (Jim GO 2026-09-24).
// Calls the romrxbjj-v2 edge function `request-account-deletion`, which emails
// privacy@romrx.io via Resend. Nothing is deleted or canceled by this flow.
// The success copy is only shown when the function confirms the email was sent.

// P1-23: Stacy's new label (2056 file, note 6).
export const DELETION_BUTTON_LABEL = 'Delete my account'
export const DELETION_SUCCESS_COPY =
  'We got your request. We will confirm by email and complete it within 30 days.'

// P1-23: the backend accepts all three sites (Avery contract).
export type DeletionSite = 'romrx.io' | 'romrxbjj.com' | 'romrxbodybuilding.com'

/** Which site the request is for, from the page host (www or apex). Anything else, including localhost, is romrx.io. */
export function deletionSiteForHost(hostname: string): DeletionSite {
  const h = hostname.toLowerCase().replace(/^www\./, '')
  if (h === 'romrxbjj.com') return 'romrxbjj.com'
  if (h === 'romrxbodybuilding.com') return 'romrxbodybuilding.com'
  return 'romrx.io'
}

export type DeletionResult =
  | { ok: true; resendId: string; alreadyOpen: boolean }
  | { ok: false; reason: 'rate_limited' | 'failed' }

type InvokeResult = { data: unknown; error: unknown }
export type InvokeFn = (name: string, opts: { body: Record<string, unknown> }) => Promise<InvokeResult>

function statusOf(error: unknown): number | undefined {
  const ctx = (error as { context?: { status?: unknown } } | null)?.context
  return typeof ctx?.status === 'number' ? ctx.status : undefined
}

export async function requestAccountDeletion(invoke: InvokeFn, site: DeletionSite): Promise<DeletionResult> {
  try {
    const { data, error } = await invoke('request-account-deletion', { body: { site } })
    if (error) {
      return { ok: false, reason: statusOf(error) === 429 ? 'rate_limited' : 'failed' }
    }
    const d = data as { ok?: unknown; resend_id?: unknown; already_open?: unknown } | null
    if (d && d.ok === true && typeof d.resend_id === 'string' && d.resend_id.length > 0) {
      return { ok: true, resendId: d.resend_id, alreadyOpen: d.already_open === true }
    }
    return { ok: false, reason: 'failed' }
  } catch {
    return { ok: false, reason: 'failed' }
  }
}

export function deletionErrorCopy(reason: 'rate_limited' | 'failed'): string {
  return reason === 'rate_limited'
    ? 'You already sent a request recently. Please wait an hour, or email privacy@romrx.io.'
    : "We couldn't send your request. Please try again, or email privacy@romrx.io." // P1-23: Stacy's error line
}
