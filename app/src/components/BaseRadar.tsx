import { useState } from 'react'
import { bandFull, BAND_HEX, type RadarSideRow } from '../lib/mobilityBands'
import { radarRadius, BUILDING_RING_PCT } from '../lib/radarScale'

// My Body radar v2 (Jim 2026-09-24): the SHAPE shows imbalance.
//  - Two outlines: Left (solid dark slate) and Right (dashed teal), each side's
//    % of the Base target. Midline joints put one value on both lines.
//  - Steady target = dashed cobalt reference circle. The gap between the
//    worse-side shape and that circle is tinted, so a weak joint is a dent.
//  - Quadratic radial scale (lib/radarScale): 89 vs 100 and 35 vs 66 stay obvious.
//  - Band-coloured dots on the worse side only; 90% Building ring kept.

export const RADAR_LEFT_COLOR = '#334155' // slate-700, solid
export const RADAR_RIGHT_COLOR = '#0F766E' // teal-700, dashed
const RIGHT_DASH = '6 4'
const TARGET_COLOR = '#1D4ED8' // cobalt = Steady
const TARGET_DASH = '2 4'
const GAP_TINT = 'rgba(239, 68, 68, 0.14)' // light red

const W = 360
const H = 320
const CX = W / 2
const CY = 158
const R = 112

type RadiusFn = (pct: number | null | undefined) => number
function fmt(p: number | null): string {
  return p == null ? '-' : `${p}%`
}

/** `radius` is only for scale comparisons (default = the chosen quadratic scale). */
export function BaseRadar({ rows, radius = radarRadius }: { rows: RadarSideRow[]; radius?: RadiusFn }) {
  const [active, setActive] = useState<number | null>(null)
  const point = (i: number, count: number, pct: number): [number, number] => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / count
    const r = R * radius(pct)
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
  }
  const polygon = (values: number[]): string =>
    values.map((v, i) => point(i, values.length, v).map(x => x.toFixed(1)).join(',')).join(' ')
  const n = rows.length
  if (n < 3) return null
  const worse = rows.map(r => r.worse)
  const ringR = R * radius(BUILDING_RING_PCT)
  const act = active != null ? rows[active] : null

  return (
    <div className="relative" onMouseLeave={() => setActive(null)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto max-h-[320px]"
        role="img"
        aria-label="ROM profile radar: left and right side as a percent of your Base target"
        data-radar="base-v2"
      >
        {/* Gap to target: tint the whole target disc, then cover the worse-side shape */}
        <circle cx={CX} cy={CY} r={R} fill={GAP_TINT} />
        <polygon points={polygon(worse)} fill="#ffffff" />

        {/* Spokes */}
        {rows.map((_, i) => {
          const [x, y] = point(i, n, 100)
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke={active === i ? '#94a3b8' : '#e2e8f0'} strokeWidth={1} />
        })}

        {/* 90% Building ring */}
        <circle cx={CX} cy={CY} r={ringR} fill="none" stroke="#cbd5e1" strokeWidth={1} data-ring="building-90" />
        <text x={CX + 3} y={CY - ringR + 10} fontSize={8} fill="#94a3b8">90%</text>

        {/* Steady target reference circle */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={TARGET_COLOR} strokeWidth={1.5} strokeDasharray={TARGET_DASH} data-ring="steady-target" />
        {/* Label sits in the empty bottom-left corner, outside the plot: never collides with lines */}
        <g data-label="steady-target">
          <line x1={6} y1={H - 10} x2={24} y2={H - 10} stroke={TARGET_COLOR} strokeWidth={1.5} strokeDasharray={TARGET_DASH} />
          <text x={28} y={H - 7} fontSize={9} fontWeight={600} fill={TARGET_COLOR}>Steady target</text>
        </g>

        {/* Right (dashed teal) then Left (solid slate) on top */}
        <polygon
          points={polygon(rows.map(r => r.right))}
          fill="none" stroke={RADAR_RIGHT_COLOR} strokeWidth={2} strokeDasharray={RIGHT_DASH} strokeLinejoin="round"
          data-series="right"
        />
        <polygon
          points={polygon(rows.map(r => r.left))}
          fill="none" stroke={RADAR_LEFT_COLOR} strokeWidth={2} strokeLinejoin="round"
          data-series="left"
        />

        {/* Worse-side dots, band coloured; hover targets per joint */}
        {rows.map((r, i) => {
          const [x, y] = point(i, n, r.worse)
          const [lx, ly] = point(i, n, 100)
          const a = -Math.PI / 2 + (2 * Math.PI * i) / n
          const tx = CX + (R + 16) * Math.cos(a)
          const ty = CY + (R + 16) * Math.sin(a)
          const anchor = Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end'
          return (
            <g
              key={r.key}
              data-joint={r.key}
              data-left={r.leftPct ?? ''}
              data-right={r.rightPct ?? ''}
              data-worse={r.worse}
              data-band={r.band ?? ''}
              data-left-band={r.leftBand ?? ''}
              data-right-band={r.rightBand ?? ''}
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(a2 => (a2 === i ? null : i))}
              style={{ cursor: 'pointer' }}
            >
              <line x1={CX} y1={CY} x2={lx} y2={ly} stroke="transparent" strokeWidth={22} />
              {r.measured && (
                <circle cx={x} cy={y} r={active === i ? 5 : 4} fill={r.band != null ? BAND_HEX[r.band] : '#94a3b8'} stroke="#fff" strokeWidth={1.25} />
              )}
              <text
                x={tx} y={ty + 3} fontSize={9.5} textAnchor={anchor}
                fill={r.measured ? (active === i ? '#0f172a' : '#475569') : '#cbd5e1'}
                fontWeight={active === i ? 700 : 500}
              >
                {r.short}
              </text>
            </g>
          )
        })}
      </svg>

      {act && (
        <div
          className="absolute top-1 left-1 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1.5 text-[11px] shadow-sm pointer-events-none"
          data-radar-tooltip
        >
          <p className="font-semibold text-slate-800">{act.label}</p>
          {act.midline ? (
            <p className="text-slate-600">Left and Right {fmt(act.leftPct)}</p>
          ) : (
            <p className="text-slate-600">Left {fmt(act.leftPct)} · Right {fmt(act.rightPct)}</p>
          )}
          {act.band != null ? (
            <p className="font-semibold" style={{ color: BAND_HEX[act.band] }}>{bandFull(act.band)}</p>
          ) : (
            <p className="text-slate-400">Not measured</p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-600" data-radar-legend>
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" stroke={RADAR_LEFT_COLOR} strokeWidth="2" /></svg>
          Left
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" stroke={RADAR_RIGHT_COLOR} strokeWidth="2" strokeDasharray={RIGHT_DASH} /></svg>
          Right
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" stroke={TARGET_COLOR} strokeWidth="1.5" strokeDasharray={TARGET_DASH} /></svg>
          Steady target
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: GAP_TINT, border: '1px solid rgba(239,68,68,0.3)' }} />
          Gap to target
        </span>
      </div>
    </div>
  )
}
