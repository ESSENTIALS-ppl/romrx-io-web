/**
 * ROMood mood input: ONE swappable component (Jim may replace bubbles). Any replacement must keep
 * MoodInputProps: it reads and writes energy/pleasantness (0 to 100) and an optional feeling word.
 * Pick the visual with ROMOOD_PLACEHOLDERS.inputVisual (lib/romoodCopy.ts).
 */
import { ROMOOD_COPY as C, FEELING_WORDS, QUADRANT_NAMES, ROMOOD_PLACEHOLDERS, type FeelingWord, type Quadrant } from '../lib/romoodCopy'
import { positionFor, quadrantFor, readoutIndex } from '../lib/romood'

export type MoodValue = { energy: number; pleasantness: number; word: FeelingWord | null }
export type MoodInputProps = { value: MoodValue; onChange: (v: MoodValue) => void }

const GRID: Quadrant[] = ['high_unpleasant', 'high_pleasant', 'low_unpleasant', 'low_pleasant']

export function BubbleMoodInput({ value, onChange }: MoodInputProps) {
  const { energy, pleasantness, word } = value
  const active = quadrantFor(energy, pleasantness)
  const pick = (w: FeelingWord) => onChange({ ...positionFor(w), word: w })
  const slide = (k: 'e' | 'p', v: number) => onChange(k === 'e' ? { energy: v, pleasantness, word: null } : { energy, pleasantness: v, word: null })
  return (
    <div className="space-y-4" data-testid="mood-input" data-visual="bubbles">
      {([['e', C.energy, energy], ['p', C.pleasantness, pleasantness]] as const).map(([k, s, v]) => (
        <div key={k}>
          <label className="text-sm font-medium" htmlFor={`romood-${k}`}>{s.label}</label>
          <input id={`romood-${k}`} type="range" min={0} max={100} value={v} className="w-full"
            aria-valuetext={s.readout[readoutIndex(v)]} onChange={e => slide(k, Number(e.target.value))} />
          <div className="flex justify-between text-xs text-slate-500"><span>{s.low}</span><span>{s.readout[readoutIndex(v)]}</span><span>{s.high}</span></div>
        </div>
      ))}
      <div role="group" aria-label={C.gridLabel} className="grid grid-cols-2 gap-2 bg-cobalt-ink rounded-xl p-2">
        {GRID.map(q => (
          <div key={q} role="group" aria-label={QUADRANT_NAMES[q]}
            className={`grid grid-cols-2 gap-1 rounded-lg p-1 ${active === q ? 'ring-2 ring-white' : ''}`}>
            {FEELING_WORDS.filter(w => w.quadrant === q).map(w => (
              <button key={w.word} type="button" aria-pressed={word?.word === w.word} onClick={() => pick(w)}
                className="rounded-full aspect-square text-xs font-semibold bg-white/80">{w.word}</button>
            ))}
          </div>
        ))}
      </div>
      {word && <p className="text-sm" data-testid="romood-description">{word.description}</p>}
    </div>
  )
}

export const MOOD_INPUTS = { bubbles: BubbleMoodInput } as const

export function MoodInput(props: MoodInputProps) {
  const Visual = MOOD_INPUTS[ROMOOD_PLACEHOLDERS.inputVisual]
  return <Visual {...props} />
}
