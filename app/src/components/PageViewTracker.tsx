import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../lib/track'

/** Mount once inside BrowserRouter. Fires page_view on every route change. */
export function PageViewTracker() {
  const { pathname } = useLocation()
  useEffect(() => { trackPageView(pathname) }, [pathname])
  return null
}
