import type { Step } from './assessmentMeta'

import { STEPS_PART1 } from './assessmentSteps1'
import { STEPS_PART2 } from './assessmentSteps2'

export const STEPS: Step[] = [...STEPS_PART1, ...STEPS_PART2]
