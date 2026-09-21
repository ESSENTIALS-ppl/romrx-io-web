import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { cn } from '../lib/cn'
import { Utensils, Droplets } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { loadLatestFuelBody, saveFuelLog } from '../lib/fuelLogs'

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
//     vulnerability + sex-aware body-fat heat-illness flags.
//
// 2026-09-15 update (audit fixes, core model unchanged):
//   - Body inputs and the 24-hour zone grid are shared state owned by the page,
//     so switching Nutrition <-> Hydration no longer wipes inputs or results.
//   - Energy-availability floor: never prescribe under 30 kcal/kg lean mass
//     (IOC REDs low-EA threshold). Explained in the plan text when applied.
//   - Below-target body fat: operating body = current weight, not a heavier
//     projection. Explained in the plan text.
//   - Zone 5 guardrail: wearable Zone 5 beyond 20 min is treated as Zone 4 in
//     the math and flagged. Zone 4+5 beyond 90 min is flagged.
//   - Peak sweat rate requires at least 15 min in a zone; the intra-session
//     cap follows that peak instead of any stray minute.
//   - BSA heat-vulnerability thresholds corrected to a human range
//     (m2/kg: >= 0.026 efficient, <= 0.021 heat-vulnerable).
//   - Body-fat heat flag is sex-aware (>= 25% men, >= 35% women).
//   - Measured mode flags overdrinking when post-weight exceeds pre-weight.
//   - Input clamping with inline errors instead of silent zeros.
//
// Persistence: successful Calculate writes one row to public.fuel_logs per
// kind (nutrition|hydration). Inputs live in page state; last body prefills
// from the user's latest fuel_log when present.
// =============================================================================

const LB2KG = 0.45359237

// Coerce a raw input string to a number; blank/invalid -> 0 only at calc time.
const num = (s: string): number => {
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

// ---- Model constants ---------------------------------------------------------
const PROTEIN_G_PER_KG_LEAN = 1.7
const EA_FLOOR_KCAL_PER_KG_LEAN = 30 // IOC REDs low energy availability threshold
const Z5_TRUE_MAX_MIN = 20 // wearable Zone 5 beyond this is treated as Zone 4
const HARD_DAY_WARN_MIN = 90 // Zone 4 + Zone 5 minutes that earn a caution
const PEAK_MIN_IN_ZONE = 15 // minutes in a zone before it counts as the peak
const BSA_EFFICIENT = 0.026 // m2/kg
const BSA_VULNERABLE = 0.021 // m2/kg
const BF_HEAT_FLAG: Record<string, number> = { male: 25, female: 35 }

// ---- Input limits -------------------------------------------------------------
const LIM = {
  weight: { min: 60, max: 600 },
  bf: { min: 3, max: 60 },
  ft: { min: 3, max: 8 },
  inch: { min: 0, max: 11.9 },
  session: { min: 10, max: 600 },
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
function zoneMins(t: ZoneTime, k: number): number {
  return t[k].h * 60 + t[k].m
}

// Zone 5 guardrail shared by both models. Wearables report cumulative Zone 5
// minutes that are rarely true VO2max physiology; anything past the cap is
// fueled and sweated as Zone 4.
function effectiveMinutes(t: ZoneTime): { mins: Record<number, number>; z5Moved: number; hardMin: number } {
  const mins: Record<number, number> = {}
  for (let k = 0; k <= 5; k++) mins[k] = zoneMins(t, k)
  const z5Moved = Math.max(0, mins[5] - Z5_TRUE_MAX_MIN)
  mins[5] -= z5Moved
  mins[4] += z5Moved
  return { mins, z5Moved, hardMin: mins[4] + mins[5] }
}

function rangeError(label: string, v: number, lim: { min: number; max: number }, unit: string): string {
  if (v < lim.min || v > lim.max) return `${label} must be between ${lim.min} and ${lim.max} ${unit}.`
  return ''
}

// ---- Shared body state ------------------------------------------------------
interface Body { sex: Sex; weight: string; bf: string; ft: string; inch: string; salt: number }
const DEFAULT_BODY: Body = { sex: 'male', weight: '198', bf: '18', ft: '5', inch: '10', salt: 35 }

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
          <select className="input" aria-label={`${z.name} hours`} value={times[z.k].h} onChange={e => onChange(z.k, 'h', +e.target.value)}>
            {HOUR_OPTS.map(h => <option key={h} value={h}>{h} hours</option>)}
          </select>
          <select className="input" aria-label={`${z.name} minutes`} value={times[z.k].m} onChange={e => onChange(z.k, 'm', +e.target.value)}>
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
      <span>{ok ? '24h 0m ✓' : `${h}h ${m}m, ${calcLabel}`}</span>
    </div>
  )
}

function calcLabelFor(total: number): string {
  return total > 1440
    ? `over by ${Math.floor((total - 1440) / 60)}h ${(total - 1440) % 60}m`
    : `add ${Math.floor((1440 - total) / 60)}h ${(1440 - total) % 60}m`
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{children}</label>
)

// Shared Step 1 body card. Height and sweat saltiness only matter for hydration
// and are shown there; sex, weight, and body fat are one set of inputs for both.
function BodyCard({ body, onChange, showHydrationFields }: { body: Body; onChange: (b: Body) => void; showHydrationFields: boolean }) {
  const set = (patch: Partial<Body>) => onChange({ ...body, ...patch })
  return (
    <SectionCard title="Step 1 · Your body" subtitle="Shared by Nutrition and Hydration">
      <div className="space-y-4">
        <div>
          <Label>Biological sex <span className="normal-case font-normal text-slate-400">(sets your target composition default)</span></Label>
          <SexToggle value={body.sex} onChange={sex => set({ sex })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Current weight (lb)</Label>
            <input type="number" inputMode="decimal" className="input" value={body.weight} min={LIM.weight.min} max={LIM.weight.max} onChange={e => set({ weight: e.target.value })} />
          </div>
          <div>
            <Label>Body fat (%)</Label>
            <input type="number" inputMode="decimal" className="input" value={body.bf} min={LIM.bf.min} max={LIM.bf.max} onChange={e => set({ bf: e.target.value })} />
          </div>
        </div>
        {showHydrationFields && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label>Height ft</Label><input type="number" inputMode="numeric" className="input" value={body.ft} min={LIM.ft.min} max={LIM.ft.max} onChange={e => set({ ft: e.target.value })} /></div>
            <div><Label>Height in</Label><input type="number" inputMode="decimal" className="input" value={body.inch} min={0} max={11} onChange={e => set({ inch: e.target.value })} /></div>
            <div className="col-span-2">
              <Label>Sweat saltiness</Label>
              <select className="input" value={body.salt} onChange={e => set({ salt: +e.target.value })}>
                <option value={20}>Light sweater (~20 mmol/L)</option>
                <option value={35}>Average sweater (~35 mmol/L)</option>
                <option value={50}>Salty sweater (~50 mmol/L)</option>
              </select>
            </div>
          </div>
        )}
        <p className="text-xs text-slate-500 bg-surface rounded-card p-3 leading-relaxed">
          We preserve your current lean mass and project it to a healthy target operating composition (default 12% men / 22% women) to set your resting energy, never your total current weight. If you are already leaner than that target, we fuel your current weight.
        </p>
      </div>
    </SectionCard>
  )
}

// ============================ NUTRITION VIEW ================================
interface NutritionResult {
  kcal: number; carbG: number; proG: number; fatG: number; carbFrac: number
  tow: number; leanLb: number; excess: number; weightN: number; dayName: string
  notes: string[]; belowTarget: boolean; eaFloored: boolean
}

export function computeNutrition(body: Body, times: ZoneTime): { result?: NutritionResult; error?: string } {
  const weightN = num(body.weight)
  const bfIn = num(body.bf)
  const err = rangeError('Weight', weightN, LIM.weight, 'lb') || rangeError('Body fat', bfIn, LIM.bf, '%')
  if (err) return { error: err }

  const bfPct = bfIn / 100
  const leanLb = weightN * (1 - bfPct)
  const leanKg = leanLb * LB2KG
  const target = TARGET_BF[body.sex]
  const belowTarget = bfPct < target
  // Operating body: lean mass projected to the target composition, or current
  // weight when the user is already leaner than the target.
  const tow = belowTarget ? weightN : leanLb / (1 - target)
  const z0 = 75 * (tow / 198)

  const { mins, z5Moved, hardMin } = effectiveMinutes(times)
  let kcal = 0, carbKcal = 0
  N_ZONES.forEach(z => {
    const e = (mins[z.k] / 60) * z0 * z.mult
    kcal += e; carbKcal += e * z.carb
  })
  const carbFrac = kcal > 0 ? carbKcal / kcal : 0.05
  kcal = Math.round(kcal)

  const notes: string[] = []
  // Energy-availability floor (IOC REDs: < 30 kcal/kg FFM is low EA).
  const eaFloor = Math.round(EA_FLOOR_KCAL_PER_KG_LEAN * leanKg)
  const eaFloored = kcal < eaFloor
  if (eaFloored) {
    kcal = eaFloor
    notes.push(`Your logged day came in under ${EA_FLOOR_KCAL_PER_KG_LEAN} kcal per kg of lean mass, the level below which hormones, bone, and recovery start to suffer. We raised the plan to that floor. Very restful days still need this much to run the body you are protecting.`)
  }
  if (belowTarget) {
    notes.push(`You are already leaner than the ${Math.round(target * 100)}% reference, so we fueled your current ${Math.round(weightN)} lb rather than projecting a heavier operating body.`)
  }
  if (z5Moved > 0) {
    notes.push(`Zone 5 is short interval work. We kept ${Z5_TRUE_MAX_MIN} minutes as true Zone 5 and fueled the remaining ${z5Moved} minutes as Zone 4, which is closer to what your body actually did.`)
  }
  if (hardMin > HARD_DAY_WARN_MIN) {
    notes.push(`Over ${HARD_DAY_WARN_MIN} minutes in Zone 4 and 5 is a very hard day. Double-check your wearable data before eating to this number two days in a row.`)
  }

  const proG = Math.round(leanKg * PROTEIN_G_PER_KG_LEAN)
  const proKcal = proG * 4
  let remain = kcal - proKcal
  if (remain < 0) {
    remain = 0
    notes.push('Your protein target alone approaches your total energy estimate, so protein is preserved and carbs and fat fall low. Add any real Zone 2+ activity and the budget opens up.')
  }
  const carbG = Math.round((remain * carbFrac) / 4)
  const fatG = Math.round((remain * (1 - carbFrac)) / 9)

  const vigEq = mins[2] + (mins[3] + mins[4] + mins[5]) * 2
  const dayName = vigEq <= 20 ? 'Sedentary Day' : vigEq <= 42 ? 'Active Rest Day' : vigEq <= 89 ? 'Moderate Activity Day' : vigEq <= 149 ? 'High Activity Day' : 'Extreme Activity Day'

  return {
    result: {
      kcal, carbG, proG, fatG, carbFrac, tow, leanLb, weightN, dayName, notes, belowTarget, eaFloored,
      excess: belowTarget ? 0 : Math.max(0, Math.round(weightN - tow)),
    },
  }
}

function NutritionView({ body, times, setZone, result, setResult, onSaved, saveState }: {
  body: Body; times: ZoneTime; setZone: (k: number, field: 'h' | 'm', val: number) => void
  result: NutritionResult | null; setResult: (r: NutritionResult | null) => void
  onSaved: (inputs: Record<string, unknown>, outputs: Record<string, unknown>) => void
  saveState: string
}) {
  const [error, setError] = useState('')
  const total = totalMinutes(times)
  const complete = total === 1440
  const calcLabel = calcLabelFor(total)

  const dayName = useMemo(() => {
    const per = (k: number) => zoneMins(times, k)
    const vigEq = per(2) + (per(3) + per(4) + per(5)) * 2
    if (vigEq <= 20) return 'Sedentary Day'
    if (vigEq <= 42) return 'Active Rest Day'
    if (vigEq <= 89) return 'Moderate Activity Day'
    if (vigEq <= 149) return 'High Activity Day'
    return 'Extreme Activity Day'
  }, [times])

  function calculate() {
    const out = computeNutrition(body, times)
    if (out.error) { setError(out.error); setResult(null); return }
    setError('')
    setResult(out.result ?? null)
    if (out.result) {
      onSaved(
        { body, times },
        {
          kcal: out.result.kcal,
          carbG: out.result.carbG,
          proG: out.result.proG,
          fatG: out.result.fatG,
          carbFrac: out.result.carbFrac,
          dayName: out.result.dayName,
          tow: out.result.tow,
          leanLb: out.result.leanLb,
          belowTarget: out.result.belowTarget,
          eaFloored: out.result.eaFloored,
        },
      )
    }
  }

  const cPct = result ? Math.round(result.carbFrac * 100) : 0

  return (
    <div className="space-y-5">
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
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-card px-4 py-3">{error}</p>}
      {saveState && <p className="text-xs text-slate-500">{saveState}</p>}

      {result && (
        <SectionCard title="Your fuel plan">
          <p className="text-base leading-relaxed text-cobalt-ink mb-5">
            Today reads as a <b>{result.dayName.replace(' Day', '').toLowerCase()} day</b>. We protect your <b>{Math.round(result.leanLb)} lb</b> of lean mass and fuel a <b>{Math.round(result.tow)} lb</b> operating body{result.excess > 3 ? <>, treating about <b>{result.excess} lb</b> of excess fat as available stored energy rather than fuel to maintain</> : ''}. That sets an estimated <b>{result.kcal.toLocaleString()} kcal</b>, with carbohydrate at <b>{cPct}%</b> of your non-protein energy.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-center bg-surface rounded-card p-4 text-center mb-5">
            <div><div className="font-display font-bold text-xl text-cobalt-ink">{Math.round(result.weightN)} lb</div><div className="text-[0.7rem] uppercase tracking-wide text-slate-400">Current weight</div></div>
            <div className="text-cobalt text-2xl font-bold">→</div>
            <div>
              <div className="font-display font-bold text-xl text-cobalt-ink">{Math.round(result.tow)} lb{result.belowTarget ? '' : ` @ ${TARGET_BF[body.sex] * 100}%`}</div>
              <div className="text-[0.7rem] uppercase tracking-wide text-slate-400">{result.belowTarget ? 'Operating body (already lean)' : 'Target operating body'}</div>
            </div>
          </div>

          <div className="text-center font-display font-bold text-xl text-white rounded-card p-4 mb-4" style={{ background: 'linear-gradient(135deg,#1D4ED8,#7C3AED)' }}>
            ≈ {result.kcal.toLocaleString()} kcal / day
            <span className="block font-sans font-normal text-xs opacity-85 mt-0.5">{result.eaFloored ? 'Raised to your energy-availability floor' : 'Estimated daily energy, built entirely from your time in zone'}</span>
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

          {result.notes.length > 0 && (
            <div className="space-y-2 mt-4">
              {result.notes.map((n, i) => <p key={i} className="text-xs text-slate-600 bg-surface rounded-card p-3 leading-relaxed">{n}</p>)}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-4 leading-relaxed">Your time-in-zone set the energy and carb/fat mix; lean mass set protein. Macro targets are approximate starting values, not medical prescriptions.</p>
        </SectionCard>
      )}
    </div>
  )
}

// ============================ HYDRATION VIEW ===============================
interface HydrationResult {
  fluidL: number; peakRate: number; cap: number; naMg: number; kMg: number; mgMg: number
  sessionMode: boolean; narr: string; flags: { c: 'ok' | 'warn' | 'bad'; t: string }[]
}
interface Measured { pre: string; post: string; sesMin: string; drunk: string; urine: string }

export function computeHydration(body: Body, times: ZoneTime, measured: boolean, m: Measured): { result?: HydrationResult; error?: string } {
  const weightN = num(body.weight)
  const bfN = num(body.bf)
  const ftN = num(body.ft), inchN = num(body.inch)
  const err = rangeError('Weight', weightN, LIM.weight, 'lb') || rangeError('Body fat', bfN, LIM.bf, '%')
    || rangeError('Height (feet)', ftN, LIM.ft, 'ft') || rangeError('Height (inches)', inchN, LIM.inch, 'in')
  if (err) return { error: err }

  const heightCm = (ftN * 12 + inchN) * 2.54
  const weightKg = weightN * LB2KG
  const flags: HydrationResult['flags'] = []
  let fluidL = 0, peakRate = 0, narr = '', sessionMode = false

  if (measured) {
    sessionMode = true
    const sesMinN = num(m.sesMin)
    const sErr = rangeError('Session length', sesMinN, LIM.session, 'minutes')
    if (sErr) return { error: sErr }
    const pre = num(m.pre), post = num(m.post)
    if (pre < LIM.weight.min || post < LIM.weight.min) return { error: 'Enter your pre and post weights in pounds.' }
    const hrs = sesMinN / 60
    const drunk = Math.max(0, num(m.drunk)), urine = Math.max(0, num(m.urine))
    const lostL = (pre - post) * LB2KG + drunk - urine
    peakRate = Math.max(0, lostL / hrs)
    fluidL = Math.max(0, lostL)
    if (post > pre) {
      flags.push({ c: 'bad', t: `You finished ${((post - pre)).toFixed(1)} lb heavier than you started, which means you drank more than you sweated. That is the overhydration side of the danger zone. Cut intake next session and keep sodium in what you do drink.` })
    }
    narr = `From your weigh-in, you lost ${fluidL.toFixed(2)} L of fluid over a ${sesMinN}-minute session, a measured sweat rate of ${peakRate.toFixed(2)} L/hr.`
  } else {
    const { mins, z5Moved, hardMin } = effectiveMinutes(times)
    let anyActive = 0, activeFluid = 0
    H_ZONES.forEach(z => {
      const zm = mins[z.k]
      fluidL += (zm / 60) * z.rate
      if (z.k >= 2 && zm > 0) { anyActive += zm; activeFluid += (zm / 60) * z.rate }
      // Peak only counts once a zone has real time in it, not a stray few minutes.
      if (z.rate > peakRate && zm >= PEAK_MIN_IN_ZONE) peakRate = z.rate
    })
    // Fallback when no zone reaches the peak threshold: use the average active rate.
    if (peakRate === 0 && anyActive > 0) peakRate = activeFluid / (anyActive / 60)
    narr = `Based on how you spent your day, your body lost about ${fluidL.toFixed(1)} L to sweat, driven mostly by ${hardMin > 0 || mins[3] > 0 ? 'your harder Zone 3-5 work' : 'light day-long activity'}.`
    if (z5Moved > 0) flags.push({ c: 'warn', t: `Zone 5 is short interval work. We counted ${Z5_TRUE_MAX_MIN} minutes as true Zone 5 and the other ${z5Moved} minutes at the Zone 4 sweat rate.` })
    if (hardMin > HARD_DAY_WARN_MIN) flags.push({ c: 'warn', t: `Over ${HARD_DAY_WARN_MIN} minutes in Zone 4 and 5 is a very hard day. Weigh in before and after your next session to replace this estimate with your real sweat rate.` })
  }

  const naMg = Math.round(fluidL * body.salt * 23)
  const cap = peakRate >= 1.5 ? 800 : peakRate >= 1.0 ? 600 : peakRate > 0 ? 500 : 400
  const bsa = 0.007184 * Math.pow(heightCm, 0.725) * Math.pow(weightKg, 0.425)
  const saMass = bsa / weightKg

  if (saMass >= BSA_EFFICIENT) flags.push({ c: 'ok', t: 'Efficient cooling build. Your surface-area-to-mass ratio favors heat loss, so you shed heat relatively well.' })
  else if (saMass <= BSA_VULNERABLE) flags.push({ c: 'warn', t: 'Heat-vulnerable build. A lower surface-area-to-mass ratio means you rely more on sweating to shed heat. Prioritize fluid and cooling in warm sessions.' })
  else flags.push({ c: 'ok', t: 'Balanced surface-area-to-mass ratio for heat dissipation.' })

  const bfFlag = BF_HEAT_FLAG[body.sex]
  if (bfN >= bfFlag) flags.push({ c: 'bad', t: `At ${bfN}% body fat, fat acts as thermal insulation and lowers your total-body-water reserve. Military cohort studies link excess body fat to several times higher heat-illness risk. Hydrate early and avoid peak heat for hard sessions.` })
  if (peakRate >= 1.5) flags.push({ c: 'warn', t: 'Zone 4-5 work: sodium replacement is mandatory for sessions over 60 minutes. Plain water alone risks hyponatremia.' })
  else if (fluidL > 0) flags.push({ c: 'ok', t: 'Moderate sweat load. Sip to thirst and add sodium on any session over 60 minutes.' })
  flags.push({ c: 'warn', t: 'Both dehydration and overdrinking are dangerous. Never exceed the intra-session absorption cap; use thirst as your ceiling.' })

  const rehyd = (fluidL * 1.5).toFixed(1)
  narr += ` Aim to replace it steadily${sessionMode ? `, about ${rehyd} L in the hours after training` : ''}, pairing fluid with sodium so you do not dilute your blood.`

  return { result: { fluidL, peakRate, cap, naMg, kMg: Math.round(fluidL * 5 * 39), mgMg: Math.round(fluidL * 0.8 * 24), sessionMode, narr, flags } }
}

function HydrationView({ body, times, setZone, result, setResult, onSaved, saveState }: {
  body: Body; times: ZoneTime; setZone: (k: number, field: 'h' | 'm', val: number) => void
  result: HydrationResult | null; setResult: (r: HydrationResult | null) => void
  onSaved: (inputs: Record<string, unknown>, outputs: Record<string, unknown>) => void
  saveState: string
}) {
  const [measured, setMeasured] = useState(false)
  const [m, setM] = useState<Measured>({ pre: body.weight, post: String(Math.max(0, num(body.weight) - 2)), sesMin: '60', drunk: '0.5', urine: '0' })
  const [error, setError] = useState('')
  const setField = (patch: Partial<Measured>) => setM(prev => ({ ...prev, ...patch }))

  const total = totalMinutes(times)
  const complete = measured || total === 1440
  const calcLabel = calcLabelFor(total)

  function calculate() {
    const out = computeHydration(body, times, measured, m)
    if (out.error) { setError(out.error); setResult(null); return }
    setError('')
    setResult(out.result ?? null)
    if (out.result) {
      onSaved(
        { body, times, measured, measuredInputs: m },
        {
          fluidL: out.result.fluidL,
          peakRate: out.result.peakRate,
          cap: out.result.cap,
          naMg: out.result.naMg,
          kMg: out.result.kMg,
          mgMg: out.result.mgMg,
          sessionMode: out.result.sessionMode,
        },
      )
    }
  }

  const flagStyle: Record<string, string> = {
    ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warn: 'bg-amber-50 text-amber-700 border-amber-200',
    bad: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Step 2 · Your day in zones">
        <label className="flex items-start gap-3 bg-cobalt-light border border-cobalt/20 rounded-card p-3.5 mb-4 cursor-pointer">
          <input type="checkbox" className="mt-1" checked={measured} onChange={e => setMeasured(e.target.checked)} />
          <span><b className="block text-sm text-cobalt-ink">I measured my sweat rate</b><span className="text-xs text-slate-500">Use a pre/post weigh-in for your real number instead of a zone estimate (gold standard)</span></span>
        </label>

        {measured ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Pre (lb)</Label><input type="number" inputMode="decimal" className="input" value={m.pre} onChange={e => setField({ pre: e.target.value })} /></div>
              <div><Label>Post (lb)</Label><input type="number" inputMode="decimal" className="input" value={m.post} onChange={e => setField({ post: e.target.value })} /></div>
              <div><Label>Session (min)</Label><input type="number" inputMode="numeric" className="input" value={m.sesMin} min={LIM.session.min} max={LIM.session.max} onChange={e => setField({ sesMin: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Fluid drunk (L)</Label><input type="number" inputMode="decimal" step="0.1" min={0} className="input" value={m.drunk} onChange={e => setField({ drunk: e.target.value })} /></div>
              <div><Label>Urine (L)</Label><input type="number" inputMode="decimal" step="0.1" min={0} className="input" value={m.urine} onChange={e => setField({ urine: e.target.value })} /></div>
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
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-card px-4 py-3">{error}</p>}
      {saveState && <p className="text-xs text-slate-500">{saveState}</p>}

      {result && (
        <SectionCard title="Your sweat-loss replacement">
          <p className="text-base leading-relaxed text-cobalt-ink mb-5">{result.narr}</p>

          <div className="text-center text-white rounded-card p-5 mb-4" style={{ background: 'linear-gradient(135deg,#1D4ED8,#7C3AED)' }}>
            <div className="font-display font-extrabold text-4xl leading-none">{result.fluidL.toFixed(result.fluidL < 1 ? 2 : 1)} L</div>
            <div className="text-xs opacity-90 mt-1.5">{result.sessionMode ? 'measured fluid lost this session, rehydrate to ~150% of this' : 'estimated fluid lost to sweat today, replace across the day'}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
            <div className="border border-cobalt/10 rounded-card p-4 text-center"><div className="font-display font-bold text-2xl text-cobalt-ink">{result.peakRate.toFixed(2)} L/hr</div><div className="text-xs uppercase tracking-wide text-slate-500 mt-1.5">{result.sessionMode ? 'Measured sweat rate' : 'Peak sweat rate'}</div></div>
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
          <p className="text-xs text-slate-400 mt-4 leading-relaxed">These are sweat-replacement estimates to spread across the day via food and drinks, not one forced dose and not your full dietary intake. Fluid cap follows IMMDA guidance (400 to 800 mL/hr); heat-risk flags draw on military exertional heat illness cohorts.</p>
        </SectionCard>
      )}
    </div>
  )
}

// =============================== PAGE ======================================
export function MyFuel() {
  const { user } = useAuth()
  const [view, setView] = useState<'nutrition' | 'hydration'>('nutrition')
  // Shared inputs owned by the page so toggling views never wipes them.
  const [body, setBody] = useState<Body>(DEFAULT_BODY)
  const [times, setTimes] = useState<ZoneTime>(() => initTimes(N_ZONES))
  const [nResult, setNResult] = useState<NutritionResult | null>(null)
  const [hResult, setHResult] = useState<HydrationResult | null>(null)
  const [nSave, setNSave] = useState('')
  const [hSave, setHSave] = useState('')
  const [prefillNote, setPrefillNote] = useState('')

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    void (async () => {
      const bodyIn = await loadLatestFuelBody(user.id)
      if (cancelled || !bodyIn) return
      setBody(prev => ({
        sex: bodyIn.sex === 'female' || bodyIn.sex === 'male' ? bodyIn.sex : prev.sex,
        weight: typeof bodyIn.weight === 'string' ? bodyIn.weight : prev.weight,
        bf: typeof bodyIn.bf === 'string' ? bodyIn.bf : prev.bf,
        ft: typeof bodyIn.ft === 'string' ? bodyIn.ft : prev.ft,
        inch: typeof bodyIn.inch === 'string' ? bodyIn.inch : prev.inch,
        salt: typeof bodyIn.salt === 'number' ? bodyIn.salt : prev.salt,
      }))
      setPrefillNote('Loaded your last saved body inputs.')
    })()
    return () => { cancelled = true }
  }, [user?.id])

  function setZone(k: number, field: 'h' | 'm', val: number) {
    setTimes(t => ({ ...t, [k]: { ...t[k], [field]: val } }))
  }

  function persist(kind: 'nutrition' | 'hydration', inputs: Record<string, unknown>, outputs: Record<string, unknown>) {
    if (!user?.id) {
      const msg = 'Sign in required to save this capture.'
      if (kind === 'nutrition') setNSave(msg)
      else setHSave(msg)
      return
    }
    const setMsg = kind === 'nutrition' ? setNSave : setHSave
    setMsg('Saving…')
    void saveFuelLog(user.id, kind, inputs, outputs).then(res => {
      if (res.error) setMsg(`Saved locally only — cloud save failed: ${res.error}`)
      else setMsg(`Saved to your Fuel log${res.id ? ` (${res.id.slice(0, 8)})` : ''}.`)
    })
  }

  return (
    <div className="space-y-5">
      <PageHeader title="My Fuel" subtitle="Zone-based nutrition and hydration for the body you're building" />
      {prefillNote && <p className="text-xs text-slate-500">{prefillNote}</p>}

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

      <BodyCard body={body} onChange={setBody} showHydrationFields={view === 'hydration'} />

      {view === 'nutrition'
        ? <NutritionView body={body} times={times} setZone={setZone} result={nResult} setResult={setNResult} onSaved={(i, o) => persist('nutrition', i, o)} saveState={nSave} />
        : <HydrationView body={body} times={times} setZone={setZone} result={hResult} setResult={setHResult} onSaved={(i, o) => persist('hydration', i, o)} saveState={hSave} />}
    </div>
  )
}
