import type { Step } from './assessmentMeta'

export const STEPS_PART1: Step[] = [
{
    id: 'hip_er',
    title: 'Hip External Rotation',
    why: 'Supports seated and ground-based positions that require an open hip.',
    tool: 'Your phone. A firm chair.',
    position: [
      'Sit tall in a firm chair with both feet flat on the floor and your knees bent to 90°.',
      'Move your other knee out to the side and tuck that foot back, out of the way.',                   // Stacy PASS Oct 6
      'Hold your phone flat on your INNER calf, just below the knee. The screen faces your other leg and the long edge runs along your calf.',
      'Press the phone flat against your leg with your hand the whole time.',                           // Stacy PASS Oct 6
      'Tap Start, then hold your lower leg straight up and down and stay still while it counts down from 5. It zeroes at the end.',
    ],
    howTo: [
      'Keep your knee bent and both hips down. Slowly swing your foot INWARD, toward your other leg. Your foot moves only sideways.',
      'Stop at a firm stretch or when your thigh starts to lift off the chair. Hold still: after 2.5 seconds the number locks and chimes.',
      'Tap Use this number. Return to center, tap Start, and repeat with the other leg.',
    ],
    mistake: 'Your thigh rotates instead of just your shin.',
    mistakeFix: 'Press one hand gently on your thigh to hold it still. Only the lower leg moves.',
    // Jim, Oct 6 11:36 AM: phone on the inner calf (it can slip on the shin as the foot moves inward). Stacy PASS Oct 6 11:45.
    meter: { grip: 'Phone flat on your inner calf, just below the knee. Screen faces your other leg, long edge along the calf.' },
    fields: [
      { key: 'hip_er_l', label: 'Left', unit: '°', normalLow: 29, normalHigh: 43, riskBelow: 40, rangeSource: 'Simoneau et al., 1998' },
      { key: 'hip_er_r', label: 'Right', unit: '°', normalLow: 29, normalHigh: 43, riskBelow: 40, rangeSource: 'Simoneau et al., 1998' },
    ],
  },
{
    id: 'hip_ir',
    title: 'Hip Internal Rotation',
    why: 'Supports hip escapes and rotational movement.',
    // Was 'Same chair, same phone spot.' Hip ER moved to the inner calf (Jim, Oct 6), so the spot differs now. Stacy PASS Oct 6 11:45.
    tool: 'Same chair. This time, hold the phone flat on the front of your shin.',
    position: [
      'Stay in the same chair and the same position.',
      'Keep your phone flat on the front of your shin, just below the knee, screen facing forward.',
      'Before each leg, tap Start and hold your shin straight up and down while it counts down from 5.',
    ],
    howTo: [
      'Keep your knee bent and both hips down. Slowly swing your foot OUTWARD, away from your other leg. Your foot moves only sideways.',
      'Stop at a firm stretch or when your other hip starts to lift. Hold still until the number locks and chimes.',
      'Tap Use this number. Return to center, tap Start, and repeat with the other leg.',
    ],
    mistake: 'One hip lifts off the chair.',
    mistakeFix: 'You must stay sitting evenly on both sides. The moment one side lifts, that is your endpoint. Record it.',
    meter: { grip: 'Phone flat on the front of your shin, just below the knee. Screen faces forward, long edge along the shin.' },
    fields: [
      { key: 'hip_ir_l', label: 'Left', unit: '°', normalLow: 26, normalHigh: 40, riskBelow: 30, rangeSource: 'Simoneau et al., 1998' },
      { key: 'hip_ir_r', label: 'Right', unit: '°', normalLow: 26, normalHigh: 40, riskBelow: 30, rangeSource: 'Simoneau et al., 1998' },
    ],
  },
{
    id: 'shoulder_er',
    title: 'Shoulder External Rotation',
    why: 'Supports overhead and pressing positions.',
    tool: 'Your phone. Seated in a chair.',
    position: [
      'Sit tall. Raise one arm out to the side at shoulder height, like a T. Bend the elbow to 90° so your forearm points straight ahead.',
      'Hold the phone along your forearm like a ruler: thumb on one long edge, fingers on the other, top edge in line with your knuckles. Turn it on its edge so the screen faces your head. Keep your wrist straight and stiff the whole time.',
      'Tap Start with your other hand, then hold this start position while it counts down from 5.',
    ],
    howTo: [
      'Keep your elbow at shoulder height. Rotate up and back until you feel a strong stretch or your back starts to arch. Going past straight up is fine.',
      'Hold still: after 2.5 seconds the number locks and chimes. Tap Use this number.',
      'Switch arms, tap Start in the start position, and repeat.',
    ],
    mistake: 'Your shoulder shrugs up or your elbow drops below shoulder height.',
    mistakeFix: 'Keep your shoulder pressed down and your elbow at the same height the whole time. From the elbow to the shoulder, the arm only rotates - it does not lift up or drop down.',
    meter: { grip: 'Phone along your forearm like a ruler, on its edge, screen facing your head. Wrist straight and stiff.' },
    fields: [
      { key: 'shoulder_er_l', label: 'Left', unit: '°', normalLow: 85, normalHigh: 110, riskBelow: 60, rangeSource: 'Vairo et al., 2012' },
      { key: 'shoulder_er_r', label: 'Right', unit: '°', normalLow: 85, normalHigh: 110, riskBelow: 60, rangeSource: 'Vairo et al., 2012' },
    ],
  },
{
    id: 'shoulder_flex',
    title: 'Shoulder Flexion',
    why: 'Overhead reach and pressing movements both require full shoulder lift.',
    tool: 'Your phone. Standing.',
    position: [
      'Stand tall with room overhead and your arm hanging relaxed at your side.',
      'Hold the phone in that hand, long edge pointing down along your arm, screen facing out to the side, away from your body.',
      'Tap Start with your other hand, then let your arm hang straight down and hold still while it counts down from 5.',
    ],
    howTo: [
      'Thumb up, wrist straight, ribs down. Keep your elbow straight and raise your arm in front of you and UP as high as you can go.',
      'Stop before your back arches or your shoulder shrugs. Hold still until the number locks and chimes.',
      'Tap Use this number. Lower your arm, tap Start, and repeat on the other side.',
    ],
    mistake: 'Leaning your upper body backward or shrugging your shoulder to get the arm higher.',
    mistakeFix: 'Keep your body tall and still. The moment your back starts to arch or your shoulder creeps up toward your ear, that is your true end range. Record it there.',
    meter: { grip: 'Phone in your hand, long edge along your arm, screen facing out to the side. Thumb up, wrist straight.' },
    fields: [
      { key: 'shoulder_flex_l', label: 'Left', unit: '°', normalLow: 140, normalHigh: 180, riskBelow: 120, rangeSource: 'Gill et al., 2020' },
      { key: 'shoulder_flex_r', label: 'Right', unit: '°', normalLow: 140, normalHigh: 180, riskBelow: 120, rangeSource: 'Gill et al., 2020' },
    ],
  },
{
    id: 'cervical_lat',
    title: 'Cervical Lateral Flexion',
    why: 'Lateral neck strength and range support balance and control in scrambles and contact.',
    tool: 'Your phone. Seated in a chair.',
    position: [
      'Sit upright in a chair. Feet flat. Back straight.',
      'Tap Start, then press your phone flat against your FOREHEAD, screen facing forward, away from your face.',
      'Look straight ahead. Hold still while it counts down from 5 with a soft beep each second. It zeroes at the end.',
    ],
    howTo: [
      'Nose points forward and chin stays level. Tilt your ear toward your left shoulder as far as it will go. Shoulders down, body still. Hold still until the number locks and chimes.',
      'Tap Use this number. Then tap Start the same way and tilt toward your right shoulder.',
    ],
    mistake: 'Shrugging your shoulder up to meet your ear.',
    mistakeFix: 'Keep both shoulders pressed down the whole time. Only your head moves. If your shoulder rises, that reading does not count.',
    meter: { grip: 'Phone flat on your forehead, screen facing forward.' },
    fields: [
      { key: 'cervical_lat_l', label: 'Left', unit: '°', riskBelow: 30 },
      { key: 'cervical_lat_r', label: 'Right', unit: '°', riskBelow: 30 },
    ],
  }
]
