// Quinn F1-F5 copy (QUINN-COPY-F1-F5.md): Stacy PASS Oct 19 2026.
import type { Step } from './assessmentMeta'
import { HIP_FLEX_STEP } from '../lib/hipFlexCopy'

export const STEPS_PART2: Step[] = [
{
    id: 'cervical_flex_ext',
    title: 'Cervical Flexion + Extension',
    why: 'Covers your chin-to-chest and looking-up range.',
    tool: 'Your phone. Seated in a chair.',
    position: [
      'Sit upright in a chair. Feet flat. Back straight.',
      'Tap Start, then hold your phone flat against the right side of your head, at your temple, with your right hand, screen facing out, top edge pointing up.',
      'Look straight ahead. Hold still while it counts down from 5 with a soft beep each second. It zeroes at the end.',
    ],
    howTo: [
      'Back stays against the chair. Only your head nods. Chin down (Flexion): Drop your chin toward your chest as far as it will go. Hold still until the number locks and dings. Tap Use this number.',
      'Chin up (Extension): Look straight ahead, tap Start the same way, then lift your chin toward the ceiling as far as it will go. Hold until it locks and tap Use this number.',
    ],
    mistake: 'Moving your whole upper body forward or backward instead of just your head and neck.',
    mistakeFix: 'Your shoulders and upper body stay still. Only your head moves. If your back starts to round or arch, stop there.',
    // Quinn Oct 21 2026: right temple, right hand, top edge up (enables the direction check, lib/meterDirection.ts).
    meter: { grip: 'Hold your phone flat against the right side of your head, at your temple, with your right hand, screen facing out, top edge pointing up.' },
    // Card 14 (Jim YES Oct 20 10:52 AM ET): published Swinkels 2014 decade means, flexion 53 to 60, extension 64 to 75
    // (TYPICAL-RANGES-FOR-AVERY-20261019.md rows 10-11). Display only, never scoring. Own note per field so each shows.
    fields: [
      { key: 'cervical_flex', label: 'Flexion', unit: '°', normalLow: 53, normalHigh: 60, riskBelow: 35, referenceNote: 'Typical range: 53 to 60 degrees', rangeSource: 'Swinkels, 2014' },
      { key: 'cervical_ext', label: 'Extension', unit: '°', normalLow: 64, normalHigh: 75, riskBelow: 40, referenceNote: 'Typical range: 64 to 75 degrees', rangeSource: 'Swinkels, 2014' },
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
    meter: { grip: HIP_FLEX_STEP.meterGrip },
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
    why: 'A wide stance asks for hip abduction range.',
    tool: 'Your phone. Standing.',
    position: [
      'Stand upright with something nearby you can grab for balance if needed.',
      'Tap Start, then hold your phone flat against the OUTER side of your thigh, midway between your hip and your knee, with your same-side hand. The screen faces out to the side and the long edge runs along your thigh.',
      'Stand straight with your weight even on both feet. Hold still while it counts down from 5 with a soft beep each second. It zeroes at the end.',
    ],
    howTo: [
      'Toes forward. Lift your test leg straight out to the side. No lean, no forward drift, no turning out.',
      'Stop just before your upper body starts to lean to the other side or your hips push back. Hold still until the number locks and dings.',
      'Tap Use this number. Lower the leg, tap Start again, and repeat on the other side.',
    ],
    mistake: 'Leaning your upper body away or letting your hips push back to get the leg higher.',
    mistakeFix: 'Your upper body stays upright and your hips stay right under you. The moment either shifts, you have hit your limit.',
    meter: { grip: 'Standing. Phone flat on the outer side of your thigh, screen facing out, long edge along the thigh.' },
    fields: [
      { key: 'hip_abd_l', label: 'Left', unit: '°', riskBelow: 25 },
      { key: 'hip_abd_r', label: 'Right', unit: '°', riskBelow: 25 },
    ],
  },
{
    id: 'lumbar',
    title: 'Lumbar Flexion + Extension',
    why: 'Low back range and control support bending, lifting, and recovering from awkward positions.',
    tool: 'Type this one in for now. Use any level you have to read the angle. Standing + Floor.',  // Stacy PASS, Oct 5 11:32 PM
    position: [
      'Bending forward (Flexion) is standing. Bending back (Extension) is on the floor face down.',
      'Bend forward (Flexion) setup: Stand straight, feet shoulder-width apart. Hold your phone flat against your breastbone with both hands, top edge pointing up, screen facing out. Set your level to 0 while you stand straight.',
      'Bend back (Extension) setup: Lie face down on the floor with your hands under your shoulders. Rest your phone flat on your upper back, between your shoulder blades, screen facing up. If it slides, ask someone to hold it there. Set your level to 0 while you lie flat.',
    ],
    howTo: [
      'Bend forward (Flexion): Keep your legs straight. Slowly bend forward with your back flat. Stop when you feel a strong stretch in the back of your legs. Note the angle at that point.',
      'Bend back (Extension): Press up with both arms to lift your chest, keeping your hips flat on the floor. Note the angle at the highest point.',
    ],
    mistake: 'Rounding your back to get lower when bending forward, or letting your hips lift off the floor during the press-up.',
    mistakeFix: 'When bending forward, stop when you feel a strong stretch in the back of your legs. When bending back, your hips stay flat on the floor the whole time. Only your chest rises.',
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
      'Check your heel: it should stay down the whole time. A slip of paper under the heel should stay pinched.',
      'Move your foot closer or farther from the wall until you find the farthest spot where your knee still just touches the wall with the heel down. Measure from the wall to the tip of your big toe. Record it in centimeters (cm), not degrees.',
      'Do 3 tries on this foot and record the best one (the farthest distance that still counts). Repeat with the other foot.',
    ],
    mistake: 'Your heel lifts off the floor, or your knee drifts inward or outward as it drives forward.',
    mistakeFix: 'Keep your eye on your heel and your knee over your second and third toes. If your heel lifts even slightly, that try does not count. Move your foot closer to the wall and try again.',
    fields: [
      // Typical range 6-13 cm (Quinn, TYPICAL-RANGES-FOR-AVERY-20261019.md: Konor 2012, mean 9.5 cm, SD 3.1). Display only, never scoring.
      { key: 'ankle_df_l', label: 'Left', unit: 'cm', normalLow: 6, normalHigh: 13, riskBelow: 0, rangeSource: 'Konor et al., 2012' },
      { key: 'ankle_df_r', label: 'Right', unit: 'cm', normalLow: 6, normalHigh: 13, riskBelow: 0, rangeSource: 'Konor et al., 2012' },
    ],
  }
]
