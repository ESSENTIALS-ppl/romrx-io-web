import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { isStripeTestRequested } from './lib/stripeTestMode'

// Latch ?stripe_test=1 for this tab as soon as the app loads. Before, the flag was only stored the first time a
// checkout/portal request was built, so landing on /login?stripe_test=1 and later opening Settings lost it and the
// Cancel button called the portal with the LIVE key (404 'No active subscription to cancel.'). The server still
// ignores the flag unless the signed-in user passes is_test_account, so this cannot move a real user to test mode.
isStripeTestRequested()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
