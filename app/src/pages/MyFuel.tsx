import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { cn } from '../lib/cn'
import { Utensils, Droplets } from 'lucide-react'

// =============================================================================
// My Fuel (Base / HQ)
// -----------------------------------------------------------------------------
// Two zone-driven calculators for every Base subscriber:
//   - Nutrition (Zone Fuel Model): fuels a target operating composition, not
//     current total weight. Zone 0 = 75 * (target wt / 198) kcal/hr, energy =
//     sum(zone hours * zone kcal/hr), protein fixed at 1.7 g/kg lean mass,
//     carbs/fat split by the zone fuel blend. Target BF 12% men / 22% women.
//   - Hydration (Zone Sweat Model): purely zone-driven sweat loss (no dietary
//     baselines), optional measured pre/post-weight mode, sodium =
//     fluid * Na mmol/L * 23, 400-800 mL/hr cap, 150% rehydration, BSA heat
//     vulnerability + >=25% BF heat-illness flags.
//
// Self-contained: no Supabase writes. Inputs live in local component state so
// the page works before profile fields for weight/body-fat exist.
// =============================================================================

const LB2KG = 0.45359237

// Coerce a raw input string to a number; blank/invalid -> 0 only at calc time.
const num = (s: string): number => {
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

// ---- Zone definitions ------------------------------------------------------
interface FuelZone { k: number; name: string; sub: string; mult: number; carb: number; color: string; defH: number; defM: number }
const N_ZONES: FuelZone[] = [
  { k: 0, name: 'Zone 0', sub: 'Rest / basal', mult: 1.0, carb: 0.05, color: '#94A3B8', defH: 16, defM: 0 },
  { k: 1, name: 'Zone 1', sub: 'Easy activity', mult: 1.6667, carb: 0.2, color: '#60A5FA', defH: 7, defM: 0 },
  { k: 2, name: 'Zone 2', sub: 'Moderate', mult: 3.3333, carb: 0.4, color: '#1D4ED8', defH: 0, defM: 45 },
  { k: 3, name: 'Zone 3', sub: 'Hard', mult: 6.0, carb: 0.65, color: '#7C3AED', defH: 0, defM: 10 },
  { k: 4, name: 'Zone 4', sub: 'Very hard', mult: 8.6667, carb: 0.85, color: '#CA8A04', defH: 0, defM: 5 },
  { k: 5, name: 'Zone 5', sub: 'Maximal', mult: 11.3333, carb: 1.0, color: '#B91C1C', defH: 0, defM: 0 },
]
interface SweatZone { k: number; name: string; sub: string; rate: number; color: string; defH: number; defM: number }
const H_ZONES: SweatZone[] = [
  { k: 0, name: 'Zone 0', sub: 'Rest / basal', rate: 0.0, color: '#CBD5E1', defH: 16, defM: 0 },
  { k: 1, name: 'Zone 1', sub: 'Easy activity', rate: 0.2, color: '#93C5FD', defH: 7, defM: 0 },
  { k: 2, name: 'Zone 2', sub: 'Moderate', rate: 0.75, color: '#60A5FA', defH: 0, defM: 45 },
  { k: 3, name: 'Zone 3', sub: 'Hard', rate: 1.25, color: '#1D4ED8', defH: 0, defM: 10 },
  { k: 4, name: 'Zone 4', sub: 'Very hard', rate: 2.0, color: '#7C3AED', defH: 0, defM: 5 },
  { k: 5, name: 'Zone 5', sub: 'Maximal', rate: 2.5, color: '#9333EA', defH: 0, defM: 0 },
]
const TARGET_BF: Record<string, number> = { male: 0.12, female: 0.22 }

type Sex = 'male' | 'female'
type ZoneTime = Record<number, { h: number; m: number }>

function initTimes(zones: { k: number; defH: number; defM: number }[]): ZoneTime {
  const out: ZoneTime = {}
  zones.forEach(z => { out[z.k] = { h: z.defH, m: z.defM } })
  return out
}
function totalMinutes(t: ZoneTime): number {
  return Object.values(t).reduce((s, v) => s + v.h * 60 + v.m, 0)
}

const HOUR_OPTS = Array.from({ length: 25 }, (_, i) => i)
const MIN_OPTS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

// Shared zone-time editor row
function ZoneRows({ zones, times, onChange }: { zones: { k: number; name: string; sub: string; color: string }[]; times: ZoneTime; onChange: (k: number, field: 'h' | 'm', val: number) => void }) {
  return (
    <div className="divide-y divide-cobalt/10">
      {zones.map(z => (
        <div key={z.k} className="grid grid-cols-1 sm:grid-cols-[1.3fr_0.9fr_0.9fr] gap-2 sm:gap-3 items-center py-2.5">
          <div className="text-sm font-semibold text-cobalt-ink flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: z.color }} />
            <span>{z.name}<span className="block text-xs font-normal text-slate-400">{z.sub}</span></span>
          </div>
          <select className="input" value={times[z.k].h} onChange={e => onChange(z.k, 'h', +e.target.value)}>
            {HOUR_OPTS.map(h => <option key={h} value={h}>{h} hours</option>)}
          </select>
          <select className="input" value={times[z.k].m} onChange={e => onChange(z.k, 'm', +e.target.value)}>
            {MIN_OPTS.map(m => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </div>
      ))}
    </div>
  )
}

function SexToggle({ value, onChange }: { value: Sex; onChange: (s: Sex) => void }) {
  return (
    <div className="flex rounded-card border border-slate-300 overflow-hidden">
      {(['male', 'female'] as Sex[]).map(s => (
        <button key={s} type="button" onClick={() => onChange(s)}
          className={cn('flex-1 py-2.5 text-sm font-semibold capitalize transition-colors', value === s ? 'bg-cobalt text-white' : 'bg-white text-slate-500 hover:bg-cobalt-light')}>
          {s}
        </button>
      ))}
    </div>
  )
}

function TotalBar({ total, calcLabel }: { total: number; calcLabel: string }) {
  const ok = total === 1440
  const h = Math.floor(total / 60), m = total % 60
  return (
    <div className={cn('flex justify-between items-center mt-4 px-4 py-3 rounded-card text-sm font-semibold border',
      ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200')}>
      <span>Day total</span>
      <span>{ok ? '24h 0m ✓' : `${h}h ${m}m — ${calcLabel}`}</span>
    </div>
  )
}

// ============================ NUTRITION VIEW ================================
function NutritionView() {
  const [sex, setSex] = useState<Sex>('male')
  const [weight, setWeight] = useState('255')
  const [bf, setBf] = useState('25')
  const [times, setTimes] = useState<ZoneTime>(() => initTimes(N_ZONES))
  const [result, setResult] = useState<null | {
    kcal: number; carbG: number; proG: number; fatG: number; carbFrac: number
    tow: number; leanLb: number; excess: number; weightN: number; dayName: string; warn: string
  }>(null)

  const total = totalMinutes(times)
  const complete = total === 1440
  const calcLabel = total > 1440 ? `over by ${Math.floor((total - 1440) / 60)}h ${(total - 1440) % 60}m` : `add ${Math.floor((1440 - total) / 60)}h ${(1440 - total) % 60}m`

  const dayName = useMemo(() => {
    const per = (k: number) => times[k].h * 60 + times[k].m
    const vigEq = per(2) + (per(3) + per(4) + per(5)) * 2
    if (vigEq <= 20) return 'Sedentary Day'
    if (vigEq <= 42) return 'Active Rest Day'
    if (vigEq <= 89) return 'Moderate Activity Day'
    if (vigEq <= 149) return 'High Activity Day'
    return 'Extreme Activity Day'
  }, [times])

  function setZone(k: number, field: 'h' | 'm', val: number) {
    setTimes(t => ({ ...t, [k]: { ...t[k], [field]: val } }))
  }

  function calculate() {
    const weightN = num(weight)
    const bfPct = num(bf) / 100
    if (!weightN || weightN < 60 || bfPct <= 0) return
    const leanLb = weightN * (1 - bfPct)
    const leanKg = leanLb * LB2KG
    const tow = leanLb / (1 - TARGET_BF[sex])
    const z0 = 75 * (tow / 198)
    let kcal = 0, carbKcal = 0
    N_ZONES.forEach(z => {
      const hrs = (times[z.k].h * 60 + times[z.k].m) / 60
      const e = hrs * z0 * z.mult
      kcal += e; carbKcal += e * z.carb
    })
    kcal = Math.round(kcal)
    const proG = Math.round(leanKg * 1.7)
    const proKcal = proG * 4
    let remain = kcal - proKcal
    let warn = ''
    if (remain < 0) { remain = 0; warn = 'On a near-pure-rest day your protein target alone approaches your total energy estimate, so protein is preserved and carbs and fat fall low. Add any real Zone 2+ activity and the budget opens up.' }
    const carbFrac = kcal > 0 ? carbKcal / kcal : 0.05
    const carbG = Math.round((remain * carbFrac) / 4)
    const fatG = Math.round((remain * (1 - carbFrac)) / 9)
    setResult({ kcal, carbG, proG, fatG, carbFrac, tow, leanLb, excess: Math.max(0, Math.round(weightN - tow)), weightN, dayName, warn })
  }

  const cPct = result ? Math.round(result.carbFrac * 100) : 0

  return (
    <div className="space-y-5">
      <SectionCard title="Step 1 · Your body">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Biological sex <span className="normal-case font-normal text-slate-400">— sets target composition default</span></label>
            <SexToggle value={sex} onChange={setSex} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Current weight (lb)</label>
              <input type="number" inputMode="decimal" className="input" value={weight} min={60} max={600} onChange={e => setWeight(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Body fat (%)</label>
              <input type="number" inputMode="decimal" className="input" value={bf} min={3} max={60} onChange={e => setBf(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-slate-500 bg-surface rounded-card p-3 leading-relaxed">
            We preserve your current lean mass and project it to a healthy target operating composition (default 12% men / 22% women) to set your resting energy, never your total current weight.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Step 2 · Your day in zones" subtitle="Log a full 24 hours across your heart-rate zones">
        <ZoneRows zones={N_ZONES} times={times} onChange={setZone} />
        <TotalBar total={total} calcLabel={calcLabel} />
        {total > 0 && (
          <div className="mt-3 px-4 py-3 rounded-card border-l-4 border-cobalt bg-cobalt-light">
            <p className="font-display font-bold text-sm text-cobalt-ink">{dayName}</p>
            <p className="text-xs text-slate-500 mt-0.5">Your carb and fat mix shifts with how hard you worked. Higher zones pull more carbohydrate into the plan.</p>
          </div>
        )}
      </SectionCard>

      <button onClick={calculate} disabled={!complete}
        className="btn-primary w-full py-3.5 disabled:opacity-50 disabled:cursor-not-allowed">
        {complete ? 'Calculate my fuel plan' : 'Log must equal 24:00 to calculate'}
      </button>

      {result && (
        <SectionCard title="Your fuel plan">
          <p className="text-base leading-relaxed text-cobalt-ink mb-5">
            Today reads as a <b>{result.dayName.replace(' Day', '').toLowerCase()} day</b>. We protect your <b>{Math.round(result.leanLb)} lb</b> of lean mass and fuel a <b>{Math.round(result.tow)} lb</b> operating body{result.excess > 3 ? <>, treating about <b>{result.excess} lb</b> of excess fat as available stored energy rather than fuel to maintain</> : ''}. That sets an estimated <b>{result.kcal.toLocaleString()} kcal</b>, with carbohydrate at <b>{cPct}%</b> of your non-protein energy.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-center bg-surface rounded-card p-4 text-center mb-5">
            <div><div className="font-display font-bold text-xl text-cobalt-ink">{Math.round(result.weightN)} lb</div><div className="text-[0.7rem] uppercase tracking-wide text-slate-400">Current weight</div></div>
            <div className="text-cobalt text-2xl font-bold">→</div>
            <div><div className="font-display font-bold text-xl text-cobalt-ink">{Math.round(result.tow)} lb @ {TARGET_BF[sex] * 100}%</div><div className="text-[0.7rem] uppercase tracking-wide text-slate-400">Target operating body</div></div>
          </div>

          <div className="text-center font-display font-bold text-xl text-white rounded-card p-4 mb-4" style={{ background: 'linear-gradient(135deg,#1D4ED8,#7C3AED)' }}>
            ≈ {result.kcal.toLocaleString()} kcal / day
            <span className="block font-sans font-normal text-xs opacity-85 mt-0.5">Estimated daily energy, built entirely from your time in zone</span>
          </div>

          <div className="flex h-3.5 rounded-full overflow-hidden mb-4">
            <span style={{ width: `${cPct}%`, background: '#1D4ED8' }} />
            <span style={{ width: `${100 - cPct}%`, background: '#CA8A04' }} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { g: result.carbG, kc: result.carbG * 4, lab: 'Carbs', col: 'text-cobalt' },
              { g: result.proG, kc: result.proG * 4, lab: 'Protein', col: 'text-[#7C3AED]' },
              { g: result.fatG, kc: result.fatG * 9, lab: 'Fat', col: 'text-[#CA8A04]' },
            ].map(mac => (
              <div key={mac.lab} className="border border-cobalt/10 rounded-card p-4 text-center">
                <div className={cn('font-display font-extrabold text-3xl leading-none', mac.col)}>~{mac.g}g</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-2">{mac.lab}</div>
                <div className="text-xs text-slate-400 mt-0.5">{mac.kc} kcal</div>
              </div>
            ))}
          </div>

          {result.warn && <p className="text-xs text-slate-500 bg-surface rounded-card p-3 mt-4">{result.warn}</p>}
          <p className="text-xs text-slate-400 mt-4 leading-relaxed">Your time-in-zone set the energy and carb/fat mix; lean mass set protein. Macro targets are approximate starting values, not medical prescriptions.</p>
        </SectionCard>
      )}
    </div>
  )
}

// ============================ HYDRATION VIEW ===============================
function HydrationView() {
  const [sex, setSex] = useState<Sex>('male')
  const [weight, setWeight] = useState('198')
  const [ft, setFt] = useState('5')
  const [inch, setInch] = useState('10')
  const [bf, setBf] = useState('18')
  const [salt, setSalt] = useState(35)
  const [measured, setMeasured] = useState(false)
  const [pre, setPre] = useState('198')
  const [post, setPost] = useState('196')
  const [sesMin, setSesMin] = useState('60')
  const [drunk, setDrunk] = useState('0.5')
  const [urine, setUrine] = useState('0')
  const [times, setTimes] = useState<ZoneTime>(() => initTimes(H_ZONES))
  const [result, setResult] = useState<null | {
    fluidL: number; peakRate: number; cap: number; naMg: number; kMg: number; mgMg: number
    sessionMode: boolean; narr: string; flags: { c: 'ok' | 'warn' | 'bad'; t: string }[]
  }>(null)

  const total = totalMinutes(times)
  const complete = measured || total === 1440
  const calcLabel = total > 1440 ? `over by ${Math.floor((total - 1440) / 60)}h ${(total - 1440) % 60}m` : `add ${Math.floor((1440 - total) / 60)}h ${(1440 - total) % 60}m`

  function setZone(k: number, field: 'h' | 'm', val: number) {
    setTimes(t => ({ ...t, [k]: { ...t[k], [field]: val } }))
  }

  function calculate() {
    const heightCm = (num(ft) * 12 + num(inch)) * 2.54
    const weightKg = num(weight) * LB2KG
    let fluidL = 0, peakRate = 0, narr = '', sessionMode = false

    if (measured) {
      sessionMode = true
      const sesMinN = num(sesMin)
      const hrs = sesMinN / 60 || 1
      const lostL = (num(pre) - num(post)) * LB2KG + num(drunk) - num(urine)
      peakRate = Math.max(0, lostL / hrs)
      fluidL = Math.max(0, lostL)
      narr = `From your weigh-in, you lost ${fluidL.toFixed(2)} L of fluid over a ${sesMinN}-minute session, a measured sweat rate of ${peakRate.toFixed(2)} L/hr.`
    } else {
      H_ZONES.forEach(z => {
        const mins = times[z.k].h * 60 + times[z.k].m
        fluidL += (mins / 60) * z.rate
        if (z.rate > peakRate && mins > 0) peakRate = z.rate
      })
      const hardMin = (times[3].h * 60 + times[3].m) + (times[4].h * 60 + times[4].m) + (times[5].h * 60 + times[5].m)
      narr = `Based on how you spent your day, your body lost about ${fluidL.toFixed(1)} L to sweat, driven mostly by ${hardMin > 0 ? 'your harder Zone 3-5 work' : 'light day-long activity'}.`
    }

    const bfN = num(bf)
    const naMg = Math.round(fluidL * salt * 23)
    const cap = peakRate >= 1.5 ? 800 : peakRate >= 1.0 ? 600 : peakRate > 0 ? 500 : 400
    const bsa = 0.007184 * Math.pow(heightCm, 0.725) * Math.pow(weightKg, 0.425)
    const saMass = bsa / weightKg

    const flags: { c: 'ok' | 'warn' | 'bad'; t: string }[] = []
    if (saMass >= 0.0128) flags.push({ c: 'ok', t: 'Efficient cooling build. Your surface-area-to-mass ratio favors heat loss, so you shed heat relatively well.' })
    else if (saMass <= 0.0112) flags.push({ c: 'warn', t: 'Heat-vulnerable build. A lower surface-area-to-mass ratio means you rely more on sweating to shed heat. Prioritize fluid and cooling in warm sessions.' })
    else flags.push({ c: 'ok', t: 'Balanced surface-area-to-mass ratio for heat dissipation.' })
    if (bfN >= 25) flags.push({ c: 'bad', t: `At ${bfN}% body fat, fat acts as thermal insulation and lowers your total-body-water reserve. Research links this to roughly 3.5x higher heat-illness risk. Hydrate early and avoid peak heat for hard sessions.` })
    if (peakRate >= 1.5) flags.push({ c: 'warn', t: 'Zone 4-5 work: sodium replacement is mandatory for sessions over 60 minutes. Plain water alone risks hyponatremia.' })
    else if (fluidL > 0) flags.push({ c: 'ok', t: 'Moderate sweat load. Sip to thirst and add sodium on any session over 60 minutes.' })
    flags.push({ c: 'warn', t: 'Both dehydration and overdrinking are dangerous. Never exceed the intra-session absorption cap; use thirst as your ceiling.' })

    const rehyd = (fluidL * 1.5).toFixed(1)
    narr += ` Aim to replace it steadily${sessionMode ? `, about ${rehyd} L in the hours after training` : ''}, pairing fluid with sodium so you do not dilute your blood.`

    setResult({ fluidL, peakRate, cap, naMg, kMg: Math.round(fluidL * 5 * 39), mgMg: Math.round(fluidL * 0.8 * 24), sessionMode, narr, flags })
  }

  const flagStyle: Record<string, string> = {
    ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warn: 'bg-amber-50 text-amber-700 border-amber-200',
    bad: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Step 1 · Your body">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Biological sex</label>
            <SexToggle value={sex} onChange={setSex} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Weight (lb)</label><input type="number" inputMode="decimal" className="input" value={weight} onChange={e => setWeight(e.target.value)} /></div>
            <div><label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Height ft</label><input type="number" inputMode="numeric" className="input" value={ft} onChange={e => setFt(e.target.value)} /></div>
            <div><label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Height in</label><input type="number" inputMode="decimal" className="input" value={inch} onChange={e => setInch(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Body fat (%)</label><input type="number" inputMode="decimal" className="input" value={bf} onChange={e => setBf(e.target.value)} /></div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Sweat saltiness</label>
              <select className="input" value={salt} onChange={e => setSalt(+e.target.value)}>
                <option value={20}>Light sweater (~20 mmol/L)</option>
                <option value={35}>Average sweater (~35 mmol/L)</option>
                <option value={50}>Salty sweater (~50 mmol/L)</option>
              </select>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Step 2 · Your day in zones">
        <label className="flex items-start gap-3 bg-cobalt-light border border-cobalt/20 rounded-card p-3.5 mb-4 cursor-pointer">
          <input type="checkbox" className="mt-1" checked={measured} onChange={e => setMeasured(e.target.checked)} />
          <span><b className="block text-sm text-cobalt-ink">I measured my sweat rate</b><span className="text-xs text-slate-500">Use a pre/post weigh-in for your real number instead of a zone estimate (gold standard)</span></span>
        </label>

        {measured ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Pre (lb)</label><input type="number" inputMode="decimal" className="input" value={pre} onChange={e => setPre(e.target.value)} /></div>
              <div><label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Post (lb)</label><input type="number" inputMode="decimal" className="input" value={post} onChange={e => setPost(e.target.value)} /></div>
              <div><label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Session (min)</label><input type="number" inputMode="numeric" className="input" value={sesMin} onChange={e => setSesMin(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Fluid drunk (L)</label><input type="number" inputMode="decimal" step="0.1" className="input" value={drunk} onChange={e => setDrunk(e.target.value)} /></div>
              <div><label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Urine (L)</label><input type="number" inputMode="decimal" step="0.1" className="input" value={urine} onChange={e => setUrine(e.target.value)} /></div>
            </div>
          </div>
        ) : (
          <>
            <ZoneRows zones={H_ZONES} times={times} onChange={setZone} />
            <TotalBar total={total} calcLabel={calcLabel} />
          </>
        )}
      </SectionCard>

      <button onClick={calculate} disabled={!complete}
        className="btn-primary w-full py-3.5 disabled:opacity-50 disabled:cursor-not-allowed">
        {complete ? 'Calculate my hydration needs' : 'Log must equal 24:00 to calculate'}
      </button>

      {result && (
        <SectionCard title="Your sweat-loss replacement">
          <p className="text-base leading-relaxed text-cobalt-ink mb-5">{result.narr}</p>

          <div className="text-center text-white rounded-card p-5 mb-4" style={{ background: 'linear-gradient(135deg,#1D4ED8,#7C3AED)' }}>
            <div className="font-display font-extrabold text-4xl leading-none">{result.fluidL.toFixed(result.fluidL < 1 ? 2 : 1)} L</div>
            <div className="text-xs opacity-90 mt-1.5">{result.sessionMode ? 'measured fluid lost this session, rehydrate to ~150% of this' : 'estimated fluid lost to sweat today, replace across the day'}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
            <div className="border border-cobalt/10 rounded-card p-4 text-center"><div className="font-display font-bold text-2xl text-cobalt-ink">{result.peakRate.toFixed(2)} L/hr</div><div className="text-xs uppercase tracking-wide text-slate-500 mt-1.5">Peak sweat rate</div></div>
            <div className="border border-cobalt/10 rounded-card p-4 text-center"><div className="font-display font-bold text-2xl text-cobalt-ink">{result.cap} mL/hr</div><div className="text-xs uppercase tracking-wide text-slate-500 mt-1.5">Intra-session cap</div></div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-4 mb-2">Electrolytes lost in sweat</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[{ v: result.naMg, k: 'Sodium (Na)' }, { v: result.kMg, k: 'Potassium (K)' }, { v: result.mgMg, k: 'Magnesium (Mg)' }].map(e => (
              <div key={e.k} className="bg-surface rounded-card p-3.5 text-center"><div className="font-display font-bold text-lg text-cobalt">{e.v.toLocaleString()} mg</div><div className="text-xs text-slate-400 mt-0.5">{e.k}</div></div>
            ))}
          </div>

          <div className="space-y-2 mt-4">
            {result.flags.map((f, i) => (
              <div key={i} className={cn('rounded-card border px-4 py-3 text-sm leading-snug', flagStyle[f.c])}>{f.t}</div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4 leading-relaxed">These are sweat-replacement estimates to spread across the day via food and drinks, not one forced dose and not your full dietary intake.</p>
        </SectionCard>
      )}
    </div>
  )
}

// =============================== PAGE ======================================
export function MyFuel() {
  const [view, setView] = useState<'nutrition' | 'hydration'>('nutrition')

  return (
    <div className="space-y-5">
      <PageHeader title="My Fuel" subtitle="Zone-based nutrition and hydration for the body you're building" />

      <div className="flex gap-2 max-w-md">
        <button onClick={() => setView('nutrition')}
          className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-card text-sm font-semibold border transition-colors',
            view === 'nutrition' ? 'bg-cobalt text-white border-cobalt' : 'bg-white text-slate-500 border-slate-200 hover:bg-cobalt-light')}>
          <Utensils size={15} /> Nutrition
        </button>
        <button onClick={() => setView('hydration')}
          className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-card text-sm font-semibold border transition-colors',
            view === 'hydration' ? 'bg-cobalt text-white border-cobalt' : 'bg-white text-slate-500 border-slate-200 hover:bg-cobalt-light')}>
          <Droplets size={15} /> Hydration
        </button>
      </div>

      {view === 'nutrition' ? <NutritionView /> : <HydrationView />}
    </div>
  )
}
