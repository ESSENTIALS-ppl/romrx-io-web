import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Info, SkipForward } from 'lucide-react'
import { cn } from '../lib/cn'
import { scoreToTier, tierLabel } from '../lib/tier'

const SUBMIT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-lead-assessment`

// -- Types --------------------------------------------------------------------
interface Field {
  key: string
  label: string
  unit?: string
  normalLow: number
  normalHigh: number
  riskBelow: number // AT RISK threshold
}

interface Step {
  id: string
  title: string
  why: string // One-line relevance for training/movement readiness
  tool: string // What to use to measure
  position: string[] // Setup steps (numbered)
  howTo: string[] // How to measure steps
  mistake: string // Common mistake
  mistakeFix: string // The fix
  fields: Field[]
}

// -- Measurement steps (one per joint group) -----------------------------------
const STEPS: Step[] = [
  {
    id: 'hip_er',
    title: 'Hip External Rotation',
    why: 'Supports seated and ground-based positions that require an open hip.',
    tool: 'iPhone: Measure app -> Level. Android: Simple Inclinometer. Firm chair.',
    position: [
      'Sit in a firm chair. Both feet flat on the floor, knees at 90°.',
      'Hold your phone against the FRONT of your shin (just below your knee). Screen faces FORWARD - away from your leg. Long edge runs along your shinbone.',
      'Tap to zero. The phone should read close to 0°.',
    ],
    howTo: [
      'Keep your thigh pressed down. Slowly swing your foot INWARD - toward your other leg.',
      'Stop when you feel a firm stretch or your thigh starts to lift off the chair. Read the number.',
      'Record it. Return to center. Re-zero. Switch legs and repeat.',
    ],
    mistake: 'Your thigh rotates instead of just your shin.',
    mistakeFix: 'Press one hand gently on your thigh to hold it still. Only the lower leg moves.',
    fields: [
      { key: 'hip_er_l', label: 'Left', unit: '°', normalLow: 40, normalHigh: 60, riskBelow: 40 },
      { key: 'hip_er_r', label: 'Right', unit: '°', normalLow: 40, normalHigh: 60, riskBelow: 40 },
    ],
  },
  {
    id: 'hip_ir',
    title: 'Hip Internal Rotation',
    why: 'Protects the knee and supports hip escapes and rotational movement.',
    tool: 'Same chair, same phone placement - only the foot direction changes.',
    position: [
      'Stay in the same chair. Do NOT move your position.',
      'Phone is still on the front of your shin, screen facing forward.',
      'Tap to re-zero at center before each leg.',
    ],
    howTo: [
      'Keep your thigh pressed down. Slowly swing your foot OUTWARD - away from your other leg.',
      'Stop when you feel a firm stretch or one hip starts to lift. Read the number.',
      'Record it. Return to center. Re-zero. Switch legs and repeat.',
    ],
    mistake: 'One hip lifts off the chair.',
    mistakeFix: 'You must stay sitting evenly on both sides. The moment one side lifts, that is your endpoint. Record it.',
    fields: [
      { key: 'hip_ir_l', label: 'Left', unit: '°', normalLow: 30, normalHigh: 45, riskBelow: 30 },
      { key: 'hip_ir_r', label: 'Right', unit: '°', normalLow: 30, normalHigh: 45, riskBelow: 30 },
    ],
  },
  {
    id: 'shoulder_er',
    title: 'Shoulder External Rotation',
    why: 'Supports overhead and pressing positions and helps protect the shoulder joint.',
    tool: 'iPhone: Measure -> Level. Android: Simple Inclinometer. Seated in chair.',
    position: [
      'Sit upright. Raise one arm straight out to the side at shoulder height, like a T. Bend your elbow to 90°.',
      'Hold your phone in that hand, screen facing toward you. That is your starting position.',
      'Tap to zero.',
    ],
    howTo: [
      'Keep your elbow in the same spot. Rotate your forearm upward, allowing your shoulder to turn until you feel a strong stretch.',
      'Read the number or have a partner read it.',
      'Record the number. Re-zero and repeat with the opposite arm.',
    ],
    mistake: 'Your shoulder shrugs up or your elbow drops below shoulder height.',
    mistakeFix: 'Keep your shoulder pressed down and your elbow at the same height the whole time. From the elbow to the shoulder, the arm only rotates - it does not lift up or drop down.',
    fields: [
      { key: 'shoulder_er_l', label: 'Left', unit: '°', normalLow: 60, normalHigh: 90, riskBelow: 60 },
      { key: 'shoulder_er_r', label: 'Right', unit: '°', normalLow: 60, normalHigh: 90, riskBelow: 60 },
    ],
  },
  {
    id: 'shoulder_flex',
    title: 'Shoulder Flexion',
    why: 'Overhead reach and pressing movements both require full shoulder lift.',
    tool: 'iPhone: Measure -> Level. Android: Simple Inclinometer. Standing.',
    position: [
      'Stand upright with room overhead and your arm hanging relaxed at your side.',
      'Hold your phone in your hand with the screen facing toward you.',
      'Tap to zero while your arm hangs straight down.',
    ],
    howTo: [
      'Keep your elbow straight. Raise your arm FORWARD and UP as high as you can go.',
      'Stop when you cannot go higher without leaning back or shrugging. Read the number.',
      'Record it. Shake out your arm. Re-zero. Repeat on the other side.',
    ],
    mistake: 'Leaning your upper body backward or shrugging your shoulder to get the arm higher.',
    mistakeFix: 'Keep your body tall and still. The moment your back starts to arch or your shoulder creeps up toward your ear, that is your true end range. Record it there.',
    fields: [
      { key: 'shoulder_flex_l', label: 'Left', unit: '°', normalLow: 140, normalHigh: 180, riskBelow: 120 },
      { key: 'shoulder_flex_r', label: 'Right', unit: '°', normalLow: 140, normalHigh: 180, riskBelow: 120 },
    ],
  },
  {
    id: 'cervical_lat',
    title: 'Cervical Lateral Flexion',
    why: 'Lateral neck strength and range support balance and control in scrambles and contact.',
    tool: 'iPhone: Measure -> Level. Android: Simple Inclinometer. Seated in chair.',
    position: [
      'Sit upright in a chair. Feet flat. Back straight.',
      'Press your phone flat against your FOREHEAD, screen facing forward away from your face.',
      'Tap to zero while looking straight ahead.',
    ],
    howTo: [
      'Tilt your ear toward your left shoulder as far as it will go. Keep your shoulder pressed down.',
      'Read the number. Re-zero. Tilt your ear toward your right shoulder. Read and record both sides.',
    ],
    mistake: 'Shrugging your shoulder up to meet your ear.',
    mistakeFix: 'Keep both shoulders pressed down the whole time. Only your head moves. If your shoulder rises, that reading does not count.',
    fields: [
      { key: 'cervical_lat_l', label: 'Left', unit: '°', normalLow: 40, normalHigh: 45, riskBelow: 30 },
      { key: 'cervical_lat_r', label: 'Right', unit: '°', normalLow: 40, normalHigh: 45, riskBelow: 30 },
    ],
  },
  {
    id: 'cervical_flex_ext',
    title: 'Cervical Flexion + Extension',
    why: 'Chin-to-chest and looking-up range both matter for posture and neck safety under load.',
    tool: 'iPhone: Measure -> Level. Android: Simple Inclinometer. Seated in chair.',
    position: [
      'Sit upright in a chair. Feet flat. Back straight.',
      'Press your phone flat against the SIDE of your head at the temple, screen facing the wall beside you.',
      'Tap to zero while looking straight ahead.',
    ],
    howTo: [
      'Flexion: Drop your chin toward your chest as far as it will go. Read the number. Record it.',
      'Re-zero. Extension: Lift your chin toward the ceiling as far as it will go. Read the number. Record it.',
    ],
    mistake: 'Moving your whole upper body forward or backward instead of just your head and neck.',
    mistakeFix: 'Your shoulders and torso stay still. Only your head moves. If your back starts to round or arch, stop there.',
    fields: [
      { key: 'cervical_flex', label: 'Flexion', unit: '°', normalLow: 45, normalHigh: 60, riskBelow: 35 },
      { key: 'cervical_ext', label: 'Extension', unit: '°', normalLow: 55, normalHigh: 70, riskBelow: 40 },
    ],
  },
  {
    id: 'hip_flex',
    title: 'Hip Flexion',
    why: 'Deep hip flexion supports ground-based positions and squat depth alike.',
    tool: 'iPhone: Measure -> Level. Android: Simple Inclinometer. Lying on the floor.',
    position: [
      'Lie flat on your back on the floor. Both legs straight.',
      'Hold your phone flat against the outer side of your thigh (the surface facing away from your other leg), midway between your hip and your knee. Screen faces outward.',
      'Tap to zero with your leg flat on the ground.',
    ],
    howTo: [
      'Keep your knee completely straight. Raise your leg as high as you can without bending the knee.',
      'Keep the phone aligned with your thigh as it rises. Stop just before your low back starts to lift off the floor. Read the number.',
      'Record it. Lower the leg slowly. Re-zero. Repeat on the other side.',
    ],
    mistake: 'Bending the knee as the leg rises, or going so high that the low back arches off the floor.',
    mistakeFix: 'Your leg stays completely straight the whole time. Stop before your low back lifts - once it arches, you have gone past your true range.',
    fields: [
      { key: 'hip_flex_l', label: 'Left', unit: '°', normalLow: 100, normalHigh: 120, riskBelow: 100 },
      { key: 'hip_flex_r', label: 'Right', unit: '°', normalLow: 100, normalHigh: 120, riskBelow: 100 },
    ],
  },
  {
    id: 'hip_abd',
    title: 'Hip Abduction',
    why: 'A wide, stable base depends on healthy hip abduction range.',
    tool: 'iPhone: Measure -> Level. Android: Simple Inclinometer. Standing.',
    position: [
      'Stand upright with something nearby you can grab for balance if needed.',
      'Hold your phone flat against the front of your thigh with your same side hand, screen facing away from you.',
      'Tap to zero while standing straight, weight even on both feet.',
    ],
    howTo: [
      'Lift your test leg sideways, out away from your body. Keep your toes pointing forward the whole time.',
      'Stop just before your upper body starts to lean to the opposite side or your hip hinges backward. Read the number.',
      'Record it. Lower the leg. Re-zero. Repeat on the other side.',
    ],
    mistake: 'Leaning your torso away or letting the hip hinge backward to get the leg higher.',
    mistakeFix: 'Your torso stays upright and your hip stays directly under you. The moment either shifts, you have hit your true end range.',
    fields: [
      { key: 'hip_abd_l', label: 'Left', unit: '°', normalLow: 35, normalHigh: 45, riskBelow: 25 },
      { key: 'hip_abd_r', label: 'Right', unit: '°', normalLow: 35, normalHigh: 45, riskBelow: 25 },
    ],
  },
  {
    id: 'lumbar',
    title: 'Lumbar Flexion + Extension',
    why: 'Low back range and control support bending, lifting, and recovering from awkward positions.',
    tool: 'iPhone: Measure -> Level. Android: Simple Inclinometer. Standing + Floor.',
    position: [
      'Flexion is standing. Extension is on the floor face down.',
      'Flexion setup: Stand straight, feet shoulder-width apart. Hold your phone at your side, screen facing away. Make sure to zero before you start.',
      'Extension setup: Lie face down on the floor. Place one hand under your shoulder for the press-up. Hold your phone at your side with your other hand, screen facing away. Zero lying flat.',
    ],
    howTo: [
      'Flexion: Keep your legs straight. Slowly bend forward with your back flat. Stop when you feel a strong stretch in the back of your legs. Read the number.',
      'Extension: Press up on one arm into a cobra, keeping your hips flat on the floor. Read the number at your end range.',
    ],
    mistake: 'Rounding the back to get lower on flexion, or letting your hips lift off the floor during the cobra.',
    mistakeFix: 'For flexion, the stretch in the back of your legs is your true stopping point. For extension, your hips stay flat on the floor the entire time - only your chest rises.',
    fields: [
      { key: 'lumbar_flex', label: 'Flexion', unit: '°', normalLow: 40, normalHigh: 80, riskBelow: 40 },
      { key: 'lumbar_ext', label: 'Extension', unit: '°', normalLow: 20, normalHigh: 30, riskBelow: 15 },
    ],
  },
  {
    id: 'ankle_df',
    title: 'Ankle Dorsiflexion',
    why: 'Base and balance in every standing movement depend on ankle range.',
    tool: 'Tape measure or ruler. Standing knee-to-wall test (measure in centimeters).',
    position: [
      'Remove your shoes. Stand barefoot facing a wall with a tape measure on the floor pointing straight out from the wall.',
      'Place the tip of your big toe at the 10 cm mark on the tape.',
      'Keep your heel flat on the floor the entire test.',
    ],
    howTo: [
      'Drive your knee forward to touch the wall without lifting your heel. Move your foot closer or farther from the wall until you find the spot where your knee can just barely touch with the heel still flat.',
      'Once you find that spot, measure the distance from the wall to the tip of your big toe. That is your score. Record it in cm.',
      'Repeat on the other side.',
    ],
    mistake: 'Your heel lifts off the floor as your knee drives forward.',
    mistakeFix: 'Keep your eye on your heel the whole time. If it lifts even slightly, that rep does not count. Adjust your foot closer to the wall and try again.',
    fields: [
      { key: 'ankle_df_l', label: 'Left', unit: 'cm', normalLow: 10, normalHigh: 20, riskBelow: 10 },
      { key: 'ankle_df_r', label: 'Right', unit: 'cm', normalLow: 10, normalHigh: 20, riskBelow: 10 },
    ],
  },
]

const SETUP_STEPS = [
  { icon: '📱', label: 'iPhone', detail: 'Open the Measure app (pre-installed on all iPhones). Tap Level at the bottom. You will see a number in degrees that changes as you tilt the phone - that is your angle.' },
  { icon: '🤖', label: 'Android', detail: 'Download "Simple Inclinometer" by Syleos Apps, free on Google Play. Open it and you will see your angle in degrees, just like a digital level.' },
  { icon: '🤝', label: 'Partner (recommended)', detail: 'A partner makes this much easier - they hold the phone and read the angle while you focus on moving. You can do it solo using the screenshot tip on each step.' },
  { icon: '🔄', label: 'Warm up first - 5 minutes', detail: '1) Walk or march in place for 2 minutes. 2) Arm circles - 10 forward, 10 backward. 3) Hip circles - big loops with your hips like a hula hoop, 10 each way. 4) Leg swings - hold a wall, swing each leg front-to-back 10 times then side-to-side 10 times. 5) Slow neck turns - look left and right, 5 times each way. Wear shorts and a t-shirt.' },
  { icon: '📸', label: 'Solo tip', detail: 'When you cannot tap the screen: say "Hey Siri, take a screenshot" (iPhone) or "Hey Google, take a screenshot" (Android). Read the number right after.' },
  { icon: '⏭️', label: 'Skip is always OK', detail: 'If a position is too difficult or you need a partner for a step and do not have one, tap Skip. Your score is based on what you completed. You can always come back and fill in any skipped measurements later.' },
]

// -- Live scoring helper --------------------------------------------------------
function getScore(val: string, field: Field) {
  const n = parseFloat(val)
  if (isNaN(n) || val === '') return null
  if (n < field.riskBelow) return 'risk'
  if (n >= field.normalLow) return 'functional'
  return 'yellow'
}

// -- Single field input ----------------------------------------------------------
function MeasureInput({ field, value, onChange }: {
  field: Field; value: string; onChange: (k: string, v: string) => void
}) {
  const score = getScore(value, field)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-cobalt-ink">{field.label}</label>
        <span className="text-xs text-slate-500">Normal: {field.normalLow}-{field.normalHigh}{field.unit}</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number" min="0" max="360" step="0.5"
          value={value}
          onChange={e => onChange(field.key, e.target.value)}
          placeholder=""
          className={cn(
            'w-24 px-3 py-2.5 rounded-card border text-sm text-center font-mono font-bold transition-all focus:outline-none',
            score === 'risk' ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-400' :
            score === 'functional' ? 'border-cobalt/40 bg-cobalt/5 text-cobalt focus:border-cobalt' :
            score === 'yellow' ? 'border-yellow-300 bg-yellow-50 text-yellow-700 focus:border-yellow-400' :
            'border-cobalt/10 bg-surface focus:border-cobalt focus:bg-white'
          )}
        />
        <span className="text-sm text-slate-500">{field.unit}</span>
        {score === 'risk' && (
          <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
            <AlertTriangle size={10} /> AT RISK
          </span>
        )}
        {score === 'functional' && (
          <span className="flex items-center gap-1 text-xs font-semibold text-cobalt bg-cobalt-light px-2 py-0.5 rounded-full">
            <CheckCircle2 size={10} /> FUNCTIONAL
          </span>
        )}
        {score === 'yellow' && (
          <span className="flex items-center gap-1 text-xs font-semibold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">
            LOW
          </span>
        )}
      </div>
    </div>
  )
}

// -- Main component ----------------------------------------------------------------
export function Assessment() {
  const { session, user } = useAuth()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'setup' | 'measure' | 'lead' | 'done' | 'lead-done'>('setup')
  const [stepIdx, setStepIdx] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (key: string, val: string) => setValues(p => ({ ...p, [key]: val }))

  const step = STEPS[stepIdx]
  const totalMeasureSteps = STEPS.length
  const progress = Math.round((stepIdx / totalMeasureSteps) * 100)

  const handleNext = () => {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx(s => s + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (session) {
      submit()
    } else {
      setPhase('lead')
    }
  }

  function computeAssessmentData() {
    const data: Record<string, number | null> = {}
    for (const [k, v] of Object.entries(values)) {
      data[k] = v === '' ? null : parseFloat(v)
    }
    return data
  }

  const submit = async (leadEmail?: string, leadName?: string) => {
    setLoading(true); setError('')
    const assessment_data = computeAssessmentData()
    const prs_score = 100 // TODO(phase1): server computes authoritative PRS; client sends raw data only.

    const body: Record<string, unknown> = {
      assessment_data,
      prs_score,
      tier: tierLabel(scoreToTier(prs_score)),
    }
    if (session) {
      body.user_id = user?.id
    } else {
      body.email = leadEmail
      body.full_name = leadName
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    }
    if (session) headers['Authorization'] = `Bearer ${session.access_token}`

    try {
      const res = await fetch(SUBMIT_URL, { method: 'POST', headers, body: JSON.stringify(body) })
      const data = await res.json()
      setLoading(false)
      if (!data.ok) { setError(data.error ?? 'Submission failed. Please try again.'); return }

      if (session) {
        setPhase('done')
        setTimeout(() => navigate('/onboarding/results', { replace: true }), 2000)
      } else {
        setPhase('lead-done')
      }
    } catch {
      setLoading(false)
      setError('Something went wrong. Please try again.')
    }
  }

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Please enter your email.'); return }
    submit(email, fullName)
  }

  // -- Setup screen -----------------------------------------------------------
  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-surface py-8 px-4">
        <div className="max-w-lg mx-auto space-y-5">
          <div className="text-center">
            <h1 className="font-display font-bold text-cobalt text-2xl">ROM Self-Assessment</h1>
            <p className="text-sm text-slate-500 mt-1">15 minutes - Smartphone inclinometer - No equipment needed</p>
          </div>

          <div className="card p-6 space-y-4">
            <p className="text-sm font-semibold text-cobalt-ink">Before you start:</p>
            {SETUP_STEPS.map(s => (
              <div key={s.label} className="flex gap-3 items-start">
                <span className="text-xl shrink-0">{s.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-cobalt-ink">{s.label}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-cobalt-light rounded-card p-4">
            <div className="flex gap-2 items-start">
              <Info size={16} className="text-cobalt mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-cobalt">The method in 4 words: Place. Zero. Move. Read.</p>
                <p className="text-xs text-cobalt/80 mt-1 leading-relaxed">
                  Hold phone flat against the body part. Tap screen to zero it. Move slowly to your end range. Read the number - ignore any minus sign. Each step tells you exactly where to hold the phone and which direction to move.
                </p>
              </div>
            </div>
          </div>

          <button onClick={() => setPhase('measure')} className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3">
            I'm ready - Start assessment <ChevronRight size={18} />
          </button>
          <p className="text-center text-xs text-slate-500">You can skip any measurement you can't do and retest later.</p>
        </div>
      </div>
    )
  }

  // -- Lead capture screen (unauthenticated) -----------------------------------
  if (phase === 'lead') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="font-display font-bold text-cobalt text-2xl">Almost done!</h1>
            <p className="text-sm text-slate-500 mt-1">Enter your email to see your results.</p>
          </div>
          <form onSubmit={handleLeadSubmit} className="card p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="First Last" className="input" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus className="input" />
            </div>
            {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              See my results
            </button>
          </form>
        </div>
      </div>
    )
  }

  // -- Lead thank-you screen ----------------------------------------------------
  if (phase === 'lead-done') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center space-y-4 px-4 max-w-sm">
          <div className="w-16 h-16 bg-cobalt-light rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-cobalt" fill="currentColor" strokeWidth={0} />
          </div>
          <h2 className="font-display font-bold text-xl text-cobalt-ink">Check your email!</h2>
          <p className="text-sm text-slate-500">We sent your Position Readiness results and a link to unlock your full dashboard to <strong>{email}</strong>.</p>
        </div>
      </div>
    )
  }

  // -- Done screen ---------------------------------------------------------------
  if (phase === 'done') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-cobalt-light rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-cobalt" fill="currentColor" strokeWidth={0} />
          </div>
          <h2 className="font-display font-bold text-xl text-cobalt-ink">Assessment complete!</h2>
          <p className="text-sm text-slate-500">Computing your Position Readiness Score...</p>
          <div className="w-6 h-6 border-[3px] border-cobalt/30 border-t-cobalt rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  // -- Measurement screen ----------------------------------------------------------
  return (
    <div className="min-h-screen bg-surface py-6 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-cobalt-light rounded-full overflow-hidden">
            <div className="h-full bg-cobalt rounded-full transition-all duration-500"
              style={{ width: `${progress + (100 / totalMeasureSteps)}%` }} />
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap">{stepIdx + 1} / {totalMeasureSteps}</span>
        </div>

        {/* Joint card */}
        <div className="bg-white rounded-card border border-cobalt/10 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-cobalt px-5 py-4">
            <h2 className="font-display font-bold text-xl text-white">{step.title}</h2>
            <p className="text-cobalt-light text-xs mt-0.5">{step.why}</p>
          </div>

          <div className="p-5 space-y-5">
            {/* Tool badge */}
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-surface rounded-card px-3 py-2">
              <span className="text-base">📐</span>
              <span className="font-medium">{step.tool}</span>
            </div>

            {/* Setup */}
            <div>
              <p className="text-xs font-bold text-cobalt-ink uppercase tracking-wide mb-2">Setup</p>
              <ol className="space-y-1.5">
                {step.position.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-slate-500 leading-snug">
                    <span className="w-5 h-5 bg-cobalt-light text-cobalt text-xs font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>

            {/* How to */}
            <div>
              <p className="text-xs font-bold text-cobalt-ink uppercase tracking-wide mb-2">How to Measure</p>
              <ol className="space-y-1.5">
                {step.howTo.map((s, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-slate-500 leading-snug">
                    <span className="w-5 h-5 bg-surface border border-cobalt/10 text-slate-500 text-xs font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>

            {/* Common mistake */}
            <div className="flex gap-2.5 bg-yellow-50 border border-yellow-200 rounded-card p-3">
              <AlertTriangle size={15} className="text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-yellow-700">Common mistake</p>
                <p className="text-xs text-yellow-700 mt-0.5">{step.mistake}</p>
                <p className="text-xs text-yellow-800 font-medium mt-1">Fix: {step.mistakeFix}</p>
              </div>
            </div>

            {/* Input fields */}
            <div className="space-y-4 pt-2 border-t border-cobalt/10">
              <p className="text-xs font-bold text-cobalt-ink uppercase tracking-wide">Enter your measurements</p>
              {step.fields.map(f => (
                <MeasureInput key={f.key} field={f} value={values[f.key] ?? ''} onChange={handleChange} />
              ))}
            </div>

            {/* Hands-free screenshot tip */}
            <p className="text-center text-xs text-slate-500">
              📸 Can't tap the screen? Say <span className="font-semibold">&ldquo;Hey Siri, take a screenshot&rdquo;</span> (iPhone) or <span className="font-semibold">&ldquo;Hey Google, take a screenshot&rdquo;</span> (Android).
            </p>

            {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => { if (stepIdx > 0) { setStepIdx(s => s - 1); window.scrollTo({ top: 0 }) } else setPhase('setup') }}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-cobalt px-3 py-2 rounded-card hover:bg-cobalt-light transition-colors"
              >
                <ChevronLeft size={15} /> Back
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { handleChange(step.fields[0].key, ''); handleNext() }}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-cobalt-ink px-3 py-2 rounded-card hover:bg-surface transition-colors"
                >
                  <SkipForward size={13} /> Skip
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                  className="btn-primary flex items-center gap-2"
                >
                  {loading
                    ? <><Loader2 size={14} className="animate-spin" /> Submitting...</>
                    : stepIdx === STEPS.length - 1
                      ? <><CheckCircle2 size={14} /> Submit</>
                      : <>Next <ChevronRight size={14} /></>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={cn(
              'rounded-full transition-all duration-300',
              i === stepIdx ? 'bg-cobalt w-5 h-2' : i < stepIdx ? 'bg-cobalt/40 w-2 h-2' : 'bg-gray-200 w-2 h-2'
            )} />
          ))}
        </div>
      </div>
    </div>
  )
}
