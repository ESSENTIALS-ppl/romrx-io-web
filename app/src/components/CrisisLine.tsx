// Plain links only. No onClick, no tracking, no Meta, no analytics, no location lookup. Takes no props, so mood cannot affect it.
import { CRISIS_SCREEN_INTENT, CRISIS_HELP_TITLE, CRISIS_HELP_INTRO, CRISIS_HELP_DANGER, CRISIS_LINE_PARTS as P, CRISIS_HELP_US_PARTS as U, CRISIS_HELP_UK_PARTS as K, CRISIS_HELP_ELSE_PARTS as E } from '../lib/crisisCopy'
const L = 'underline'
export function CrisisLine() {
  return (
    <div className="text-xs text-slate-600 mt-4" data-testid="crisis-line">
      <p data-testid="crisis-intent">{CRISIS_SCREEN_INTENT}</p>
      <p data-testid="crisis-text">{P[0]}<a className={L} href="tel:988">{P[1]}</a>{P[2]}<a className={L} href="sms:988">{P[3]}</a>{P[4]}<a className={L} href="tel:988">{P[5]}</a>{P[6]}<a className={L} href="tel:116123">{P[7]}</a>{P[8]}<a className={L} href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">{P[9]}</a>{P[10]}</p>
    </div>
  )
}
export function CrisisHelp() {
  return (
    <div className="text-sm text-cobalt-ink space-y-2" data-testid="crisis-help">
      <h3 className="font-semibold">{CRISIS_HELP_TITLE}</h3>
      <p>{CRISIS_HELP_INTRO}</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>{U[0]}<a className={L} href="tel:988">{U[1]}</a>{U[2]}<a className={L} href="sms:988">{U[3]}</a>{U[4]}<a className={L} href="https://988lifeline.org" target="_blank" rel="noopener noreferrer">{U[5]}</a>{U[6]}</li>
        <li>{K[0]}<a className={L} href="tel:116123">{K[1]}</a>{K[2]}</li>
        <li>{E[0]}<a className={L} href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">{E[1]}</a>{E[2]}</li>
      </ul>
      <p>{CRISIS_HELP_DANGER}</p>
    </div>
  )
}
