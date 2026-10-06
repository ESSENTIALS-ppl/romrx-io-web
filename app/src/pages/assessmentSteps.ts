import type { Step } from './assessmentMeta'

import { STEPS_PART1 } from './assessmentSteps1'
import { STEPS_PART2 } from './assessmentSteps2'

import { baseLumbarRemoved } from '../lib/lumbarFlag'

/** With the low-back flag ON (lib/lumbarFlag.ts) the lumbar step is not offered: nothing is saved for it. */
export const STEPS: Step[] = [...STEPS_PART1, ...STEPS_PART2].filter(s => !(baseLumbarRemoved() && s.id === 'lumbar'))
