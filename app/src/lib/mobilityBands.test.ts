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
  JOINT_SCORE_TARGETS,
  ASSESSMENT_JOINTS,
  TOP_PROBLEM_AREAS_MAX,
  bandChip,
  bandFull,
  bandMapFromJointScores,
  bandScoreFromTargetRatio,
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
    ['ankle_df', 1], ['cervical_ext', 3], ['cervical_flex', 3], ['cervical_lat', 1], ['hip_abd', 1],
    ['hip_er', 3], ['hip_flex', 2], ['hip_ir', 1], ['lumbar_ext', 3], ['lumbar_flex', 3],
    ['shoulder_er', 1], ['shoulder_flex', 2],
  ].map(([joint_key, score]) => ({ joint_key: joint_key as string, score: score as number }))

  it('My Body and My Protocol show the same band', () => {
    const s = surfaces(a, rows)
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
    expect(read(join(pages, 'MyBody.tsx'))).toMatch(/topProblemAreas\(/)
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
