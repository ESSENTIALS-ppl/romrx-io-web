import { useState } from 'react'
import { bandFull, BAND_HEX, type RadarSideRow } from '../lib/mobilityBands'
import { radarRadius, BUILDING_RING_PCT } from '../lib/radarScale'

// My Body radar v2 (Jim 2026-09-24): the SHAPE shows imbalance.
//  - Two outlines: Left (solid dark slate) and Right (dashed teal), each side's
//    % of the Base target. Midline joints put one value on both lines.
//  - Steady target = dashed cobalt reference circle (3 3 dash, per the approved Oct 26 mockup).
//  - Quadratic radial scale (lib/radarScale): 89 vs 100 and 35 vs 66 stay obvious.
//  - Oct 27 (Jim, mockup match): no gap tint, no coloured dots, no "90%" text, no always-on spokes.
//    The grey 90% ring stays. Hover/tap still works through invisible hit circles; the active
//    spoke and a slate ring on the worse-side point appear only while a joint is active.

export const RADAR_LEFT_COLOR = '#334155' // slate-700, solid
export const RADAR_RIGHT_COLOR = '#0F766E' // teal-700, dashed
export const RADAR_RIGHT_DASH = '6 4'
const RIGHT_DASH = RADAR_RIGHT_DASH
const TARGET_COLOR = '#1D4ED8' // cobalt = Steady
const TARGET_DASH = '3 3'

const W = 360
const H = 320
const CX = W / 2
const CY = 158
const R = 112

type RadiusFn = (pct: number | null | undefined) => number
function fmt(p: number | null): string {
  return p == null ? '-' : `${p}%`
}

/** FG-07: up to 3 earlier assessments, drawn as thin worse-side outlines. Legend text is dates only. */
export interface EarlierShape { label: string; rows: RadarSideRow[] }
const EARLIER_STYLES: ReadonlyArray<{ stroke: string; dash: string; opacity: number }> = [
  { stroke: '#64748b', dash: '2 3', opacity: 0.9 },
  { stroke: '#94a3b8', dash: '5 3 1 3', opacity: 0.9 },
  { stroke: '#cbd5e1', dash: '1 3', opacity: 1 },
]

/** `radius` is only for scale comparisons (default = the chosen quadratic scale). */
export function BaseRadar({ rows, radius = radarRadius, earlier = [], latestLabel = '' }: { rows: RadarSideRow[]; radius?: RadiusFn; earlier?: EarlierShape[]; latestLabel?: string }) {
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
        {/* Spoke: only for the active (hovered or tapped) joint */}
        {active != null && (() => {
          const [x, y] = point(active, n, 100)
          return <line x1={CX} y1={CY} x2={x} y2={y} stroke="#94a3b8" strokeWidth={1} data-spoke="active" />
        })()}

        {/* 90% Building ring */}
        <circle cx={CX} cy={CY} r={ringR} fill="none" stroke="#cbd5e1" strokeWidth={1} data-ring="building-90" />

        {/* Steady target reference circle */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={TARGET_COLOR} strokeWidth={1.5} strokeDasharray={TARGET_DASH} data-ring="steady-target" />
        {/* Label sits in the empty bottom-left corner, outside the plot: never collides with lines */}
        <g data-label="steady-target">
          <text x={6} y={H - 7} fontSize={9} fontWeight={600} fill={TARGET_COLOR}>Steady target</text>
        </g>

        {/* FG-07: earlier assessments (worse side %), drawn under the latest. Only joints measured both times get a vertex. */}
        {earlier.slice(0, 3).map((e, k) => {
          const st = EARLIER_STYLES[k]
          const pts: string[] = []
          rows.forEach((r, i) => {
            const m = e.rows.find(x => x.key === r.key)
            if (m && m.measured && r.measured) pts.push(point(i, n, m.worse).map(x => x.toFixed(1)).join(','))
          })
          if (pts.length < 3) return null
          return (
            <polygon
              key={`earlier-${k}`} points={pts.join(' ')}
              fill="none" stroke={st.stroke} strokeWidth={1.5} strokeDasharray={st.dash} strokeOpacity={st.opacity} strokeLinejoin="round"
              data-series="earlier" data-series-label={e.label}
            />
          )
        })}

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

        {/* Layer 1: spoke hover areas + labels. They start at 30% of the radius so the
            crowded centre belongs to the dots, and they are painted BEFORE the dots. */}
        {rows.map((r, i) => {
          const a = -Math.PI / 2 + (2 * Math.PI * i) / n
          const [sx, sy] = [CX + R * 0.3 * Math.cos(a), CY + R * 0.3 * Math.sin(a)]
          const [lx, ly] = point(i, n, 100)
          const tx = CX + (R + 16) * Math.cos(a)
          const ty = CY + (R + 16) * Math.sin(a)
          const anchor = Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end'
          return (
            <g
              key={`hit-${r.key}`}
              data-hit="spoke"
              data-hit-joint={r.key}
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(a2 => (a2 === i ? null : i))}
              style={{ cursor: 'pointer' }}
            >
              <line x1={sx} y1={sy} x2={lx} y2={ly} stroke="transparent" strokeWidth={22} />
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

        {/* Layer 2 (on top): one invisible hit circle per measured joint on the worse side, so a point
            always wins over any spoke area (Reid Field 2026-09-24: 02 Ankle DF). No visible dot at rest. */}
        {rows.map((r, i) => {
          const [x, y] = point(i, n, r.worse)
          return (
            <g
              key={r.key}
              data-hit="dot"
              data-joint={r.key}
              data-left={r.leftPct ?? ''}
              data-right={r.rightPct ?? ''}
              data-worse={r.worse}
              data-band={r.band ?? ''}
              data-left-band={r.leftBand ?? ''}
              data-right-band={r.rightBand ?? ''}
              data-cx={x.toFixed(1)}
              data-cy={y.toFixed(1)}
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(a2 => (a2 === i ? null : i))}
              style={{ cursor: 'pointer' }}
            >
              {r.measured && (
                <>
                  <circle cx={x} cy={y} r={7} fill="transparent" />
                  {active === i && <circle cx={x} cy={y} r={4} fill="none" stroke={RADAR_LEFT_COLOR} strokeWidth={1.5} data-hover-ring />}
                </>
              )}
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
        <span className="font-semibold" style={{ color: TARGET_COLOR }} data-band-label="3">Steady target</span>
      </div>
      {earlier.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-1 text-[11px] text-slate-600" data-radar-dates>
          {latestLabel && (
            <span className="inline-flex items-center gap-1.5">
              <svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" stroke={RADAR_LEFT_COLOR} strokeWidth="2" /></svg>
              {latestLabel}
            </span>
          )}
          {earlier.slice(0, 3).map((e, k) => (
            <span key={`${e.label}-${k}`} className="inline-flex items-center gap-1.5">
              <svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" stroke={EARLIER_STYLES[k].stroke} strokeWidth="1.5" strokeDasharray={EARLIER_STYLES[k].dash} /></svg>
              {e.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
