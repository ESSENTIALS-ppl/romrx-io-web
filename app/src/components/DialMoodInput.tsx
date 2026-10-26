/**
 * ROMood input option B: the ROMeter dial (Jim picked B, Oct 26 2026; ref romood-visuals-20261026/option-B).
 * Energy = drag the needle (half-circle dial). Pleasantness = colour bar below; it also tints the needle.
 * Feeling word in the readout; tapping it opens a word picker. Stores the same fields: energy 0-100,
 * pleasantness 0-100, word (null unless the user picks one).
 *
 * Accessibility: the dial is role="slider" (arrows, PageUp/PageDown, Home/End) with aria-valuetext;
 * the bar is a native range input with aria-valuetext. The word and the energy caption sit BELOW the
 * dial in normal page flow, so the needle can never cover them (fixes the mockup overlap).
 */
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { ROMOOD_COPY as C, FEELING_WORDS, QUADRANT_NAMES, ROMOOD_PLACEHOLDERS, type FeelingWord, type Quadrant } from '../lib/romoodCopy'
import { nearestWord, positionFor, readoutIndex } from '../lib/romood'
import type { MoodInputProps } from './MoodInput'

const CX = 150, CY = 150, R = 120
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
/** energy 0 = far left (180 deg), 100 = far right (0 deg). */
export function needlePoint(energy: number, len = 95) {
  const a = Math.PI * (1 - energy / 100)
  return { x: CX + len * Math.cos(a), y: CY - len * Math.sin(a) }
}
/** Pointer position inside the dial to energy. Points below the pivot snap to the nearest end. */
export function energyFromPoint(x: number, y: number): number {
  const dx = x - CX, dy = CY - y
  if (dy <= 0) return dx < 0 ? 0 : 100
  return clamp(100 * (1 - Math.atan2(dy, dx) / Math.PI))
}
function needleColor(p: number) {
  const stops = [[249, 115, 102], [139, 147, 181], [20, 184, 166], [56, 232, 255]]
  const t = (p / 100) * 3, i = Math.min(2, Math.floor(t)), f = t - i
  const c = stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f))
  return `rgb(${c.join(',')})`
}
const QUADS: Quadrant[] = ['high_unpleasant', 'high_pleasant', 'low_unpleasant', 'low_pleasant']

export function DialMoodInput({ value, onChange }: MoodInputProps) {
  const { energy, pleasantness, word } = value
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState(false)
  const [picker, setPicker] = useState(false)
  const shown = word ?? (ROMOOD_PLACEHOLDERS.dialSuggestWord ? nearestWord(energy, pleasantness) : null)
  const eText = C.energy.readout[readoutIndex(energy)]
  const pText = C.pleasantness.readout[readoutIndex(pleasantness)]
  const setE = (v: number) => onChange({ energy: clamp(v), pleasantness, word: null })
  const setP = (v: number) => onChange({ energy, pleasantness: clamp(v), word: null })
  const pick = (w: FeelingWord) => { onChange({ ...positionFor(w), word: w }); setPicker(false) }

  const fromPointer = (e: PointerEvent<SVGSVGElement>) => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r || !r.width) return
    setE(energyFromPoint(((e.clientX - r.left) / r.width) * 300, ((e.clientY - r.top) / r.height) * 175))
  }
  const onKey = (e: KeyboardEvent) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }
    if (e.key in step) { e.preventDefault(); setE(energy + step[e.key]) }
    else if (e.key === 'Home') { e.preventDefault(); setE(0) }
    else if (e.key === 'End') { e.preventDefault(); setE(100) }
  }
  const tip = needlePoint(energy)
  const arcEnd = needlePoint(energy, R)
  const color = needleColor(pleasantness)

  return (
    <div className="space-y-3" data-testid="mood-input" data-visual="dial">
      <div className="text-center">
        <svg ref={svgRef} viewBox="0 0 300 175" className="w-full max-w-xs mx-auto touch-none select-none"
          role="slider" tabIndex={0} aria-label={C.energy.label} aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={energy} aria-valuetext={`${C.energy.label}: ${eText}`} aria-orientation="horizontal"
          data-testid="mood-dial" onKeyDown={onKey}
          onPointerDown={e => { setDragging(true); (e.target as Element).setPointerCapture?.(e.pointerId); fromPointer(e) }}
          onPointerMove={e => { if (dragging) fromPointer(e) }}
          onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)}>
          <path d={`M30 150 A120 120 0 0 1 270 150`} fill="none" stroke="#1E2C48" strokeWidth={18} strokeLinecap="round" />
          {energy > 0 && <path d={`M30 150 A120 120 0 0 1 ${arcEnd.x.toFixed(1)} ${arcEnd.y.toFixed(1)}`} fill="none" stroke={color} strokeWidth={18} strokeLinecap="round" />}
          <line x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke={color} strokeWidth={4} strokeLinecap="round" data-testid="mood-needle" />
          <circle cx={CX} cy={CY} r={9} fill={color} />
          <text x={30} y={172} fill="#6B7D96" fontSize={11} textAnchor="middle">{C.energy.low}</text>
          <text x={270} y={172} fill="#6B7D96" fontSize={11} textAnchor="middle">{C.energy.high}</text>
        </svg>
        {/* Readout sits below the dial, outside the needle's sweep, so it is never overlapped. */}
        {shown && (
          <button type="button" className="text-2xl font-extrabold underline decoration-dotted" data-testid="mood-word"
            aria-haspopup="dialog" aria-label={`Feeling word: ${shown.word}. Tap to change.`} onClick={() => setPicker(true)}>{shown.word}</button>
        )}
        <p className="text-xs text-slate-500" data-testid="mood-energy-caption">{C.energy.label}: {eText}</p>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="romood-p">{C.pleasantness.label}</label>
        <input id="romood-p" type="range" min={0} max={100} value={pleasantness} className="w-full"
          style={{ accentColor: color }} aria-valuetext={`${C.pleasantness.label}: ${pText}`}
          data-testid="mood-bar" onChange={e => setP(Number(e.target.value))} />
        <div className="flex justify-between text-xs text-slate-500"><span>{C.pleasantness.low}</span><span>{pText}</span><span>{C.pleasantness.high}</span></div>
      </div>

      {word && <p className="text-sm" data-testid="romood-description"><strong>{word.word}</strong> {word.description}</p>}

      {picker && (
        <div role="dialog" aria-modal="true" aria-label={C.gridLabel} className="rounded-xl border border-cobalt/20 p-3 space-y-2" data-testid="mood-picker"
          onKeyDown={e => { if (e.key === 'Escape') setPicker(false) }}>
          {QUADS.map(q => (
            <div key={q} role="group" aria-label={QUADRANT_NAMES[q]} className="flex flex-wrap gap-1">
              {FEELING_WORDS.filter(w => w.quadrant === q).map(w => (
                <button key={w.word} type="button" aria-pressed={word?.word === w.word} onClick={() => pick(w)}
                  className="rounded-full px-3 py-1 text-xs font-semibold border">{w.word}</button>
              ))}
            </div>
          ))}
          <button type="button" className="text-xs underline" onClick={() => setPicker(false)} data-testid="mood-picker-close">{C.back}</button>
        </div>
      )}
    </div>
  )
}
