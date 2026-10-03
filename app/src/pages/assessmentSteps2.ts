import type { Step } from './assessmentMeta'

export const STEPS_PART2: Step[] = [
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
    title: 'Hip Flexion (Straight-Leg Raise)',
    why: 'You raise one straight leg and read the angle. Each leg is measured and scored on its own, so you can see both sides.',
    tool: 'iPhone: Measure -> Level. Android: Simple Inclinometer. Lying on the floor.',
    position: [
      'Lie flat on your back on the floor with both legs straight.',
      'Hold your phone flat against the outer side of your thigh (the surface facing away from your other leg), midway between your hip and your knee. Screen faces outward.',
      'Tap to zero with your leg flat on the ground.',
    ],
    howTo: [
      'Keep the test knee completely straight. Raise that leg as high as you can without bending the knee, and keep your other leg flat on the floor.',
      'Keep the phone aligned with your thigh as it rises. Stop just before your low back starts to lift off the floor or your other leg starts to lift. Read the number.',
      'Record it for this leg. Lower the leg slowly. Re-zero. Repeat with the other leg. Each leg gets its own number.',
    ],
    mistake: 'Bending the knee as the leg rises, letting the other leg lift, or going so high that the low back arches off the floor.',
    mistakeFix: 'Keep the test leg straight the whole time and the other leg flat on the floor. Stop before your low back lifts. Once it arches, that number does not count.',
    fields: [
      { key: 'hip_flex_l', label: 'Left leg', unit: '°', normalLow: 100, normalHigh: 120, riskBelow: 100 },
      { key: 'hip_flex_r', label: 'Right leg', unit: '°', normalLow: 100, normalHigh: 120, riskBelow: 100 },
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
    title: 'Ankle Dorsiflexion (Knee-to-Wall, cm)',
    why: 'This is one test, the standing knee-to-wall test, and you record it in centimeters (cm) for each foot.',
    tool: 'Tape measure or ruler. Standing knee-to-wall test. Measure in centimeters (cm).',
    position: [
      'Remove your shoes. Stand barefoot facing a wall with a tape measure on the floor pointing straight out from the wall.',
      'Place the tip of your big toe at the 10 cm mark on the tape.',
      'Keep your heel flat on the floor the entire test.',
    ],
    howTo: [
      'Drive your knee forward to touch the wall without lifting your heel. Move your foot closer or farther from the wall until you find the spot where your knee can just barely touch with the heel still flat.',
      'Once you find that spot, measure the distance from the wall to the tip of your big toe. That is your score. Record it in centimeters (cm), not degrees.',
      'Repeat with the other foot.',
    ],
    mistake: 'Your heel lifts off the floor as your knee drives forward.',
    mistakeFix: 'Keep your eye on your heel the whole time. If it lifts even slightly, that rep does not count. Adjust your foot closer to the wall and try again.',
    fields: [
      { key: 'ankle_df_l', label: 'Left', unit: 'cm', normalLow: 10, normalHigh: 20, riskBelow: 10 },
      { key: 'ankle_df_r', label: 'Right', unit: 'cm', normalLow: 10, normalHigh: 20, riskBelow: 10 },
    ],
  }
]
