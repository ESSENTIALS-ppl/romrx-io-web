/**
 * Radial scale for the My Body radar (v2, Jim 2026-09-24).
 *
 * CHOICE: r = (pct / 100)^2 (quadratic, 0 at centre, 1 on the Steady target circle).
 * Why: it stretches the top of the range, where the bands live, and still shows
 * low values without pinning any joint to the centre:
 *   89 vs 100 → 0.79 vs 1.00 (21% of the radius; linear gives 11%)
 *   90 (Building ring) → 0.81
 *   35 vs 66 → 0.12 vs 0.44 (still clearly separate, nothing hidden)
 * The alternative (linear with a 40% floor at the centre) gives similar top-end
 * contrast (89 → 0.82) but pins everything below 40% to the same centre point,
 * so fixture 02's Ankle DF (35%) would lose its value and need a special marker.
 */
export const RADAR_SCALE_NAME = 'quadratic' as const

export function radarRadius(pct: number | null | undefined): number {
  if (pct == null || !Number.isFinite(pct)) return 0
  const p = Math.max(0, Math.min(100, pct)) / 100
  return p * p
}

/** The rejected alternative, kept for the comparison test/screens only. */
export function radarRadiusFloor40(pct: number | null | undefined): number {
  if (pct == null || !Number.isFinite(pct)) return 0
  return Math.max(0, Math.min(100, pct) - 40) / 60
}

/** Where the Building threshold ring (90%) sits. */
export const BUILDING_RING_PCT = 90
