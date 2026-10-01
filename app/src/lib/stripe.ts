// Live-mode Stripe price IDs. Shared by Unlock.tsx and MySport.tsx.
export const BASE_PRICE_ID = 'price_1TpvnqDou9Iktbw0GMayhIQ7'

export const SPORT_PRICE_IDS: Record<string, string> = {
  bjj: 'price_1TpvpxDou9Iktbw0hDQOEDwy',
  bodybuilding: 'price_1TpvriDou9Iktbw0oiHxtLfB',
}

export const CHECKOUT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`
