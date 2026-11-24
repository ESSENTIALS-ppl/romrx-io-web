// FG-08 (Grant 4:23 PM ET, Reid FAIL): My Body per-joint trend with its dates and values, and the
// "Where you started" vs "Where you are now" comparison. Values use the existing Base formulas (lib/jointHistory,
// lib/mobilityBands); dates are assessed_at in the same short format as the radar legend. Values are always text,
// never colour only.
import type { StartedVsNow, TrendPoint } from '../lib/jointHistory'

/** Same format as the radar legend on My Body (FG-07): e.g. "Nov 17, 2026", in the device's time zone. */
export function assessmentDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** One joint: a small trend line plus each point's date and % (worse side, % of the Base target). Heading is the existing joint name. */
export function JointTrend({ label, points, n }: { label: string; points: TrendPoint[]; n: number }) {
  const W = 120, H = 32, pad = 3
  const xs = (i: number) => pad + (i * (W - 2 * pad)) / Math.max(1, n - 1)
  const ys = (v: number) => H - pad - (Math.max(0, Math.min(100, v)) * (H - 2 * pad)) / 100
  // A missing assessment is a gap in the line (never a zero): split into runs of neighbouring assessments.
  const runs: TrendPoint[][] = []
  for (const p of points) {
    const last = runs[runs.length - 1]
    if (last && last[last.length - 1].i === p.i - 1) last.push(p)
    else runs.push([p])
  }
  return (
    <div data-trend={label}>
      <p className="text-xs font-semibold text-slate-600 mb-0.5">{label}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8" aria-hidden="true" focusable="false">
        <line x1={pad} x2={W - pad} y1={ys(90)} y2={ys(90)} stroke="#cbd5e1" strokeWidth={0.75} strokeDasharray="2 2" />
        {runs.filter(r => r.length > 1).map(r => (
          <polyline key={r[0].i} points={r.map(p => `${xs(p.i).toFixed(1)},${ys(p.pct).toFixed(1)}`).join(' ')} fill="none" stroke="#1D4ED8" strokeWidth={1.5} strokeLinejoin="round" />
        ))}
        {points.map(p => (
          <circle key={p.i} cx={xs(p.i)} cy={ys(p.pct)} r={2.2} fill="#1D4ED8" />
        ))}
      </svg>
      <ol className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] leading-snug" data-trend-points>
        {points.map(p => (
          <li key={p.i} className="whitespace-nowrap" data-point-date={p.date} data-point-pct={p.pct}>
            <span className="text-slate-500">{assessmentDate(p.date)}</span>{' '}
            <span className="font-semibold text-slate-800">{p.pct}%</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

const pctText = (v: number | null) => (v == null ? '-' : `${v}%`)

/** First full assessment vs the latest: Body score and each Joint Breakdown joint. Only rendered with 2+ assessments. */
export function StartedVsNowTable({ data }: { data: StartedVsNow }) {
  return (
    <div className="mt-3 border-t border-cobalt/10 pt-3" data-started-vs-now>
      <table className="w-full text-xs table-fixed">
        <colgroup><col className="w-[40%]" /><col className="w-[30%]" /><col className="w-[30%]" /></colgroup>
        <thead>
          <tr className="align-bottom">
            <td />
            <th scope="col" className="text-right font-semibold text-slate-600 pb-1.5 pl-2">
              <span className="block">Where you started</span>
              <span className="block font-normal text-slate-500" data-started-date>{assessmentDate(data.started.date)}</span>
            </th>
            <th scope="col" className="text-right font-semibold text-slate-600 pb-1.5 pl-2">
              <span className="block">Where you are now</span>
              <span className="block font-normal text-slate-500" data-now-date>{assessmentDate(data.now.date)}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cobalt/10">
          <tr data-compare-total>
            <th scope="row" className="text-left font-semibold text-cobalt-ink py-1.5">Body score</th>
            <td className="text-right font-bold text-slate-800 py-1.5 pl-2">{data.started.total}/100</td>
            <td className="text-right font-bold text-slate-800 py-1.5 pl-2">{data.now.total}/100</td>
          </tr>
          {data.joints.map(j => (
            <tr key={j.key} data-compare-joint={j.key}>
              <th scope="row" className="text-left font-medium text-slate-600 py-1.5">{j.label}</th>
              <td className="text-right text-slate-700 py-1.5 pl-2">{pctText(j.started)}</td>
              <td className="text-right font-semibold text-slate-800 py-1.5 pl-2">{pctText(j.now)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
