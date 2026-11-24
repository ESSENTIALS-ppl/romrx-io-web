import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// J5: the results Unlock no longer calls activate-beta-base first. It goes straight to card checkout
// (create-checkout-session, mode 'base').
const src = readFileSync(resolve(__dirname, '../pages/ResultsPreview.tsx'), 'utf8')
// code lines only (comments may still describe how earlier beta accounts were activated)
const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
const h = src.slice(src.indexOf('const handleUnlock'), src.indexOf('if (loading) return'))

describe('J5: Unlock goes straight to card checkout', () => {
  it('has no activate-beta-base call or free-unlock fallthrough anywhere in ResultsPreview', () => {
    expect(code).not.toMatch(/activate-beta-base|BETA_ACTIVATE_URL|free_unlock|beta_ended|checkout_required/)
  })
  it('the first and only fetch in handleUnlock is CHECKOUT_URL with mode base', () => {
    const fetches = h.match(/fetch\(([A-Z_]+)/g) ?? []
    expect(fetches).toEqual(['fetch(CHECKOUT_URL'])
    expect(h).toMatch(/mode: 'base',\n\s+user_id: user\.id,/)
    expect(h.indexOf("mode: 'base'")).toBeLessThan(h.indexOf('fetch(CHECKOUT_URL'))
    expect(h).toContain('if (checkoutData.url) { window.location.href = checkoutData.url; return }')
  })
})
