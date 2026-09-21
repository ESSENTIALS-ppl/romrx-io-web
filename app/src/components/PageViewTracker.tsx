import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../lib/track'
import { captureUtmFromUrl } from '../lib/utm'

/** Mount once inside BrowserRouter. Captures first-touch UTM; fires page_view on route change. */
export function PageViewTracker() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    captureUtmFromUrl(search, `${pathname}${search}`)
    trackPageView(pathname)
  }, [pathname, search])
  return null
}
