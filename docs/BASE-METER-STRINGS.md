# Base assessment phone meter: customer strings for review

Branch `feat/base-inclinometer-20261005` (romrx-io-web). Old = main 600a2a4, New = this branch. Draft only, not live.

Reviewers: **Stacy** (legal and claims: no accuracy, medical or diagnostic claims) and **Quinn** (kinesiology: is the phone placement anatomically right for each joint, and does a phone angle measure that joint well).

Rules applied: plain, goal-first, American spelling, no em dashes, no accuracy or medical claims, 'Protocol' never 'Profile'. Unchanged strings are marked (unchanged). Scoring, bands, ranges and 'Normal: a-b' labels are not changed.

Sources: step copy in `app/src/pages/assessmentSteps1.ts`, `assessmentSteps2.ts`, `app/src/lib/hipFlexCopy.ts` (hip flexion, Stacy-pinned phrases kept word for word); meter UI strings in `app/src/lib/meterCopy.ts`; setup screen in `app/src/pages/assessmentMeta.ts` and `AssessmentPhases.tsx`.



## Questions for Quinn
1. **Lumbar flexion and extension: left as typed entry only (no phone meter).** One phone measures whole-trunk tilt, which mixes hip and low-back motion, and the current setup ('hold your phone at your side') is ambiguous. Recommend keeping it typed only until there is a placement you approve (for example sacrum plus T12 with two readings).
2. **Ankle dorsiflexion** stays knee-to-wall in cm (typed only). Not an angle.
3. **The meter reads the gravity angle since Zero.** It measures rotation about any horizontal axis and ignores compass heading. Movement in a second plane (for example hip flexion mixed into hip abduction, or trunk lean) adds to the number. Please confirm each grip keeps the movement in one plane.
4. **Shoulder ER and flexion: the phone is held in the hand**, lined up with the forearm or arm. Wrist bend adds error. Is a hand grip acceptable, or should it be strapped to the forearm?
5. **Head steps, hip flexion and hip abduction use a 3-second delayed Zero** with a soft tick, because the screen is out of view when the phone is in place.
6. **Hip ER and IR (seated):** the phone sits flat on the front of the shin with the screen forward, so the shin swings in the plane of the screen. Please confirm.

## Movements (in assessment order)

| # | Movement | Fields (L/R or parts) | Old input | New input | Grip in the meter |
|---|---|---|---|---|---|
| 1 | Hip External Rotation | Left (hip_er_l, °), Right (hip_er_r, °) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Phone meter (Measure with phone) + typed box | Phone flat on the front of your shin, just below the knee. Screen faces forward, long edge along the shin. |
| 2 | Hip Internal Rotation | Left (hip_ir_l, °), Right (hip_ir_r, °) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Phone meter (Measure with phone) + typed box | Phone flat on the front of your shin, just below the knee. Screen faces forward, long edge along the shin. |
| 3 | Shoulder External Rotation | Left (shoulder_er_l, °), Right (shoulder_er_r, °) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Phone meter (Measure with phone) + typed box | Phone in your hand, lined up with your forearm, on its edge with the screen facing your head. |
| 4 | Shoulder Flexion | Left (shoulder_flex_l, °), Right (shoulder_flex_r, °) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Phone meter (Measure with phone) + typed box | Phone in your hand, long edge along your arm, screen facing out to the side. |
| 5 | Cervical Lateral Flexion | Left (cervical_lat_l, °), Right (cervical_lat_r, °) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Phone meter (Measure with phone) + typed box | Phone flat on your forehead, screen facing forward. (Zero waits 3 s) |
| 6 | Cervical Flexion + Extension | Flexion (cervical_flex, °), Extension (cervical_ext, °) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Phone meter (Measure with phone) + typed box | Phone flat against the side of your head at the temple, screen facing the wall beside you. (Zero waits 3 s) |
| 7 | Hip Flexion (Straight-Leg Raise) | Left leg (hip_flex_l, °), Right leg (hip_flex_r, °) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Phone meter (Measure with phone) + typed box | Phone flat on the outer side of your thigh, midway between hip and knee, screen facing out. (Zero waits 3 s) |
| 8 | Hip Abduction | Left (hip_abd_l, °), Right (hip_abd_r, °) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Phone meter (Measure with phone) + typed box | Phone flat on the front of your thigh, screen facing forward, long edge along the thigh. (Zero waits 3 s) |
| 9 | Lumbar Flexion + Extension | Flexion (lumbar_flex, °), Extension (lumbar_ext, °) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Typed box only | (none) |
| 10 | Ankle Dorsiflexion (Knee-to-Wall, cm) | Left (ankle_df_l, cm), Right (ankle_df_r, cm) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Typed box only | (none) |

---

## Hip External Rotation (`hip_er`)

Meter: YES, grip line: Phone flat on the front of your shin, just below the knee. Screen faces forward, long edge along the shin.

### Tool line
- **Old:** iPhone: Measure app -> Level. Android: Simple Inclinometer. Firm chair.
- **New:** Your phone. A firm chair.

### Setup
**Old:**

1. Sit in a firm chair. Both feet flat on the floor, knees at 90°.
2. Hold your phone against the FRONT of your shin (just below your knee). Screen faces FORWARD - away from your leg. Long edge runs along your shinbone.
3. Tap to zero. The phone should read close to 0°.

**New:**

1. Sit tall in a firm chair with both feet flat on the floor and your knees bent to 90°.
2. Hold your phone flat on the FRONT of your shin, just below the knee. The screen faces forward and the long edge runs along your shinbone.
3. With your shin straight up and down, tap Zero.

### How to Measure
**Old:**

1. Keep your thigh pressed down. Slowly swing your foot INWARD - toward your other leg.
2. Stop when you feel a firm stretch or your thigh starts to lift off the chair. Read the number.
3. Record it. Return to center. Re-zero. Switch legs and repeat.

**New:**

1. Keep your thigh pressed down. Slowly swing your foot INWARD, toward your other leg.
2. Stop at a firm stretch or when your thigh starts to lift off the chair. Hold still: after 2.5 seconds the number locks and chimes.
3. Tap Use this number. Return to center, tap Zero, and repeat with the other leg.

### Common mistake
(unchanged) Your thigh rotates instead of just your shin.

### Fix
(unchanged) Press one hand gently on your thigh to hold it still. Only the lower leg moves.

---

## Hip Internal Rotation (`hip_ir`)

Meter: YES, grip line: Phone flat on the front of your shin, just below the knee. Screen faces forward, long edge along the shin.

### Tool line
- **Old:** Same chair, same phone placement - only the foot direction changes.
- **New:** Same chair, same phone spot. Only the foot direction changes.

### Setup
**Old:**

1. Stay in the same chair. Do NOT move your position.
2. Phone is still on the front of your shin, screen facing forward.
3. Tap to re-zero at center before each leg.

**New:**

1. Stay in the same chair and the same position.
2. Keep your phone flat on the front of your shin, just below the knee, screen facing forward.
3. With your shin straight up and down, tap Zero before each leg.

### How to Measure
**Old:**

1. Keep your thigh pressed down. Slowly swing your foot OUTWARD - away from your other leg.
2. Stop when you feel a firm stretch or one hip starts to lift. Read the number.
3. Record it. Return to center. Re-zero. Switch legs and repeat.

**New:**

1. Keep your thigh pressed down. Slowly swing your foot OUTWARD, away from your other leg.
2. Stop at a firm stretch or when one hip starts to lift. Hold still until the number locks and chimes.
3. Tap Use this number. Return to center, tap Zero, and repeat with the other leg.

### Common mistake
(unchanged) One hip lifts off the chair.

### Fix
(unchanged) You must stay sitting evenly on both sides. The moment one side lifts, that is your endpoint. Record it.

---

## Shoulder External Rotation (`shoulder_er`)

Meter: YES, grip line: Phone in your hand, lined up with your forearm, on its edge with the screen facing your head.

### Tool line
- **Old:** iPhone: Measure -> Level. Android: Simple Inclinometer. Seated in chair.
- **New:** Your phone. Seated in a chair.

### Setup
**Old:**

1. Sit upright. Raise one arm straight out to the side at shoulder height, like a T. Bend your elbow to 90°.
2. Hold your phone in that hand, screen facing toward you. That is your starting position.
3. Tap to zero.

**New:**

1. Sit tall. Raise one arm out to the side at shoulder height, like a T. Bend the elbow to 90° so your forearm points straight ahead.
2. Hold the phone in that hand, lined up with your forearm, long edge toward your fingertips. Turn it on its edge so the screen faces your head.
3. Tap Zero with your other hand.

### How to Measure
**Old:**

1. Keep your elbow in the same spot. Rotate your forearm upward, allowing your shoulder to turn until you feel a strong stretch.
2. Read the number or have a partner read it.
3. Record the number. Re-zero and repeat with the opposite arm.

**New:**

1. Keep your elbow in the same spot. Rotate your forearm up and back until you feel a strong stretch.
2. Hold still: after 2.5 seconds the number locks and chimes. Tap Use this number.
3. Switch arms, tap Zero in the start position, and repeat.

### Common mistake
(unchanged) Your shoulder shrugs up or your elbow drops below shoulder height.

### Fix
(unchanged) Keep your shoulder pressed down and your elbow at the same height the whole time. From the elbow to the shoulder, the arm only rotates - it does not lift up or drop down.

---

## Shoulder Flexion (`shoulder_flex`)

Meter: YES, grip line: Phone in your hand, long edge along your arm, screen facing out to the side.

### Tool line
- **Old:** iPhone: Measure -> Level. Android: Simple Inclinometer. Standing.
- **New:** Your phone. Standing.

### Setup
**Old:**

1. Stand upright with room overhead and your arm hanging relaxed at your side.
2. Hold your phone in your hand with the screen facing toward you.
3. Tap to zero while your arm hangs straight down.

**New:**

1. Stand tall with room overhead and your arm hanging relaxed at your side.
2. Hold the phone in that hand, long edge pointing down along your arm, screen facing out to the side, away from your body.
3. Tap Zero with your other hand while your arm hangs straight down.

### How to Measure
**Old:**

1. Keep your elbow straight. Raise your arm FORWARD and UP as high as you can go.
2. Stop when you cannot go higher without leaning back or shrugging. Read the number.
3. Record it. Shake out your arm. Re-zero. Repeat on the other side.

**New:**

1. Keep your elbow straight. Raise your arm FORWARD and UP as high as you can go.
2. Stop when you cannot go higher without leaning back or shrugging. Hold still until the number locks and chimes.
3. Tap Use this number. Lower your arm, tap Zero, and repeat on the other side.

### Common mistake
(unchanged) Leaning your upper body backward or shrugging your shoulder to get the arm higher.

### Fix
(unchanged) Keep your body tall and still. The moment your back starts to arch or your shoulder creeps up toward your ear, that is your true end range. Record it there.

---

## Cervical Lateral Flexion (`cervical_lat`)

Meter: YES, grip line: Phone flat on your forehead, screen facing forward.

### Tool line
- **Old:** iPhone: Measure -> Level. Android: Simple Inclinometer. Seated in chair.
- **New:** Your phone. Seated in a chair.

### Setup
**Old:**

1. Sit upright in a chair. Feet flat. Back straight.
2. Press your phone flat against your FOREHEAD, screen facing forward away from your face.
3. Tap to zero while looking straight ahead.

**New:**

1. Sit upright in a chair. Feet flat. Back straight.
2. Tap Zero, then press your phone flat against your FOREHEAD, screen facing forward, away from your face.
3. Look straight ahead and hold still. It zeroes after 3 seconds with a soft tick.

### How to Measure
**Old:**

1. Tilt your ear toward your left shoulder as far as it will go. Keep your shoulder pressed down.
2. Read the number. Re-zero. Tilt your ear toward your right shoulder. Read and record both sides.

**New:**

1. Tilt your ear toward your left shoulder as far as it will go. Keep your shoulder pressed down. Hold still until the number locks and chimes.
2. Tap Use this number. Then tap Zero the same way and tilt toward your right shoulder.

### Common mistake
(unchanged) Shrugging your shoulder up to meet your ear.

### Fix
(unchanged) Keep both shoulders pressed down the whole time. Only your head moves. If your shoulder rises, that reading does not count.

---

## Cervical Flexion + Extension (`cervical_flex_ext`)

Meter: YES, grip line: Phone flat against the side of your head at the temple, screen facing the wall beside you.

### Tool line
- **Old:** iPhone: Measure -> Level. Android: Simple Inclinometer. Seated in chair.
- **New:** Your phone. Seated in a chair.

### Setup
**Old:**

1. Sit upright in a chair. Feet flat. Back straight.
2. Press your phone flat against the SIDE of your head at the temple, screen facing the wall beside you.
3. Tap to zero while looking straight ahead.

**New:**

1. Sit upright in a chair. Feet flat. Back straight.
2. Tap Zero, then press your phone flat against the SIDE of your head at the temple, screen facing the wall beside you.
3. Look straight ahead and hold still. It zeroes after 3 seconds with a soft tick.

### How to Measure
**Old:**

1. Flexion: Drop your chin toward your chest as far as it will go. Read the number. Record it.
2. Re-zero. Extension: Lift your chin toward the ceiling as far as it will go. Read the number. Record it.

**New:**

1. Flexion: Drop your chin toward your chest as far as it will go. Hold still until the number locks and chimes. Tap Use this number.
2. Extension: Look straight ahead, tap Zero the same way, then lift your chin toward the ceiling as far as it will go. Hold until it locks and tap Use this number.

### Common mistake
(unchanged) Moving your whole upper body forward or backward instead of just your head and neck.

### Fix
(unchanged) Your shoulders and torso stay still. Only your head moves. If your back starts to round or arch, stop there.

---

## Hip Flexion (Straight-Leg Raise) (`hip_flex`)

Meter: YES, grip line: Phone flat on the outer side of your thigh, midway between hip and knee, screen facing out.

### Tool line
- **Old:** iPhone: Measure -> Level. Android: Simple Inclinometer. Lying on the floor. A partner is helpful.
- **New:** Your phone. Lying on the floor. A partner is helpful.

### Setup
**Old:**

1. Lie flat on your back on the floor with both legs straight.
2. Hold your phone flat against the outer side of your thigh (the surface facing away from your other leg), midway between your hip and your knee. Screen faces outward.
3. Slide one hand under the small of your low back. Tap to zero with your leg flat on the ground.

**New:**

1. Lie flat on your back on the floor with both legs straight.
2. Hold your phone flat against the outer side of your thigh (the surface facing away from your other leg), midway between your hip and your knee. Screen faces outward.
3. Tap Zero, then slide one hand under the small of your low back with your leg flat on the ground. It zeroes after 3 seconds with a soft tick.

### How to Measure
**Old:**

1. Keep the test knee completely straight. Raise that leg as high as you can without bending the knee, and keep your other leg flat on the floor.
2. Keep the phone aligned with your thigh as it rises. Stop when you feel a firm stretch behind the thigh, or sooner when your low back presses down onto your hand. Stop if you feel sharp pain. Read the number.
3. Record it for this leg. Lower the leg slowly. Re-zero. Repeat with the other leg. Each leg gets its own number.

**New:**

1. Keep the test knee completely straight. Raise that leg as high as you can without bending the knee, and keep your other leg flat on the floor.
2. Keep the phone aligned with your thigh as it rises. Stop when you feel a firm stretch behind the thigh, or sooner when your low back presses down onto your hand. Stop if you feel sharp pain. Hold still until the number locks and chimes.
3. Tap Use this number for this leg. Lower the leg slowly. Tap Zero again and repeat with the other leg. Each leg gets its own number.

### Common mistake
(unchanged) Bending the knee as the leg rises, letting the other leg lift, or letting your low back press down or your hips tilt as you go higher.

### Fix
(unchanged) Keep the test leg straight and the other leg flat on the floor. Stop at a firm stretch, not at pain. Stop sooner when your low back presses down onto your hand. If your hips tilt or your knee bends, redo the lift and read the number again.

---

## Hip Abduction (`hip_abd`)

Meter: YES, grip line: Phone flat on the front of your thigh, screen facing forward, long edge along the thigh.

### Tool line
- **Old:** iPhone: Measure -> Level. Android: Simple Inclinometer. Standing.
- **New:** Your phone. Standing.

### Setup
**Old:**

1. Stand upright with something nearby you can grab for balance if needed.
2. Hold your phone flat against the front of your thigh with your same side hand, screen facing away from you.
3. Tap to zero while standing straight, weight even on both feet.

**New:**

1. Stand upright with something nearby you can grab for balance if needed.
2. Tap Zero, then hold your phone flat against the front of your thigh with your same-side hand. The screen faces forward, away from you, and the long edge runs along your thigh.
3. Stand straight with your weight even on both feet and hold still. It zeroes after 3 seconds with a soft tick.

### How to Measure
**Old:**

1. Lift your test leg sideways, out away from your body. Keep your toes pointing forward the whole time.
2. Stop just before your upper body starts to lean to the opposite side or your hip hinges backward. Read the number.
3. Record it. Lower the leg. Re-zero. Repeat on the other side.

**New:**

1. Lift your test leg sideways, out away from your body. Keep your toes pointing forward the whole time.
2. Stop just before your upper body starts to lean to the opposite side or your hip hinges backward. Hold still until the number locks and chimes.
3. Tap Use this number. Lower the leg, tap Zero again, and repeat on the other side.

### Common mistake
(unchanged) Leaning your torso away or letting the hip hinge backward to get the leg higher.

### Fix
(unchanged) Your torso stays upright and your hip stays directly under you. The moment either shifts, you have hit your true end range.

---

## Lumbar Flexion + Extension (`lumbar`)

Meter: NO (typed entry only)

### Tool line
(unchanged) iPhone: Measure -> Level. Android: Simple Inclinometer. Standing + Floor.

### Setup
(unchanged)
1. Flexion is standing. Extension is on the floor face down.
2. Flexion setup: Stand straight, feet shoulder-width apart. Hold your phone at your side, screen facing away. Make sure to zero before you start.
3. Extension setup: Lie face down on the floor. Place one hand under your shoulder for the press-up. Hold your phone at your side with your other hand, screen facing away. Zero lying flat.

### How to Measure
(unchanged)
1. Flexion: Keep your legs straight. Slowly bend forward with your back flat. Stop when you feel a strong stretch in the back of your legs. Read the number.
2. Extension: Press up on one arm into a cobra, keeping your hips flat on the floor. Read the number at your end range.

### Common mistake
(unchanged) Rounding the back to get lower on flexion, or letting your hips lift off the floor during the cobra.

### Fix
(unchanged) For flexion, the stretch in the back of your legs is your true stopping point. For extension, your hips stay flat on the floor the entire time - only your chest rises.

---

## Ankle Dorsiflexion (Knee-to-Wall, cm) (`ankle_df`)

Meter: NO (typed entry only)

### Tool line
(unchanged) Tape measure or ruler. A slip of paper (to check your heel). Standing knee-to-wall test. Measure in centimeters (cm).

### Setup
(unchanged)
1. Remove your shoes. Stand barefoot facing a wall with a tape measure on the floor pointing straight out from the wall.
2. Line up the middle of your heel and your second toe along the tape, so your foot points straight at the wall.
3. Place the tip of your big toe at the 10 cm mark on the tape to start. Your hands may rest on the wall.

### How to Measure
(unchanged)
1. Bend the knee over the test foot and drive it forward toward the wall, over your second and third toes. Do not let the knee cave inward. Keep your heel flat on the floor.
2. Check your heel: it should stay down the whole time. A slip of paper under the heel should stay pinched, or ask a friend to watch.
3. Move your foot closer or farther from the wall until you find the farthest spot where your knee still just touches the wall with the heel down. Measure from the wall to the tip of your big toe. Record it in centimeters (cm), not degrees.
4. Do 3 tries on this foot and record the best one (the farthest distance that still counts). Repeat with the other foot.

### Common mistake
(unchanged) Your heel lifts off the floor, or your knee drifts inward or outward as it drives forward.

### Fix
(unchanged) Keep your eye on your heel and your knee over your second and third toes. If your heel lifts even slightly, that try does not count. Move your foot closer to the wall and try again.

---

## Setup screen (before the steps)

### Subtitle
- **Old:** 15 minutes - Smartphone inclinometer - No equipment needed
- **New:** 15 minutes - Your phone is the meter - No equipment needed

### Method box
- **Old:** The method in 4 words: Place. Zero. Move. Read. / Hold phone flat against the body part. Tap screen to zero it. Move slowly to your end range. Read the number - ignore any minus sign. Each step tells you exactly where to hold the phone and which direction to move.
- **New:** The method in 4 words: Place. Zero. Move. Hold. / Hold the phone against the body part as shown. Tap Zero in the start position. Move slowly to your end range, then hold still until the number locks. Each step tells you exactly where to hold the phone and which direction to move.

### Before you start items
**Old:**

- **iPhone:** Open the Measure app (pre-installed on all iPhones). Tap Level at the bottom. You will see a number in degrees that changes as you tilt the phone - that is your angle.
- **Android:** Download "Simple Inclinometer" by Syleos Apps, free on Google Play. Open it and you will see your angle in degrees, just like a digital level.
- **Partner (recommended):** A partner makes this much easier - they hold the phone and read the angle while you focus on moving. You can do it solo using the screenshot tip on each step.
- **Warm up first - 5 minutes:** 1) Walk or march in place for 2 minutes. 2) Arm circles - 10 forward, 10 backward. 3) Hip circles - big loops with your hips like a hula hoop, 10 each way. 4) Leg swings - hold a wall, swing each leg front-to-back 10 times then side-to-side 10 times. 5) Slow neck turns - look left and right, 5 times each way. Wear shorts and a t-shirt.
- **Solo tip:** When you cannot tap the screen: say "Hey Siri, take a screenshot" (iPhone) or "Hey Google, take a screenshot" (Android). Read the number right after.
- **Skip is always OK:** If a position is too difficult or you need a partner for a step and do not have one, tap Skip. Your score is based on what you completed. You can always come back and fill in any skipped measurements later.

**New:**

- **Your phone is the meter:** On each angle step, tap Measure with phone and allow motion access if asked. Hold the phone where the step shows, tap Zero, move, and hold still. The number locks with a soft chime. Tap Use this number to fill it in. Turn your ringer on to hear the chime.
- **Typing is always OK:** You can type any number yourself. If the phone meter is not available, use the Measure app (tap Level) on iPhone or the free "Simple Inclinometer" app by Syleos Apps on Android, then type the number. The low back step uses one of these apps.
- **Partner (recommended):** A partner makes this much easier - they hold the phone and tap the buttons while you focus on moving.
- **Warm up first - 5 minutes:** 1) Walk or march in place for 2 minutes. 2) Arm circles - 10 forward, 10 backward. 3) Hip circles - big loops with your hips like a hula hoop, 10 each way. 4) Leg swings - hold a wall, swing each leg front-to-back 10 times then side-to-side 10 times. 5) Slow neck turns - look left and right, 5 times each way. Wear shorts and a t-shirt.
- **Solo tip:** Cannot see the screen at the end of a move? Just hold still. The number locks and chimes, so you can read it after you return.
- **Skip is always OK:** If a position is too difficult or you need a partner for a step and do not have one, tap Skip. Your score is based on what you completed. You can always come back and fill in any skipped measurements later.

### Bottom tip on each step
- **Old (all steps):** 📸 Can't tap the screen? Say "Hey Siri, take a screenshot" (iPhone) or "Hey Google, take a screenshot" (Android).
- **New (meter steps on a phone):** 🔒 Can't see the screen at the end? Hold still. The number locks and chimes, so you can read it after.
- **New (typed-only degree steps, or desktop):** the old screenshot tip (unchanged). Ankle (cm): no tip.

## Phone meter UI strings (new, `app/src/lib/meterCopy.ts`)

- `measureButton`: 'Measure with phone'
- `closeButton`: 'Close'
- `measuringPrefix`: 'Measuring'
- `startButton`: 'Start sensor'
- `startNote`: 'Your phone may ask to use motion. Tap Allow.'
- `starting`: 'Starting the sensor...'
- `zeroButton`: 'Zero'
- `resetButton`: 'Reset'
- `useButton`: 'Use this number'
- `peakLabel`: 'Peak'
- `lockedPrefix`: 'Locked'
- `needZero`: 'Get into the start position and tap Zero.'
- `needZeroDelayed`: (s: number) => `Tap Zero, then get into the start position. It zeroes in ${s} seconds.`
- `zeroCountdown`: (s: number) => `Zeroing in ${s}...`
- `live`: 'Move slowly to your end range, then hold still.'
- `holding`: 'Hold still...'
- `locked`: 'Locked. Tap Use this number, or Reset to measure again.'
- `savedThenNext`: (prev: string, val: number, next: string) => `${prev} saved: ${val}°. Now ${next}: tap Zero in the start position.`
- `denied`: 'Motion access is off, so type your number in the box. To use the phone meter on iPhone, reload this page, tap Start sensor, and tap Allow.'
- `error`: 'The phone meter did not start. Tap Start sensor again, or type your number in the box.'
- `noData`: 'This device is not sending motion readings, so type your number in the box.'
- `desktopNote`: 'Type your numbers here. On a phone, you can also measure with the phone itself.'
- `manualPlaceholder`: 'Type'
- `manualAria`: (label: string) => `${label}, type your number`

Also shown: 'Normal: a-b°' labels and band chips (unchanged), the 'Locked: X°' badge, Peak value.

## Not changed, flagged
- The done and lead-done screens still say **'Personal Readiness Profile'** (existing copy, also in the lead email). Rule says 'Protocol', never 'Profile'. Not changed here because it is product naming outside the meter; please decide.
- Lumbar step still names the Measure app and Simple Inclinometer (typed-only step).
