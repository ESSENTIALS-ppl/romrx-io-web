// Quinn F1-F5 copy (QUINN-COPY-F1-F5.md): Stacy PASS Oct 19 2026.
import type { Step } from './assessmentMeta'

/**
 * Hip ER phone spot, kept in ONE place so a word swap is a one-line change per string (Jim, Oct 6 11:36 AM: inner calf,
 * Stacy PASS 11:45). Quinn suggests 'inner side of the shin, just below the knee, on the flat bone' instead; that is
 * with Jim. Change only these two lines (and the tests that pin them) if Jim picks another spot.
 */
export const HIP_ER_PHONE_SPOT = {
  setup: 'Hold your phone flat on your INNER calf, just below the knee. The screen faces your other leg and the long edge runs along your calf.',
  grip: 'Phone flat on your inner calf, just below the knee. Screen faces your other leg, long edge along the calf.',
} as const

export const STEPS_PART1: Step[] = [
{
    id: 'hip_er',
    title: 'Hip External Rotation',
    why: 'Used in seated and floor positions that ask for an open hip.',
    tool: 'Your phone. A firm chair.',
    position: [
      'Sit tall in a firm chair with both feet flat on the floor and your knees bent to 90°.',
      'Move your other knee out to the side and tuck that foot back, out of the way.',                   // Stacy PASS Oct 6
      HIP_ER_PHONE_SPOT.setup,
      'Press the phone flat against your leg with your hand the whole time.',                           // Stacy PASS Oct 6
      'Tap Start, then hold your lower leg straight up and down and stay still while it counts down from 5. It zeroes at the end.',
    ],
    howTo: [
      'Keep your knee bent and both hips down. Slowly swing your foot INWARD, toward your other leg. Your foot moves only sideways.',
      'Stop at a firm stretch or when your thigh starts to lift off the chair. Hold still: after 2.5 seconds the number locks and dings.',
      'Tap Use this number. Return to center, tap Start, and repeat with the other leg.',
    ],
    mistake: 'Your thigh turns instead of just your lower leg.',
    mistakeFix: 'Press one hand gently on your thigh to hold it still. Only the lower leg moves.',
    // Jim, Oct 6 11:36 AM: phone on the inner calf (it can slip on the shin as the foot moves inward). Stacy PASS Oct 6 11:45.
    meter: { grip: HIP_ER_PHONE_SPOT.grip },
    // Range reset (Jim Oct 21 2026 4:15 PM ET): pooled mean +/- 1 SD, risk = mean - 2 SD. Simoneau 1998 (PMID 9742472) +
    // Roach 1991 (PMID 1881956), N 1,743: 32.1 (9.0). range-proposal.md (Quinn). Scoring target = normalLow (mobilityBands.ts).
    fields: [
      { key: 'hip_er_l', label: 'Left', unit: '°', normalLow: 23, normalHigh: 41, riskBelow: 14, rangeSource: 'Simoneau et al., 1998; Roach and Miles, 1991' },
      { key: 'hip_er_r', label: 'Right', unit: '°', normalLow: 23, normalHigh: 41, riskBelow: 14, rangeSource: 'Simoneau et al., 1998; Roach and Miles, 1991' },
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
      'Keep your phone flat on the front of your shin, just below the knee, screen facing forward. Press the phone flat against your leg with your hand the whole time.',
      'Before each leg, tap Start and hold your shin straight up and down while it counts down from 5.',
    ],
    howTo: [
      'Keep your knee bent and both hips down. Slowly swing your foot OUTWARD, away from your other leg. Your foot moves only sideways.',
      'Stop at a firm stretch or when your other hip starts to lift. Hold still until the number locks and dings.',
      'Tap Use this number. Return to center, tap Start, and repeat with the other leg.',
    ],
    mistake: 'One hip lifts off the chair.',
    mistakeFix: 'Stay sitting evenly on both sides. The moment one side lifts, stop there and hold still until the number locks.',
    meter: { grip: 'Phone flat on the front of your shin, just below the knee. Screen faces forward, long edge along the shin.' },
    // Range reset (Jim Oct 21 2026): pooled Simoneau 1998 (PMID 9742472) + Roach 1991 (PMID 1881956), N 1,743: 32.0 (8.0).
    fields: [
      { key: 'hip_ir_l', label: 'Left', unit: '°', normalLow: 24, normalHigh: 40, riskBelow: 16, rangeSource: 'Simoneau et al., 1998; Roach and Miles, 1991' },
      { key: 'hip_ir_r', label: 'Right', unit: '°', normalLow: 24, normalHigh: 40, riskBelow: 16, rangeSource: 'Simoneau et al., 1998; Roach and Miles, 1991' },
    ],
  },
{
    id: 'shoulder_er',
    // Jim 1:00 PM Oct 21 2026: SEATED in a chair with a back (Quinn's exact seated copy, app-steps-audit.md). Was: Oct 6 8:19 PM STANDING goal-post shoulder ER
    // replaces the lying tucked-elbow step that was shown as 'Shoulder Extension'. Key shoulder_er and fields unchanged.
    title: 'Shoulder External Rotation',
    why: 'Supports overhead and pressing positions.',
    // Cue sentences are Quinn's exact words, split Setup / How to Measure like every meter step. The stop line is the shared
    // STOP_LINE (rendered once on every step). Meter math unchanged: gravity angle since zero (see shoulderErStanding.test.ts).
    tool: 'Phone meter, held in your hand.',
    position: [
      'Sit tall in a chair with a back, feet flat, your back against the chair. Raise your arm out to the side to shoulder height and bend your elbow to a right angle, forearm pointing straight ahead.',
      'Tap Start with your other hand, then hold this start position while it counts down from 5.',
    ],
    howTo: [
      'Keep your elbow at shoulder height and in line with your shoulders. Slowly rotate your forearm up and back, like waving hello over your shoulder, until it stops on its own. Hold still until the number locks.',
      'Switch arms, tap Start in the start position, and repeat.',
    ],
    // Mistake line restored word for word from the pre-Oct 6 goal-post step (same arm position). The fix line is that
    // step's first sentence plus a plain-words second sentence (the old one said 'rotates'). Both pending Stacy.
    mistake: 'Arching your back off the chair, letting your elbow drop or pull back, or bending your wrist.',
    mistakeFix: 'Keep your back against the chair and your elbow at shoulder height. Only your forearm moves.',
    // Quinn: flat along the forearm, top edge toward the hand, screen facing out to the side.
    // Jim 12:58 PM Oct 21 2026: natural in-hand grip, screen facing you. Tilt math unchanged (1:1 for any rigid grip); direction check uses z, see lib/meterDirection.ts.
    meter: { grip: 'Hold the phone naturally in your hand, screen facing you. Keep your wrist straight and your grip firm.' },
    // NO typical range and NO source line (Stacy, Oct 6 8:19 PM: Vairo 2012 tested cadets lying down, not general adults
    // standing; Gill 40-75 removed). Scoring target 85 lives in JOINT_SCORE_TARGETS. riskBelow is not read by scoring or
    // display; 57 = Quinn's riskBelow for the server Protocol mirror.
    fields: [
      { key: 'shoulder_er_l', label: 'Left', unit: '°', riskBelow: 57 },
      { key: 'shoulder_er_r', label: 'Right', unit: '°', riskBelow: 57 },
    ],
  },
{
    id: 'shoulder_flex',
    title: 'Shoulder Flexion',
    why: 'Overhead reaching and pressing both ask for full shoulder lift.',
    // Jim, Oct 6 11:54 AM: done SITTING in a chair with a back (not standing, not lying). Target, range and order unchanged.
    // Stacy PASS Oct 6 12:02 (all lines). Meter math unchanged (see shoulderFlexSitting.test.ts).
    tool: 'Your phone. Sitting in a chair with a back.',
    position: [
      'Sit tall with your back against the chair and your feet flat. Let your arm hang straight down by your side, palm facing your body, thumb forward.',
      'Hold the phone in that hand, standing on its long side, in line with your arm. The screen faces out, away from your body.',
      'Tap Start with your other hand, then let your arm hang straight down and hold still while it counts down from 5. It zeroes at the end.',
      'Keep your arm straight, your elbow locked and your back against the chair the whole time.',   // Jim, Oct 6: always visible (Setup is never under More help). Stacy PASS Oct 6 12:02.
    ],
    howTo: [
      'Keep your arm straight and your elbow locked. Lift your arm forward and straight up over your head, not out to the side. Keep your palm facing in.',
      'Stop before your back arches or your shoulder shrugs. Hold still until the number locks and dings.',
      'Tap Use this number. Lower your arm, tap Start, and repeat on the other side.',
    ],
    mistake: 'Arching your back or leaning back to get the arm higher.',
    mistakeFix: "Keep your back against the chair. Don't arch your back or lean back. Keep your wrist straight. Don't bend your elbow or turn your arm out. Don't shrug your shoulder up to your ear.",
    meter: { grip: 'Phone in that hand, standing on its long side, in line with your arm. Screen faces out, away from your body.' },
    // Range reset (Jim Oct 21 2026): Gill 2020 (PMID 33046038), dominant side 159.8 (19.0), n 2,382.
    fields: [
      { key: 'shoulder_flex_l', label: 'Left', unit: '°', normalLow: 141, normalHigh: 179, riskBelow: 122, rangeSource: 'Gill et al., 2020' },
      { key: 'shoulder_flex_r', label: 'Right', unit: '°', normalLow: 141, normalHigh: 179, riskBelow: 122, rangeSource: 'Gill et al., 2020' },
    ],
  },
{
    id: 'cervical_lat',
    title: 'Cervical Lateral Flexion',
    why: 'Shows how far you can tilt your head toward each shoulder.',
    // Jim 1:13 PM Oct 21 2026, Quinn's exact copy: phone flat on the side of the head AWAY from the tilt, just above the
    // ear, same-side hand. Left tilt first (phone on the right), then switch sides, re-Start, tilt right. Direction check:
    // lib/meterDirection.ts (z, -1 on both sides; the phone switching sides is what flips the world direction).
    tool: 'Phone meter, held flat against the side of your head.',
    position: [
      'Sit tall in a chair, feet flat, shoulders down and level, nose pointing forward.',
      'For the left tilt, hold the back of the phone flat against the RIGHT side of your head, just above your ear, with your right hand. Top edge points up, screen facing out.',
      'Tap Start, then hold this start position while it counts down from 5.',
    ],
    howTo: [
      'Nose points forward and chin stays level. Slowly tilt your left ear toward your left shoulder until it stops on its own. Keep the phone pressed flat. Hold still until the number locks and dings.',
      'Tap Use this number. Move the phone to the LEFT side of your head, just above your ear, with your left hand. Sit back up straight, tap Start, hold for the countdown, then tilt your right ear toward your right shoulder.',
    ],
    mistake: 'Turning your face, lifting your shoulder toward your ear, leaning your body, or letting the phone slide or tip.',
    mistakeFix: 'Nose forward, shoulders down, body still, phone pressed flat. Only your head tilts.',
    meter: { grip: 'Back of the phone flat against the side of your head, just above your ear, on the side away from the tilt.' },
    // Range reset (Jim Oct 21 2026): pooled, WITH Wadhwa 2024 (Grant ruling). PMIDs 23829201, 32626769, 33868830, 39677250;
    // N 260: 44.5 (7.4). Without-Wadhwa alternative: proof-20261020/range-reset-neck-no-wadhwa.patch (not default).
    fields: [
      { key: 'cervical_lat_l', label: 'Left', unit: '°', normalLow: 37, normalHigh: 52, riskBelow: 30, rangeSource: 'Pooled: Tousignant-Laflamme 2013, Wolan-Nieroda 2020, Canovas-Ambit 2021, Wadhwa 2024' },
      { key: 'cervical_lat_r', label: 'Right', unit: '°', normalLow: 37, normalHigh: 52, riskBelow: 30, rangeSource: 'Pooled: Tousignant-Laflamme 2013, Wolan-Nieroda 2020, Canovas-Ambit 2021, Wadhwa 2024' },
    ],
  }
]
