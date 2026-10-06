import type { Step } from './assessmentMeta'
import { HIP_FLEX_STEP } from '../lib/hipFlexCopy'

export const STEPS_PART2: Step[] = [
{
    id: 'cervical_flex_ext',
    title: 'Cervical Flexion + Extension',
    why: 'Chin-to-chest and looking-up range both matter for posture and neck safety under load.',
    tool: 'Your phone. Seated in a chair.',
    position: [
      'Sit upright in a chair. Feet flat. Back straight.',
      'Tap Zero, then press your phone flat against the SIDE of your head at the temple, screen facing the wall beside you.',
      'Look straight ahead and hold still. It zeroes after 3 seconds with a soft tick.',
    ],
    howTo: [
      'Flexion: Drop your chin toward your chest as far as it will go. Hold still until the number locks and chimes. Tap Use this number.',
      'Extension: Look straight ahead, tap Zero the same way, then lift your chin toward the ceiling as far as it will go. Hold until it locks and tap Use this number.',
    ],
    mistake: 'Moving your whole upper body forward or backward instead of just your head and neck.',
    mistakeFix: 'Your shoulders and torso stay still. Only your head moves. If your back starts to round or arch, stop there.',
    meter: { grip: 'Phone flat against the side of your head at the temple, screen facing the wall beside you.', zeroDelaySec: 3 },
    fields: [
      { key: 'cervical_flex', label: 'Flexion', unit: '°', normalLow: 45, normalHigh: 60, riskBelow: 35 },
      { key: 'cervical_ext', label: 'Extension', unit: '°', normalLow: 55, normalHigh: 70, riskBelow: 40 },
    ],
  },
{
    id: 'hip_flex',
    title: 'Hip Flexion (Straight-Leg Raise)',
    why: HIP_FLEX_STEP.why,
    tool: HIP_FLEX_STEP.tool,
    position: [...HIP_FLEX_STEP.position],
    howTo: [...HIP_FLEX_STEP.howTo],
    mistake: HIP_FLEX_STEP.mistake,
    mistakeFix: HIP_FLEX_STEP.mistakeFix,
    meter: { grip: HIP_FLEX_STEP.meterGrip, zeroDelaySec: 3 },
    // No normal/target range on purpose: see lib/hipFlexCopy.ts and HIP_FLEX_UNSCORED_FALLBACK. The input note and the
    // sex-known "why" sentence are chosen by the measure screen from the user's sex (hipFlexInputNote / hipFlexWhy).
    fields: [
      { key: 'hip_flex_l', label: 'Left leg', unit: '°', unscored: true },
      { key: 'hip_flex_r', label: 'Right leg', unit: '°', unscored: true },
    ],
  },
{
    id: 'hip_abd',
    title: 'Hip Abduction',
    why: 'A wide, stable base depends on healthy hip abduction range.',
    tool: 'Your phone. Standing.',
    position: [
      'Stand upright with something nearby you can grab for balance if needed.',
      'Tap Zero, then hold your phone flat against the front of your thigh with your same-side hand. The screen faces forward, away from you, and the long edge runs along your thigh.',
      'Stand straight with your weight even on both feet and hold still. It zeroes after 3 seconds with a soft tick.',
    ],
    howTo: [
      'Lift your test leg sideways, out away from your body. Keep your toes pointing forward the whole time.',
      'Stop just before your upper body starts to lean to the opposite side or your hip hinges backward. Hold still until the number locks and chimes.',
      'Tap Use this number. Lower the leg, tap Zero again, and repeat on the other side.',
    ],
    mistake: 'Leaning your torso away or letting the hip hinge backward to get the leg higher.',
    mistakeFix: 'Your torso stays upright and your hip stays directly under you. The moment either shifts, you have hit your true end range.',
    meter: { grip: 'Phone flat on the front of your thigh, screen facing forward, long edge along the thigh.', zeroDelaySec: 3 },
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
    title: 'Ankle Dorsiflexion (Knee-to-Wall, cm)',
    why: 'This is one test, the standing knee-to-wall test, and you record it in centimeters (cm) for each foot. Do not convert it to degrees.',
    tool: 'Tape measure or ruler. A slip of paper (to check your heel). Standing knee-to-wall test. Measure in centimeters (cm).',
    position: [
      'Remove your shoes. Stand barefoot facing a wall with a tape measure on the floor pointing straight out from the wall.',
      'Line up the middle of your heel and your second toe along the tape, so your foot points straight at the wall.',
      'Place the tip of your big toe at the 10 cm mark on the tape to start. Your hands may rest on the wall.',
    ],
    howTo: [
      'Bend the knee over the test foot and drive it forward toward the wall, over your second and third toes. Do not let the knee cave inward. Keep your heel flat on the floor.',
      'Check your heel: it should stay down the whole time. A slip of paper under the heel should stay pinched, or ask a friend to watch.',
      'Move your foot closer or farther from the wall until you find the farthest spot where your knee still just touches the wall with the heel down. Measure from the wall to the tip of your big toe. Record it in centimeters (cm), not degrees.',
      'Do 3 tries on this foot and record the best one (the farthest distance that still counts). Repeat with the other foot.',
    ],
    mistake: 'Your heel lifts off the floor, or your knee drifts inward or outward as it drives forward.',
    mistakeFix: 'Keep your eye on your heel and your knee over your second and third toes. If your heel lifts even slightly, that try does not count. Move your foot closer to the wall and try again.',
    fields: [
      // normalLow/normalHigh/riskBelow are unused (0): there is no published centimeter cutoff, so no "Normal" range is shown.
      { key: 'ankle_df_l', label: 'Left', unit: 'cm', normalLow: 0, normalHigh: 0, riskBelow: 0, referenceNote: 'Best of 3, in cm' },
      { key: 'ankle_df_r', label: 'Right', unit: 'cm', normalLow: 0, normalHigh: 0, riskBelow: 0, referenceNote: 'Best of 3, in cm' },
    ],
  }
]
