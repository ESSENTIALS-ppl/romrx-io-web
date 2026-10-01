/**
 * Minimal GPC honor unit checks (Stacy Field-test C.3 companion).
 * Run: node scripts/gpc-consent-unit.mjs
 * Does not enable Pixel. Asserts storage write rules only.
 */
let gpc = false
const store = new Map()

function gpcEnabled() { return gpc === true }
function writeConsent(state) {
  const effective = gpcEnabled() && state === 'granted' ? 'denied' : state
  store.set('romrx.consent.v1', { state: effective })
  return store.get('romrx.consent.v1')
}
function effectiveConsentState() {
  if (gpcEnabled()) {
    const existing = store.get('romrx.consent.v1')
    if (!existing || existing.state === 'granted' || existing.state === 'unknown') {
      writeConsent('denied')
    }
    return 'denied'
  }
  return store.get('romrx.consent.v1')?.state ?? 'unknown'
}
function isAdsMeasurementAllowed() {
  return effectiveConsentState() === 'granted'
}

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg)
  console.log('PASS:', msg)
}

store.clear(); gpc = false
assert(writeConsent('granted').state === 'granted', 'GPC off + OK → granted')
assert(isAdsMeasurementAllowed() === true, 'GPC off + granted → ads allowed')

store.clear(); gpc = true
assert(writeConsent('granted').state === 'denied', 'GPC on + OK must NOT grant (C.3)')
assert(effectiveConsentState() === 'denied', 'GPC on → effective denied')
assert(isAdsMeasurementAllowed() === false, 'GPC on → ads measurement blocked')

store.clear(); gpc = false; writeConsent('granted')
gpc = true
assert(effectiveConsentState() === 'denied', 'GPC turns on after prior grant → denied')
assert(store.get('romrx.consent.v1').state === 'denied', 'prior grant rewritten to denied under GPC')

store.clear(); gpc = true
assert(writeConsent('denied').state === 'denied', 'GPC on + DNS/S deny → denied')

console.log('All GPC unit checks passed.')
