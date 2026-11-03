import { describe, it, expect } from 'vitest'
import { urlBase64ToUint8Array, enablePush } from './pushSubscribe'

describe('pushSubscribe', () => {
  it('decodes a base64url VAPID key', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3])
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255])
  })
  it('reports unsupported when there is no Notification/serviceWorker (node)', async () => {
    const r = await enablePush(async () => ({ data: null, error: null }), 'AQID')
    expect(r).toEqual({ ok: false, reason: 'unsupported' })
  })
})
