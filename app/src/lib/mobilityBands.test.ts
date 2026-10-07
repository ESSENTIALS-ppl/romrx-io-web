/**
 * PERMANENT guard for the Base band single source of truth (P0 2026-09-24).
 *
 * Reid saw "96/100 Needs focus" on My Body vs "96/100 Steady" on My Protocol,
 * 5 "top problem areas" under "top three" copy, "Focus" chips, and red bars on
 * Steady joints. Each block below pins one of those so it cannot come back.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BAND_CHIP,
  BAND_FULL,
  BAND_LEGEND,
  BAND_TONE,
  BAND_PERCENT_RANGE,
  JOINT_SCORE_TARGETS,
  ASSESSMENT_JOINTS,
  isUnscoredJoint,
  TOP_PROBLEM_AREAS_MAX,
  bandChip,
  bandFull,
  bandMapFromJointScores,
  bandScoreFromTargetRatio,
  clampPercentToBand,
  jointPercent,
  jointPercentsForAssessment,
  rankBadgeClass,
  worstBandScore,
  formatScoreBand,
  mobilityScoreForAssessment,
  SCORE_BAND_SEPARATOR,
  jointBandsForAssessment,
  overallBandForAssessment,
  topProblemAreas,
  type BandScore,
  type JointScoreRow,
} from './mobilityBands'
import { getScore } from '../pages/assessmentMeta'

const SRC = resolve(__dirname, '..')
const REPO = resolve(SRC, '..', '..')
const read = (p: string) => readFileSync(p, 'utf8')
const EXACT = ['Needs focus', 'Building', 'Steady']
const GYR = /\b(green|yellow|red|at[ _-]?risk|elite|restricted)\b/i

/** Replica of public.compute_joint_scores() CASE (the DB truth). */
function sqlScore(worse: number, target: number): BandScore {
  if (worse / target >= 1.0) return 3
  if (worse / target >= 0.9) return 2
  return 1
}

/** Every band surface, resolved the way that surface resolves it. */
function surfaces(assessment: Record<string, number | null>, rows?: JointScoreRow[]) {
  const band = overallBandForAssessment(assessment, rows)
  return {
    myBody: band, // MyBody.tsx header
    myProtocol: overallBandForAssessment(assessment, rows), // MyProtocol.tsx header
    resultsPreview: overallBandForAssessment(assessment), // ResultsPreview.tsx (no rows yet)
    settingsHistory: overallBandForAssessment(assessment), // Settings.tsx history
    leadSubmit: overallBandForAssessment(assessment), // Assessment.tsx lead payload
  }
}

describe('labels', () => {
  it('are exactly Needs focus / Building / Steady (chips included)', () => {
    expect([BAND_FULL[1], BAND_FULL[2], BAND_FULL[3]]).toEqual(EXACT)
    expect([BAND_CHIP[1], BAND_CHIP[2], BAND_CHIP[3]]).toEqual(EXACT)
    expect(([1, 2, 3] as BandScore[]).map(bandChip)).toEqual(EXACT)
    expect(([1, 2, 3] as BandScore[]).map(bandFull)).toEqual(EXACT)
    expect(BAND_LEGEND.map(l => l.chip)).toEqual(EXACT)
    expect(BAND_LEGEND.map(l => l.full)).toEqual(EXACT)
  })
  it('never use green/yellow/red (or AT RISK / ELITE / RESTRICTED) words', () => {
    for (const l of [...Object.values(BAND_FULL), ...Object.values(BAND_CHIP)]) expect(l).not.toMatch(GYR)
  })
})

describe('boundaries: same measurement → same band on every surface', () => {
  const EPS = 0.01
  for (const [joint, target] of Object.entries(JOINT_SCORE_TARGETS)) {
    const def = ASSESSMENT_JOINTS.find(j => j.key === joint)
    if (!def) continue
    // Hip flexion is never banded (HIP_FLEX_UNSCORED_FALLBACK); see hipFlexCopy.test.ts.
    if (isUnscoredJoint(joint)) continue
    const cases: Array<[number, BandScore]> = [
      [0, 1], // low
      [0.9 * target - EPS, 1],
      [0.9 * target, 2], // exact boundary
      [0.9 * target + EPS, 2],
      [0.95 * target, 2], // mid
      [target - EPS, 2],
      [target, 3], // exact boundary
      [target + EPS, 3],
      [2 * target, 3], // high
    ]
    for (const [v, expected] of cases) {
      it(`${joint}=${v.toFixed(2)} (target ${target}) → ${BAND_FULL[expected]}`, () => {
        // Only this joint measured so it alone drives the overall band.
        const a: Record<string, number | null> = {}
        if (def.single) a[def.single] = v
        else { a[def.l!] = v; a[def.r!] = v + 5 } // worse side drives the band
        const rows: JointScoreRow[] = [{ joint_key: joint, score: sqlScore(v, target) }]

        expect(bandScoreFromTargetRatio(v, target)).toBe(expected)
        expect(sqlScore(v, target)).toBe(expected)
        const s = surfaces(a, rows)
        for (const [name, b] of Object.entries(s)) expect([name, b]).toEqual([name, expected])
        // Joint chip / bar / name colour (My Body) and My Protocol card chip
        expect(jointBandsForAssessment(a, rows).get(joint)).toBe(expected)
        expect(jointBandsForAssessment(a).get(joint)).toBe(expected)
        // Live chip on the measure screen (per side)
        const key = def.single ?? def.l!
        expect(getScore(String(v), { key, label: '', normalLow: 0, normalHigh: 0, riskBelow: 0 })).toBe(expected)
      })
    }
  }
})

describe('fixture 01 regression (cloned from real Sep 8 app result)', () => {
  const a = {
    hip_er_l: 50, hip_er_r: 48, hip_ir_l: 38, hip_ir_r: 36, hip_abd_l: 40, hip_abd_r: 38,
    hip_flex_l: 115, hip_flex_r: 112, shoulder_er_l: 78, shoulder_er_r: 76,
    shoulder_flex_l: 165, shoulder_flex_r: 162, ankle_df_l: 11.5, ankle_df_r: 10.8,
    lumbar_flex: 60, lumbar_ext: 25, cervical_lat_l: 42, cervical_lat_r: 40,
    cervical_flex: 50, cervical_ext: 60,
  }
  const rows: JointScoreRow[] = [
    // re-scored with the Oct 6 targets (hip ER 29, IR 26, abduction 40, shoulder flexion 140, ankle 6 cm):
    // hip_abd 38/40 → 2, hip_ir 36/26 → 3, ankle_df 10.8/6 → 3, shoulder_flex 162/140 → 3; neck side bend 40/38 → 3 (was 40/45 → 1); shoulder ER 76/85 → 1 (standing goal-post target 85, Oct 6 8:19 PM; was 76/40 → 3)
    ['ankle_df', 3], ['cervical_ext', 3], ['cervical_flex', 3], ['cervical_lat', 3], ['hip_abd', 2],
    ['hip_er', 3], ['hip_flex', 2], ['hip_ir', 3], ['lumbar_ext', 3], ['lumbar_flex', 3],
    ['shoulder_er', 1], ['shoulder_flex', 3],
  ].map(([joint_key, score]) => ({ joint_key: joint_key as string, score: score as number }))

  it('My Body and My Protocol show the same band', () => {
    const s = surfaces(a, rows)
    // Shoulder ER target 85 (Oct 6 8:19 PM): 76/85 = 0.89 is Needs focus, so the worst joint is shoulder ER, on every surface
    expect(new Set(Object.values(s))).toEqual(new Set([1]))
  })
  it('persisted rows agree with the client formula', () => {
    const fromRows = bandMapFromJointScores(rows)
    const fromValues = jointBandsForAssessment(a)
    for (const [k, b] of fromRows) expect([k, fromValues.get(k)]).toEqual([k, b])
  })
  it('Hip ER and Lumbar Ext are Steady with Steady colours (no red)', () => {
    const m = jointBandsForAssessment(a, rows)
    for (const k of ['hip_er', 'lumbar_ext']) {
      const b = m.get(k)!
      expect(bandChip(b)).toBe('Steady')
      expect(BAND_TONE[b].bar).not.toMatch(/red|yellow/)
      expect(BAND_TONE[b].label).not.toMatch(/red|yellow/)
    }
  })
  it('5 worst_joints → exactly 3 problem areas', () => {
    expect(topProblemAreas(['hip_abd_r', 'hip_abd_l', 'ankle_df_r', 'ankle_df_l', 'hip_ir_r'])).toEqual([
      'hip_abd_r', 'ankle_df_r', 'hip_ir_r',
    ])
  })
})

describe('top problem areas', () => {
  it('cap is 3', () => expect(TOP_PROBLEM_AREAS_MAX).toBe(3))
  it('exactly 3 when ≥3 joints exist', () => {
    expect(topProblemAreas(['a_l', 'b_r', 'c', 'd', 'e'])).toHaveLength(3)
  })
  it('fewer only when fewer distinct joints exist', () => {
    expect(topProblemAreas(['a_l', 'a_r'])).toEqual(['a_l'])
    expect(topProblemAreas(['a', 'b'])).toEqual(['a', 'b'])
    expect(topProblemAreas([])).toEqual([])
    expect(topProblemAreas(null)).toEqual([])
  })
})

describe('surface wiring (static): every band surface uses the single source', () => {
  const pages = join(SRC, 'pages')
  const bandSurfaces = ['MyBody.tsx', 'MyProtocol.tsx', 'ResultsPreview.tsx', 'Settings.tsx', 'Assessment.tsx']
  it.each(bandSurfaces)('%s resolves its band via overallBandForAssessment', f => {
    expect(read(join(pages, f))).toMatch(/overallBandForAssessment\(/)
  })
  it('My Body + My Protocol cap problem areas via the shared helper', () => {
    expect(read(join(pages, 'MyBody.tsx'))).toMatch(/topProblemAreasForAssessment\(/)
    expect(read(join(pages, 'MyBody.tsx'))).not.toMatch(/worst_joints\.map\(/)
    expect(read(join(pages, 'MyProtocol.tsx'))).toMatch(/TOP_PROBLEM_AREAS_MAX/)
  })

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap(n => {
      const p = join(dir, n)
      if (statSync(p).isDirectory()) return walk(p)
      return /\.(tsx?|ts)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : []
    })
  const appFiles = walk(SRC).filter(p => !p.endsWith(join('lib', 'mobilityBands.ts')))

  it('no second band-threshold system anywhere in the app', () => {
    for (const p of appFiles) {
      const s = read(p)
      expect([p, /bandScoreFromAggregate|bandScoreFromThresholds|isBad\s*=/.test(s)]).toEqual([p, false])
    }
  })
  it('no "Focus" shorthand chip and no G/Y/R band words in visible JSX text', () => {
    for (const p of appFiles.filter(f => f.endsWith('.tsx'))) {
      const s = read(p)
      expect([p, />\s*(<[^>]+>\s*)?Focus\s*</.test(s) || /\/>\s*Focus\s*</.test(s)]).toEqual([p, false])
      expect([p, />\s*(Green|Yellow|Red|GREEN|YELLOW|RED|AT RISK|ELITE|RESTRICTED)\s*</.test(s)]).toEqual([p, false])
    }
  })
})

describe('email templates in this repo', () => {
  const dirs = [join(REPO, 'supabase', 'functions'), join(REPO, 'netlify', 'functions')].filter(existsSync)
  const files = dirs.flatMap(function walk(d: string): string[] {
    return readdirSync(d).flatMap(n => {
      const p = join(d, n)
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|js|mjs|html)$/.test(n) ? [p] : []
    })
  })
  it('never show a G/Y/R or AT RISK/ELITE band, nor "Top 3 Priority Joints"', () => {
    for (const p of files) {
      const s = read(p)
      expect([p, /Your (ROM )?(score|band)[^<]{0,40}\b(GREEN|YELLOW|RED|AT RISK|ELITE|RESTRICTED)\b/.test(s)]).toEqual([p, false])
      expect([p, /Top 3 Priority Joints/i.test(s)]).toEqual([p, false])
    }
  })
})

// ---------------------------------------------------------------------------
// Score + band together: "96/100 · Steady" on every Base surface (2026-09-24)
// ---------------------------------------------------------------------------

/**
 * Audit fixtures 20260924-02/03/04/05 (values from EXPECTED-BANDS.md). Fix A
 * (2026-09-24) values: /100 = floor(mean min(1, worse/target) * 100) clamped
 * into the overall band; top3 = % of the first three problem areas.
 * The lead email (romrxbjj-v2 submit-lead-assessment) prints the SAME /100.
 * Re-pinned Oct 6 2026 for the new Steady targets (hip ER 29, IR 26, abduction 40, shoulder
 * flexion 140, ankle 6 cm): same measured inputs, new expected %, /100 and compute-tiers
 * worst_joints. Fixture 05's boundary joint moved from ankle (17.9 cm is Steady against 6) to
 * shoulder ER L 80.5 / 90 = 0.894 (target unchanged).
 */
const AUDIT_FIXTURES: Array<{ name: string; a: Record<string, number | null>; score: number; band: BandScore; text: string; pct: Record<string, number>; worst: string[] }> = [
  {
    name: '02 LOW', score: 88, band: 1, text: '88/100 \u00B7 Needs focus',
    worst: ['lumbar_ext', 'shoulder_er_l', 'lumbar_flex', 'shoulder_er_r', 'cervical_lat_l'],
    pct: {
      hip_er: 100, hip_ir: 84, hip_abd: 100, shoulder_er: 72, shoulder_flex: 100,
      ankle_df: 100, lumbar_flex: 75, lumbar_ext: 64, cervical_lat: 84, cervical_flex: 92, cervical_ext: 100,
    },
    a: {
      hip_er_l: 30, hip_er_r: 32, hip_ir_l: 22, hip_ir_r: 25, hip_abd_l: 55, hip_abd_r: 60,
      hip_flex_l: 95, hip_flex_r: 100, shoulder_er_l: 61.4, shoulder_er_r: 66.1,   // rescaled to the shoulder ER target 85 (was 28.9 / 31.1 vs 40)
      shoulder_flex_l: 150, shoulder_flex_r: 155, ankle_df_l: 7.0, ankle_df_r: 8.5,
      lumbar_flex: 45, lumbar_ext: 16, cervical_lat_l: 32, cervical_lat_r: 34,   // rescaled to the Oct 6 neck side-bend target 38 (was 38 / 40 vs 45)
      cervical_flex: 46, cervical_ext: 60,
    },
  },
  {
    name: '03 MID/BOUNDARY', score: 98, band: 2, text: '98/100 \u00B7 Building',
    worst: ['shoulder_er_l', 'shoulder_er_r', 'cervical_lat_l', 'cervical_lat_r', 'cervical_flex'],
    pct: {
      hip_er: 100, hip_ir: 100, hip_abd: 100, shoulder_er: 90, shoulder_flex: 100,
      ankle_df: 100, lumbar_flex: 100, lumbar_ext: 100, cervical_lat: 95, cervical_flex: 99, cervical_ext: 100,
    },
    a: {
      hip_er_l: 45, hip_er_r: 47, hip_ir_l: 44.5, hip_ir_r: 46, hip_abd_l: 81, hip_abd_r: 81.5,
      hip_flex_l: 120.5, hip_flex_r: 122, shoulder_er_l: 76.9, shoulder_er_r: 80.3,   // rescaled to target 85 (was 36.2 / 37.8 vs 40)
      shoulder_flex_l: 170, shoulder_flex_r: 172, ankle_df_l: 18.0, ankle_df_r: 19.0,
      lumbar_flex: 60.5, lumbar_ext: 25, cervical_lat_l: 36.2, cervical_lat_r: 37.2,   // rescaled to the Oct 6 neck side-bend target 38 (was 43 / 44 vs 45)
      cervical_flex: 49.5, cervical_ext: 62,
    },
  },
  {
    name: '04 HIGH', score: 100, band: 3, text: '100/100 \u00B7 Steady',
    worst: ['hip_er_l', 'hip_er_r', 'hip_ir_l', 'hip_ir_r', 'hip_abd_l'],
    pct: {
      hip_er: 100, hip_ir: 100, hip_abd: 100, shoulder_er: 100, shoulder_flex: 100,
      ankle_df: 100, lumbar_flex: 100, lumbar_ext: 100, cervical_lat: 100, cervical_flex: 100, cervical_ext: 100,
    },
    a: {
      hip_er_l: 50, hip_er_r: 52, hip_ir_l: 46, hip_ir_r: 48, hip_abd_l: 92, hip_abd_r: 95,
      hip_flex_l: 125, hip_flex_r: 128, shoulder_er_l: 95, shoulder_er_r: 98,
      shoulder_flex_l: 180, shoulder_flex_r: 180, ankle_df_l: 21, ankle_df_r: 22,
      lumbar_flex: 65, lumbar_ext: 28, cervical_lat_l: 46, cervical_lat_r: 47,
      cervical_flex: 52, cervical_ext: 65,
    },
  },  {
    // Boundary: 03 with Shoulder ER L 80.5 / 90 = 0.894 → that joint 89% Needs focus; the
    // raw mean is 98 but the overall band is Needs focus, so /100 clamps to 89.
    name: '05 BOUNDARY <0.90', score: 89, band: 1, text: '89/100 \u00B7 Needs focus',
    worst: ['shoulder_er_l', 'shoulder_er_r', 'cervical_lat_l', 'cervical_lat_r', 'cervical_flex'],
    pct: {
      hip_er: 100, hip_ir: 100, hip_abd: 100, shoulder_er: 89, shoulder_flex: 100,
      ankle_df: 100, lumbar_flex: 100, lumbar_ext: 100, cervical_lat: 95, cervical_flex: 99, cervical_ext: 100,
    },
    a: {
      hip_er_l: 45, hip_er_r: 47, hip_ir_l: 44.5, hip_ir_r: 46, hip_abd_l: 81, hip_abd_r: 81.5,
      hip_flex_l: 120.5, hip_flex_r: 122, shoulder_er_l: 76.1, shoulder_er_r: 80.3,   // rescaled to target 85 (was 35.8 / 37.8 vs 40)
      shoulder_flex_l: 170, shoulder_flex_r: 172, ankle_df_l: 18.0, ankle_df_r: 19.0,
      lumbar_flex: 60.5, lumbar_ext: 25, cervical_lat_l: 36.2, cervical_lat_r: 37.2,   // rescaled to the Oct 6 neck side-bend target 38 (was 43 / 44 vs 45)
      cervical_flex: 49.5, cervical_ext: 62,
    },
  },
]

describe('formatScoreBand: exactly "NN/100 · Band"', () => {
  it('matches the spec example', () => expect(formatScoreBand(96, 3)).toBe('96/100 \u00B7 Steady'))
  it.each([
    [0, 1, '0/100 \u00B7 Needs focus'],
    [61, 1, '61/100 \u00B7 Needs focus'],
    [88, 2, '88/100 \u00B7 Building'],
    [100, 3, '100/100 \u00B7 Steady'],
  ] as Array<[number, BandScore, string]>)('%i + band %i → %s', (n, b, out) => {
    expect(formatScoreBand(n, b)).toBe(out)
  })
  it('uses U+00B7 middle dot, never an em/en dash or hyphen separator', () => {
    expect(SCORE_BAND_SEPARATOR).toBe(' \u00B7 ')
    for (const b of [1, 2, 3] as BandScore[]) {
      const s = formatScoreBand(50, b)
      expect(s).toMatch(/^\d{1,3}\/100 \u00B7 (Needs focus|Building|Steady)$/)
      expect(s).not.toMatch(/[\u2014\u2013]| - /)
      expect(s).not.toMatch(GYR)
    }
  })
})

describe('mobilityScoreForAssessment: one shared /100 number', () => {
  it.each(AUDIT_FIXTURES)('fixture $name → $text', ({ a, score, band, text }) => {
    expect(mobilityScoreForAssessment(a)).toBe(score)
    expect(overallBandForAssessment(a)).toBe(band)
    expect(formatScoreBand(mobilityScoreForAssessment(a), overallBandForAssessment(a)!)).toBe(text)
  })
  it('same assessment → same score (deterministic, no mutation)', () => {
    for (const { a } of AUDIT_FIXTURES) {
      const before = JSON.stringify(a)
      const runs = Array.from({ length: 5 }, () => mobilityScoreForAssessment(a))
      expect(new Set(runs).size).toBe(1)
      expect(mobilityScoreForAssessment({ ...a })).toBe(runs[0])
      expect(JSON.stringify(a)).toBe(before)
    }
  })
  it.each(AUDIT_FIXTURES)('fixture $name: per-joint % and top three', ({ a, pct, worst }) => {
    expect(Object.fromEntries(jointPercentsForAssessment(a))).toEqual(pct)
    const rows = [...jointBandsForAssessment(a)].map(([joint_key, score]) => ({ joint_key, score }))
    expect(Object.fromEntries(jointPercentsForAssessment(a, rows))).toEqual(pct)
    expect(mobilityScoreForAssessment(a, rows)).toBe(mobilityScoreForAssessment(a))
    expect(topProblemAreas(worst)).toHaveLength(3)
  })
  it('nothing measured → 100 (matches the Steady fallback every surface uses)', () => {
    expect(mobilityScoreForAssessment({})).toBe(100)
    expect(mobilityScoreForAssessment(null)).toBe(100)
  })
  it('every surface shows the identical "NN/100 · Band" string for one assessment', () => {
    for (const { a, text } of AUDIT_FIXTURES) {
      const s = surfaces(a)
      const score = mobilityScoreForAssessment(a)
      const strings = Object.values(s).map(b => formatScoreBand(score, b!))
      expect(new Set(strings)).toEqual(new Set([text]))
    }
  })
})

describe('surface wiring (static): score + band via the shared helpers', () => {
  const pages = join(SRC, 'pages')
  const displaySurfaces = ['MyBody.tsx', 'MyProtocol.tsx', 'ResultsPreview.tsx', 'Settings.tsx']
  it.each(displaySurfaces)('%s imports and calls mobilityScoreForAssessment + formatScoreBand', f => {
    const s = read(join(pages, f))
    expect(s).toMatch(/import\s*\{[^}]*\bmobilityScoreForAssessment\b[^}]*\}\s*from '..\/lib\/mobilityBands'/)
    expect(s).toMatch(/import\s*\{[^}]*\bformatScoreBand\b[^}]*\}\s*from '..\/lib\/mobilityBands'/)
    expect(s).toMatch(/mobilityScoreForAssessment\(/)
    expect(s).toMatch(/formatScoreBand\(/)
    // the overall band label is never rendered alone
    expect(s).not.toMatch(/\{tier\.label\}/)
  })
  it('lead submit sends the shared score (not a hardcoded number)', () => {
    const s = read(join(pages, 'Assessment.tsx'))
    expect(s).toMatch(/prs_score\s*=\s*mobilityScoreForAssessment\(/)
  })
  it('no duplicated /100 score formula outside lib/mobilityBands.ts', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap(n => {
        const p = join(dir, n)
        if (statSync(p).isDirectory()) return walk(p)
        return /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : []
      })
    for (const p of walk(SRC).filter(f => !f.endsWith(join('lib', 'mobilityBands.ts')))) {
      const s = read(p)
      expect([p, /function computePRS\b|score\s*-=\s*8\b|PRS_BILATERAL|BILATERAL_JOINTS\s*=/.test(s)]).toEqual([p, false])
    }
  })
})

describe('My Protocol cards: "#N Problem area" (Base only)', () => {
  const s = read(join(SRC, 'pages', 'MyProtocol.tsx'))
  it('card rank label is "#N Problem area"', () => {
    expect(s).toMatch(/const rankLabel = `#\$\{rank\} Problem area`/)
    for (const n of [1, 2, 3]) expect(`#${n} Problem area`).toMatch(/^#[123] Problem area$/)
  })
  it('no "#N Priority" / PRIORITY label and the rank chip is not uppercased', () => {
    expect(s).not.toMatch(/#[123] Priority|PRIORITY/)
    expect(s).not.toMatch(/uppercase[^'"]*['"],\s*rankColor/)
  })
})

// ---------------------------------------------------------------------------
// Fix A (Jim LOCK via Grant 2026-09-24 5:32 PM ET): ONE per-joint % and /100
// ---------------------------------------------------------------------------

const RANGE_OK = (v: number, b: BandScore) => v >= BAND_PERCENT_RANGE[b].min && v <= BAND_PERCENT_RANGE[b].max

describe('Fix A: band ranges', () => {
  it('Needs focus 0..89, Building 90..99, Steady 100', () => {
    expect(BAND_PERCENT_RANGE).toEqual({ 1: { min: 0, max: 89 }, 2: { min: 90, max: 99 }, 3: { min: 100, max: 100 } })
  })
  it('clampPercentToBand follows the spec', () => {
    expect(clampPercentToBand(95, 1)).toBe(89)
    expect(clampPercentToBand(40, 1)).toBe(40)
    expect(clampPercentToBand(80, 2)).toBe(90)
    expect(clampPercentToBand(100, 2)).toBe(99)
    expect(clampPercentToBand(94, 2)).toBe(94)
    expect(clampPercentToBand(0, 3)).toBe(100)
  })
})

describe('Fix A: per-joint % = floor(100 * min(1, worse / target))', () => {
  it('floor, not round (89.6 never shows as 90)', () => {
    // hip_abd target 40: 35.84 / 40 = 0.896 → 89.6 → 89
    expect(jointPercent('hip_abd', { left: 35.84, right: 40 })).toBe(89)
    expect(jointPercent('ankle_df', { left: 5.37, right: 5.7 })).toBe(89) // 5.37 / 6 cm = 0.895
    expect(jointPercent('ankle_df', { left: 5.4, right: 5.7 })).toBe(90)  // 5.4 / 6 cm = 0.90
    expect(jointPercent('hip_ir', { left: 25.6, right: 27 })).toBe(98) // 25.6 / 26 = 0.985
  })
  it('uses the worse side (lower of L/R) or midline, capped at 100', () => {
    expect(jointPercent('hip_er_l', { left: 19.2, right: 29 })).toBe(66) // 19.2 / 29 = 0.662
    expect(jointPercent('hip_er', { right: 19.2 })).toBe(66)
    expect(jointPercent('lumbar_ext', { midline: 50 })).toBe(100)
    expect(jointPercent('lumbar_ext', {})).toBeNull()
  })
  it('exact boundaries: 0.90 → 90, 1.00 → 100, just under 1.00 → 99', () => {
    for (const [joint, target] of Object.entries(JOINT_SCORE_TARGETS)) {
      if (isUnscoredJoint(joint)) continue
      expect([joint, jointPercent(joint, { midline: 0.9 * target })]).toEqual([joint, 90])
      expect([joint, jointPercent(joint, { midline: target })]).toEqual([joint, 100])
      expect([joint, jointPercent(joint, { midline: target - 0.01 })]).toEqual([joint, 99])
      expect([joint, jointPercent(joint, { midline: 0.9 * target - 0.01 })]).toEqual([joint, 89])
    }
  })
})

describe('Fix A: generated assessments never contradict the band (per joint and overall)', () => {
  // Deterministic LCG; values cluster around the 0.90 / 1.00 boundaries on purpose.
  let seed = 20260924
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
  const RATIOS = [0, 0.3, 0.5, 0.8, 0.89, 0.895, 0.899, 0.8999, 0.9, 0.9001, 0.905, 0.95, 0.99, 0.999, 0.9999, 1, 1.0001, 1.05, 1.5]
  const gen = (): Record<string, number | null> => {
    const a: Record<string, number | null> = {}
    // Profile floor so all three overall bands are well represented:
    // any ratio (mostly Needs focus), >= 0.90 (Building / Steady), >= 1.00 (Steady).
    const floor = [0, 0.9, 1][Math.floor(rnd() * 3)]
    const pool = RATIOS.filter(r => r >= floor)
    for (const j of ASSESSMENT_JOINTS) {
      if (rnd() < 0.12) continue // unmeasured joint
      const t = JOINT_SCORE_TARGETS[j.key]
      const pick = () => {
        const r = rnd() < 0.6 ? pool[Math.floor(rnd() * pool.length)] : floor + rnd() * (1.3 - floor * 0.9)
        const v = r * t
        // app-style 0.5 steps (rounded up when a floor applies, so the profile holds) or raw
        return rnd() < 0.5 ? (floor > 0 ? Math.ceil(v * 2) / 2 : Math.round(v * 2) / 2) : v
      }
      if (j.single) a[j.single] = pick()
      else {
        if (rnd() < 0.9) a[j.l!] = pick()
        if (rnd() < 0.9) a[j.r!] = pick()
      }
    }
    return a
  }
  const N = 5000
  it(`${N} assessments: every joint % sits in its band range; /100 sits in the overall band range`, () => {
    let checkedJoints = 0
    const seen = new Set<BandScore>()
    for (let i = 0; i < N; i++) {
      const a = gen()
      // Persisted rows exactly as public.compute_joint_scores() would write them.
      const rows: JointScoreRow[] = []
      for (const j of ASSESSMENT_JOINTS) {
        const l = j.l ? a[j.l] : null, r = j.r ? a[j.r] : null, m = j.single ? a[j.single] : null
        const worse = m ?? (l != null && r != null ? Math.min(l, r) : (l ?? r))
        if (worse != null) rows.push({ joint_key: j.key, score: sqlScore(worse, JOINT_SCORE_TARGETS[j.key]) })
      }
      for (const withRows of [false, true]) {
        const rs = withRows ? rows : undefined
        const bands = jointBandsForAssessment(a, rs)
        const pcts = jointPercentsForAssessment(a, rs)
        expect(pcts.size).toBe(bands.size)
        for (const [k, p] of pcts) {
          const b = bands.get(k)!
          checkedJoints++
          if (!RANGE_OK(p, b)) throw new Error(`joint ${k} ${p}% contradicts ${BAND_FULL[b]} in ${JSON.stringify(a)}`)
          // the raw floor formula agrees with the band on its own (the clamp is only a guard)
          const def = ASSESSMENT_JOINTS.find(j => j.key === k)!
          const raw = jointPercent(k, { left: def.l ? a[def.l] : null, right: def.r ? a[def.r] : null, midline: def.single ? a[def.single] : null }, null)!
          expect(raw).toBe(p)
        }
        const overall = overallBandForAssessment(a, rs)
        const score = mobilityScoreForAssessment(a, rs)
        if (overall == null) { expect(score).toBe(100); continue }
        seen.add(overall)
        expect(overall).toBe(worstBandScore([...bands.values()]))
        if (!RANGE_OK(score, overall)) throw new Error(`/100 ${score} contradicts ${BAND_FULL[overall]} in ${JSON.stringify(a)}`)
        // /100 never exceeds 89 when any joint is Needs focus, and every surface string agrees
        expect(formatScoreBand(score, overall)).toMatch(new RegExp(`^${score}/100 \u00B7 ${BAND_FULL[overall]}$`))
      }
    }
    expect(seen).toEqual(new Set([1, 2, 3]))
    expect(checkedJoints).toBeGreaterThan(N * 10)
  })
})

describe('Fix A: My Protocol rank badge colour = that joint\'s band tone', () => {
  const s = read(join(SRC, 'pages', 'MyProtocol.tsx'))
  it.each([1, 2, 3] as BandScore[])('band %i → BAND_TONE badge (solid band colour)', b => {
    expect(rankBadgeClass(b)).toBe(BAND_TONE[b].badge)
    const family = { 1: 'red', 2: 'yellow', 3: 'cobalt' }[b]
    expect(BAND_TONE[b].badge).toMatch(new RegExp(`\\bbg-${family}\\b|\\bbg-${family}-\\d+`))
    expect(BAND_TONE[b].bar).toMatch(new RegExp(family))
  })
  it('badges for different bands differ, and none is neutral slate', () => {
    expect(new Set([1, 2, 3].map(b => rankBadgeClass(b as BandScore))).size).toBe(3)
    for (const b of [1, 2, 3] as BandScore[]) expect(rankBadgeClass(b)).not.toMatch(/slate/)
  })
  it('IssueCard colours the rank badge by the card\'s band (not by position, not neutral)', () => {
    expect(s).toMatch(/const rankColor = rankBadgeClass\(band\)/)
    expect(s).not.toMatch(/rank === 1 \?/)
    expect(s).not.toMatch(/const rankColor = 'bg-slate/)
  })
})

describe('Fix A: no Base surface uses the elite OPTIMAL table or the old deduction score', () => {
  const baseSurfaces = ['MyBody.tsx', 'MyProtocol.tsx', 'ResultsPreview.tsx', 'Settings.tsx', 'Assessment.tsx']
  it.each(baseSurfaces)('%s has no OPTIMAL / elite targets', f => {
    const s = read(join(SRC, 'pages', f))
    expect(s).not.toMatch(/\bOPTIMAL\b/)
    expect(s).not.toMatch(/Elite athlete targets/i)
    expect(s).not.toMatch(/'Hip ER':\s*80/)
  })
  it('lib/mobilityBands.ts has no OPTIMAL table and no riskBelow/normalMin score tables', () => {
    const s = read(join(SRC, 'lib', 'mobilityBands.ts'))
    expect(s).not.toMatch(/\bOPTIMAL\b/)
    expect(s).not.toMatch(/SCORE_BILATERAL_JOINTS|SCORE_UNILATERAL_JOINTS|riskBelow:\s*\d|normalMin:\s*\d/)
    expect(s).not.toMatch(/score\s*-=/)
  })
  it('My Body bars + radar use the shared jointPercent helpers', () => {
    const s = read(join(SRC, 'pages', 'MyBody.tsx'))
    // bars and radar both render jointDisplayRowsForAssessment rows (jointPercent inside)
    expect(s).toMatch(/jointDisplayRowsForAssessment\(assessment, jointScores\)/)
    expect(s).toMatch(/radarSideRowsForAssessment\(assessment, jointScores\)/)
    expect(s).not.toMatch(/function norm\(/)
  })
  it('My Body + My Protocol clamp /100 with the same joint_scores their band uses', () => {
    for (const f of ['MyBody.tsx', 'MyProtocol.tsx']) {
      expect(read(join(SRC, 'pages', f))).toMatch(/mobilityScoreForAssessment\(assessment, jointScores\)/)
    }
  })
})
