// Plain links only. No onClick, no tracking, no Meta, no analytics, no location lookup. Takes no props, so mood cannot affect it.
const L = 'underline'
export function CrisisLine() {
  return (
    <div className="text-xs text-slate-600 mt-4" data-testid="crisis-line">
      <p data-testid="crisis-intent">This is a support resource. ROMRx is not a crisis service and does not monitor your check-ins.</p>
      <p data-testid="crisis-text">Having a really hard time? In the US, you can <a className={L} href="tel:988">call</a> or <a className={L} href="sms:988">text</a> <a className={L} href="tel:988">988</a> anytime, free and confidential. In the UK or Ireland, call Samaritans free on <a className={L} href="tel:116123">116 123</a>. Elsewhere, <a className={L} href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">find a helpline</a>. If you are in danger, call your local emergency number.</p>
    </div>
  )
}
export function CrisisHelp() {
  return (
    <div className="text-sm text-cobalt-ink space-y-2" data-testid="crisis-help">
      <h3 className="font-semibold">Need to talk to someone?</h3>
      <p>ROMRx is a fitness app, not a crisis service. We do not monitor your check-ins and can't help in an emergency. If you are having a really hard time, these free services can help:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>US: <a className={L} href="tel:988">call</a> or <a className={L} href="sms:988">text 988</a>, or chat at <a className={L} href="https://988lifeline.org" target="_blank" rel="noopener noreferrer">988lifeline.org</a>. Veterans, call 988 and press 1, or text 838255. En español, llame al 988 y oprima 2, o envíe AYUDA al 988.</li>
        <li>UK and Ireland: call Samaritans free on <a className={L} href="tel:116123">116 123</a>, any time.</li>
        <li>Anywhere else: find a helpline at <a className={L} href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">findahelpline.com</a>.</li>
      </ul>
      <p>If you are in danger, call 911 (US), 999 (UK), 112 (Ireland and the EU), or your local emergency number.</p>
    </div>
  )
}
