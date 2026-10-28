// Words the member sees for assessment progress saving. Stacy's ruling (Oct 28 2026):
//  - resume line: "Your answers are saved for 48 hours after your last step."
//  - leave sheet text (signed in): cleared as drafted.
// The signed-out leave line is NEW (nothing is saved without an account): Stacy to confirm.
export const RESUME_TITLE = 'Resume where you left off'
export const RESUME_RETENTION = 'Your answers are saved for 48 hours after your last step.'
export const RESUME_BUTTON = 'Resume'
export const START_OVER_BUTTON = 'Start over'
export const START_OVER_CONFIRM = 'Tap again to erase my saved answers and start over'
export const resumeProgressLine = (done: number, total: number) => `You finished ${done} of ${total} steps.`

export const LEAVE_TITLE = 'Leave the assessment?'
export const LEAVE_SAVED =
  'Your progress is saved. You can pick up where you left off, on this or any device, for the next 48 hours.'
export const LEAVE_UNSAVED_LAST =
  'Your last step is not saved yet. Stay a moment, or it will be kept on this device only.'
export const LEAVE_SIGNED_OUT = 'Your answers are not saved because you are not signed in. If you leave, you will start over.'
export const LEAVE_STAY = 'Stay'
export const LEAVE_LEAVE = 'Leave'

export const SAVE_STATUS_SAVED = 'Saved'
export const SAVE_STATUS_FAILED = 'Not saved yet. We will keep trying.'
