import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { track } from '../lib/track'

function kcalBucket(kcal: number): string {
  if (kcal < 1500) return 'under_1500'
  if (kcal < 2000) return '1500_1999'
  if (kcal < 2500) return '2000_2499'
  if (kcal < 3000) return '2500_2999'
  if (kcal < 3500) return '3000_3499'
  return '3500_plus'
}

function fluidBucketL(liters: number): string {
  if (liters < 0.5) return 'under_0_5'
  if (liters < 1) return '0_5_0_9'
  if (liters < 2) return '1_0_1_9'
  if (liters < 3) return '2_0_2_9'
  return '3_0_plus'
}

/** Fire-and-forget My Fuel Calculate -> product_events. No PII. */
export function FuelCalculateTracker() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (!pathname.includes('/dashboard/my-fuel')) return
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('button')
      if (!btn) return
      const label = (btn.textContent || '').trim()
      const nutrition = label === 'Calculate my fuel plan'
      const hydration = label === 'Calculate my hydration needs'
      if (!nutrition && !hydration) return
      window.setTimeout(() => {
        const text = document.body.innerText || ''
        if (nutrition) {
          const m = text.match(/≈\s*([\d,]+)\s*kcal/)
          const kcal = m ? Number(m[1].replace(/,/g, '')) : null
          track('fuel_nutrition_calculated', {
            fuel_mode: 'nutrition',
            kcal: Number.isFinite(kcal as number) ? kcal : null,
            kcal_bucket: kcal && Number.isFinite(kcal) ? kcalBucket(kcal) : null,
          })
        } else {
          const m = text.match(/(\d+\.\d+|\d+)\s*L/)
          const fluid = m ? Number(m[1]) : null
          track('fuel_hydration_calculated', {
            fuel_mode: 'hydration',
            fluid_l: Number.isFinite(fluid as number) ? fluid : null,
            fluid_bucket: fluid && Number.isFinite(fluid) ? fluidBucketL(fluid) : null,
          })
        }
      }, 50)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [pathname])
  return null
}
