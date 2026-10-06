import type { Step } from './assessmentMeta'

export const STEPS_PART1: Step[] = [
{
    id: 'hip_er',
    title: 'Hip External Rotation',
    why: 'Supports seated and ground-based positions that require an open hip.',
    tool: 'Your phone. A firm chair.',
    position: [
      'Sit tall in a firm chair with both feet flat on the floor and your knees bent to 90°.',
      'Hold your phone flat on the FRONT of your shin, just below the knee. The screen faces forward and the long edge runs along your shinbone.',
      'With your shin straight up and down, tap Zero.',
    ],
    howTo: [
      'Keep your thigh pressed down. Slowly swing your foot INWARD, toward your other leg.',
      'Stop at a firm stretch or when your thigh starts to lift off the chair. Hold still: after 2.5 seconds the number locks and chimes.',
      'Tap Use this number. Return to center, tap Zero, and repeat with the other leg.',
    ],
    mistake: 'Your thigh rotates instead of just your shin.',
    mistakeFix: 'Press one hand gently on your thigh to hold it still. Only the lower leg moves.',
    meter: { grip: 'Phone flat on the front of your shin, just below the knee. Screen faces forward, long edge along the shin.' },
    fields: [
      { key: 'hip_er_l', label: 'Left', unit: '°', normalLow: 40, normalHigh: 60, riskBelow: 40 },
      { key: 'hip_er_r', label: 'Right', unit: '°', normalLow: 40, normalHigh: 60, riskBelow: 40 },
    ],
  },
{
    id: 'hip_ir',
    title: 'Hip Internal Rotation',
    why: 'Supports hip escapes and rotational movement.',
    tool: 'Same chair, same phone spot. Only the foot direction changes.',
    position: [
      'Stay in the same chair and the same position.',
      'Keep your phone flat on the front of your shin, just below the knee, screen facing forward.',
      'With your shin straight up and down, tap Zero before each leg.',
    ],
    howTo: [
      'Keep your thigh pressed down. Slowly swing your foot OUTWARD, away from your other leg.',
      'Stop at a firm stretch or when one hip starts to lift. Hold still until the number locks and chimes.',
      'Tap Use this number. Return to center, tap Zero, and repeat with the other leg.',
    ],
    mistake: 'One hip lifts off the chair.',
    mistakeFix: 'You must stay sitting evenly on both sides. The moment one side lifts, that is your endpoint. Record it.',
    meter: { grip: 'Phone flat on the front of your shin, just below the knee. Screen faces forward, long edge along the shin.' },
    fields: [
      { key: 'hip_ir_l', label: 'Left', unit: '°', normalLow: 30, normalHigh: 45, riskBelow: 30 },
      { key: 'hip_ir_r', label: 'Right', unit: '°', normalLow: 30, normalHigh: 45, riskBelow: 30 },
    ],
  },
{
    id: 'shoulder_er',
    title: 'Shoulder External Rotation',
    why: 'Supports overhead and pressing positions.',
    tool: 'Your phone. Seated in a chair.',
    position: [
      'Sit tall. Raise one arm out to the side at shoulder height, like a T. Bend the elbow to 90° so your forearm points straight ahead.',
      'Hold the phone in that hand, lined up with your forearm, long edge toward your fingertips. Turn it on its edge so the screen faces your head.',
      'Tap Zero with your other hand.',
    ],
    howTo: [
      'Keep your elbow in the same spot. Rotate your forearm up and back until you feel a strong stretch.',
      'Hold still: after 2.5 seconds the number locks and chimes. Tap Use this number.',
      'Switch arms, tap Zero in the start position, and repeat.',
    ],
    mistake: 'Your shoulder shrugs up or your elbow drops below shoulder height.',
    mistakeFix: 'Keep your shoulder pressed down and your elbow at the same height the whole time. From the elbow to the shoulder, the arm only rotates - it does not lift up or drop down.',
    meter: { grip: 'Phone in your hand, lined up with your forearm, on its edge with the screen facing your head.' },
    fields: [
      { key: 'shoulder_er_l', label: 'Left', unit: '°', normalLow: 60, normalHigh: 90, riskBelow: 60 },
      { key: 'shoulder_er_r', label: 'Right', unit: '°', normalLow: 60, normalHigh: 90, riskBelow: 60 },
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
      'Tap Zero with your other hand while your arm hangs straight down.',
    ],
    howTo: [
      'Keep your elbow straight. Raise your arm FORWARD and UP as high as you can go.',
      'Stop when you cannot go higher without leaning back or shrugging. Hold still until the number locks and chimes.',
      'Tap Use this number. Lower your arm, tap Zero, and repeat on the other side.',
    ],
    mistake: 'Leaning your upper body backward or shrugging your shoulder to get the arm higher.',
    mistakeFix: 'Keep your body tall and still. The moment your back starts to arch or your shoulder creeps up toward your ear, that is your true end range. Record it there.',
    meter: { grip: 'Phone in your hand, long edge along your arm, screen facing out to the side.' },
    fields: [
      { key: 'shoulder_flex_l', label: 'Left', unit: '°', normalLow: 140, normalHigh: 180, riskBelow: 120 },
      { key: 'shoulder_flex_r', label: 'Right', unit: '°', normalLow: 140, normalHigh: 180, riskBelow: 120 },
    ],
  },
{
    id: 'cervical_lat',
    title: 'Cervical Lateral Flexion',
    why: 'Lateral neck strength and range support balance and control in scrambles and contact.',
    tool: 'Your phone. Seated in a chair.',
    position: [
      'Sit upright in a chair. Feet flat. Back straight.',
      'Tap Zero, then press your phone flat against your FOREHEAD, screen facing forward, away from your face.',
      'Look straight ahead and hold still. It zeroes after 3 seconds with a soft tick.',
    ],
    howTo: [
      'Tilt your ear toward your left shoulder as far as it will go. Keep your shoulder pressed down. Hold still until the number locks and chimes.',
      'Tap Use this number. Then tap Zero the same way and tilt toward your right shoulder.',
    ],
    mistake: 'Shrugging your shoulder up to meet your ear.',
    mistakeFix: 'Keep both shoulders pressed down the whole time. Only your head moves. If your shoulder rises, that reading does not count.',
    meter: { grip: 'Phone flat on your forehead, screen facing forward.', zeroDelaySec: 3 },
    fields: [
      { key: 'cervical_lat_l', label: 'Left', unit: '°', normalLow: 40, normalHigh: 45, riskBelow: 30 },
      { key: 'cervical_lat_r', label: 'Right', unit: '°', normalLow: 40, normalHigh: 45, riskBelow: 30 },
    ],
  }
]
