import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../lib/track'
import { captureUtmFromUrl } from '../lib/utm'
import { trackMetaPageView } from '../lib/metaAttribution'

/** Mount once inside BrowserRouter. Captures first-touch UTM; fires page_view on route change.
 * Meta PageView is hard-gated inside trackMetaPageView (flag off + consent). */
export function PageViewTracker() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    captureUtmFromUrl(search, `${pathname}${search}`)
    trackPageView(pathname)
    trackMetaPageView()
  }, [pathname, search])
  return null
}
