# Base assessment ROMeter (phone meter): customer strings for review

Branch `feat/base-inclinometer-20261005` (romrx-io-web). Old = main 600a2a4, New = this branch. Draft only, not live.

Reviewers: **Stacy** (legal and claims: no accuracy, medical or diagnostic claims) and **Quinn** (kinesiology: is the phone placement anatomically right for each joint, and does a phone angle measure that joint well).

Rules applied: plain, goal-first, American spelling, no em dashes, no accuracy or medical claims, 'Protocol' never 'Profile'. Unchanged strings are marked (unchanged). Scoring, bands, ranges and 'Normal: a-b' labels are not changed.

Sources: step copy in `app/src/pages/assessmentSteps1.ts`, `assessmentSteps2.ts`, `app/src/lib/hipFlexCopy.ts` (hip flexion, Stacy-pinned phrases kept word for word); meter UI strings in `app/src/lib/meterCopy.ts`; setup screen in `app/src/pages/assessmentMeta.ts` and `AssessmentPhases.tsx`.




## ROMeter rename (Stacy cleared, Oct 6 2026, ROMETER-STACY-CLEAR-20261006.md)
- Turn on the meter -> **Turn on the ROMeter**; Turning on the meter... -> **Turning on the ROMeter...**; denied: To use the meter -> **To use the ROMeter**; in-app: The meter may not work -> **The ROMeter may not work**; Can't use the meter? -> **Can't use the ROMeter?** (straight swaps PASS)
- Meter error: **The ROMeter did not start. Tap the button again, or type your number in the box.** PASS
- Setup tip label: Your phone is the meter -> **Meet the ROMeter** PASS
- Setup subtitle: 15 minutes - Your phone is the meter - No equipment needed -> **15 minutes - Uses the ROMeter on your phone - No equipment needed** PASS
- Desktop note: -> **Type your numbers here. On a phone, you can also use the ROMeter.** PASS
- Kept: **Measure with phone** (Stacy: clearest action, no script change). Older entries below this point that still say "meter" are history.

## Simple layout + ROMeter page (Stacy PASS, Oct 6 2026, 11:43 AM)
- More help toggle (meter steps; holds How to Measure, Common mistake and the lock tip): **More help** PASS
- Locked badge, no number (the big number below shows the value): **Locked** PASS
- ROMeter page (`app/src/lib/rometerCopy.ts`), all eight plan lines PASS exactly as written: tab/title **ROMeter**; subtitle **A quick angle check with your phone.**; intro **Hold your phone against the part that moves, then measure how far it goes.**; meter header **ROMeter**; grip **Hold the phone flat against the part that moves.**; locked line **Locked. Tap Reset or Start to measure again.**; **This does not change your assessment or your score.**; desktop **Open this page on your phone to use the ROMeter.** (Tilt line, privacy and disclaimer were already PASS.)
- Guardrail (Stacy): Setup and any not-medical-advice or warm-up text stay visible, never under More help. A meter step whose How to Measure or Common mistake has safety wording (Hip Flexion: "Stop if you feel sharp pain.", "Stop at a firm stretch, not at pain.") keeps those open with no More help. Test: `app/src/lib/moreHelpGuard.test.tsx`.

## OVERNIGHT BUILD, Oct 5-6 2026 (3 AM preview): exact strings for Stacy's final pass

Update Oct 6 (Jim, real iPhone test): the countdown now shows and ticks 5, 4, 3, 2, 1, then GO at 5 s. Sounds: tick 940 Hz, about 0.11 s; GO 1320 Hz, higher, louder and longer; lock ding 1760 Hz. Older sections below that mention 480 Hz or 880 Hz are history. No other strings changed.

Legend: **[STACY]** = verbatim from METER-STRINGS-STACY-PRECLEAR-20261005.md (already passes). **[NEW]** = new or changed wording outside her list (check one by one). **[QUINN]** = Quinn's grip/range sign-off wording.

### Meter panel (lib/meterCopy.ts)
| Where | String | Status |
|---|---|---|
| Button that asks for motion | Turn on the ROMeter | [STACY] |
| While asking | Turning on the ROMeter... | [STACY] |
| Under that button | Your phone may ask to use motion. Tap Allow. | [STACY] |
| Under that button | Sound on, volume up. Turn off silent mode to hear the beeps. | [STACY] (keep only "Sound on, volume up." if Reid shows iPhone beeps play in silent mode) |
| Countdown button (was Zero) | Start | [STACY] |
| Other buttons | Reset / Use this number / Close / Peak / Locked: X° / Measure with phone | [STACY] PASS |
| Before Start | Tap Start, then hold the start position while it counts down from 5. | [STACY] rule ("tap Zero" -> "tap Start"; "counts down from 5" PASS) |
| Big number during countdown | 5, 4, 3, 2, 1, then GO | [NEW] (a tick on each number at 0, 1, 2, 3, 4 s; zero and GO at 5 s; Jim, Oct 6) |
| Under the big number while counting | Hold still... | [STACY] |
| At zero / live | GO. Move slowly to your end range, then hold still. | [STACY] |
| Holding (bar filling) | Hold still... | as drafted |
| Locked | Locked. Tap Use this number, or Reset to measure again. | as drafted |
| After Use, collapsed card | Saved: Left 48° (Saved: Right 55°, Saved: Left leg 70°, Saved: Flexion 50°) | [STACY] (+ mirrored labels) |
| Meter moves to next side | Right side ready. Get in position and tap Start. / Left side ready. Get in position and tap Start. | [STACY] |
| Next side on SLR / neck flex-ext | Right leg ready. Get in position and tap Start. / Extension ready. Get in position and tap Start. | [NEW] (mirror of her line for non Left/Right labels) |
| Both done | Both sides saved. | [STACY] |
| Both done, neck flexion + extension | Both saved. | [NEW] |
| Link on a saved card | Measure again | [NEW] |
| Tag on the side that is next | Up next | [NEW] |
| Motion denied | Motion access is off. Type your number in the box. To use the ROMeter, close and reopen your browser, then tap Allow when asked. | [STACY] (Reid/Avery to confirm on a real iPhone) |
| Instagram / Facebook browser (shown up front in the meter, and instead of the denied/no-data line) | The ROMeter may not work inside Instagram or Facebook. Open this page in Safari or Chrome, or type your number in the box. | [STACY] |
| Meter error | The ROMeter did not start. Tap the button again, or type your number in the box. | [STACY] rule (as drafted, button renamed) |
| No readings | This device is not sending motion readings, so type your number in the box. | as drafted |
| Desktop | Type your numbers here. On a phone, you can also measure with the phone itself. | as drafted |
| Range label (every step that shows one) | Typical range: X-Y° | [STACY] (Quinn suggested "29 to 43°"; Stacy's dash form used) |
| Range source line under the inputs | Source: Simoneau et al., 1998 / Source: Vairo et al., 2012 / Source: Gill et al., 2020 | [QUINN] format, [NEW] for Stacy |
| My Body, flag ON, no lumbar value | Low back: not measured | [STACY] |

### Ranges shown (Quinn verified; Grant: SLR no number)
| Step | Shown | Source line |
|---|---|---|
| Hip ER | Typical range: 29-43° | Source: Simoneau et al., 1998 |
| Hip IR | Typical range: 26-40° | Source: Simoneau et al., 1998 |
| Shoulder ER | Typical range: 85-110° | Source: Vairo et al., 2012 |
| Shoulder flexion | Typical range: 140-180° | Source: Gill et al., 2020 |
| Neck side bend, neck flexion, neck extension, hip abduction | no number, no source | - |
| Straight-leg raise | no number, no source (SHOW_SLR_TYPICAL_RANGE = false; label "Saved for each leg" + "Saved for each leg, not scored." as before) | - |
| Ankle (cm) | Best of 3, in cm (unchanged) | - |
Range labels are display only: scoring still uses JOINT_SCORE_TARGETS (unchanged).

### Method line options (setup screen)
- **Live on the preview (Grant's plan, Stacy PASS 11:30 PM): Option A:** Tap Start and hold still for the beeps. Move on GO. Hold at your limit until the ding.
- Alternate for Jim, Option B (Grant, Stacy PASS): Start. Beeps. Go. Hold for the ding.
- Alternate for Jim, Stacy's pre-clear line: Get in position. Tap Start. Hold still for the countdown. Move on GO. Hold until the ding.
- (Earlier Avery draft, not cleared, not used: Place the phone. Tap Start. Hold still for the beeps. Move on GO. Hold at your limit until the ding.)
- Old: The method in 4 words: Place. Zero. Move. Hold. (+ paragraph). Now one sub-line: "Each step shows where to hold the phone and which way to move." [NEW]

### Kept on purpose tonight (Stacy: PASS if kept, or Sunday)
- Step header "Enter your measurements" -> **"Your measurements"** on every step (Stacy pre-clear optional, line 30; Grant: use it). "Record it" x3 in tips: kept (Stacy PASS). Typed-fallback line "Can't use the meter? Type your number in the box." kept (Stacy's line).
- Setup tip "Your phone is the meter" (Reid, Oct 5): countdown sentence removed so it no longer repeats the Option A method line. Now: "On each angle step, tap Measure with phone and allow motion access if asked. Hold the phone where the step shows. Tap Use this number to fill it in. Sound on, volume up. Turn off silent mode to hear the beeps." (removal only, no new wording)
- Behavior (no copy change): "Use this number" is disabled from the Start tap, through the countdown and GO, until the number locks; Reset unlocks and disables it again. Typing stays available.
- "Personal Readiness Profile" on done screens + lead email: NOT changed (Sunday Protocol pass).
- Setup box label "Typing is always OK" kept; its text is Stacy's line. (Both this box and the second-person box were removed Oct 6, see the 12:12 / 12:13 update at the end.)
- Low-back step (only visible when the low-back flag is OFF, i.e. production at the 6 AM ship; with the flag ON it is gone). Grant call: names no app. Stacy PASS, Oct 5 11:32 PM:
  | Line | Old | New |
  |---|---|---|
  | Tool | iPhone: Measure -> Level. Android: Simple Inclinometer. Standing + Floor. | Type this one in for now. Use any level you have to read the angle. Standing + Floor. |
  | Flexion setup (end) | Make sure to zero before you start. | Set your level to 0 while you stand straight. |
  | Extension setup (end) | Zero lying flat. | Set your level to 0 while you lie flat. |
  | Flexion how-to (end) | Read the number. | Note the angle at that point. |
  | Extension how-to (end) | Read the number at your end range. | Note the angle at your end range. |
  | Range label | Normal: 40-80° / 20-30° | none (no source; a typical range shows only where rangeSource exists) |
  Grip ("Hold your phone at your side, screen facing away") unchanged: Quinn's call (a phone in a hanging hand reads about 0).

### Full step text as built (draft, low-back flag ON)
#### Method line (setup screen)
- Tap Start and hold still for the beeps. Move on GO. Hold at your limit until the ding.
- (sub-line) Each step shows where to hold the phone and which way to move.

#### Setup boxes (changed ones)
- **Meet the ROMeter**: On each angle step, tap Measure with phone and allow motion access if asked. Hold the phone where the step shows. Tap Use this number to fill it in. Sound on, volume up. Turn off silent mode to hear the beeps.
- **Typing is always OK**: Can't use the ROMeter? Type your number in the box.
- **Partner (optional)**: A partner can help. They hold the phone and tap the buttons while you move.

- **Your phone is the meter**: On each angle step, tap Measure with phone and allow motion access if asked. Hold the phone where the step shows. Tap Use this number to fill it in. Sound on, volume up. Turn off silent mode to hear the beeps.
- **Typing is always OK**: Can't use the meter? Type your number in the box.
- (Second-person setup box: removed, Jim Oct 6 12:13 PM.)

#### Hip External Rotation (`hip_er`)
- Meter grip: Phone flat on your inner calf, just below the knee. Screen faces your other leg, long edge along the calf. **[Stacy PASS Oct 6 11:45]**
- Setup:
  1. Sit tall in a firm chair with both feet flat on the floor and your knees bent to 90°.
  2. Move your other knee out to the side and tuck that foot back, out of the way. **[Stacy PASS Oct 6, word for word]**
  3. Hold your phone flat on your INNER calf, just below the knee. The screen faces your other leg and the long edge runs along your calf. **[Stacy PASS Oct 6 11:45]**
  4. Press the phone flat against your leg with your hand the whole time. **[Stacy PASS Oct 6, word for word]**
  5. Tap Start, then hold your lower leg straight up and down and stay still while it counts down from 5. It zeroes at the end. **[Stacy PASS Oct 6 11:45]**
- How to Measure:
  1. Keep your knee bent and both hips down. Slowly swing your foot INWARD, toward your other leg. Your foot moves only sideways.
  2. Stop at a firm stretch or when your thigh starts to lift off the chair. Hold still: after 2.5 seconds the number locks and chimes.
  3. Tap Use this number. Return to center, tap Start, and repeat with the other leg.
- Range label: Typical range: 29-43° | Source line: Source: Simoneau et al., 1998

#### Hip Internal Rotation (`hip_ir`)
- Meter grip: Phone flat on the front of your shin, just below the knee. Screen faces forward, long edge along the shin.
- Setup:
  1. Stay in the same chair and the same position.
  2. Keep your phone flat on the front of your shin, just below the knee, screen facing forward.
  3. Before each leg, tap Start and hold your shin straight up and down while it counts down from 5.
- How to Measure:
  1. Keep your knee bent and both hips down. Slowly swing your foot OUTWARD, away from your other leg. Your foot moves only sideways.
  2. Stop at a firm stretch or when your other hip starts to lift. Hold still until the number locks and chimes.
  3. Tap Use this number. Return to center, tap Start, and repeat with the other leg.
- Range label: Typical range: 26-40° | Source line: Source: Simoneau et al., 1998

#### Shoulder Extension (`shoulder_er`) (tucked elbow, lying on your back; Jim, Oct 6 11:45 AM)
- Title shown to users: Shoulder Extension **[Stacy: not a claims issue; before ship it needs one name everywhere (header, MyProtocol.tsx:128, ResultsPreview.tsx:44, mobilityBands.ts:553, ROMBot). Waiting for Jim's final title.]** (was: Shoulder External Rotation; Jim, Oct 6 11:56 AM). Key `shoulder_er` unchanged.
- Meter grip: Phone in that hand, along your forearm like a ruler, on its edge, screen facing your head. Wrist straight and stiff. **[Stacy PASS Oct 6 11:55]**
- Setup:
  1. Lie on your back on the floor with your knees bent and feet flat. Keep your elbow on the floor, tucked in at your side, and bend it so your forearm points at the ceiling. **[Stacy PASS Oct 6 11:55]**
  2. Hold the phone in that hand along your forearm like a ruler: thumb on one long edge, fingers on the other, top edge in line with your knuckles. Turn it on its edge so the screen faces your head. Keep your wrist straight and stiff the whole time. **[Stacy PASS Oct 6 11:55]**
  3. Tap Start with your other hand, then hold this start position while it counts down from 5.
- How to Measure:
  1. Keep your elbow on the floor, tucked in at your side. Let your hand fall slowly outward, away from your body, toward the floor. Stop at a strong stretch or when your elbow starts to slide away from your side. **[Stacy PASS Oct 6 11:55]**
  2. Hold still at your limit: after 2.5 seconds the number locks and chimes. Tap Use this number. **[Stacy PASS Oct 6 11:55]**
  3. Switch arms, tap Start in the start position, and repeat.
- Range label: Typical range: 40-75° | Source line: Source: Gill et al., 2020 **[NOT Stacy-cleared: Quinn says Gill measured standing and 40-75 is a derived mean ± SD]** (label kept as is, Jim's call)

#### Shoulder Flexion (`shoulder_flex`) (sitting in a chair with a back; Jim, Oct 6 11:54 AM)
- Tool: Your phone. Sitting in a chair with a back. **[Stacy PASS Oct 6 12:02]**
- Meter grip: Phone in that hand, standing on its long side, in line with your arm. Screen faces out, away from your body. **[Stacy PASS Oct 6 12:02]**
- Setup:
  1. Sit tall with your back against the chair and your feet flat. Let your arm hang straight down by your side, palm facing your body, thumb forward. **[Stacy PASS Oct 6 12:02]**
  2. Hold the phone in that hand, standing on its long side, in line with your arm. The screen faces out, away from your body. **[Stacy PASS Oct 6 12:02]**
  3. Tap Start with your other hand, then let your arm hang straight down and hold still while it counts down from 5. It zeroes at the end. **[Stacy PASS Oct 6 12:02]**
  4. Keep your arm straight, your elbow locked and your back against the chair the whole time. **[Stacy PASS Oct 6 12:02]** (Jim, Oct 6: always visible in Setup)
- How to Measure:
  1. Keep your arm straight and your elbow locked. Lift your arm forward and straight up over your head, not out to the side. Keep your palm facing in. **[Stacy PASS Oct 6 12:02]**
  2. Stop before your back arches or your shoulder shrugs. Hold still until the number locks and chimes.
  3. Tap Use this number. Lower your arm, tap Start, and repeat on the other side.
- Common mistake: Arching your back or leaning back to get the arm higher. **[Stacy PASS Oct 6 12:02]**
- Fix: Keep your back against the chair. Don't arch your back or lean back. Keep your wrist straight. Don't bend your elbow or turn your arm out. Don't shrug your shoulder up to your ear. **[Stacy PASS Oct 6 12:02]**
- Range label: Typical range: 140-180° | Source line: Source: Gill et al., 2020

#### Cervical Lateral Flexion (`cervical_lat`)
- Meter grip: Phone flat on your forehead, screen facing forward.
- Setup:
  1. Sit upright in a chair. Feet flat. Back straight.
  2. Tap Start, then press your phone flat against your FOREHEAD, screen facing forward, away from your face.
  3. Look straight ahead. Hold still while it counts down from 5 with a soft beep each second. It zeroes at the end.
- How to Measure:
  1. Nose points forward and chin stays level. Tilt your ear toward your left shoulder as far as it will go. Shoulders down, body still. Hold still until the number locks and chimes.
  2. Tap Use this number. Then tap Start the same way and tilt toward your right shoulder.
- Range label: none (no number shown)

#### Cervical Flexion + Extension (`cervical_flex_ext`)
- Meter grip: Phone flat against the side of your head at the temple, screen facing the wall beside you.
- Setup:
  1. Sit upright in a chair. Feet flat. Back straight.
  2. Tap Start, then press your phone flat against the SIDE of your head at the temple, screen facing the wall beside you.
  3. Look straight ahead. Hold still while it counts down from 5 with a soft beep each second. It zeroes at the end.
- How to Measure:
  1. Back stays against the chair. Only your head nods. Chin down (Flexion): Drop your chin toward your chest as far as it will go. Hold still until the number locks and chimes. Tap Use this number. **[Stacy PASS Oct 6 11:55]**
  2. Chin up (Extension): Look straight ahead, tap Start the same way, then lift your chin toward the ceiling as far as it will go. Hold until it locks and tap Use this number. **[Stacy PASS Oct 6 11:55]**
- Range label: none (no number shown)

#### Hip Flexion (Straight-Leg Raise) (`hip_flex`)
Jim, Oct 6 12:07 PM (decided): every hand / low back reference removed from this step. Title, why, tool, per-leg fields and range unchanged.
- Meter grip: Phone on your mid-thigh. **[Stacy PASS Oct 6 12:07]**
- Setup:
  1. Lie flat on your back, legs straight out, knees touching the floor. **[Stacy PASS Oct 6 12:07]**
  2. Place your phone on your mid-thigh. **[Stacy PASS Oct 6 12:07]**
  3. Tap Start, then keep your leg flat on the ground and hold still while it counts down from 5 with a soft beep each second. It zeroes at the end. **[Stacy PASS Oct 6 12:07]**
- How to Measure:
  1. Lift one leg and keep it straight until you can't anymore. **[Stacy PASS Oct 6 12:07]**
  2. Pause for 2.5 seconds so the meter can lock in the range. **[Stacy PASS Oct 6 12:07]**
  3. Tap Use this number for this leg. Lower the leg slowly. Tap Start again and repeat with the other leg. Each leg gets its own number. **[Stacy PASS Oct 6 12:07]**
- Common mistake: Your hips start coming up, or you shift in any other way. **[Stacy PASS Oct 6 12:07]**
- Fix: Keep your hips down and your body still. If you shift, redo the lift. **[Stacy PASS Oct 6 12:07]**
- No stop or safety line remains on this step (Jim's copy replaced both fields that had one). See SHIP BLOCKERS at the end of this doc.
- Range label: Typical range: 60-80° / Source: Youdas et al., 2005 (unchanged)

#### Hip Abduction (`hip_abd`)
- Meter grip: Standing. Phone flat on the outer side of your thigh, screen facing out, long edge along the thigh.
- Setup:
  1. Stand upright with something nearby you can grab for balance if needed.
  2. Tap Start, then hold your phone flat against the OUTER side of your thigh, midway between your hip and your knee, with your same-side hand. The screen faces out to the side and the long edge runs along your thigh.
  3. Stand straight with your weight even on both feet. Hold still while it counts down from 5 with a soft beep each second. It zeroes at the end.
- How to Measure:
  1. Toes forward. Lift your test leg straight out to the side. No lean, no forward drift, no turning out.
  2. Stop just before your upper body starts to lean to the other side or your hips push back. Hold still until the number locks and chimes. **[Stacy PASS Oct 6 11:55]**
  3. Tap Use this number. Lower the leg, tap Start again, and repeat on the other side.
- Range label: none (no number shown)

#### Ankle Dorsiflexion (Knee-to-Wall, cm) (`ankle_df`) (typed only)
- Setup:
  1. Remove your shoes. Stand barefoot facing a wall with a tape measure on the floor pointing straight out from the wall.
  2. Line up the middle of your heel and your second toe along the tape, so your foot points straight at the wall.
  3. Place the tip of your big toe at the 10 cm mark on the tape to start. Your hands may rest on the wall.
- How to Measure:
  1. Bend the knee over the test foot and drive it forward toward the wall, over your second and third toes. Do not let the knee cave inward. Keep your heel flat on the floor.
  2. Check your heel: it should stay down the whole time. A slip of paper under the heel should stay pinched.
  3. Move your foot closer or farther from the wall until you find the farthest spot where your knee still just touches the wall with the heel down. Measure from the wall to the tip of your big toe. Record it in centimeters (cm), not degrees.
  4. Do 3 tries on this foot and record the best one (the farthest distance that still counts). Repeat with the other foot.
- Range label: none (screen shows "Best of 3, in cm")


## Questions for Quinn
1. **Lumbar flexion and extension: left as typed entry only (no phone meter).** One phone measures whole-trunk tilt, which mixes hip and low-back motion, and the current setup ('hold your phone at your side') is ambiguous. Recommend keeping it typed only until there is a placement you approve (for example sacrum plus T12 with two readings).
2. **Ankle dorsiflexion** stays knee-to-wall in cm (typed only). Not an angle.
3. **The meter reads the gravity angle since Zero.** It measures rotation about any horizontal axis and ignores compass heading. Movement in a second plane (for example hip flexion mixed into hip abduction, or trunk lean) adds to the number. Please confirm each grip keeps the movement in one plane.
4. **Shoulder ER and flexion: the phone is held in the hand**, lined up with the forearm or arm. Wrist bend adds error. Is a hand grip acceptable, or should it be strapped to the forearm?
5. **Zero is a 5-4-3-2-1 countdown on every meter step** (Jim, Oct 5, 10:26 PM): a soft 480 Hz tick on each number, then it zeroes at the start position. This lets you get into position with the screen out of view.
6. **Hip ER and IR (seated):** Hip ER now has the phone flat on the inner calf, screen facing the other leg (Jim, Oct 6, 11:36 AM: it can slip on the shin as the foot moves inward). The lower leg now swings about an axis in the plane of the screen; the meter reads the gravity angle since zero, so the number is the same as on the shin. Hip IR still has the phone flat on the front of the shin with the screen forward, so the shin swings in the plane of the screen (unchanged until Jim decides). Please confirm both.

## Movements (in assessment order)

| # | Movement | Fields (L/R or parts) | Old input | New input | Grip in the meter |
|---|---|---|---|---|---|
| 1 | Hip External Rotation | Left (hip_er_l, °), Right (hip_er_r, °) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Phone meter (Measure with phone) + typed box | Phone flat on your inner calf, just below the knee. Screen faces your other leg, long edge along the calf. **[Stacy PASS Oct 6 11:45]** |
| 2 | Hip Internal Rotation | Left (hip_ir_l, °), Right (hip_ir_r, °) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Phone meter (Measure with phone) + typed box | Phone flat on the front of your shin, just below the knee. Screen faces forward, long edge along the shin. |
| 3 | Shoulder External Rotation | Left (shoulder_er_l, °), Right (shoulder_er_r, °) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Phone meter (Measure with phone) + typed box | Phone in your hand, lined up with your forearm, on its edge with the screen facing your head. |
| 4 | Shoulder Flexion | Left (shoulder_flex_l, °), Right (shoulder_flex_r, °) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Phone meter (Measure with phone) + typed box | Phone in your hand, long edge along your arm, screen facing out to the side. |
| 5 | Cervical Lateral Flexion | Left (cervical_lat_l, °), Right (cervical_lat_r, °) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Phone meter (Measure with phone) + typed box | Phone flat on your forehead, screen facing forward.  |
| 6 | Cervical Flexion + Extension | Flexion (cervical_flex, °), Extension (cervical_ext, °) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Phone meter (Measure with phone) + typed box | Phone flat against the side of your head at the temple, screen facing the wall beside you.  |
| 7 | Hip Flexion (Straight-Leg Raise) | Left leg (hip_flex_l, °), Right leg (hip_flex_r, °) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Phone meter (Measure with phone) + typed box | Phone flat on the outer side of your thigh, midway between hip and knee, screen facing out.  |
| 8 | Hip Abduction | Left (hip_abd_l, °), Right (hip_abd_r, °) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Phone meter (Measure with phone) + typed box | Phone flat on the front of your thigh, screen facing forward, long edge along the thigh.  |
| 9 | Lumbar Flexion + Extension | Flexion (lumbar_flex, °), Extension (lumbar_ext, °) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Typed box only | (none) |
| 10 | Ankle Dorsiflexion (Knee-to-Wall, cm) | Left (ankle_df_l, cm), Right (ankle_df_r, cm) | Typed box (number read from Measure app Level / Simple Inclinometer, or a tape for ankle) | Typed box only | (none) |

---

## Hip External Rotation (`hip_er`)

Meter: YES, grip line: Phone flat on your inner calf, just below the knee. Screen faces your other leg, long edge along the calf. **[Stacy PASS Oct 6 11:45]**

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
2. Move your other knee out to the side and tuck that foot back, out of the way. **[Stacy PASS Oct 6, word for word]**
3. Hold your phone flat on your INNER calf, just below the knee. The screen faces your other leg and the long edge runs along your calf. **[Stacy PASS Oct 6 11:45]**
4. Press the phone flat against your leg with your hand the whole time. **[Stacy PASS Oct 6, word for word]**
5. Tap Zero, then hold your lower leg straight up and down and stay still while it counts down from 5. It zeroes at the end. **[Stacy PASS Oct 6 11:45]**

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
- **New:** Same chair. This time, hold the phone flat on the front of your shin. **[Stacy PASS Oct 6 11:45]** (was: Same chair, same phone spot. Only the foot direction changes.)

### Setup
**Old:**

1. Stay in the same chair. Do NOT move your position.
2. Phone is still on the front of your shin, screen facing forward.
3. Tap to re-zero at center before each leg.

**New:**

1. Stay in the same chair and the same position.
2. Keep your phone flat on the front of your shin, just below the knee, screen facing forward.
3. Before each leg, tap Zero and hold your shin straight up and down while it counts down from 5.

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
3. Tap Zero with your other hand, then hold this start position while it counts down from 5.

### How to Measure
**Old:**

1. Keep your elbow in the same spot. Rotate your forearm upward, allowing your shoulder to turn until you feel a strong stretch.
2. Read the number. (old line; second-person clause removed from this history Oct 6)
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
3. Tap Zero with your other hand, then let your arm hang straight down and hold still while it counts down from 5.

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
3. Look straight ahead. Hold still while it counts down from 5 with a soft beep each second. It zeroes at the end.

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
3. Look straight ahead. Hold still while it counts down from 5 with a soft beep each second. It zeroes at the end.

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

Meter: YES, grip line: Phone on your mid-thigh. **[Stacy PASS Oct 6 12:07]** (was: Phone flat on the outer side of your thigh, midway between hip and knee, screen facing out.)

Current copy below is Jim's Oct 6 12:07 PM decision (no hand, no low back). The Old lines are history.

### Tool line
- **Old:** iPhone: Measure -> Level. Android: Simple Inclinometer. Lying on the floor. (plus a second-person sentence, removed Oct 6)
- **New:** Your phone. Lying on the floor. (Jim, Oct 6 12:13 PM: second-person sentence removed)

### Setup
**Old:**

1. Lie flat on your back on the floor with both legs straight.
2. Hold your phone flat against the outer side of your thigh (the surface facing away from your other leg), midway between your hip and your knee. Screen faces outward.
3. Slide one hand under the small of your low back. Tap to zero with your leg flat on the ground.

**New (Jim, Oct 6 12:07 PM):**

1. Lie flat on your back, legs straight out, knees touching the floor. **[Stacy PASS Oct 6 12:07]**
2. Place your phone on your mid-thigh. **[Stacy PASS Oct 6 12:07]**
3. Tap Start, then keep your leg flat on the ground and hold still while it counts down from 5 with a soft beep each second. It zeroes at the end. **[Stacy PASS Oct 6 12:07]**

### How to Measure
**Old:**

1. Keep the test knee completely straight. Raise that leg as high as you can without bending the knee, and keep your other leg flat on the floor.
2. Keep the phone aligned with your thigh as it rises. Stop when you feel a firm stretch behind the thigh, or sooner when your low back presses down onto your hand. Stop if you feel sharp pain. Read the number.
3. Record it for this leg. Lower the leg slowly. Re-zero. Repeat with the other leg. Each leg gets its own number.

**New (Jim, Oct 6 12:07 PM):**

1. Lift one leg and keep it straight until you can't anymore. **[Stacy PASS Oct 6 12:07]**
2. Pause for 2.5 seconds so the meter can lock in the range. **[Stacy PASS Oct 6 12:07]**
3. Tap Use this number for this leg. Lower the leg slowly. Tap Start again and repeat with the other leg. Each leg gets its own number. **[Stacy PASS Oct 6 12:07]**

### Common mistake
**Old:** Bending the knee as the leg rises, letting the other leg lift, or letting your low back press down or your hips tilt as you go higher.

**New (Jim, Oct 6 12:07 PM):** Your hips start coming up, or you shift in any other way. **[Stacy PASS Oct 6 12:07]**

### Fix
**Old:** Keep the test leg straight and the other leg flat on the floor. Stop at a firm stretch, not at pain. Stop sooner when your low back presses down onto your hand. If your hips tilt or your knee bends, redo the lift and read the number again.

**New (Jim, Oct 6 12:07 PM):** Keep your hips down and your body still. If you shift, redo the lift. **[Stacy PASS Oct 6 12:07]**

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
3. Stand straight with your weight even on both feet. Hold still while it counts down from 5 with a soft beep each second. It zeroes at the end.

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
2. Check your heel: it should stay down the whole time. A slip of paper under the heel should stay pinched.
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
- **New:** The method in 4 words: Place. Zero. Move. Hold. / Hold the phone against the body part as shown. Tap Zero and hold the start position for the 5-second countdown. Move slowly to your end range, then hold still until the number locks. Each step tells you exactly where to hold the phone and which direction to move.

### Before you start items
**Old:**

- **iPhone:** Open the Measure app (pre-installed on all iPhones). Tap Level at the bottom. You will see a number in degrees that changes as you tilt the phone - that is your angle.
- **Android:** Download "Simple Inclinometer" by Syleos Apps, free on Google Play. Open it and you will see your angle in degrees, just like a digital level.
- (Second-person setup box, removed Oct 6.)
- **Warm up first - 5 minutes:** 1) Walk or march in place for 2 minutes. 2) Arm circles - 10 forward, 10 backward. 3) Hip circles - big loops with your hips like a hula hoop, 10 each way. 4) Leg swings - hold a wall, swing each leg front-to-back 10 times then side-to-side 10 times. 5) Slow neck turns - look left and right, 5 times each way. Wear shorts and a t-shirt.
- **Solo tip:** When you cannot tap the screen: say "Hey Siri, take a screenshot" (iPhone) or "Hey Google, take a screenshot" (Android). Read the number right after.
- **Skip is always OK:** If a position is too difficult, tap Skip. Your score is based on what you completed. You can always come back and fill in any skipped measurements later.

**New:**

- **Your phone is the meter:** On each angle step, tap Measure with phone and allow motion access if asked. Hold the phone where the step shows, tap Zero, and hold still for the 5-second countdown. Then move and hold still. The number locks with a soft chime. Tap Use this number to fill it in. Turn your ringer on to hear the chime.
- **Typing is always OK:** You can type any number yourself. If the phone meter is not available, use the Measure app (tap Level) on iPhone or the free "Simple Inclinometer" app by Syleos Apps on Android, then type the number. The low back step uses one of these apps.
- (Second-person setup box, removed Oct 6.)
- **Warm up first - 5 minutes:** 1) Walk or march in place for 2 minutes. 2) Arm circles - 10 forward, 10 backward. 3) Hip circles - big loops with your hips like a hula hoop, 10 each way. 4) Leg swings - hold a wall, swing each leg front-to-back 10 times then side-to-side 10 times. 5) Slow neck turns - look left and right, 5 times each way. Wear shorts and a t-shirt.
- **Solo tip:** Cannot see the screen at the end of a move? Just hold still. The number locks and chimes, so you can read it after you return.
- **Skip is always OK:** If a position is too difficult, tap Skip. Your score is based on what you completed. You can always come back and fill in any skipped measurements later.

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
- `needZero`: 'Tap Zero, then hold the start position while it counts down from 5.'
- `zeroCountdown`: 'Hold the start position...'
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

---

## Update: Zero countdown (Jim, Oct 5, 10:26 PM)

Zero now starts a 5-4-3-2-1 countdown on every meter step, shown big in place of the number, with a short soft tick on each number (480 Hz, about 70 ms, low volume, no vibration; the lock ding stays 880 Hz). Then it zeroes at the start position and goes live. Reset or Close during the countdown cancels it. Replaces the 3-second delayed Zero. Strings changed in this update (previous draft vs now):

- **Hip External Rotation** (position)
  - Was: With your shin straight up and down, tap Zero.
  - Now: Tap Zero, then hold your shin straight up and down and stay still while it counts down from 5. It zeroes at the end.
- **Hip Internal Rotation** (position)
  - Was: With your shin straight up and down, tap Zero before each leg.
  - Now: Before each leg, tap Zero and hold your shin straight up and down while it counts down from 5.
- **Shoulder External Rotation** (position)
  - Was: Tap Zero with your other hand.
  - Now: Tap Zero with your other hand, then hold this start position while it counts down from 5.
- **Shoulder Flexion** (position)
  - Was: Tap Zero with your other hand while your arm hangs straight down.
  - Now: Tap Zero with your other hand, then let your arm hang straight down and hold still while it counts down from 5.
- **Cervical Lateral Flexion** (position)
  - Was: Look straight ahead and hold still. It zeroes after 3 seconds with a soft tick.
  - Now: Look straight ahead. Hold still while it counts down from 5 with a soft beep each second. It zeroes at the end.
- **Cervical Flexion + Extension** (position)
  - Was: Look straight ahead and hold still. It zeroes after 3 seconds with a soft tick.
  - Now: Look straight ahead. Hold still while it counts down from 5 with a soft beep each second. It zeroes at the end.
- **Hip Flexion (Straight-Leg Raise)** (position)
  - Was: Tap Zero, then slide one hand under the small of your low back with your leg flat on the ground. It zeroes after 3 seconds with a soft tick.
  - Now: Tap Zero, then slide one hand under the small of your low back with your leg flat on the ground. Hold still while it counts down from 5 with a soft beep each second. It zeroes at the end.
- **Hip Abduction** (position)
  - Was: Stand straight with your weight even on both feet and hold still. It zeroes after 3 seconds with a soft tick.
  - Now: Stand straight with your weight even on both feet. Hold still while it counts down from 5 with a soft beep each second. It zeroes at the end.
- **Setup screen** (Your phone is the meter)
  - Was: On each angle step, tap Measure with phone and allow motion access if asked. Hold the phone where the step shows, tap Zero, move, and hold still. The number locks with a soft chime. Tap Use this number to fill it in. Turn your ringer on to hear the chime.
  - Now: On each angle step, tap Measure with phone and allow motion access if asked. Hold the phone where the step shows, tap Zero, and hold still for the 5-second countdown. Then move and hold still. The number locks with a soft chime. Tap Use this number to fill it in. Turn your ringer on to hear the chime.
- **Setup screen method box**
  - Was: ...Tap Zero in the start position. Move slowly to your end range, then hold still until the number locks...
  - Now: ...Tap Zero and hold the start position for the 5-second countdown. Move slowly to your end range, then hold still until the number locks...
- **Meter status** `needZero`
  - Was: Get into the start position and tap Zero.
  - Now: Tap Zero, then hold the start position while it counts down from 5.
- **Meter status** `needZeroDelayed` (removed)
  - Was: Tap Zero, then get into the start position. It zeroes in {s} seconds.
  - Now: (removed, every step uses the countdown)
- **Meter status** `zeroCountdown` (shown under the big 5..1)
  - Was: Zeroing in {s}...
  - Now: Hold the start position...

---

## Update: Hip ER phone on the inner calf (Jim, Oct 6, 11:36 AM) [Stacy PASS Oct 6 11:45]

Jim: move the Hip External Rotation phone spot from the front of the shin to flat on the inner calf, and zero it there. The phone can slip on the front of the shin as the foot moves inward; it stays put flat on the inner calf. Hip Internal Rotation is NOT changed (still on the front of the shin) until Jim decides. Only the words that name the phone spot changed. Meter math is unchanged: it reads the gravity angle since zero, which gives the same number for this movement with the screen facing forward (shin) or sideways (inner calf).

- **Hip External Rotation** (meter grip) **[Stacy PASS Oct 6 11:45]**
  - Was: Phone flat on the front of your shin, just below the knee. Screen faces forward, long edge along the shin.
  - Now: Phone flat on your inner calf, just below the knee. Screen faces your other leg, long edge along the calf.
- **Hip External Rotation** (position, line 2) **[Stacy PASS Oct 6 11:45]**
  - Was: Hold your phone flat on the FRONT of your shin, just below the knee. The screen faces forward and the long edge runs along your shinbone.
  - Now: Hold your phone flat on your INNER calf, just below the knee. The screen faces your other leg and the long edge runs along your calf.
- **Hip External Rotation** (position, line 3, the zero cue) **[Stacy PASS Oct 6 11:45]**
  - Was: Tap Start, then hold your shin straight up and down and stay still while it counts down from 5. It zeroes at the end.
  - Now: Tap Start, then hold your lower leg straight up and down and stay still while it counts down from 5. It zeroes at the end.
- Not changed: Hip ER common mistake ("Your thigh rotates instead of just your shin.") is about the leg, not the phone spot.
- **Hip Internal Rotation** (tool line) **[Stacy PASS Oct 6 11:45]**: the old line said the phone spot was the same as Hip ER, which is no longer true. The Hip IR phone spot itself is not moved.
  - Was: Same chair, same phone spot. Only the foot direction changes.
  - Interim draft (not shipped, replaced Oct 6 11:45): Same chair. Phone on the front of your shin. Only the foot direction changes.
  - Now: Same chair. This time, hold the phone flat on the front of your shin. (Stacy's edit)

### Added Oct 6 (after 11:45): two Hip ER setup cues **[Stacy PASS Oct 6, word for word]**
Shown in the open Setup list on the Hip ER step (never under More help). New Setup order: sit tall; move the other knee; phone on the inner calf; press the phone flat; tap Start.
- **Hip External Rotation** (Setup, new line 2): Move your other knee out to the side and tuck that foot back, out of the way. **[Stacy PASS Oct 6, word for word]**
- **Hip External Rotation** (Setup, new line 4): Press the phone flat against your leg with your hand the whole time. **[Stacy PASS Oct 6, word for word]**

---

## Update: Shoulder ER tucked elbow + plain wording on all steps (Jim, Oct 6, 11:45 AM) [Stacy PASS Oct 6 11:55, all 24 rows as written; shoulder ER range row pending Quinn]

Jim: Base step 3, Shoulder ER, is now the tucked-elbow version lying on your back: elbow on the floor at your side (never "upper arm on the floor"), forearm pointing at the ceiling, zero there, then the hand falls outward toward the floor and you hold at your limit. Same phone grip (in that hand, along the forearm, wrist straight and stiff). Typical range 40-75° (Gill et al., 2020). Scoring targets (JOINT_SCORE_TARGETS) are not changed here; the scoring branch sets shoulder ER to 40. Shoulder flexion stays standing. Hip IR stays on the shin.

Jim also asked for plain, body-landmark wording on every step (no anatomy terms such as abduction, flexion, supine, lateral, medial, torso, hinge, cobra). Only position and movement wording changed; method, phone spots, stored keys and step titles did not. Field labels Flexion / Extension stay as the input box names, so lines name them in brackets after the plain words, for example "Chin down (Flexion)". Stacy-pinned lines (lumbar "Set your level to 0 ...", "Note the angle at your end range.", hip flexion step, meter panel copy) are word for word.

Hip ER phone spot: both strings now live in one constant, `HIP_ER_PHONE_SPOT` (app/src/pages/assessmentSteps1.ts), so a spot change (for example Quinn's "inner side of the shin, just below the knee, on the flat bone", now with Jim) is one line per string.

The per-movement sections earlier in this file are history; the "Full step text as built" section and this table are current.

Every changed string. Stacy PASSED all 24 rows as written (Oct 6, 11:55), except the shoulder ER range row, which is Stacy PASS pending Quinn confirming Gill's position:

| Step | Line | Where (new) | Old | New | Status |
|---|---|---|---|---|---|
| hip_er | mistake | app/src/pages/assessmentSteps1.ts:31 | Your thigh rotates instead of just your shin. | Your thigh turns instead of just your lower leg. | Stacy PASS Oct 6 11:55 |
| shoulder_er | tool | app/src/pages/assessmentSteps1.ts:70 | Your phone. Seated in a chair. | Your phone. Lying on your back on the floor. | Stacy PASS Oct 6 11:55 |
| shoulder_er | mistake | app/src/pages/assessmentSteps1.ts:81 | Your shoulder shrugs up or your elbow drops below shoulder height. | Your elbow slides away from your side or your shoulder lifts off the floor. | Stacy PASS Oct 6 11:55 |
| shoulder_er | mistakeFix | app/src/pages/assessmentSteps1.ts:82 | Keep your shoulder pressed down and your elbow at the same height the whole time. From the elbow to the shoulder, the arm only rotates - it does not lift up or drop down. | Keep your elbow on the floor, tucked in at your side, the whole time. Only your forearm moves, like a door swinging open. | Stacy PASS Oct 6 11:55 |
| shoulder_er | grip | app/src/pages/assessmentSteps1.ts:83 | Phone along your forearm like a ruler, on its edge, screen facing your head. Wrist straight and stiff. | Phone in that hand, along your forearm like a ruler, on its edge, screen facing your head. Wrist straight and stiff. | Stacy PASS Oct 6 11:55 |
| shoulder_er | setup 1 | app/src/pages/assessmentSteps1.ts:72 | Sit tall. Raise one arm out to the side at shoulder height, like a T. Bend the elbow to 90° so your forearm points straight ahead. | Lie on your back on the floor with your knees bent and feet flat. Keep your elbow on the floor, tucked in at your side, and bend it so your forearm points at the ceiling. | Stacy PASS Oct 6 11:55 |
| shoulder_er | setup 2 | app/src/pages/assessmentSteps1.ts:73 | Hold the phone along your forearm like a ruler: thumb on one long edge, fingers on the other, top edge in line with your knuckles. Turn it on its edge so the screen faces your head. Keep your wrist straight and stiff the whole time. | Hold the phone in that hand along your forearm like a ruler: thumb on one long edge, fingers on the other, top edge in line with your knuckles. Turn it on its edge so the screen faces your head. Keep your wrist straight and stiff the whole time. | Stacy PASS Oct 6 11:55 |
| shoulder_er | how-to 1 | app/src/pages/assessmentSteps1.ts:77 | Keep your elbow at shoulder height. Rotate up and back until you feel a strong stretch or your back starts to arch. Going past straight up is fine. | Keep your elbow on the floor, tucked in at your side. Let your hand fall slowly outward, away from your body, toward the floor. Stop at a strong stretch or when your elbow starts to slide away from your side. | Stacy PASS Oct 6 11:55 |
| shoulder_er | how-to 2 | app/src/pages/assessmentSteps1.ts:78 | Hold still: after 2.5 seconds the number locks and chimes. Tap Use this number. | Hold still at your limit: after 2.5 seconds the number locks and chimes. Tap Use this number. | Stacy PASS Oct 6 11:55 |
| shoulder_er | fields | | shoulder_er_l 85-110 rb 60 Vairo et al., 2012; shoulder_er_r 85-110 rb 60 Vairo et al., 2012 | shoulder_er_l 40-75 rb 40 Gill et al., 2020; shoulder_er_r 40-75 rb 40 Gill et al., 2020 | NOT Stacy-cleared: Quinn says Gill measured standing and 40-75 is a derived mean ± SD (label kept, Jim's call) |
| shoulder_flex | mistakeFix | app/src/pages/assessmentSteps1.ts:107 | Keep your body tall and still. The moment your back starts to arch or your shoulder creeps up toward your ear, that is your true end range. Record it there. | Keep your body tall and still. The moment your back starts to arch or your shoulder creeps up toward your ear, that is your limit. Record it there. | Stacy PASS Oct 6 11:55 |
| cervical_flex_ext | mistakeFix | app/src/pages/assessmentSteps2.ts:20 | Your shoulders and torso stay still. Only your head moves. If your back starts to round or arch, stop there. | Your shoulders and upper body stay still. Only your head moves. If your back starts to round or arch, stop there. | Stacy PASS Oct 6 11:55 |
| cervical_flex_ext | how-to 1 | app/src/pages/assessmentSteps2.ts:16 | Back stays against the chair. Only your head nods. Flexion: Drop your chin toward your chest as far as it will go. Hold still until the number locks and chimes. Tap Use this number. | Back stays against the chair. Only your head nods. Chin down (Flexion): Drop your chin toward your chest as far as it will go. Hold still until the number locks and chimes. Tap Use this number. | Stacy PASS Oct 6 11:55 |
| cervical_flex_ext | how-to 2 | app/src/pages/assessmentSteps2.ts:17 | Extension: Look straight ahead, tap Start the same way, then lift your chin toward the ceiling as far as it will go. Hold until it locks and tap Use this number. | Chin up (Extension): Look straight ahead, tap Start the same way, then lift your chin toward the ceiling as far as it will go. Hold until it locks and tap Use this number. | Stacy PASS Oct 6 11:55 |
| hip_abd | mistake | app/src/pages/assessmentSteps2.ts:59 | Leaning your torso away or letting the hip hinge backward to get the leg higher. | Leaning your upper body away or letting your hips push back to get the leg higher. | Stacy PASS Oct 6 11:55 |
| hip_abd | mistakeFix | app/src/pages/assessmentSteps2.ts:60 | Your torso stays upright and your hip stays directly under you. The moment either shifts, you have hit your true end range. | Your upper body stays upright and your hips stay right under you. The moment either shifts, you have hit your limit. | Stacy PASS Oct 6 11:55 |
| hip_abd | how-to 2 | app/src/pages/assessmentSteps2.ts:56 | Stop just before your upper body starts to lean to the opposite side or your hip hinges backward. Hold still until the number locks and chimes. | Stop just before your upper body starts to lean to the other side or your hips push back. Hold still until the number locks and chimes. | Stacy PASS Oct 6 11:55 |
| lumbar | mistake | app/src/pages/assessmentSteps2.ts:81 | Rounding the back to get lower on flexion, or letting your hips lift off the floor during the cobra. | Rounding your back to get lower when bending forward, or letting your hips lift off the floor during the press-up. | Stacy PASS Oct 6 11:55 |
| lumbar | mistakeFix | app/src/pages/assessmentSteps2.ts:82 | For flexion, the stretch in the back of your legs is your true stopping point. For extension, your hips stay flat on the floor the entire time - only your chest rises. | When bending forward, the stretch in the back of your legs is your true stopping point. When bending back, your hips stay flat on the floor the entire time - only your chest rises. | Stacy PASS Oct 6 11:55 |
| lumbar | setup 1 | app/src/pages/assessmentSteps2.ts:73 | Flexion is standing. Extension is on the floor face down. | Bending forward (Flexion) is standing. Bending back (Extension) is on the floor face down. | Stacy PASS Oct 6 11:55 |
| lumbar | setup 2 | app/src/pages/assessmentSteps2.ts:74 | Flexion setup: Stand straight, feet shoulder-width apart. Hold your phone at your side, screen facing away. Set your level to 0 while you stand straight. | Bend forward (Flexion) setup: Stand straight, feet shoulder-width apart. Hold your phone at your side, screen facing away. Set your level to 0 while you stand straight. | Stacy PASS Oct 6 11:55 |
| lumbar | setup 3 | app/src/pages/assessmentSteps2.ts:75 | Extension setup: Lie face down on the floor. Place one hand under your shoulder for the press-up. Hold your phone at your side with your other hand, screen facing away. Set your level to 0 while you lie flat. | Bend back (Extension) setup: Lie face down on the floor. Place one hand under your shoulder for the press-up. Hold your phone at your side with your other hand, screen facing away. Set your level to 0 while you lie flat. | Stacy PASS Oct 6 11:55 |
| lumbar | how-to 1 | app/src/pages/assessmentSteps2.ts:78 | Flexion: Keep your legs straight. Slowly bend forward with your back flat. Stop when you feel a strong stretch in the back of your legs. Note the angle at that point. | Bend forward (Flexion): Keep your legs straight. Slowly bend forward with your back flat. Stop when you feel a strong stretch in the back of your legs. Note the angle at that point. | Stacy PASS Oct 6 11:55 |
| lumbar | how-to 2 | app/src/pages/assessmentSteps2.ts:79 | Extension: Press up on one arm into a cobra, keeping your hips flat on the floor. Note the angle at your end range. | Bend back (Extension): Press up on one arm to lift your chest, keeping your hips flat on the floor. Note the angle at your end range. | Stacy PASS Oct 6 11:55 |

Measure-screen fields for shoulder ER: normalLow 40, normalHigh 75, rangeSource "Gill et al., 2020" (shows "Typical range: 40-75°" and "Source: Gill et al., 2020"). riskBelow 40, equal to the Steady target of 40 on the scoring branch; riskBelow is no longer read by scoring or display, so it is kept in line with the target.

Step titles still use anatomy terms (not renamed; listed for Jim): Hip External Rotation, Hip Internal Rotation, Shoulder External Rotation, Shoulder Flexion, Cervical Lateral Flexion, Cervical Flexion + Extension, Hip Flexion (Straight-Leg Raise), Hip Abduction, Lumbar Flexion + Extension, Ankle Dorsiflexion (Knee-to-Wall, cm). "Why" lines with jargon (not position wording, not changed): Hip IR "rotational movement", Cervical Lateral "Lateral neck strength", Hip Abduction "hip abduction range".

---

## Update: Shoulder flexion SITTING in a chair (Jim, Oct 6, 11:54 AM) [Stacy PASS Oct 6 12:02, all lines as written]

Jim: Base shoulder flexion is done sitting in a chair with a back, not standing and not lying down. Target 140, scoring, the range text (Typical range: 140-180°, Gill et al., 2020) and the step order are unchanged. Meter math unchanged: with the phone on its long side and the screen facing out, the lift turns inside the screen plane, and the meter reads the gravity angle since zero smoothly from 0 to 180 (tests: shoulderFlexSitting.test.ts). Setup stays in the open Setup list.

Flag: the 1e5f02b shoulder flexion Fix row ("...that is your limit. Record it there.", Stacy PASS Oct 6 11:55) and the earlier standing lines are replaced by Jim's sitting wording below. Kept as is (still true sitting): how-to 2 "Stop before your back arches or your shoulder shrugs..." and how-to 3 "Tap Use this number. Lower your arm...". The countdown line keeps its wording with "It zeroes at the end." added, as on the other steps.

| Line | Where (new) | Old | New | Status |
|---|---|---|---|---|
| tool | app/src/pages/assessmentSteps1.ts:97 | Your phone. Standing. | Your phone. Sitting in a chair with a back. | Stacy PASS Oct 6 12:02 |
| setup 1 | app/src/pages/assessmentSteps1.ts:99 | Stand tall with room overhead and your arm hanging relaxed at your side. | Sit tall with your back against the chair and your feet flat. Let your arm hang straight down by your side, palm facing your body, thumb forward. | Stacy PASS Oct 6 12:02 |
| setup 2 | app/src/pages/assessmentSteps1.ts:100 | Hold the phone in that hand, long edge pointing down along your arm, screen facing out to the side, away from your body. | Hold the phone in that hand, standing on its long side, in line with your arm. The screen faces out, away from your body. | Stacy PASS Oct 6 12:02 |
| setup 3 | app/src/pages/assessmentSteps1.ts:101 | Tap Start with your other hand, then let your arm hang straight down and hold still while it counts down from 5. | Tap Start with your other hand, then let your arm hang straight down and hold still while it counts down from 5. It zeroes at the end. | Stacy PASS Oct 6 12:02 |
| how-to 1 | app/src/pages/assessmentSteps1.ts:104 | Thumb up, wrist straight, ribs down. Keep your elbow straight and raise your arm in front of you and UP as high as you can go. | Keep your arm straight and your elbow locked. Lift your arm forward and straight up over your head, not out to the side. Keep your palm facing in. | Stacy PASS Oct 6 12:02 |
| mistake | app/src/pages/assessmentSteps1.ts:108 | Leaning your upper body backward or shrugging your shoulder to get the arm higher. | Arching your back or leaning back to get the arm higher. | Stacy PASS Oct 6 12:02 |
| mistakeFix | app/src/pages/assessmentSteps1.ts:109 | Keep your body tall and still. The moment your back starts to arch or your shoulder creeps up toward your ear, that is your limit. Record it there. | Keep your back against the chair. Don't arch your back or lean back. Keep your wrist straight. Don't bend your elbow or turn your arm out. Don't shrug your shoulder up to your ear. | Stacy PASS Oct 6 12:02 |
| grip | app/src/pages/assessmentSteps1.ts:110 | Phone in your hand, long edge along your arm, screen facing out to the side. Thumb up, wrist straight. | Phone in that hand, standing on its long side, in line with your arm. Screen faces out, away from your body. | Stacy PASS Oct 6 12:02 |

---

## Update: Shoulder ER step title relabeled (Jim, Oct 6, 11:56 AM) [Stacy: not a claims issue; needs one name everywhere before ship; waiting for Jim's final title]

Jim reversed the shoulder ER removal: the lying-down tucked-elbow step STAYS in Base (9 moves). Its title (what the user sees on the step header and in the meter card) is now **Shoulder Extension** **[Stacy: not a claims issue; before ship it needs one name everywhere (header, MyProtocol.tsx:128, ResultsPreview.tsx:44, mobilityBands.ts:553, ROMBot). Waiting for Jim's final title.]** (was: Shoulder External Rotation). The stored key `shoulder_er`, the field keys `shoulder_er_l` / `shoulder_er_r`, targets, saved answers and field labels are unchanged, so no key rename is needed. The title may change again, so other places that show the old name are listed, not changed:
- app/src/pages/MyProtocol.tsx:128 label 'Shoulder External Rotation' (Protocol)
- app/src/pages/ResultsPreview.tsx:44 'Shoulder External Rotation' (results preview)
- app/src/lib/mobilityBands.ts:553 label / short 'Shoulder ER' (My Body list and spider chart)
- romrxbjj-v2 supabase/functions/ai-chat/handler.js:22 "shoulder external rotation" (ROMBot wording)

Shoulder ER range label "Typical range: 40-75° / Source: Gill et al., 2020" kept as is (Jim's call) and is **NOT Stacy-cleared: Quinn says Gill measured standing and 40-75 is a derived mean ± SD**.

### Added Oct 6 (12:01 PM): shoulder flexion always-visible cue [Stacy PASS Oct 6 12:02]
Jim asked for these cues after his phone hit the floor, so they must not sit under More help. Added as the LAST Setup line (Setup always shows); the full Fix box is unchanged.
- **Shoulder Flexion** (Setup, new line 4, app/src/pages/assessmentSteps1.ts:103): Keep your arm straight, your elbow locked and your back against the chair the whole time. **[Stacy PASS Oct 6 12:02]**

---

## Update: Hip Flexion (SLR) setup line 3, no hand under the low back (Jim, Oct 6, 12:02 PM) [Stacy PASS Oct 6 12:02; ship-block SUPERSEDED by Jim's 12:07 copy below]

- **Hip Flexion (SLR)** (Setup 3, app/src/lib/hipFlexCopy.ts, HIP_FLEX_STEP.position[2]) **[Stacy PASS Oct 6 12:02, ship-blocked: can't ship until Jim decides how-to 2 and Fix (they still mention the hand under the low back)]**
  - Was: Tap Start, then slide one hand under the small of your low back with your leg flat on the ground. Hold still while it counts down from 5 with a soft beep each second. It zeroes at the end.
  - Now: Tap Start, then keep your leg flat on the ground and hold still while it counts down from 5 with a soft beep each second. It zeroes at the end.
- Not changed (Jim is deciding): setup lines 1-2, How to Measure 1-3, Common mistake and Fix. How to Measure 2 ("...or sooner when your low back presses down onto your hand.") and the Fix ("...when your low back presses down onto your hand.") still mention the hand.

---

## Update: Hip Flexion (SLR), every hand reference removed (Jim, Oct 6, 12:07 PM, decided) [Stacy PASS Oct 6 12:07, all 9 lines]

All in `app/src/lib/hipFlexCopy.ts`, HIP_FLEX_STEP (the step in assessmentSteps2.ts reads from it). Unchanged: title, why, tool ("Your phone. Lying on the floor.", second-person sentence removed by Jim at 12:13 PM), per-leg fields (Left leg / Right leg), "Typical range: 60-80°" with "Source: Youdas et al., 2005".

| Field | Was | Now |
|---|---|---|
| Setup 1 (position[0]) | Lie flat on your back on the floor with both legs straight. | Lie flat on your back, legs straight out, knees touching the floor. **[Stacy PASS Oct 6 12:07]** |
| Setup 2 (position[1]) | Hold your phone flat against the outer side of your thigh (the surface facing away from your other leg), midway between your hip and your knee. Screen faces outward. | Place your phone on your mid-thigh. **[Stacy PASS Oct 6 12:07]** |
| Setup 3 (position[2]) | (same) | Tap Start, then keep your leg flat on the ground and hold still while it counts down from 5 with a soft beep each second. It zeroes at the end. **[Stacy PASS Oct 6 12:07]** |
| How to Measure 1 (howTo[0]) | Keep the test knee completely straight, kneecap pointing at the ceiling. Raise that leg straight up, not out, as high as you can without bending the knee, and keep your other leg flat on the floor. | Lift one leg and keep it straight until you can't anymore. **[Stacy PASS Oct 6 12:07]** |
| How to Measure 2 (howTo[1]) | Keep the phone aligned with your thigh as it rises. Stop when you feel a firm stretch behind the thigh, or sooner when your low back presses down onto your hand. Stop if you feel sharp pain. Hold still until the number locks and chimes. | Pause for 2.5 seconds so the meter can lock in the range. **[Stacy PASS Oct 6 12:07]** |
| How to Measure 3 (howTo[2]) | (same) | Tap Use this number for this leg. Lower the leg slowly. Tap Start again and repeat with the other leg. Each leg gets its own number. **[Stacy PASS Oct 6 12:07]** |
| Common mistake (mistake) | Bending the knee as the leg rises, letting the other leg lift, or letting your low back press down or your hips tilt as you go higher. | Your hips start coming up, or you shift in any other way. **[Stacy PASS Oct 6 12:07]** |
| Fix (mistakeFix) | Keep the test leg straight and the other leg flat on the floor. Stop at a firm stretch, not at pain. Stop sooner when your low back presses down onto your hand. If your hips tilt or your knee bends, redo the lift and read the number again. | Keep your hips down and your body still. If you shift, redo the lift. **[Stacy PASS Oct 6 12:07]** |
| Meter grip (meterGrip) | Phone flat on the outer side of your thigh, midway between hip and knee, screen facing out. | Phone on your mid-thigh. **[Stacy PASS Oct 6 12:07]** |

Removed with these fields: both SLR safety lines ("Stop if you feel sharp pain." in How to Measure 2, "Stop at a firm stretch, not at pain." in the Fix). No other SLR copy, overlay or tooltip in app/src mentions a hand, the low back or "presses down". Test: hipFlexCopy.test.ts fails if "hand", "low back" or "press down" appears in any HIP_FLEX_STEP string.

---

## Update: Self-assessment intro line, the phone is equipment (Jim, Oct 6, 12:10 PM) [Jim wording 12:10, Stacy check pending]

- **Setup screen subtitle** (app/src/pages/AssessmentPhases.tsx:34)
  - Was: 15 minutes - Your phone is the meter - No equipment needed (ROMeter stack: "15 minutes - Uses the ROMeter on your phone - No equipment needed"; scoring branch: "15 minutes - Smartphone inclinometer - No equipment needed")
  - Now: **Approximately 15 minutes using the ROMeter. Equipment needed: your phone.** [Jim wording 12:10, Stacy check pending]
- Older rows in this doc that say "No equipment needed" are history. Grep of app/src, app/index.html and index.html for no equipment, equipment-free / equipment free, just / only / nothing but your phone, all you need is your phone, no gear, no tools: no other app UI hits. Test: app/src/lib/noEquipmentClaim.test.ts (zero hits in app/src + exact intro line).
- Note for Jim: the ankle (knee-to-wall) step still needs a wall, a tape measure or ruler, and a slip of paper (tool line in assessmentSteps2.ts), so "Equipment needed: your phone." is not complete for that step.

---

## Update: typed-fallback copy removed (Jim, Oct 6, 12:12 PM) and second-person copy removed (Jim, Oct 6, 12:13 PM) [Jim wording, Stacy check pending]

Copy only: the number boxes and Use this number work exactly as before. Users hold the phone themselves. "Before you start" wording is otherwise ON HOLD (Jim dictating); only the two boxes and one clause below were removed from it.

| Where | Was | Now |
|---|---|---|
| meterCopy.ts `denied` | Motion access is off. Type your number in the box. To use the meter, close and reopen your browser, then tap Allow when asked. | Motion access is off. To use the meter, close and reopen your browser, then tap Allow when asked. (ROMeter stack: "To use the ROMeter") |
| meterCopy.ts `inApp` | The meter may not work inside Instagram or Facebook. Open this page in Safari or Chrome, or type your number in the box. | The meter may not work inside Instagram or Facebook. Open this page in Safari or Chrome. (ROMeter stack: "The ROMeter may not work") |
| meterCopy.ts `error` | The phone meter did not start. Tap Turn on the meter again, or type your number in the box. | The phone meter did not start. Tap Turn on the meter again. (ROMeter stack: "The ROMeter did not start. Tap the button again.") |
| meterCopy.ts `noData` | This device is not sending motion readings, so type your number in the box. | This device is not sending motion readings. |
| Before you start box "Typing is always OK" | Can't use the meter? Type your number in the box. | (box removed) |
| Before you start, second-person box | (the "optional" box about a second person holding the phone and tapping the buttons) | (box removed) |
| Before you start "Skip is always OK" | If a position is too difficult or you need [a second person] for a step and do not have one, tap Skip. ... | If a position is too difficult, tap Skip. Your score is based on what you completed. You can always come back and fill in any skipped measurements later. |
| SLR tool (hipFlexCopy.ts) | Your phone. Lying on the floor. [second-person sentence] | Your phone. Lying on the floor. |
| Ankle How to Measure 2 | Check your heel: it should stay down the whole time. A slip of paper under the heel should stay pinched, or [have someone] watch. | Check your heel: it should stay down the whole time. A slip of paper under the heel should stay pinched. |

Kept on purpose: `desktopNote` "Type your numbers here. On a phone, you can also measure with the phone itself." (ROMeter stack: "...you can also use the ROMeter.") needs Jim's words; `manualAria` (screen-reader label for the box) and `manualPlaceholder` "Type" unchanged. Test: app/src/lib/jimCopyRemovals.test.ts.

---

## Update: Before you start + sound words (Jim, Oct 6, 12:16 PM) [Jim wording 12:16]

### Before you start (app/src/pages/assessmentMeta.ts SETUP_STEPS, rendered by AssessmentPhases.tsx), in this order [Jim wording 12:16]
1. **Warm up first - 5 minutes**: detail unchanged, moved to first.
2. **Your phone is the meter, and we call it ROMeter.**: Tap Measure. Your phone may ask for access. If it does, accept it. Hold the phone where the step shows. Tap Use this number to fill it in. Sound on, volume up, and turn off silent mode so you can hear the beeps.
   - Second paragraph of the same card (the card needs a label and Jim gave this sentence no title): Tap Start and move into position during the five-second countdown beeps. After the final beep, begin your move. Then hold for 2.5 seconds, and you'll hear a finishing ding.
3. **Skip is always OK**: If a position is too difficult or you feel any pain, tap Skip. Your score is based on what you complete. You can always try to redo this position during a reassessment if you're able.

Removed: the Typing is always OK card, the second-person card, the Solo tip card, and the method box under the cards (its sub-line "Each step shows where to hold the phone and which way to move." is gone; its method line is now card 2's second paragraph, so it is not shown twice).
METHOD_LINE (also on the ROMeter page) was: Tap Start and hold still for the beeps. Move on GO. Hold at your limit until the ding. Now: Jim's sentence above. [Jim wording 12:16]
Note: the button on angle steps is labeled **Measure with phone** (not renamed); Jim's card says "Tap Measure."
Timing check (no change): countdown is 5 beeps (5, 4, 3, 2, 1, one second apart), then a distinct higher start beep at 5 s when the start position is captured; lock hold is 2.5 s (LOCK_HOLD_MS = 2500).

### Sound words: countdown = beeps, start signal = beep (never GO), finish/lock = ding (never chime) [Jim wording 12:16]
| Where | Was | Now |
|---|---|---|
| meterCopy.ts `go` (big on-screen label at the start beep) | GO | Move |
| meterCopy.ts `live` | GO. Move slowly to your end range, then hold still. | Move slowly to your end range, then hold still. |
| Lock tip on each meter step (AssessmentMeasureScreen.tsx) | ...The number locks and chimes, so you can read it after. | ...The number locks and dings, so you can read it after. |
| Hip ER, Hip IR, Shoulder ER, Shoulder Flexion, Neck side bend, Neck chin down, Hip side lift (How to Measure) | ...the number locks and chimes. | ...the number locks and dings. |

"counts down from 5 with a soft beep each second" (setup lines) already matches and is unchanged. Sound files and code identifiers (GO_TONE, 'go' tone kind) are unchanged.

---

## Update: stop line on every step + Measure button (Jim, Oct 6, 12:26 PM) [Jim wording 12:26, Stacy check pending]

- **Every Base step** (all 9 measure steps, plus the typed low-back step when shown): one always-visible line right under the Setup list, rendered once by AssessmentMeasureScreen.tsx from `app/src/lib/stopLine.ts`, never under More help: **We don't want you hurt, so stop if anything hurts.** [Jim wording 12:26, Stacy check pending]
- **Angle-step button** (meterCopy.ts `measureButton`): Measure with phone -> **Measure** [Jim wording 12:26, Stacy check pending]. Jim's card line "Tap Measure." now matches the button.
- Test: app/src/lib/stopLine.test.tsx renders every step with More help closed and checks the line is shown once, after the last Setup line, outside any collapsible.

---

## Update: intro equipment, shoulder range, desktop note, lumbar flag (Jim, Oct 6, 12:29 PM) [Jim wording 12:29]

- **Setup screen subtitle** (AssessmentPhases.tsx:34): Approximately 15 minutes using the ROMeter. Equipment needed: your phone. -> **Approximately 15 minutes using the ROMeter. Equipment needed: your phone, a chair, a wall, and a tape measure or ruler.** [Jim wording 12:29, Stacy check pending]
- **Shoulder Extension range**: "Typical range: 40-75°" with "Source: Gill et al., 2020" (normalLow 40, normalHigh 75, rangeSource 'Gill et al., 2020'), same Typical range / Source format as the other steps. **Jim decided 12:29: show.** Test: shoulderRangeShown.test.tsx.
- **desktopNote** (meterCopy.ts): Type your numbers here. On a phone, you can also measure with the phone itself. (ROMeter stack: "...you can also use the ROMeter.") -> **Open this page on your phone to measure.** [Jim wording 12:29, Stacy check pending]
- noData unchanged: This device is not sending motion readings.
- **Ship note: Jim 12:29: lumbar flag ON in prod at ship (set env var on romrx.io Netlify); pack lumbar fix before next pack buyer.** (VITE_BASE_LUMBAR_REMOVED=1)

---

## SHIP BLOCKERS (Oct 6)
- **SLR step:** no stop or safety line remains (Jim's copy removed both). Stacy recommends adding the cleared line "Stop if anything hurts." as an always-visible line on the step; waiting for Jim's yes via Sable. UPDATE Jim 12:26 PM: every step now shows "We don't want you hurt, so stop if anything hurts." (Stacy check pending).
- **Shoulder Extension title**: needs one name everywhere before ship (step header, MyProtocol.tsx:128, ResultsPreview.tsx:44, mobilityBands.ts:553, ROMBot). Waiting for Jim's final title.
- **Shoulder ER range label** "Typical range: 40-75° / Source: Gill et al., 2020": NOT Stacy-cleared (Quinn: Gill measured standing; 40-75 is a derived mean ± SD). Kept as is, Jim's call. **Jim decided 12:29: show.**
- **Lumbar at ship**: Jim 12:29: lumbar flag ON in prod at ship (set env var on romrx.io Netlify); pack lumbar fix before next pack buyer.
