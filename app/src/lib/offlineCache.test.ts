import { describe, expect, it, vi } from 'vitest'
import { startOfflineCache, unregisterOfflineWorker } from './offlineCache'
import { SW_SCOPE, SW_URL } from './offlineCachePolicy'

describe('P1-26 register and kill switch', () => {
  it('registers only when the flag is on', async () => {
    const register = vi.fn(async () => ({}))
    const getRegistrations = vi.fn(async () => [])
    const container = { register, getRegistrations }
    const off = await startOfflineCache({ env: {}, container, cachesApi: { keys: async () => [], delete: async () => true } })
    expect(off).toBe('unregistered')
    expect(register).not.toHaveBeenCalled()

    const on = await startOfflineCache({
      env: { VITE_P1_26_OFFLINE_CACHE: 'on' },
      container,
      cachesApi: { keys: async () => [], delete: async () => true },
    })
    expect(on).toBe('registered')
    expect(register).toHaveBeenCalledWith(SW_URL, { scope: SW_SCOPE })
  })

  it('kill switch unregisters the worker and deletes our caches only', async () => {
    const unregister = vi.fn(async () => true)
    const container = {
      register: vi.fn(),
      getRegistrations: async () => [
        { scope: 'https://romrx.io/app/', active: { scriptURL: 'https://romrx.io/app/sw.js' }, unregister },
        { scope: 'https://romrx.io/other/', active: { scriptURL: 'https://romrx.io/other/sw.js' }, unregister },
      ],
    }
    const deleted: string[] = []
    const r = await unregisterOfflineWorker(container, {
      keys: async () => ['romrx-p1-26-shell-v1', 'unrelated-cache'],
      delete: async (n) => { deleted.push(n); return true },
    })
    expect(r.unregistered).toBe(1)
    expect(unregister).toHaveBeenCalledTimes(1)
    expect(deleted).toEqual(['romrx-p1-26-shell-v1'])
  })

  it('reports unsupported when there is no service worker container', async () => {
    const r = await startOfflineCache({ env: { VITE_P1_26_OFFLINE_CACHE: 'on' }, container: null })
    expect(r).toBe('unsupported')
  })
})
