import { useLayoutEffect, type RefObject } from 'react'

/**
 * ROMBot iPhone layout (Grant, Nov 24 2026): keep the chat column inside what the user can see.
 * - CSS (.rombot-chat in index.css) sizes the column with 100dvh and a 100vh fallback, minus its own top
 *   (--rombot-top, measured here because the phone nav wraps to more than one row), and pads the bottom
 *   with env(safe-area-inset-bottom).
 * - When window.visualViewport exists (iOS Safari, Chrome), the height follows the visual viewport, so the
 *   input and send button stay pinned above the keyboard when it opens.
 * - While mounted the page itself does not scroll; the messages list is the only scroller.
 * - On a short screen with the keyboard open, if the space under the app header would leave the messages list under
 *   MIN_LIST_PX, the column covers the whole visible area (fixed to the visual viewport, data-overlay) so the input
 *   stays pinned above the keyboard. It goes back in place when the keyboard closes.
 */
export const MIN_LIST_PX = 72

/** Column height so its bottom sits on the visible bottom; overlay when the space under the app header is too small. */
export function fitLayout(top: number, vv: { height: number; offsetTop: number }, fixedPart: number, minList = MIN_LIST_PX): { height: number; overlay: boolean } {
  const avail = Math.floor(vv.offsetTop + vv.height - top)
  if (avail >= Math.ceil(fixedPart + minList)) return { height: Math.max(0, avail), overlay: false }
  return { height: Math.max(0, Math.floor(vv.height)), overlay: true }
}

export function useFitToViewport(ref: RefObject<HTMLElement | null>, active = true) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!active || !el) return
    const html = document.documentElement
    const body = document.body
    const prev = { html: html.style.overflow, body: body.style.overflow, overscroll: body.style.overscrollBehavior }
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.overscrollBehavior = 'none'
    window.scrollTo(0, 0)

    const vv = window.visualViewport
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        // Measure the in-place position (not the overlay one).
        const wasOverlay = el.dataset.overlay === '1'
        if (wasOverlay) delete el.dataset.overlay
        const top = el.getBoundingClientRect().top
        el.style.setProperty('--rombot-top', `${Math.max(0, Math.round(top))}px`)
        if (vv) {
          const list = el.querySelector<HTMLElement>('[data-testid="rombot-messages"]')
          let fixedPart = 0
          for (const child of Array.from(el.children) as HTMLElement[]) {
            if (child === list) continue
            const cs = getComputedStyle(child)
            fixedPart += (child.getBoundingClientRect().height || 0) + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0)
          }
          const { height, overlay } = fitLayout(top, vv, fixedPart)
          el.style.setProperty('--rombot-h', `${height}px`)
          el.style.setProperty('--rombot-vv-top', `${Math.round(vv.offsetTop)}px`)
          el.dataset.vv = '1'
          if (overlay) el.dataset.overlay = '1'
        } else if (wasOverlay) el.dataset.overlay = '1'
      })
    }
    update()
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      cancelAnimationFrame(frame)
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      html.style.overflow = prev.html
      body.style.overflow = prev.body
      body.style.overscrollBehavior = prev.overscroll
    }
  }, [ref, active])
}
