import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { isStripeTestRequested } from './lib/stripeTestMode'
import { startOfflineCache } from './lib/offlineCache'

// Latch ?stripe_test=1 for this tab as soon as the app loads. Before, the flag was only stored the first time a
// checkout/portal request was built, so landing on /login?stripe_test=1 and later opening Settings lost it and the
// Cancel button called the portal with the LIVE key (404 'No active subscription to cancel.'). The server still
// ignores the flag unless the signed-in user passes is_test_account, so this cannot move a real user to test mode.
isStripeTestRequested()

// P1-26: register the offline cache worker only when VITE_P1_26_OFFLINE_CACHE=on; otherwise unregister.
void startOfflineCache({
  getAccessToken: async () => {
    const { supabase } = await import('./lib/supabase')
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  },
  getUserId: async () => {
    const { supabase } = await import('./lib/supabase')
    const { data } = await supabase.auth.getSession()
    return data.session?.user?.id ?? null
  },
  apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
