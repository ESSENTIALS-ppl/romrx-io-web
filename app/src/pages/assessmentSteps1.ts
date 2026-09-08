import type { Step } from './assessmentMeta'

export const STEPS_PART1: Step[] = [
{
    id: 'hip_er',
    title: 'Hip External Rotation',
    why: 'Supports seated and ground-based positions that require an open hip.',
    tool: 'iPhone: Measure app -> Level. Android: Simple Inclinometer. Firm chair.',
    position: [
      'Sit in a firm chair. Both feet flat on the floor, knees at 90°.',
      'Hold your phone against the FRONT of your shin (just below your knee). Screen faces FORWARD - away from your leg. Long edge runs along your shinbone.',
      'Tap to zero. The phone should read close to 0°.',
    ],
    howTo: [
      'Keep your thigh pressed down. Slowly swing your foot INWARD - toward your other leg.',
      'Stop when you feel a firm stretch or your thigh starts to lift off the chair. Read the number.',
      'Record it. Return to center. Re-zero. Switch legs and repeat.',
    ],
    mistake: 'Your thigh rotates instead of just your shin.',
    mistakeFix: 'Press one hand gently on your thigh to hold it still. Only the lower leg moves.',
    fields: [
      { key: 'hip_er_l', label: 'Left', unit: '°', normalLow: 40, normalHigh: 60, riskBelow: 40 },
      { key: 'hip_er_r', label: 'Right', unit: '°', normalLow: 40, normalHigh: 60, riskBelow: 40 },
    ],
  },
{
    id: 'hip_ir',
    title: 'Hip Internal Rotation',
    why: 'Protects the knee and supports hip escapes and rotational movement.',
    tool: 'Same chair, same phone placement - only the foot direction changes.',
    position: [
      'Stay in the same chair. Do NOT move your position.',
      'Phone is still on the front of your shin, screen facing forward.',
      'Tap to re-zero at center before each leg.',
    ],
    howTo: [
      'Keep your thigh pressed down. Slowly swing your foot OUTWARD - away from your other leg.',
      'Stop when you feel a firm stretch or one hip starts to lift. Read the number.',
      'Record it. Return to center. Re-zero. Switch legs and repeat.',
    ],
    mistake: 'One hip lifts off the chair.',
    mistakeFix: 'You must stay sitting evenly on both sides. The moment one side lifts, that is your endpoint. Record it.',
    fields: [
      { key: 'hip_ir_l', label: 'Left', unit: '°', normalLow: 30, normalHigh: 45, riskBelow: 30 },
      { key: 'hip_ir_r', label: 'Right', unit: '°', normalLow: 30, normalHigh: 45, riskBelow: 30 },
    ],
  },
{
    id: 'shoulder_er',
    title: 'Shoulder External Rotation',
    why: 'Supports overhead and pressing positions and helps protect the shoulder joint.',
    tool: 'iPhone: Measure -> Level. Android: Simple Inclinometer. Seated in chair.',
    position: [
      'Sit upright. Raise one arm straight out to the side at shoulder height, like a T. Bend your elbow to 90°.',
      'Hold your phone in that hand, screen facing toward you. That is your starting position.',
      'Tap to zero.',
    ],
    howTo: [
      'Keep your elbow in the same spot. Rotate your forearm upward, allowing your shoulder to turn until you feel a strong stretch.',
      'Read the number or have a partner read it.',
      'Record the number. Re-zero and repeat with the opposite arm.',
    ],
    mistake: 'Your shoulder shrugs up or your elbow drops below shoulder height.',
    mistakeFix: 'Keep your shoulder pressed down and your elbow at the same height the whole time. From the elbow to the shoulder, the arm only rotates - it does not lift up or drop down.',
    fields: [
      { key: 'shoulder_er_l', label: 'Left', unit: '°', normalLow: 60, normalHigh: 90, riskBelow: 60 },
      { key: 'shoulder_er_r', label: 'Right', unit: '°', normalLow: 60, normalHigh: 90, riskBelow: 60 },
    ],
  },
{
    id: 'shoulder_flex',
    title: 'Shoulder Flexion',
    why: 'Overhead reach and pressing movements both require full shoulder lift.',
    tool: 'iPhone: Measure -> Level. Android: Simple Inclinometer. Standing.',
    position: [
      'Stand upright with room overhead and your arm hanging relaxed at your side.',
      'Hold your phone in your hand with the screen facing toward you.',
      'Tap to zero while your arm hangs straight down.',
    ],
    howTo: [
      'Keep your elbow straight. Raise your arm FORWARD and UP as high as you can go.',
      'Stop when you cannot go higher without leaning back or shrugging. Read the number.',
      'Record it. Shake out your arm. Re-zero. Repeat on the other side.',
    ],
    mistake: 'Leaning your upper body backward or shrugging your shoulder to get the arm higher.',
    mistakeFix: 'Keep your body tall and still. The moment your back starts to arch or your shoulder creeps up toward your ear, that is your true end range. Record it there.',
    fields: [
      { key: 'shoulder_flex_l', label: 'Left', unit: '°', normalLow: 140, normalHigh: 180, riskBelow: 120 },
      { key: 'shoulder_flex_r', label: 'Right', unit: '°', normalLow: 140, normalHigh: 180, riskBelow: 120 },
    ],
  },
{
    id: 'cervical_lat',
    title: 'Cervical Lateral Flexion',
    why: 'Lateral neck strength and range support balance and control in scrambles and contact.',
    tool: 'iPhone: Measure -> Level. Android: Simple Inclinometer. Seated in chair.',
    position: [
      'Sit upright in a chair. Feet flat. Back straight.',
      'Press your phone flat against your FOREHEAD, screen facing forward away from your face.',
      'Tap to zero while looking straight ahead.',
    ],
    howTo: [
      'Tilt your ear toward your left shoulder as far as it will go. Keep your shoulder pressed down.',
      'Read the number. Re-zero. Tilt your ear toward your right shoulder. Read and record both sides.',
    ],
    mistake: 'Shrugging your shoulder up to meet your ear.',
    mistakeFix: 'Keep both shoulders pressed down the whole time. Only your head moves. If your shoulder rises, that reading does not count.',
    fields: [
      { key: 'cervical_lat_l', label: 'Left', unit: '°', normalLow: 40, normalHigh: 45, riskBelow: 30 },
      { key: 'cervical_lat_r', label: 'Right', unit: '°', normalLow: 40, normalHigh: 45, riskBelow: 30 },
    ],
  }
]
