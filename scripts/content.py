# -*- coding: utf-8 -*-
"""Content source for the ROMRx Base article library.

Every factual medical or exercise-science claim links inline to an authoritative
source from the research brief. Reddit is never cited as authority. No em dashes.
"""

DATE = "2026-07-24"
SITE = "https://romrx.io"

# Hub ordering by topic cluster. Every slug appears exactly once.
CLUSTERS = [
    ("foundations", "Foundations", [
        "mobility-vs-flexibility",
        "what-is-normal-range-of-motion",
        "how-to-measure-range-of-motion-progress",
    ]),
    ("stretching", "Stretching & Warm-Up", [
        "how-long-to-hold-a-stretch",
        "static-vs-dynamic-stretching",
        "do-you-need-to-warm-up",
        "does-foam-rolling-improve-range-of-motion",
    ]),
    ("strength", "Strength & Range", [
        "full-vs-partial-range-of-motion",
    ]),
    ("squat", "Squat Mobility", [
        "hip-mobility-for-squats",
        "ankle-dorsiflexion-for-squats",
        "hip-impingement-deep-squat",
    ]),
    ("joints", "Joint Mobility", [
        "overhead-shoulder-mobility",
        "thoracic-spine-mobility",
        "why-cant-i-touch-my-toes",
    ]),
    ("symptoms", "Symptoms & Red Flags", [
        "stiff-neck-limited-range-of-motion",
        "knee-range-of-motion",
    ]),
    ("lifespan", "Mobility Across Life", [
        "does-flexibility-decline-with-age",
        "am-i-hypermobile-beighton",
        "one-side-more-flexible-asymmetry",
    ]),
    ("sport", "Sport-Specific", [
        "hip-mobility-for-bjj",
    ]),
]

# Frequently reused source links.
L_AAOS = "https://goniometer.io/rom-chart.pdf"
L_ACSM = "https://pubmed.ncbi.nlm.nih.gov/21694556/"
L_VISCO = "https://pubmed.ncbi.nlm.nih.gov/9241023/"
L_AGE = "https://pubmed.ncbi.nlm.nih.gov/21070485/"
L_PHYSIO = "https://www.physio-pedia.com/Range_of_Motion_Normative_Values"
L_DOSE = "https://www.fisiologiadelejercicio.com/wp-content/uploads/2024/12/Optimising-the-Dose-of-Static-Stretching-to-Improve-Flexibility.pdf"
L_ROMADAPT = "https://pubmed.ncbi.nlm.nih.gov/34170576/"
L_FAI = "https://www.orthoinfo.org/diseases--conditions/femoroacetabular-impingement/"
L_WBLT = "https://www.matassessment.com/blog/weight-bearing-lunge-test"
L_DORSI = "https://pmc.ncbi.nlm.nih.gov/articles/PMC3362988/"

ARTICLES_LIST = []

ARTICLES_LIST += [
    {
        "slug": "mobility-vs-flexibility",
        "cluster": "Foundations",
        "kw": "mobility vs flexibility",
        "title": "Mobility vs Flexibility: What's the Difference?",
        "card": "Mobility vs Flexibility",
        "meta": "Mobility vs flexibility is not the same as range of motion. Learn the difference, why it changes how you train, and how to test your own active range.",
        "h1": "Mobility vs Flexibility: What They Are and Why the Difference Matters",
        "excerpt": "Range of motion, flexibility, and mobility are three different things. Here is the difference and why it decides whether you should stretch or strengthen.",
        "llm": "Defines range of motion, flexibility (passive), and mobility (active, controlled range) and how the distinction guides training.",
        "answer": "<strong>Mobility vs flexibility comes down to control.</strong> Range of motion is the measurable arc a joint travels, flexibility is the passive part (how far a muscle or joint moves under an outside force), and mobility is the portion of that range you can actively control with your own strength. Knowing which one limits you decides whether you should stretch, strengthen, or both.",
        "sections": [
            ("What is range of motion, the measurable thing", """
<p>Range of motion (ROM) is the arc a joint can move through, measured in degrees from an anatomical neutral position. It is the objective number underneath both flexibility and mobility. Clinicians measure it with a goniometer against published reference values, for example roughly 180 degrees of shoulder flexion or 135 degrees of knee flexion in the <a href="%(aaos)s">AAOS normal range of motion reference chart</a>.</p>
<p>ROM is not a single fixed property. Research on the stretch response shows a measured joint range reflects both tissue stiffness and your <a href="%(visco)s">tolerance to the stretch sensation</a>, which is why two people with identical anatomy can test differently on the same day.</p>
""" % {"aaos": L_AAOS, "visco": L_VISCO}),
            ("Passive vs active range of motion", """
<p><strong>Passive range</strong> is how far a joint goes when something else moves it: gravity, a strap, a partner, or your other hand. <strong>Active range</strong> is how far you can move it using only the muscles around that joint. The gap between the two is the range you can reach but not yet control.</p>
<div class="rx-table-wrap">
<table>
<thead><tr><th>Term</th><th>What it describes</th><th>How you test it</th></tr></thead>
<tbody>
<tr><td>Range of motion</td><td>The measurable arc, in degrees</td><td>Goniometer or tape test</td></tr>
<tr><td>Flexibility</td><td>Passive length available to a muscle or joint</td><td>Relaxed stretch to end range</td></tr>
<tr><td>Mobility</td><td>Actively controlled, strength-supported range</td><td>Move into the range with no help</td></tr>
</tbody>
</table>
</div>
"""),
            ("Why the mobility vs flexibility distinction changes how you train", """
<p>The mobility vs flexibility distinction matters because the fix depends on the limiter. If your passive range is large but your active range is small, stretching more will not help; you need strength through the range you already own.</p>
<h3>When flexibility is the limiter</h3>
<p>If passive range is short (a strap or partner cannot move the joint any further without pain), the tissue length and stretch tolerance are the ceiling. Regular stretching is the right tool, and guidelines recommend flexibility work for <a href="%(acsm)s">each major muscle-tendon group to maintain joint range</a>.</p>
<h3>When strength and control are the limiter</h3>
<p>If passive range is generous but you cannot actively reach it, the answer is loaded, end-range strengthening, not more stretching. This is the "flexible but not mobile" pattern many very bendy people live in.</p>
""" % {"acsm": L_ACSM}),
            ("How to self-check active vs passive range", """
<p>Pick a joint and compare the two numbers:</p>
<ul>
<li><strong>Active:</strong> move the joint as far as you can with no assistance and mark the end point.</li>
<li><strong>Passive:</strong> gently take it further with your hand, a strap, or gravity and mark again.</li>
<li><strong>Read the gap:</strong> a large gap points to a strength and control problem; a small passive range points to a flexibility problem.</li>
</ul>
<p>Measure the same way each time and compare left to right, because norms are guides rather than cutoffs.</p>
"""),
            ("Common myths about mobility and flexibility", """
<div class="rx-note"><strong>Myth: mobility is a separate magic system that replaces stretching.</strong> In practice the words overlap, and the useful line is simply active versus passive range.</div>
<div class="rx-note"><strong>Myth: more flexibility is always better.</strong> High passive range without control is not usable mobility and can feel unstable.</div>
<div class="rx-note flag"><strong>Red flag.</strong> A sudden loss of range with pain, swelling, or a locking sensation is not a flexibility problem. See a clinician instead of stretching harder.</div>
"""),
            ("How ROMRx measures your usable range", """
<p>ROMRx Base is built on this exact distinction. Instead of asking you to guess, it measures active and passive range for the joints that matter and flags where your usable range trails your passive range, so your plan targets the real limiter.</p>
"""),
        ],
        "faq": [
            ("Is mobility just active flexibility?", "Close. Mobility is the range you can actively reach and control with your own muscles, so it combines flexibility with strength and coordination. Flexibility on its own is the passive length available."),
            ("Can you be flexible but not mobile?", "Yes. Many people have large passive range but cannot actively control the end of it. That gap between passive and active range is trained with strength, not more stretching."),
            ("What is range of motion measured in?", "Degrees, measured from an anatomical neutral position with a goniometer, or with distance tests such as toe-to-wall. Norms are population guides, not pass-fail cutoffs."),
            ("Do I need both flexibility and mobility?", "For most goals, yes. You need enough passive length to reach a position and enough strength to control it. Which one to prioritize depends on which is limiting you."),
            ("Which should I train first?", "Train the limiter. If passive range is short, stretch. If passive range is fine but you cannot actively use it, strengthen through that range. Testing both tells you which."),
        ],
        "related": ["what-is-normal-range-of-motion", "full-vs-partial-range-of-motion", "how-to-measure-range-of-motion-progress"],
    },
    {
        "slug": "what-is-normal-range-of-motion",
        "cluster": "Foundations",
        "kw": "normal range of motion",
        "title": "Normal Range of Motion by Joint (Degrees Chart)",
        "card": "Normal Range of Motion by Joint",
        "meta": "See a normal range of motion chart for the neck, shoulder, hip, knee, and ankle in degrees, why norms are guides not cutoffs, and how to check your own.",
        "h1": "What Is a Normal Range of Motion? A Joint-by-Joint Guide",
        "excerpt": "Typical degree values for the neck, shoulder, hip, knee, and ankle, plus why a personal baseline beats a textbook number.",
        "llm": "Joint-by-joint normal range of motion reference values in degrees with the caveat that norms vary by age, sex, and anatomy.",
        "answer": "<strong>A normal range of motion is a population guide, not a personal cutoff.</strong> Common orthopedic references list shoulder flexion near 180 degrees, hip flexion near 120 degrees, knee flexion near 135 degrees, ankle dorsiflexion near 20 degrees, and cervical rotation near 60 degrees each side. These values vary with age, sex, and anatomy, so your own baseline and side-to-side comparison matter more than hitting a textbook number.",
        "sections": [
            ("How range of motion is measured", """
<p>Range of motion is measured in degrees from a neutral zero position, usually with a goniometer. The same joint can produce a different number depending on whether the range is active or passive and which tool is used, so consistency matters more than the instrument.</p>
"""),
            ("Normal range of motion reference values", """
<p>The values below come from the <a href="%(aaos)s">AAOS normal range of motion reference chart</a>. <a href="%(physio)s">Physiopedia's normative values</a> list comparable numbers and note that each person differs in the ability to reach them.</p>
<div class="rx-table-wrap">
<table>
<thead><tr><th>Joint</th><th>Motion</th><th>Approx. normal (degrees)</th></tr></thead>
<tbody>
<tr><td rowspan="2">Neck</td><td>Flexion / extension</td><td>45 / 45</td></tr>
<tr><td>Rotation each side</td><td>60</td></tr>
<tr><td rowspan="2">Shoulder</td><td>Flexion / abduction</td><td>180 / 180</td></tr>
<tr><td>External / internal rotation</td><td>90 / 70</td></tr>
<tr><td rowspan="2">Hip</td><td>Flexion / extension</td><td>120 / 30</td></tr>
<tr><td>Abduction</td><td>45</td></tr>
<tr><td>Knee</td><td>Flexion / extension</td><td>135 / 0</td></tr>
<tr><td>Ankle</td><td>Dorsiflexion / plantarflexion</td><td>20 / 50</td></tr>
</tbody>
</table>
</div>
<h3>Neck (cervical spine)</h3>
<p>About 45 degrees of flexion and extension, 45 degrees of side bend, and 60 degrees of rotation to each side.</p>
<h3>Shoulder</h3>
<p>Roughly 180 degrees of flexion and abduction, the overhead target, with 90 degrees of external and 70 degrees of internal rotation.</p>
<h3>Hip</h3>
<p>Around 120 degrees of flexion, 30 of extension, and 45 of abduction.</p>
<h3>Knee</h3>
<p>About 0 degrees of extension (fully straight) to 135 degrees of flexion.</p>
<h3>Ankle</h3>
<p>Roughly 20 degrees of dorsiflexion and 50 degrees of plantarflexion.</p>
""" % {"aaos": L_AAOS, "physio": L_PHYSIO}),
            ("Why normal varies by age, sex, and body type", """
<p>Reference values are averages. A large study of healthy adults found that <a href="%(age)s">average range of motion decreases with advancing age</a> for both sexes and often differs from commonly used normative charts. Bone shape and proportions also shift the numbers, so a normal range of motion for you may sit above or below the textbook figure.</p>
""" % {"age": L_AGE}),
            ("Active vs passive range when you self-test", """
<p>When you check yourself at home, decide whether you are measuring active range (moved by your own muscles) or passive range (moved by gravity, a strap, or your hand), and keep it consistent. Comparing active on one day to passive on another is not a fair comparison.</p>
"""),
            ("When limited range needs a clinician", """
<div class="rx-note flag"><strong>Red flags.</strong> A joint that cannot reach neutral (for example a knee that will not fully straighten), a sudden asymmetric loss of motion, or motion loss with pain, swelling, warmth, or locking should be evaluated by a clinician rather than stretched.</div>
"""),
            ("Turn your numbers into a plan", """
<p>A single degree reading is a snapshot. ROMRx Base records your numbers across joints, compares them side to side, and turns the pattern into a priority list, so you track a trend instead of chasing a chart.</p>
"""),
        ],
        "faq": [
            ("What is a normal range of motion for the hip?", "Orthopedic references list about 120 degrees of hip flexion, 30 degrees of extension, and 45 degrees of abduction, but these are averages that vary with age and hip anatomy."),
            ("How many degrees should my knee bend?", "A typical knee bends to roughly 135 degrees of flexion and straightens to 0 degrees. Some people reach 140 to 150 degrees; the key is full, pain-free extension."),
            ("What is normal neck rotation?", "About 60 degrees of rotation to each side is a common reference value. Rotation tends to decrease with age, so compare left to right and track your own trend."),
            ("Is it bad if I do not reach the textbook number?", "Not necessarily. Norms are population guides, not cutoffs, and anatomy varies. A stable, pain-free range that meets your daily and training needs matters more than a chart."),
            ("How do I measure my own range of motion at home?", "Use a consistent method such as a tape test, a phone goniometer app, or photos from the same angle, warm up the same way each time, and compare against your own baseline."),
        ],
        "related": ["mobility-vs-flexibility", "how-to-measure-range-of-motion-progress", "am-i-hypermobile-beighton", "knee-range-of-motion"],
    },
    {
        "slug": "how-long-to-hold-a-stretch",
        "cluster": "Stretching & Warm-Up",
        "kw": "how long to hold a stretch",
        "title": "How Long to Hold a Stretch (What Research Says)",
        "card": "How Long to Hold a Stretch",
        "meta": "How long to hold a stretch for real flexibility gains: research points to short holds done often, with total weekly time mattering more than any single hold.",
        "h1": "How Long to Hold a Stretch: A Dosage Guide",
        "excerpt": "The evidence-based dose for flexibility: how many seconds, how many sets, and why weekly volume beats marathon holds.",
        "llm": "Evidence-based stretching dosage: about 30 to 60 second holds, roughly 4 minutes per muscle per session, about 10 minutes per muscle per week.",
        "answer": "<strong>How long to hold a stretch matters less than how much you stretch each week.</strong> Meta-analytic evidence points to a practical dose of about 30 to 60 second holds, accumulating roughly 4 minutes per muscle group in a session and about 10 minutes per muscle group per week for lasting change. Short, frequent holds done most days beat one long marathon hold.",
        "howto": {
            "name": "A practical weekly stretching dose for flexibility",
            "steps": [
                {"name": "Warm up", "text": "Do a few minutes of light movement so tissue is warm before holding end-range stretches."},
                {"name": "Hold 30 to 60 seconds", "text": "Stretch each target muscle to a firm but tolerable sensation and hold for 30 to 60 seconds."},
                {"name": "Repeat for volume", "text": "Do 2 to 4 sets so you accumulate roughly 4 minutes per muscle group in the session."},
                {"name": "Hit weekly volume", "text": "Spread sessions across most days to reach about 10 minutes per muscle group per week."},
                {"name": "Stop at sharp pain", "text": "Ease off if you feel sharp, shooting, or radiating sensations, which are not a normal stretch."},
            ],
        },
        "sections": [
            ("The short answer on how long to hold a stretch", """
<p>For flexibility gains, a systematic review and meta-analysis on <a href="%(dose)s">optimising the dose of static stretching</a> found the sweet spot is a cumulative 4 minutes per muscle group in a single session and about 10 minutes per muscle group per week, with no added benefit beyond that. A single hold of 30 to 60 seconds, repeated for a few sets, reaches those targets comfortably.</p>
""" % {"dose": L_DOSE}),
            ("Why total weekly time matters more than a single hold", """
<p>A review of <a href="%(dose2)s">stretching typology and duration</a> concluded that range-of-motion gains depend mainly on total weekly stretching time rather than the length of any one hold, with a minimum around 5 minutes per week per muscle to see change. In other words, frequency and total volume drive results.</p>
""" % {"dose2": "https://paulogentil.com/pdf/The%20Relation%20Between%20Stretching%20Typology%20and%20Stretching%20Duration%20-%20The%20Effects%20on%20Range%20of%20Motion.pdf"}),
            ("A practical per-muscle dose", """
<ul>
<li><strong>Per hold:</strong> 30 to 60 seconds at a firm but tolerable stretch.</li>
<li><strong>Per session:</strong> 2 to 4 sets, roughly 4 minutes total for that muscle.</li>
<li><strong>Per week:</strong> aim for about 10 minutes per muscle group, spread across days.</li>
</ul>
<p>The <a href="%(acsm)s">ACSM position stand</a> offers a maintenance-level version: flexibility work for each major muscle-tendon group totaling about 60 seconds per exercise on 2 or more days per week.</p>
""" % {"acsm": L_ACSM}),
            ("Sets, frequency, and warmth", """
<p>Warm tissue stretches more comfortably, so light activity first helps. Consistency beats intensity: most days at a moderate stretch outperforms occasional aggressive sessions.</p>
"""),
            ("Diminishing returns and can you overdo it", """
<p>Beyond the weekly target, extra stretching does not add flexibility for healthy people. Very long, forced end-range holds carry avoidable risk without a clear payoff.</p>
<div class="rx-note flag"><strong>Red flag.</strong> Sharp, radiating pain, numbness, or tingling during a stretch is not a normal stretch sensation. Stop, and if it persists, see a clinician.</div>
"""),
            ("Build a trackable stretching plan", """
<p>The only way to know your dose is working is to measure it. ROMRx Base sets a baseline and re-checks your range so you can see whether your weekly volume is actually moving the number.</p>
"""),
        ],
        "faq": [
            ("How many seconds should I hold a stretch?", "About 30 to 60 seconds per hold works well for most muscles. Repeat for a few sets rather than pushing one very long hold."),
            ("Is it better to stretch longer or more often?", "More often. Evidence shows total weekly stretching time drives range-of-motion gains more than the length of any single hold."),
            ("How many days a week should I stretch?", "Most days is ideal. Guidelines suggest at least 2 days per week to maintain range, but spreading volume across more days helps you build it."),
            ("Can you stretch too much?", "For healthy people there is little added benefit beyond about 10 minutes per muscle per week, and very long forced holds add risk without clear reward."),
            ("Do I need to warm up before stretching?", "Warming up first makes end-range stretching more comfortable and effective, though it is not strictly required for gentle flexibility work."),
        ],
        "related": ["static-vs-dynamic-stretching", "why-cant-i-touch-my-toes", "how-to-measure-range-of-motion-progress", "does-foam-rolling-improve-range-of-motion"],
    },
    {
        "slug": "static-vs-dynamic-stretching",
        "cluster": "Stretching & Warm-Up",
        "kw": "static vs dynamic stretching",
        "title": "Static vs Dynamic Stretching: Which and When",
        "card": "Static vs Dynamic Stretching",
        "meta": "Static vs dynamic stretching before a workout: see what research shows about strength, power, and range of motion, and how to structure a smart warm-up.",
        "h1": "Static vs Dynamic Stretching: Which One and When",
        "excerpt": "What the research really says about stretching before training, and how to sequence dynamic and static work.",
        "llm": "Compares static and dynamic stretching: short static holds barely affect performance, long holds reduce strength, dynamic work fits pre-training.",
        "answer": "<strong>Static vs dynamic stretching is a timing question, not a good-versus-bad one.</strong> Short static holds of 60 seconds or less have only a trivial effect on strength and power, while holds over 60 seconds can meaningfully reduce both. Dynamic stretching raises range of motion without that penalty, so dynamic work fits before training and longer static holds fit after or on separate days.",
        "sections": [
            ("The core difference between static vs dynamic stretching", """
<p><strong>Static stretching</strong> holds a muscle at length and stays there. <strong>Dynamic stretching</strong> moves a joint through its range repeatedly, such as leg swings or arm circles. Both can build flexibility over time; they differ most in what they do to you right before a hard effort.</p>
"""),
            ("Does static stretching before lifting hurt performance", """
<p>A review of the <a href="%(pmc)s">acute effects of static stretching on strength and power</a> found the picture is dose-dependent.</p>
<h3>The under-60-second nuance</h3>
<p>Static holds of 60 seconds or less per muscle, inside a full warm-up, reduce strength and power by only about 1 to 2 percent, a trivial amount, and may even lower musculotendinous injury risk in high-intensity sport.</p>
<h3>The over-60-second effect</h3>
<p>Holds longer than 60 seconds can cut strength and power by roughly 4 to 7.5 percent, which is enough to matter for a heavy or explosive session.</p>
""" % {"pmc": "https://pmc.ncbi.nlm.nih.gov/articles/PMC6895680/"}),
            ("Where dynamic stretching fits", """
<p>Dynamic stretching increases range without the strength cost. Research shows <a href="%(dyn)s">dynamic stretching has sustained effects on range of motion</a>, increasing knee-extension range and reducing passive hamstring stiffness. That makes it the natural pre-training choice.</p>
""" % {"dyn": "https://pmc.ncbi.nlm.nih.gov/articles/PMC6370952/"}),
            ("A practical warm-up template", """
<p>A reasonable sequence, supported by an <a href="%(behm)s">acute stretching review</a>, is submaximal aerobic activity, then dynamic stretching, then sport-specific activity:</p>
<ol>
<li>5 minutes of easy cardio to raise temperature.</li>
<li>Dynamic drills for the joints you will use.</li>
<li>Ramp-up sets or strides specific to the session.</li>
</ol>
<p><a href="%(cc)s">Cleveland Clinic</a> frames it the same way: dynamic before activity, static for flexibility and cool-down.</p>
""" % {"behm": "https://pubmed.ncbi.nlm.nih.gov/21373870/", "cc": "https://health.clevelandclinic.org/dynamic-stretching-vs-static-stretching"}),
            ("Static stretching for long-term flexibility", """
<p>Saved for after training or separate sessions, static stretching is still one of the best tools for building lasting range. The penalty only applies right before explosive or maximal effort.</p>
<div class="rx-note flag"><strong>Red flag.</strong> Needing to stretch to relieve recurring joint pain, rather than muscle tightness, suggests a different problem worth a clinician's assessment.</div>
"""),
            ("Build your warm-up", """
<p>Which drills you actually need depends on your range. ROMRx Base identifies your tightest, least-controlled joints so your dynamic warm-up targets them instead of a generic list.</p>
"""),
        ],
        "faq": [
            ("Is static stretching bad before lifting?", "Not in short doses. Holds of 60 seconds or less inside a full warm-up have a trivial effect on performance. Only holds over 60 seconds meaningfully reduce strength and power."),
            ("What is dynamic stretching?", "Dynamic stretching moves a joint through its range repeatedly, such as leg swings or arm circles, to raise range and prepare movement without holding at end range."),
            ("Should runners stretch before or after?", "Dynamic drills before a run help prepare movement; save longer static holds for after or separate sessions to build flexibility."),
            ("Does stretching reduce strength?", "Long static holds over 60 seconds can reduce strength and power by roughly 4 to 7.5 percent acutely. Short holds and dynamic work do not carry that penalty."),
            ("When should I do static stretching?", "After training or on its own, when a small temporary dip in power does not matter, so you can build lasting range safely."),
        ],
        "related": ["how-long-to-hold-a-stretch", "do-you-need-to-warm-up", "does-foam-rolling-improve-range-of-motion", "mobility-vs-flexibility"],
    },
    {
        "slug": "hip-mobility-for-squats",
        "cluster": "Squat Mobility",
        "kw": "hip mobility for squats",
        "title": "Hip Mobility for Squats: A How-To Guide",
        "card": "Hip Mobility for Squats",
        "meta": "Improve hip mobility for squats with evidence-informed drills, learn why stance and foot angle matter, and train strength through your new range so it sticks.",
        "h1": "How to Improve Hip Mobility for Squats",
        "excerpt": "Why depth usually comes from range plus strength plus stance, not stretching alone, and when a pinch means stop.",
        "llm": "How-to for hip mobility for squats: add range, individualize stance and foot angle, and strengthen end range; escalate a sharp groin pinch.",
        "answer": "<strong>Better hip mobility for squats comes from adding range and then strengthening it, not stretching alone.</strong> Deeper squatting usually needs a mix of hip and often ankle range plus strength through that range. Adjusting stance width and foot angle to fit your hip anatomy often unlocks depth immediately, while a sharp pinch in the front of the hip means assess, not force.",
        "howto": {
            "name": "Build hip mobility for a deeper squat",
            "steps": [
                {"name": "Screen the limiter", "text": "Check whether hips, ankles, or technique is holding depth back before adding drills."},
                {"name": "Test hip range", "text": "Measure hip flexion and rotation and compare left to right to set a baseline."},
                {"name": "Do loaded end-range work", "text": "Use deep goblet squats, controlled 90/90 rotations, and time in the bottom position."},
                {"name": "Individualize stance", "text": "Widen stance and turn the toes out until depth improves without a pinch."},
                {"name": "Strengthen the range", "text": "Add tempo and pause squats so the new range becomes usable, not just passive."},
            ],
        },
        "sections": [
            ("Is it hips, ankles, or technique", """
<p>Missing depth is not always a hip problem. Limited ankle dorsiflexion, an over-narrow stance, or bracing habits can all cap depth. Rule those in or out before you spend weeks stretching hips that may not be the limiter.</p>
"""),
            ("Assess your hip range first", """
<p>Measure hip flexion and rotation and compare sides. A baseline tells you whether you truly lack range or simply lack control and stance fit. Norms are guides, so your own trend matters most.</p>
"""),
            ("Drills that build usable hip mobility for squats", """
<p>Flexibility responds to a dose of roughly <a href="%(dose)s">10 minutes per muscle group per week</a>, but range only becomes usable when you load it. A meta-analysis on <a href="%(rom)s">range of motion in resistance training</a> found full-range training produces greater lower-limb strength and hypertrophy, which is how new range becomes reliable depth.</p>
<h3>Loaded and end-range work</h3>
<p>Deep goblet squats, controlled 90/90 transitions, and cossack squats train range under tension.</p>
<h3>Time in the bottom position</h3>
<p>Accumulating relaxed time in a supported deep squat teaches the position and builds tolerance.</p>
""" % {"dose": L_DOSE, "rom": L_ROMADAPT}),
            ("Adjust stance and foot angle for your anatomy", """
<p>Hip socket shape varies a lot between people, so there is no single correct stance. Widening the feet and turning the toes out often unlocks depth immediately by routing the thigh bones around the pelvis. This is individualization, not cheating.</p>
"""),
            ("Strengthen the new range so it sticks", """
<p>Pause squats, tempo work, and full-range accessory lifts turn borrowed passive range into owned mobility. Without loading, gains fade.</p>
"""),
            ("When a pinch is not a mobility problem", """
<div class="rx-note flag"><strong>Red flag.</strong> A sharp anterior groin pinch, catching, or locking during deep flexion can indicate a structural cause such as <a href="%(fai)s">femoroacetabular impingement</a>. That warrants assessment, not aggressive stretching.</div>
""" % {"fai": L_FAI}),
            ("Track your squat mobility", """
<p>ROMRx Base measures hip range, compares sides, and re-checks it over time, so you can tell whether your stance change and loading are actually improving depth.</p>
"""),
        ],
        "faq": [
            ("Why can't I squat deep even though I stretch?", "Because depth needs strength and control through range, not just passive length. If your stance does not fit your hips, or your ankles are limited, stretching alone will not fix it."),
            ("Are tight hips or tight ankles limiting my squat?", "Either can. Test ankle dorsiflexion with a knee-to-wall test and check hip range separately, then target whichever is actually short."),
            ("How long does it take to improve hip mobility?", "It varies by person and starting point. Stance changes can help immediately, while range and strength gains build over weeks of consistent, loaded work."),
            ("Should I change my squat stance?", "Often yes. Widening the stance and turning the toes out to fit your hip anatomy frequently unlocks depth without any extra mobility work."),
            ("Is a pinch in my hip normal when squatting?", "A sharp pinch in the front of the hip is not something to force through. It can be structural, so have persistent or catching pain assessed by a clinician."),
        ],
        "related": ["ankle-dorsiflexion-for-squats", "hip-impingement-deep-squat", "full-vs-partial-range-of-motion", "hip-mobility-for-bjj"],
    },
]

L_JOSPT = "https://www.jospt.org/doi/10.2519/jospt.2019.8697"
L_FROZEN = "https://orthoinfo.aaos.org/en/diseases--conditions/frozen-shoulder/"
L_BJSM = "https://bjsm.bmj.com/content/51/7/562"
L_BEHM = "https://pubmed.ncbi.nlm.nih.gov/21373870/"
L_STATIC = "https://pmc.ncbi.nlm.nih.gov/articles/PMC6895680/"
L_DYN = "https://pmc.ncbi.nlm.nih.gov/articles/PMC6370952/"
L_WOLF = "https://journal.iusca.org/index.php/Journal/article/view/182"
L_KASS = "https://pubmed.ncbi.nlm.nih.gov/36662126/"
L_BROOK = "https://brookbushinstitute.com/articles/exercise-range-of-motion-and-hypertrophy"
L_FOAM_LONG = "https://pmc.ncbi.nlm.nih.gov/articles/PMC9474417/"
L_FOAM_REC = "https://pubmed.ncbi.nlm.nih.gov/32825976/"
L_FOAM_ACUTE = "https://pubmed.ncbi.nlm.nih.gov/31628662/"
L_AAFP = "https://www.aafp.org/afp/2009/1215/p1429"
L_STATPEARLS = "https://www.ncbi.nlm.nih.gov/books/NBK547699/"
L_TTFLOOR = "https://pubmed.ncbi.nlm.nih.gov/3671506/"
L_HAMSTRETCH = "https://pubmed.ncbi.nlm.nih.gov/22935854/"

ARTICLES_LIST += [
    {
        "slug": "how-to-measure-range-of-motion-progress",
        "cluster": "Foundations",
        "kw": "measure range of motion",
        "title": "How to Measure Range of Motion and Track Progress",
        "card": "Measure and Track Range of Motion",
        "meta": "Learn how to measure range of motion at home with tape tests, photos, and goniometer apps, then track active and passive range against your own baseline.",
        "h1": "How to Measure Range of Motion and Track Your Progress",
        "excerpt": "Reliable at-home ways to put a number on your range, from tape tests to goniometer apps, and how to make the measurement repeatable.",
        "llm": "How-to for measuring range of motion at home with tape tests, photos, and goniometer apps, standardizing conditions and tracking active and passive range.",
        "answer": "<strong>You can measure range of motion at home reliably without a lab.</strong> Distance tests such as the knee-to-wall test (about 1 cm of toe-to-wall distance equals roughly 3.6 degrees of ankle dorsiflexion), consistent photos or video, and a goniometer or phone app in degrees all work. The keys are standardizing conditions, recording both active and passive range, and comparing against your own baseline and side to side rather than a population chart.",
        "howto": {
            "name": "Measure and track your range of motion at home",
            "steps": [
                {"name": "Pick one method per joint", "text": "Choose a tape test, a photo from a fixed angle, or a goniometer app, and use the same one every time."},
                {"name": "Standardize the setup", "text": "Warm up the same way, use the same position, and measure at a similar time of day."},
                {"name": "Record active then passive", "text": "Measure how far you move the joint yourself, then how far it goes with gentle help, and note both."},
                {"name": "Compare left to right", "text": "Measure both sides so you track asymmetry, not just a single number."},
                {"name": "Re-test on a schedule", "text": "Re-measure every few weeks and log the trend rather than reacting to one session."},
            ],
        },
        "sections": [
            ("Why measurement beats feel", """
<p>How a stretch feels is a poor progress gauge, because warmth, mood, and stretch tolerance change day to day. A number you can repeat removes the guesswork. When you measure range of motion consistently, you can tell whether a routine is working or just feeling different.</p>
"""),
            ("Simple ways to measure range of motion at home", """
<p>Reliability studies show even novice raters can get consistent numbers with basic tools. A study on <a href="%(dorsi)s">three ankle dorsiflexion measures</a> found goniometer, inclinometer, and tape methods were all reliable, and that 1 cm of toe-to-wall distance equals about 3.6 degrees.</p>
<h3>Distance and tape tests</h3>
<p>Toe-touch reach, a pancake distance, or the <a href="%(wblt)s">weight-bearing lunge test</a> (measure toe-to-wall in centimeters) give repeatable field numbers.</p>
<h3>Photo and video from a fixed angle</h3>
<p>Mark where the camera and your body sit, then compare frames over time. Community trackers note that video often reveals less progress than it feels like, which is exactly why it is useful.</p>
<h3>Goniometer and phone apps</h3>
<p>A goniometer or a phone goniometer app reads joint angles in degrees, which you can compare against the <a href="%(aaos)s">AAOS reference chart</a> while treating norms as a guide, not a cutoff.</p>
""" % {"dorsi": L_DORSI, "wblt": L_WBLT, "aaos": L_AAOS}),
            ("Make measurements repeatable", """
<p>Consistency is what makes a number trustworthy. Use the same warm-up, the same position, the same tool, and a similar time of day. A measurement taken cold on Monday and warm on Friday is not a fair comparison.</p>
"""),
            ("Measure both active and passive range", """
<p>Record active range (moved by your own muscles) and passive range (moved by gravity, a strap, or your hand) separately. The gap between them tells you whether to strengthen or stretch, a distinction that a single number hides.</p>
"""),
            ("What a meaningful change looks like", """
<p>Small session-to-session wobble is normal. A trend across several re-tests matters more than one reading. On the lunge test, a side-to-side difference greater than about 2 to 3 cm is worth noting, especially with symptoms.</p>
<div class="rx-note flag"><strong>Red flag.</strong> If measuring reveals a sudden loss of range with pain, swelling, or locking, treat that as a reason to see a clinician, not a data point to train through.</div>
"""),
            ("A standardized profile with ROMRx", """
<p>Doing this by hand across many joints is tedious and easy to do inconsistently. ROMRx Base standardizes the assessment, stores your baseline, compares sides, and re-checks over time so your trend is apples to apples.</p>
"""),
        ],
        "faq": [
            ("How do I measure range of motion at home?", "Use a repeatable method per joint: a tape or distance test, a photo from a fixed angle, or a goniometer app in degrees. Standardize your warm-up and position so readings compare fairly."),
            ("Are goniometer phone apps accurate enough?", "For tracking your own trend, yes. Reliability studies show basic tools give consistent readings when used the same way each time. Consistency matters more than the specific tool."),
            ("Should I measure active or passive range?", "Both. Active range shows what you control; passive range shows what is available. The gap between them tells you whether to strengthen or stretch."),
            ("How much change is meaningful?", "Look for a trend across several re-tests rather than one session. Day-to-day wobble is normal, so a consistent shift in your baseline is the signal."),
            ("How often should I re-test my range of motion?", "Every few weeks is plenty for most goals. Re-testing too often mostly captures daily noise rather than real change."),
        ],
        "related": ["what-is-normal-range-of-motion", "mobility-vs-flexibility", "one-side-more-flexible-asymmetry", "ankle-dorsiflexion-for-squats"],
    },
    {
        "slug": "do-you-need-to-warm-up",
        "cluster": "Stretching & Warm-Up",
        "kw": "warm up",
        "title": "Do You Need to Warm Up? What the Evidence Says",
        "card": "Do You Need to Warm Up",
        "meta": "Is a warm up worth the time before training? See what research shows about performance and injury risk, and follow a short, effective dynamic warm up.",
        "h1": "Do You Really Need to Warm Up (and How)",
        "excerpt": "What a warm-up actually does, what the injury evidence shows, and a short dynamic structure you can keep.",
        "llm": "Explains what a warm up does, cites FIFA 11+ injury reduction, and gives a general to dynamic to ramp-up structure; long static holds fit later.",
        "answer": "<strong>A warm up is a low-cost habit that prepares your body to train.</strong> It raises tissue temperature and blood flow and rehearses movement patterns. Structured dynamic warm up programs can meaningfully reduce injury risk in sport, so a short sequence of easy activity, dynamic stretching, and activity-specific ramp-up sets is worth the few minutes, while long static holds are better saved for after training or separate sessions.",
        "howto": {
            "name": "A simple, effective warm up",
            "steps": [
                {"name": "General warm up", "text": "Do about 5 minutes of easy cardio to raise temperature and blood flow."},
                {"name": "Dynamic stretching", "text": "Move the joints you will use through their range, such as leg swings, lunges, and arm circles."},
                {"name": "Activity-specific ramp-up", "text": "Do lighter sets or strides that build toward your working effort."},
                {"name": "Keep dynamic volume modest", "text": "Avoid excessive repeats of the same drill so you do not fatigue before the session."},
            ],
        },
        "sections": [
            ("What a warm up actually does", """
<p>A warm up raises muscle temperature and blood flow and primes the movement patterns you are about to load. That combination helps you feel ready and move well from the first working set, rather than easing in over several sets.</p>
"""),
            ("Warm up vs stretching, not the same", """
<p>People often equate warming up with static stretching, but they are different jobs. A warm up prepares you to perform now; long static stretching mainly builds flexibility over time and can briefly reduce power if done heavily right before effort. Save the long holds for later.</p>
"""),
            ("What the injury evidence shows", """
<p>The strongest evidence comes from sport-specific programs. A systematic review and meta-analysis of the <a href="%(bjsm)s">FIFA 11+ warm up</a> found it reduced overall football injuries by about 39 percent, with notable reductions in hamstring, hip and groin, knee, and ankle injuries. That is a structured dynamic routine, not a few toe-touches.</p>
<p>Short static stretches inside a full warm up may even <a href="%(static)s">lower musculotendinous injury risk in high-intensity activity</a>, so brief holds are not off-limits, they are just not the whole warm up.</p>
""" % {"bjsm": L_BJSM, "static": L_STATIC}),
            ("A simple, effective warm up structure", """
<p>A well-supported sequence, described in an <a href="%(behm)s">acute stretching review</a>, is submaximal aerobic activity, then dynamic stretching, then sport-specific activity:</p>
<ol>
<li>About 5 minutes of easy cardio.</li>
<li>Dynamic drills for the joints you will train.</li>
<li>Ramp-up or warm-up sets specific to the session.</li>
</ol>
""" % {"behm": L_BEHM}),
            ("How long is enough", """
<p>For most training, 5 to 10 minutes covers it. More is not automatically better: doing many repeats of the same dynamic drill can cause fatigue and blunt sprint performance, so keep the volume modest and specific.</p>
<div class="rx-note flag"><strong>Red flag.</strong> Needing to stretch to relieve recurring joint pain, rather than general muscle tightness, points to a different problem worth a clinician's assessment.</div>
"""),
            ("Prime your key ranges with ROMRx", """
<p>A generic warm up ignores where you are actually restricted. ROMRx Base flags your tightest, least-controlled joints so your dynamic drills target them instead of a one-size list.</p>
"""),
        ],
        "faq": [
            ("Is warming up actually necessary?", "For quality and comfort, yes. A warm up raises temperature and blood flow and rehearses movement, and structured dynamic programs can reduce injury risk in sport. It is a low-cost habit."),
            ("What is the difference between a warm up and stretching?", "A warm up prepares you to perform now; long static stretching builds flexibility over time. Dynamic stretching fits inside a warm up, while long holds are better saved for later."),
            ("How long should a warm up be?", "About 5 to 10 minutes for most training: a few minutes of easy cardio, dynamic drills, then activity-specific ramp-up sets. Keep dynamic volume modest to avoid fatigue."),
            ("Does warming up prevent injury?", "It can reduce risk. Sport-specific dynamic programs like the FIFA 11+ cut injuries meaningfully, but no warm up guarantees prevention for every individual, so we say it reduces avoidable risk."),
            ("What is a good dynamic warm up?", "Easy cardio, then leg swings, lunges, and arm circles through the ranges you will use, then lighter ramp-up sets that build toward your working effort."),
        ],
        "related": ["static-vs-dynamic-stretching", "how-long-to-hold-a-stretch", "does-foam-rolling-improve-range-of-motion", "hip-mobility-for-squats"],
    },
    {
        "slug": "does-foam-rolling-improve-range-of-motion",
        "cluster": "Stretching & Warm-Up",
        "kw": "foam rolling",
        "title": "Does Foam Rolling Improve Range of Motion?",
        "card": "Does Foam Rolling Improve Range of Motion",
        "meta": "Does foam rolling improve range of motion? Reviews show short-term gains and recovery help. See how it compares with stretching and how to use it well.",
        "h1": "Does Foam Rolling Improve Range of Motion?",
        "excerpt": "What the reviews show about short-term and long-term range, recovery, and how foam rolling compares to stretching.",
        "llm": "Foam rolling gives reliable short-term range-of-motion gains and reduces soreness; long-term gains are muscle-dependent and it complements rather than replaces stretching.",
        "answer": "<strong>Foam rolling does improve range of motion, mostly in the short term.</strong> Reviews show it reliably increases range right after use without hurting performance, and it can reduce muscle soreness, which makes it a useful warm-up and recovery tool. Longer programs of more than about four weeks can also raise joint range in some muscles, but gains are muscle-dependent and it is not clearly better than stretching, so treat it as a complement.",
        "sections": [
            ("The short answer on foam rolling", """
<p>Foam rolling earns a place in a routine, with realistic expectations. It gives dependable short-term range increases and helps recovery, but it does not permanently reshape tissue, and it is best paired with stretching and strength rather than used as a replacement.</p>
"""),
            ("Acute, short-term range of motion effects", """
<p>An acute <a href="%(acute)s">meta-analysis of foam rolling and stretching</a> documents measurable short-term range-of-motion increases after rolling. A separate <a href="%(rec)s">meta-analysis</a> found foam rolling produces a short-term flexibility improvement and does not impair performance, which is why it fits well in a warm up.</p>
""" % {"acute": L_FOAM_ACUTE, "rec": L_FOAM_REC}),
            ("Long-term range of motion effects", """
<p>Over time the picture is more nuanced. A <a href="%(long)s">Sports Medicine meta-analysis on long-term foam rolling</a> found it can increase joint range in young healthy people, that effects are muscle and joint dependent, and that more than four weeks of consistent work is needed to see change.</p>
""" % {"long": L_FOAM_LONG}),
            ("Recovery and soreness", """
<p>Beyond range, rolling can blunt muscle soreness and aid perceived recovery after hard sessions, which can help you train more consistently even when the direct flexibility effect is modest.</p>
"""),
            ("Foam rolling vs stretching, and combined", """
<p>Rolling is not clearly superior to stretching for building range, and the two are often used together: roll to prime tissue and reduce soreness, stretch and strengthen to build lasting range. Much of the acute benefit likely involves neural and perceptual changes rather than the roller physically lengthening tissue.</p>
<div class="rx-note"><strong>Myth.</strong> Foam rolling does not break up fascia or permanently lengthen a muscle. The acute gain fades, which is why ongoing training still matters.</div>
"""),
            ("How to use it practically", """
<ul>
<li><strong>Before training:</strong> 30 to 60 seconds per muscle to prime range in a warm up.</li>
<li><strong>After training:</strong> a few slow passes to help soreness and recovery.</li>
<li><strong>Pair it:</strong> follow with dynamic drills before, or stretching after, to build range that sticks.</li>
</ul>
<div class="rx-note flag"><strong>Red flag.</strong> Do not roll directly over an acute injury, an area of numbness, or a specific painful joint. Persistent localized pain warrants assessment.</div>
"""),
            ("Measure what changes for you", """
<p>Because foam-rolling gains vary by muscle and person, measuring is the only way to know what helps you. ROMRx Base gives you a baseline so you can see whether rolling actually moves your range.</p>
"""),
        ],
        "faq": [
            ("Does foam rolling make you more flexible?", "In the short term, yes. Reviews show reliable range-of-motion gains right after rolling. Longer programs of more than about four weeks can raise range in some muscles, but effects are muscle-dependent."),
            ("Should I foam roll before or after a workout?", "Both work. Before training it primes range without hurting performance; after training it can reduce soreness and aid recovery."),
            ("Is foam rolling better than stretching?", "Not clearly. It is not superior to stretching for building lasting range, so it is best used alongside stretching and strength rather than as a replacement."),
            ("How long should I foam roll?", "About 30 to 60 seconds per muscle is a practical dose in a warm up. A few slow passes after training can help soreness."),
            ("Does foam rolling reduce soreness?", "Evidence suggests it can blunt muscle soreness and improve perceived recovery after hard sessions, which helps you train consistently."),
        ],
        "related": ["static-vs-dynamic-stretching", "how-long-to-hold-a-stretch", "do-you-need-to-warm-up", "mobility-vs-flexibility"],
    },
    {
        "slug": "full-vs-partial-range-of-motion",
        "cluster": "Strength & Range",
        "kw": "full vs partial range of motion",
        "title": "Full vs Partial Range of Motion: What Builds More?",
        "card": "Full vs Partial Range of Motion",
        "meta": "Full vs partial range of motion for muscle and strength: see what meta-analyses show about long-length training, lengthened partials, and when partials help.",
        "h1": "Full vs Partial Range of Motion for Strength and Muscle",
        "excerpt": "What the meta-analyses really show about training range, lengthened partials, and the specificity effect.",
        "llm": "Compares full and partial range of motion in training: full or long ROM tends to favor strength and lower-body hypertrophy, with a specificity effect and a role for partials.",
        "answer": "<strong>For most lifters, full vs partial range of motion favors training the fullest pain-free range.</strong> Across meta-analyses, full or long range of motion tends to win for strength and especially lower-body hypertrophy, though overall differences are often small. Training at long muscle lengths is a smart default, partials remain a useful variation or workaround, and there is a specificity effect: strength improves most in the range you actually train.",
        "sections": [
            ("Definitions: full, partial, and lengthened partials", """
<p>Full range of motion means moving a joint through its available pain-free arc under load. Partial range trains a portion of that arc. Lengthened partials train the stretched portion (for example the bottom of a curl), which has drawn recent interest for hypertrophy.</p>
"""),
            ("What the meta-analyses show for full vs partial range of motion", """
<p>A <a href="%(rom)s">systematic review and meta-analysis</a> found full range of motion produced significantly greater strength and lower-limb hypertrophy than partial range. A separate <a href="%(wolf)s">2023 meta-analysis</a> found only a trivial overall effect favoring full range, plus a clear specificity of range to outcome, and concluded partial range is still an efficacious alternative.</p>
<h3>Strength and lower-body hypertrophy</h3>
<p>The clearest advantage for full range shows up in lower-body strength and size.</p>
<h3>The specificity effect</h3>
<p>You get strongest in the range you train, so if a position matters to you, train it under load.</p>
<h3>Lengthened partials</h3>
<p>A review of <a href="%(kass)s">training at long muscle lengths</a> suggests emphasizing the lengthened portion can optimize growth for muscles like the quadriceps, biceps, and triceps, but this is a tool, not a mandate.</p>
""" % {"rom": L_ROMADAPT, "wolf": L_WOLF, "kass": L_KASS}),
            ("A practical default", """
<p>The <a href="%(brook)s">practical conclusion from a range-of-motion and hypertrophy review</a> is to prioritize the largest pain-free range you can control, with load progression as the main driver of results. Use full range as the default and add lengthened partials or partials as accessories.</p>
""" % {"brook": L_BROOK}),
            ("When partials are useful", """
<ul>
<li><strong>Working around a painful range</strong> while you address it.</li>
<li><strong>Overloading a strong position</strong> (for example rack pulls) for specific goals.</li>
<li><strong>Adding stimulus at long lengths</strong> once full-range work is banked.</li>
</ul>
"""),
            ("Joints, tendons, and usable range", """
<p>Training through range also builds strength at end range, which is where usable mobility comes from. This is why "flexible but weak at end range" positions feel unstable, and why loading the range you own matters.</p>
<div class="rx-note flag"><strong>Red flag.</strong> Temporarily reducing range to avoid a painful arc is reasonable, but persistent pain in a specific range warrants assessment rather than pushing through.</div>
"""),
            ("Assess your training range with ROMRx", """
<p>Knowing your pain-free range for each joint tells you how far to load. ROMRx Base measures that range so your full-range work is genuinely full for your anatomy.</p>
"""),
        ],
        "faq": [
            ("Is full range of motion better for muscle growth?", "Often, especially for the lower body, though overall differences can be small. Training at long muscle lengths is a smart default for hypertrophy."),
            ("Do partial reps build muscle?", "Yes. Partial range is an efficacious alternative and can add useful stimulus, particularly lengthened partials, but it is best layered onto full-range work."),
            ("Are lengthened partials better than full reps?", "Not clearly better overall. Evidence supports training long muscle lengths, but load and volume dominate results, so use lengthened partials as a tool, not a replacement."),
            ("When should I use partial range of motion?", "To work around a painful arc, to overload a strong position, or to add long-length stimulus once you have banked full-range training."),
            ("Does training range of motion protect joints?", "Training through range builds end-range strength and usable control, which can support joint resilience, but no exercise guarantees injury prevention."),
        ],
        "related": ["mobility-vs-flexibility", "hip-mobility-for-squats", "why-cant-i-touch-my-toes", "what-is-normal-range-of-motion"],
    },
    {
        "slug": "ankle-dorsiflexion-for-squats",
        "cluster": "Squat Mobility",
        "kw": "ankle dorsiflexion",
        "title": "Ankle Dorsiflexion for Squats: Test and Fix It",
        "card": "Ankle Dorsiflexion for Squats",
        "meta": "Limited ankle dorsiflexion wrecks squat depth. Learn the knee-to-wall test, the numbers that matter, and drills to build usable range you can load.",
        "h1": "How to Improve Ankle Dorsiflexion for Squatting",
        "excerpt": "Test ankle range objectively with the knee-to-wall test, read the numbers, and build range you can actually load.",
        "llm": "How-to for ankle dorsiflexion for squats: measure with the weight-bearing lunge test (about 10 cm good), build range, load it, and use heel lifts as a workaround.",
        "answer": "<strong>Ankle dorsiflexion is a common squat limiter you can measure objectively.</strong> Use the weight-bearing lunge (knee-to-wall) test, where roughly 10 cm or more of toe-to-wall is good functional range and a side-to-side difference greater than about 2 to 3 cm is worth noting. Limited dorsiflexion shifts movement strategy up the chain, and range usually improves with loaded mobility work plus temporary tools like a heel lift.",
        "howto": {
            "name": "Test and improve ankle dorsiflexion for squats",
            "steps": [
                {"name": "Run the knee-to-wall test", "text": "Face a wall, drive the knee forward over the toes without lifting the heel, and measure toe-to-wall distance in centimeters."},
                {"name": "Compare both ankles", "text": "Test each side and note any difference greater than about 2 to 3 cm."},
                {"name": "Do loaded mobility drills", "text": "Use weighted knee-to-wall reps, deep goblet squats, and calf work through full range."},
                {"name": "Load the new range", "text": "Add tempo squats and pauses so the range becomes usable under a bar."},
                {"name": "Use a heel lift if needed", "text": "Train with lifted heels while range improves, then retest periodically."},
            ],
        },
        "sections": [
            ("Why ankle dorsiflexion drives squat depth", """
<p>To squat deep with an upright torso, the knees must travel forward over the toes, which requires ankle dorsiflexion. When it is limited, the body compensates: heels lift, the torso pitches forward, or the stance widens. Fixing the ankle often unlocks depth that hip stretching could not.</p>
"""),
            ("Test it: the weight-bearing lunge (knee-to-wall) test", """
<p>The <a href="%(wblt)s">weight-bearing lunge test</a> is a reliable field measure. Face a wall, step one foot back, and push the front knee toward the wall without the heel rising. Measure the toe-to-wall distance.</p>
<h3>What the numbers mean</h3>
<p>As a guide, about 10 cm or more is good functional range, roughly 6 to 9 cm is moderate, and under 6 cm is restricted. This lunge test primarily reflects <a href="%(jospt)s">true ankle (talocrural) dorsiflexion</a>, which is what you want for squatting.</p>
<h3>Side-to-side differences</h3>
<p>A difference greater than about 2 to 3 cm between ankles is worth addressing, especially if one side also feels blocked or sore. In degrees, <a href="%(dorsi)s">1 cm of toe-to-wall equals roughly 3.6 degrees</a>.</p>
""" % {"wblt": L_WBLT, "jospt": L_JOSPT, "dorsi": L_DORSI}),
            ("Drills to build ankle range", """
<ul>
<li><strong>Weighted knee-to-wall:</strong> gentle rocking into end range, adding light load or a hand-driven push.</li>
<li><strong>Deep goblet squat holds:</strong> time in the bottom with heels down.</li>
<li><strong>Calf work through full range:</strong> slow eccentrics to build tolerance and strength.</li>
</ul>
"""),
            ("Load the new range", """
<p>Passive gains fade without loading. Tempo squats, paused squats, and controlled calf strengthening turn borrowed range into range you can use under a bar.</p>
"""),
            ("Shoes, heel lifts, and stance workarounds", """
<p>Heel-elevated lifting shoes or a small plate under the heels are legitimate tools, not cheating. They let you train depth while range improves. Widening the stance slightly can also reduce the dorsiflexion demand.</p>
<div class="rx-note flag"><strong>Red flag.</strong> Ankle pain, a history of repeated sprains, a blocking sensation, or a hard bony end-feel can indicate a joint restriction that should be assessed rather than stretched aggressively.</div>
"""),
            ("Track ankle range over time with ROMRx", """
<p>The lunge test is easy to repeat, and ROMRx Base logs it alongside your other joints so you can confirm your drills are actually adding usable ankle dorsiflexion.</p>
"""),
        ],
        "faq": [
            ("How do I test my ankle dorsiflexion at home?", "Use the knee-to-wall test: drive your knee toward a wall without lifting the heel and measure toe-to-wall distance. Compare both sides and track the number over time."),
            ("How much ankle dorsiflexion do I need to squat?", "As a guide, about 10 cm or more on the knee-to-wall test is good functional range. Less than 6 cm is restricted and often limits an upright deep squat."),
            ("Why do my heels lift when I squat?", "Usually limited ankle dorsiflexion. When the knee cannot travel far enough over the toes, the heel rises to let you reach depth. Building ankle range and using a heel lift both help."),
            ("Do heel-lifted lifting shoes fix ankle mobility?", "They work around limited range rather than fixing it, which is useful for training now. Pair them with mobility and loading work if you also want to build range."),
            ("How long to improve ankle mobility?", "It varies by person and starting point. Consistent loaded work over several weeks usually moves the knee-to-wall number, while a heel lift helps you train in the meantime."),
        ],
        "related": ["hip-mobility-for-squats", "what-is-normal-range-of-motion", "how-to-measure-range-of-motion-progress", "static-vs-dynamic-stretching"],
    },
    {
        "slug": "hip-impingement-deep-squat",
        "cluster": "Squat Mobility",
        "kw": "hip impingement",
        "title": "Hip Impingement or Tight Hips When You Squat?",
        "card": "Hip Pinch in a Deep Squat",
        "meta": "A pinch in the front of the hip at squat depth is not always tightness. Learn what hip impingement is, the signs that suggest it, and when to see a clinician.",
        "h1": "Hip Pinch in a Deep Squat: Mobility or Hip Impingement?",
        "excerpt": "How to tell benign tightness from a structural cause, what often helps, and when a hip pinch needs a clinician.",
        "llm": "Explains hip impingement (FAI) versus tight hips in a deep squat, signs of a structural cause, simple adjustments that help, and escalation criteria.",
        "answer": "<strong>A front-of-hip pinch at squat depth can be tightness, but it can also be hip impingement.</strong> Hip impingement (femoroacetabular impingement, or FAI) is a structural condition where extra bone changes joint shape and causes groin pain with squatting, twisting, and prolonged sitting. Simple changes like a wider stance, adjusted foot angle, and glute activation often help, but sharp, catching, or persistent pain should be assessed rather than forced through.",
        "sections": [
            ("What the pinch usually feels like", """
<p>A mobility-type pinch is often a vague crowding at the front of the hip only at the very bottom of a squat, easing when you shift stance. A structural pinch tends to be sharper, more consistent, and can linger after training or with long sitting.</p>
"""),
            ("What hip impingement (FAI) is", """
<p>According to <a href="%(fai)s">AAOS OrthoInfo</a>, FAI involves abnormal bone shape where the ball and socket rub, and groin pain with turning, twisting, and squatting is common; persistent symptoms need a doctor because delay can worsen joint damage. An <a href="%(aafp)s">AAFP review</a> notes anterolateral hip or groin pain aggravated by prolonged sitting, leaning forward, and pivoting.</p>
""" % {"fai": L_FAI, "aafp": L_AAFP}),
            ("Signs that suggest a structural cause", """
<p><a href="%(sp)s">StatPearls</a> describes FAI classically presenting with gradual hip pain worsened by hip flexion and internal rotation, with non-operative measures tried first. Suggestive signs include:</p>
<ul>
<li>Sharp groin pain rather than a muscular stretch feeling.</li>
<li>Catching, clicking, or locking deep in the hip.</li>
<li>Pain that lingers after activity or with long sitting.</li>
</ul>
""" % {"sp": L_STATPEARLS}),
            ("Simple things that often help", """
<p>Many people reduce a hip pinch by fitting the squat to their anatomy: widen the stance, turn the toes out, and focus on glute activation and knees tracking over the toes. Because hip socket shape varies, this individualization is legitimate, not cheating, and exercise does not cause FAI.</p>
"""),
            ("What not to do", """
<p>Do not aggressively force a painful end range or bounce in the bottom to "open" the hip. That tends to aggravate a structural pinch. Train the pain-free range you have while you sort out the cause.</p>
<div class="rx-note flag"><strong>Red flags.</strong> Sharp groin pain, catching, locking, giving way, or pain that persists beyond simple activity modification should be evaluated by a clinician. This article does not diagnose or treat injury.</div>
"""),
            ("When to see a clinician", """
<p>If adjustments do not resolve a sharp or catching pinch within a few weeks, or symptoms worsen, see a clinician. FAI is diagnosed with a physical exam and imaging, and early management protects the joint.</p>
"""),
            ("Map your pain-free hip range with ROMRx", """
<p>ROMRx Base measures your hip range and compares sides, giving you and any clinician a clear picture of where your pain-free range ends instead of a guess.</p>
"""),
        ],
        "faq": [
            ("Why does the front of my hip pinch when I squat?", "It can be soft-tissue tightness or activation issues, or a structural cause like hip impingement. A vague crowding that eases with stance changes is often benign; a sharp, catching, or lingering pinch may be structural."),
            ("Is hip impingement the same as tight hips?", "No. Hip impingement (FAI) is a structural condition where bone shape changes the joint, whereas tight hips are a soft-tissue issue. They can feel similar, which is why persistent pain should be assessed."),
            ("Can I keep squatting with a hip pinch?", "Often you can train the pain-free range while you address it, using stance and foot-angle changes. Sharp, catching, or worsening pain is a reason to stop forcing depth and get evaluated."),
            ("Does changing my stance help hip impingement?", "Adjusting stance width and foot angle to fit your hip anatomy frequently reduces a pinch. It does not cure a structural cause, but it lets many people train comfortably."),
            ("When should I see a doctor for hip pain?", "See a clinician for sharp groin pain, catching, locking, giving way, or pain that persists despite activity changes. Early assessment of FAI helps protect the joint."),
        ],
        "related": ["hip-mobility-for-squats", "ankle-dorsiflexion-for-squats", "what-is-normal-range-of-motion", "hip-mobility-for-bjj"],
    },
    {
        "slug": "overhead-shoulder-mobility",
        "cluster": "Joint Mobility",
        "kw": "overhead shoulder mobility",
        "title": "Overhead Shoulder Mobility: Drills That Work",
        "card": "Overhead Shoulder Mobility",
        "meta": "Struggling to get your arms fully overhead? Learn what limits overhead shoulder mobility, drills that build range, and the signs that mean see a clinician.",
        "h1": "How to Improve Overhead Shoulder Mobility",
        "excerpt": "What the overhead position needs, the usual limiters, drills to build range, and the frozen-shoulder red flags.",
        "llm": "How-to for overhead shoulder mobility: needs shoulder flexion (about 180 degrees) plus thoracic extension; hangs, band work, and control help; frozen shoulder is a red flag.",
        "answer": "<strong>Overhead shoulder mobility depends on both the shoulder and the upper back.</strong> Getting the arms fully overhead needs roughly 180 degrees of shoulder flexion plus thoracic extension, and most training-age restrictions respond to active hangs, band work, wall slides, and end-range strengthening. But painful, progressive loss of both active and passive shoulder motion can signal frozen shoulder and should be evaluated rather than forced.",
        "howto": {
            "name": "Improve your overhead shoulder mobility",
            "steps": [
                {"name": "Assess overhead reach", "text": "Stand against a wall and raise your arms; note whether the arms reach the wall without the low back arching."},
                {"name": "Free the upper back", "text": "Add thoracic extension and rotation drills so the spine can support overhead reach."},
                {"name": "Do active hangs and band work", "text": "Use supported hangs and banded overhead stretches to build shoulder flexion."},
                {"name": "Add wall slides", "text": "Perform wall slides to train end-range control, not just passive range."},
                {"name": "Strengthen overhead", "text": "Load the overhead position gradually so the range becomes usable."},
            ],
        },
        "sections": [
            ("What the overhead position requires", """
<p>A clean overhead position combines shoulder flexion, normally about 180 degrees on the <a href="%(aaos)s">AAOS reference chart</a>, with thoracic extension. If either is limited, you compensate by arching the low back or flaring the ribs to get the arms up.</p>
""" % {"aaos": L_AAOS}),
            ("Common limiters of overhead shoulder mobility", """
<p>The usual suspects are tight lats and pecs, a stiff thoracic spine, and a lack of end-range control. Because the upper back contributes so much, shoulder work alone often stalls until the t-spine moves better.</p>
"""),
            ("Assess your overhead range", """
<p>Stand with your back to a wall, ribs down, and raise your arms overhead. If the arms cannot reach the wall without the low back arching, you have an overhead restriction to work on. Compare left and right.</p>
"""),
            ("Drills to build range", """
<h3>Active hangs and band work</h3>
<p>Supported hangs and banded overhead stretches build shoulder flexion, and <a href="%(dyn)s">dynamic mobility work produces measurable increases in range</a> and reduced passive stiffness.</p>
<h3>Wall slides and end-range control</h3>
<p>Wall slides train the range with control rather than just stretching into it, which is what turns passive reach into usable overhead position.</p>
""" % {"dyn": L_DYN}),
            ("Strengthen the overhead position", """
<p>Once range improves, load it: light overhead carries, presses in a pain-free range, and controlled lowering. Strength through the new range is what makes it stick.</p>
"""),
            ("When stiffness is not just mobility", """
<div class="rx-note flag"><strong>Red flags.</strong> Per <a href="%(frozen)s">AAOS OrthoInfo</a>, frozen shoulder causes limited active and passive motion, most often at ages 40 to 60, more common in women, and linked to diabetes and thyroid disease. Pain that is worse at night, rapidly shrinking range in all directions, or shoulder pain after trauma should prompt clinician evaluation.</div>
""" % {"frozen": L_FROZEN}),
            ("Track shoulder range with ROMRx", """
<p>ROMRx Base measures shoulder flexion and compares sides so you can tell whether your hangs and band work are actually improving overhead shoulder mobility.</p>
"""),
        ],
        "faq": [
            ("Why can't I get my arms fully overhead?", "Usually a mix of tight lats and pecs, a stiff upper back, and limited end-range control. Because the thoracic spine contributes to overhead reach, shoulder work often stalls until the t-spine moves better."),
            ("Is it my shoulders or my upper back?", "Often both. Overhead reach needs shoulder flexion plus thoracic extension, so test each. If your arms cannot reach a wall overhead without arching the low back, address the upper back too."),
            ("What is normal shoulder flexion?", "About 180 degrees on standard orthopedic charts, which is the overhead target. Norms are guides that vary with anatomy, so compare against your own baseline and side to side."),
            ("How long to improve overhead mobility?", "It varies. Consistent hangs, band work, and t-spine drills plus strengthening usually show change over several weeks, with control improving alongside range."),
            ("Could this be frozen shoulder?", "Possibly, if you have painful, progressive loss of both active and passive motion, night pain, or shrinking range in all directions. That pattern should be evaluated by a clinician rather than forced."),
        ],
        "related": ["thoracic-spine-mobility", "what-is-normal-range-of-motion", "static-vs-dynamic-stretching", "one-side-more-flexible-asymmetry"],
    },
    {
        "slug": "thoracic-spine-mobility",
        "cluster": "Joint Mobility",
        "kw": "thoracic spine mobility",
        "title": "Thoracic Spine Mobility: Best Upper-Back Drills",
        "card": "Thoracic Spine Mobility",
        "meta": "A stiff upper back limits overhead reach and rotation. Learn thoracic spine mobility drills for extension and rotation, and how to strengthen your new range.",
        "h1": "How to Improve Thoracic Spine Mobility (Upper Back)",
        "excerpt": "Why the upper back rotates more than it extends, drills that build range, and how to keep it with strength.",
        "llm": "How-to for thoracic spine mobility: pair extension and rotation drills with rib and scapular control, then strengthen; supports overhead reach and neck comfort.",
        "answer": "<strong>Thoracic spine mobility comes from pairing extension and rotation with control, then strengthening.</strong> The upper back naturally rotates well and extends less, so effective work combines extension over a support, rotation drills, and rib and scapular control, followed by strengthening the new range. This supports overhead reach and neck comfort, and the lumbar spine should not be used to fake thoracic motion.",
        "sections": [
            ("What the thoracic spine does", """
<p>The thoracic spine is built for rotation more than extension, and it is the bridge between your shoulders and your low back. Good upper-back motion lets the shoulders reach overhead and the neck turn comfortably without the low back compensating.</p>
"""),
            ("How it affects shoulders, neck, and breathing", """
<p>A stiff upper back forces the shoulders and neck to make up the difference, which is why thoracic work often unlocks overhead reach (toward the roughly 180 degrees of shoulder flexion on the <a href="%(aaos)s">AAOS chart</a>) and eases neck strain. Rib position and breathing also influence how much extension you can access.</p>
""" % {"aaos": L_AAOS}),
            ("Assess t-spine extension and rotation", """
<p>Check extension by reaching overhead against a wall with ribs down, and rotation by sitting tall and turning to each side. Compare left and right rotation, since asymmetry is common.</p>
"""),
            ("Drills that build thoracic spine mobility", """
<h3>Extension over a support</h3>
<p>Gentle extension over a foam roller or bench, keeping the ribs from flaring, targets the thoracic segments. <a href="%(dyn)s">Dynamic mobility drills produce measurable, lasting increases in range</a> and reduced passive stiffness.</p>
<h3>Rotation drills</h3>
<p>Open books and thread-the-needle build rotation, the motion the thoracic spine is best suited for.</p>
<h3>Wall angels and rib control</h3>
<p>Wall angels train scapular and rib control so the range you gain is usable, not just passive.</p>
""" % {"dyn": L_DYN}),
            ("Strengthen and keep the range", """
<p>Mobility fades if you do not load it. <a href="%(rom)s">Strengthening through range</a> (rows, controlled overhead work, and anti-rotation drills) makes upper-back range durable.</p>
<div class="rx-note"><strong>Myth.</strong> Cracking the upper back does not build lasting mobility; the relief is temporary. Extension should come from the thoracic segments, not by hyperextending the low back.</div>
""" % {"rom": L_ROMADAPT}),
            ("When it needs a clinician", """
<div class="rx-note flag"><strong>Red flags.</strong> Upper-back pain with numbness, tingling, unexplained weight loss, or pain unrelated to movement should be evaluated by a clinician rather than stretched.</div>
"""),
            ("Track upper-back range with ROMRx", """
<p>ROMRx Base helps you track thoracic rotation side to side so you can confirm your drills are closing the gap, not just feeling good in the moment.</p>
"""),
        ],
        "faq": [
            ("Why is my upper back so stiff?", "Often sustained postures and low variety of movement, plus limited rotation practice. The thoracic spine is built to rotate, so it stiffens when daily life keeps it still."),
            ("Does thoracic mobility help shoulder mobility?", "Yes. Overhead reach needs thoracic extension as well as shoulder flexion, so freeing the upper back often unlocks the overhead position when shoulder work alone stalls."),
            ("How often should I do t-spine drills?", "Most days is reasonable for mobility work, since consistency drives change. Pair the drills with strengthening a few times a week so the range sticks."),
            ("Does cracking my back improve mobility?", "No. The relief is temporary and does not build lasting range. Extension and rotation drills plus strengthening are what create durable upper-back mobility."),
            ("Can a stiff t-spine cause neck pain?", "It can contribute. When the upper back does not move well, the neck compensates, so improving thoracic mobility often eases neck strain alongside neck-specific work."),
        ],
        "related": ["overhead-shoulder-mobility", "stiff-neck-limited-range-of-motion", "static-vs-dynamic-stretching", "does-flexibility-decline-with-age"],
    },
]

ARTICLES_LIST += [
    {
        "slug": "why-cant-i-touch-my-toes",
        "cluster": "Joint Mobility",
        "kw": "touch your toes",
        "title": "Can't Touch Your Toes? Here's Why and What Helps",
        "card": "Why You Can't Touch Your Toes",
        "meta": "Can't touch your toes? It is usually hamstring extensibility plus stretch tolerance, not a fixed limit. Learn what the test measures and how to improve it.",
        "h1": "Why You Can't Touch Your Toes (and How to Change It)",
        "excerpt": "What the toe-touch really measures, why stretching alone can plateau, and a simple progression that works.",
        "llm": "Explains that the toe-touch mainly measures hamstring extensibility and hip flexion; combining stretching with active and loaded work improves it for most people.",
        "answer": "<strong>If you can't touch your toes, it is usually hamstring extensibility and stretch tolerance, not a permanent limit.</strong> The standing toe-touch mostly measures hamstring length and hip flexion, so falling short typically reflects stiffer hamstrings plus lower tolerance to the stretch. Combining regular stretching with active, loaded end-range work improves the result for most people, and hinging from the hips matters more than forcing the fingertips down.",
        "howto": {
            "name": "Progress toward touching your toes",
            "steps": [
                {"name": "Hinge from the hips", "text": "Push the hips back with a long spine so the fold comes from the hips, not a rounded back."},
                {"name": "Stretch the hamstrings", "text": "Hold a firm but tolerable hamstring stretch for 30 to 60 seconds, a few sets, most days."},
                {"name": "Add loaded end-range work", "text": "Use exercises like Romanian deadlifts and good-mornings to build strength at long length."},
                {"name": "Train stretch tolerance", "text": "Return often; comfort in the end range improves reach over time."},
                {"name": "Re-test the same way", "text": "Measure fingertip-to-floor from the same setup to track progress."},
            ],
        },
        "sections": [
            ("What happens when you try to touch your toes", """
<p>The standing toe-touch is largely a test of hamstring extensibility and hip flexion. Research shows the <a href="%(visco)s">restricted toe-touch reflects stiffer hamstrings and lower stretch tolerance</a>, and that fingertip-to-floor distance <a href="%(ttf)s">mainly measures trunk and hip flexion limited by hamstring extensibility</a>. It is not a moral verdict on your fitness.</p>
""" % {"visco": L_VISCO, "ttf": L_TTFLOOR}),
            ("Hamstrings, hips, calves, or nerves", """
<p>Most often the limiter is the hamstrings and the hip hinge, but calves and the ability to tilt the pelvis forward play a part. Occasionally nerve tension mimics tightness. Locating the limiter helps you target the right fix.</p>
"""),
            ("Why stretching alone can plateau", """
<p>Passive stretching helps, but many people stall. Adding strength at long muscle lengths often restarts progress. A study of <a href="%(ham)s">workplace hamstring stretching</a> found it increased extensibility and improved trunk and pelvis alignment in forward flexion, and loaded hinge work builds on that.</p>
<h3>Adding active and loaded work</h3>
<p>Romanian deadlifts, good-mornings, and Jefferson curls train the hamstrings under load through range, which improves both tolerance and usable reach.</p>
""" % {"ham": L_HAMSTRETCH}),
            ("A simple progression", """
<ol>
<li>Hinge from the hips with a long spine, hands sliding down the legs.</li>
<li>Hold a tolerable hamstring stretch 30 to 60 seconds, a few sets, most days.</li>
<li>Add loaded end-range work twice a week.</li>
<li>Re-test fingertip-to-floor from the same setup every few weeks.</li>
</ol>
"""),
            ("When it might be nerve tension", """
<div class="rx-note flag"><strong>Red flag.</strong> Pain that shoots down the leg, numbness, or tingling during a forward fold suggests possible nerve involvement rather than simple tightness, and warrants clinician evaluation.</div>
<div class="rx-note"><strong>Nuance.</strong> Bony and proportional differences exist, but most healthy people improve with consistent training, so "some people just can't" is rarely the whole story.</div>
"""),
            ("Track your forward fold with ROMRx", """
<p>ROMRx Base gives you a repeatable baseline so you can see your forward fold improve over weeks instead of guessing from how the stretch feels on a given day.</p>
"""),
        ],
        "faq": [
            ("Does not touching my toes mean I'm unhealthy?", "No. The toe-touch mainly measures hamstring extensibility and hip flexion, not overall health. It is a useful benchmark you can improve, not a verdict."),
            ("Is it my hamstrings or my back?", "Usually the hamstrings and the hip hinge, with the pelvis unable to tilt forward enough. A rounded back can hide a stiff hip hinge, so practice folding from the hips with a long spine."),
            ("How long until I can touch my toes?", "It varies by starting point, but combining stretching with loaded end-range work most weeks moves the number for most people over several weeks to a few months."),
            ("Should I bend my knees to stretch hamstrings?", "A soft knee can help you hinge from the hips and target the hamstrings safely. As range improves, work toward straighter knees while keeping a long spine."),
            ("Could it be a nerve issue?", "If a forward fold causes shooting pain, numbness, or tingling down the leg rather than a stretch feeling, that suggests possible nerve involvement and should be assessed by a clinician."),
        ],
        "related": ["how-long-to-hold-a-stretch", "mobility-vs-flexibility", "full-vs-partial-range-of-motion", "how-to-measure-range-of-motion-progress"],
    },
    {
        "slug": "stiff-neck-limited-range-of-motion",
        "cluster": "Symptoms & Red Flags",
        "kw": "stiff neck",
        "title": "Stiff Neck and Limited Range: Causes, Red Flags",
        "card": "Stiff Neck With Limited Range",
        "meta": "A stiff neck with limited turning is common and often posture-related, but some signs need a clinician. Learn the causes, gentle drills, and the red flags.",
        "h1": "Stiff Neck With Limited Range of Motion: Causes and What Helps",
        "excerpt": "What normal neck range looks like, common causes, gentle approaches, and the red flags that mean see a clinician.",
        "llm": "Explains normal neck range (about 60 degrees rotation each side), posture-related causes, gentle mobility and strengthening, and red flags needing urgent care.",
        "answer": "<strong>A stiff neck with limited turning is usually related to posture and muscle tone, not serious disease.</strong> Normal neck range is roughly 45 degrees of flexion and extension, 45 degrees of side bend, and about 60 degrees of rotation to each side. Gentle range work, movement breaks, thoracic mobility, and neck strengthening help many people, but trauma, neurological symptoms, or fever with neck stiffness need prompt clinician evaluation.",
        "sections": [
            ("What normal neck range looks like", """
<p>The <a href="%(aaos)s">AAOS reference chart</a> lists roughly 45 degrees of cervical flexion and extension, 45 degrees of side bend, and about 60 degrees of rotation each side. As <a href="%(physio)s">Physiopedia notes</a>, cervical range declines with age, so compare against your own baseline and left-versus-right rather than a single cutoff.</p>
""" % {"aaos": L_AAOS, "physio": L_PHYSIO}),
            ("Common causes of a stiff neck", """
<p>Most everyday stiffness relates to sustained positions (long desk or phone time), elevated muscle tone, and low movement variety. <a href="%(age)s">Range naturally varies with age</a> too. These causes respond well to movement rather than rest alone.</p>
""" % {"age": L_AGE}),
            ("Gentle mobility and strengthening approaches", """
<p>Slow, pain-free rotations and side bends, chin nods, and frequent movement breaks help restore comfortable range. Strengthening the deep neck muscles often helps chronic stiffness as much as stretching does.</p>
<div class="rx-note"><strong>Myth.</strong> Aggressive self-cracking does not build lasting range; the relief is temporary.</div>
"""),
            ("The role of the thoracic spine", """
<p>The neck does not work alone. A stiff upper back makes the neck compensate, so thoracic mobility work frequently eases neck stiffness. Pair the two rather than treating the neck in isolation.</p>
"""),
            ("Red flags that mean see a clinician", """
<div class="rx-note flag"><strong>Red flags, escalate promptly.</strong> Neck stiffness after trauma, neck stiffness with fever or severe headache, or stiffness with arm or leg numbness, weakness, or coordination changes need prompt medical care. A persistent inability to move the neck should be evaluated by a professional, not researched away.</div>
"""),
            ("Track neck range safely with ROMRx", """
<p>Once serious causes are ruled out, ROMRx Base helps you track neck rotation side to side so you can see gentle range work is helping over time.</p>
"""),
        ],
        "faq": [
            ("What is normal neck rotation range?", "About 60 degrees of rotation to each side is a common reference value, along with roughly 45 degrees of flexion, extension, and side bend. Range declines with age, so track your own trend."),
            ("Why can't I turn my head fully?", "Usually sustained positions and muscle tone limit comfortable rotation, often with a stiff upper back contributing. Gentle mobility, movement breaks, and strengthening typically help."),
            ("Does posture cause a stiff neck?", "Sustained postures and long static positions are common contributors. The fix is usually more movement variety and strengthening, not simply sitting perfectly still."),
            ("Should I stretch or strengthen a stiff neck?", "Both help. Gentle range work restores comfortable motion, and strengthening the deep neck muscles often helps chronic stiffness as much as stretching."),
            ("When is a stiff neck an emergency?", "Seek prompt care for neck stiffness after trauma, with fever or severe headache, or with arm or leg numbness, weakness, or coordination changes. These are not for self-treatment."),
        ],
        "related": ["thoracic-spine-mobility", "what-is-normal-range-of-motion", "does-flexibility-decline-with-age", "how-to-measure-range-of-motion-progress"],
    },
    {
        "slug": "knee-range-of-motion",
        "cluster": "Symptoms & Red Flags",
        "kw": "knee range of motion",
        "title": "Knee Range of Motion: Bend and Straighten Guide",
        "card": "Knee Range of Motion",
        "meta": "Learn normal knee range of motion, why a knee may not fully bend or straighten, and the signs like locking or giving way that need a clinician.",
        "h1": "Knee Range of Motion: When It Won't Fully Bend or Straighten",
        "excerpt": "Normal knee range, why full extension matters, and the signs that point to an injury rather than simple stiffness.",
        "llm": "Explains normal knee range of motion (about 0 to 135 degrees), why full extension matters, and injury red flags like locking, giving way, and swelling.",
        "answer": "<strong>Normal knee range of motion is roughly 0 degrees of extension (fully straight) to about 135 degrees of flexion.</strong> Full extension matters for walking and sharing load. A knee that will not fully straighten or bend, especially with locking, catching, giving way, or swelling, suggests an injury and belongs with a clinician, whereas mild stiffness in an otherwise healthy knee often responds to gentle range work and strengthening.",
        "sections": [
            ("What normal knee range of motion is", """
<p>The <a href="%(aaos)s">AAOS reference chart</a> lists knee flexion of about 135 degrees and extension of 0 degrees, and records a deficit as a negative number (for example -10 degrees short of straight). <a href="%(physio)s">Physiopedia</a> lists comparable values (flexion up to about 150 degrees, extension 0) and describes how goniometry notes a starting angle when neutral cannot be reached.</p>
""" % {"aaos": L_AAOS, "physio": L_PHYSIO}),
            ("Why full extension matters", """
<p>A knee that fully straightens shares load efficiently and lets you walk without a compensatory limp. Losing the last few degrees of extension changes gait and can overload other structures, which is why clinicians prioritize restoring it after injury.</p>
"""),
            ("Common non-injury reasons a knee feels stiff", """
<p>In a healthy knee, stiffness can come from inactivity, swelling after a hard session, or simply age-related change, since <a href="%(age)s">knee norms vary and decline with age</a>. Gentle range work and strengthening usually help mild, non-painful stiffness.</p>
""" % {"age": L_AGE}),
            ("When it points to an injury", """
<div class="rx-note flag"><strong>Red flags.</strong> A truly locked knee, inability to bear weight, significant swelling, giving way, catching, or a knee that will not straighten after trauma suggest an injury such as meniscus or ligament involvement and need a clinician. This article educates and does not diagnose or prescribe treatment for injury.</div>
"""),
            ("How range is restored after injury or surgery", """
<p>After an injury or surgery, restoring extension and flexion is guided by a clinician and progressed gradually. Forcing a stuck knee is not the answer, and pushing hard through a blocked joint can set recovery back.</p>
<div class="rx-note"><strong>Myth.</strong> Cranking on a stiff knee to "free it up" is counterproductive; supervised, progressive loading restores range safely.</div>
"""),
            ("Track knee range responsibly with ROMRx", """
<p>For a healthy knee, ROMRx Base tracks your flexion and extension over time and compares sides, so you notice a meaningful change and know when to get something checked.</p>
"""),
        ],
        "faq": [
            ("What is a normal knee range of motion?", "Roughly 0 degrees of extension (fully straight) to about 135 degrees of flexion, though some people reach up to about 150 degrees. Full, pain-free extension is the key marker."),
            ("Why won't my knee fully straighten?", "In a healthy knee it can be stiffness or swelling. If it follows trauma or comes with locking, catching, or giving way, it may signal an injury and should be assessed by a clinician."),
            ("Is a locked knee an emergency?", "A knee that is truly locked, cannot bear weight, or is significantly swollen should be evaluated promptly. Do not force it to move."),
            ("How is knee range restored after surgery?", "Gradually and under clinician guidance, restoring extension and flexion with progressive exercises. Timelines and methods depend on the specific injury or procedure."),
            ("Can stiffness be normal in a healthy knee?", "Mild, pain-free stiffness from inactivity or aging is common and often responds to gentle range work and strengthening. Painful stiffness, locking, or swelling is not something to push through."),
        ],
        "related": ["what-is-normal-range-of-motion", "full-vs-partial-range-of-motion", "does-flexibility-decline-with-age", "how-to-measure-range-of-motion-progress"],
    },
    {
        "slug": "does-flexibility-decline-with-age",
        "cluster": "Mobility Across Life",
        "kw": "flexibility decline with age",
        "title": "Does Flexibility Decline With Age? What to Do",
        "card": "Does Flexibility Decline With Age",
        "meta": "Range of motion tends to decline with age, but much stiffness is from inactivity. Learn what flexibility decline with age involves and how to train it back.",
        "h1": "Does Flexibility Decline With Age (and What You Can Do)",
        "excerpt": "What actually changes with age, how much is really inactivity, and a realistic plan to regain usable range.",
        "llm": "Explains that measured range declines with age but much stiffness is inactivity; consistent flexibility work and strength through range preserve and improve usable motion.",
        "answer": "<strong>Some flexibility decline with age is real, but much everyday stiffness is inactivity, not an unavoidable ceiling.</strong> Measured range of motion tends to decrease as we get older, yet consistent flexibility training (guidelines suggest working each major muscle-tendon group on at least 2 days per week, about 60 seconds per exercise) plus strength through range can preserve and often improve usable motion at any age.",
        "sections": [
            ("Does flexibility decline with age?", """
<p>Average range of motion does tend to fall over the decades. A large study found <a href="%(age)s">reference ROM values decrease with advancing age</a> for both men and women. Tissues become a little stiffer, and joints see less frequent full-range use.</p>
""" % {"age": L_AGE}),
            ("Aging vs a sedentary lifestyle", """
<p>Here is the encouraging part: a large share of stiffness reflects how little we move rather than age itself. People who keep moving through full ranges retain far more flexibility than sedentary peers of the same age, which is why the "use it" theme dominates older-athlete communities.</p>
"""),
            ("What the guidelines recommend", """
<p>The <a href="%(acsm)s">ACSM position stand</a> recommends flexibility exercise for each major muscle-tendon group, about 60 seconds per exercise, on 2 or more days per week to maintain joint range. <a href="%(harvard)s">Harvard Health</a> adds that flexibility can be improved with a regular routine no matter your age, and that stretching helps maintain healthy joint range and may reduce fall risk.</p>
<h3>Flexibility dose for adults and older adults</h3>
<p>Short holds done most days, accumulating the weekly volume, beat occasional long sessions.</p>
<h3>Strength through range</h3>
<p>Loading the range you own keeps it usable, not just available.</p>
""" % {"acsm": L_ACSM, "harvard": "https://www.health.harvard.edu/healthy-aging-and-longevity/stretching-it-out"}),
            ("A realistic plan to regain range", """
<ol>
<li>Stretch major muscle groups most days, 30 to 60 seconds per hold.</li>
<li>Strength train through full pain-free range 2 to 3 days per week.</li>
<li>Move often: short mobility breaks beat one long session.</li>
<li>Track your range so you can see it improving.</li>
</ol>
"""),
            ("When stiffness needs a clinician", """
<div class="rx-note flag"><strong>Red flags.</strong> Joint pain, swelling, morning stiffness lasting more than about 30 minutes, or asymmetric loss of range can indicate arthritis or other conditions and should be evaluated. People with conditions such as Parkinson's disease or arthritis should clear a new routine with a clinician.</div>
"""),
            ("Track your range over the decades with ROMRx", """
<p>ROMRx Base gives you a baseline you can revisit for years, so you can separate real change from a bad day and keep usable range as you age.</p>
"""),
        ],
        "faq": [
            ("Do you really get less flexible with age?", "On average, measured range of motion declines with age. But much everyday stiffness comes from inactivity, and consistent training preserves and often improves usable range at any age."),
            ("Can you regain flexibility after 40 or 50?", "Yes. Flexibility can be improved with a regular routine no matter your age. Combining stretching with strength through range is the most durable approach."),
            ("How much should older adults stretch?", "Guidelines suggest flexibility work for each major muscle-tendon group on at least 2 days per week, about 60 seconds per exercise, with short holds spread across most days working well."),
            ("Is my stiffness from age or sitting?", "Often more from sitting and low movement variety than age itself. Increasing daily movement and full-range training usually reveals how much was reversible."),
            ("When is stiffness a medical issue?", "See a clinician for joint pain, swelling, morning stiffness lasting more than about 30 minutes, or asymmetric loss of range, which can indicate arthritis or other conditions."),
        ],
        "related": ["how-long-to-hold-a-stretch", "full-vs-partial-range-of-motion", "am-i-hypermobile-beighton", "knee-range-of-motion"],
    },
    {
        "slug": "am-i-hypermobile-beighton",
        "cluster": "Mobility Across Life",
        "kw": "beighton score",
        "title": "Am I Hypermobile? The Beighton Score Explained",
        "card": "Am I Hypermobile (Beighton)",
        "meta": "Learn what joint hypermobility is, how the Beighton score works, how it differs from EDS, and when to see a clinician. This is screening, not diagnosis.",
        "h1": "Am I Hypermobile? Understanding the Beighton Score",
        "excerpt": "What hypermobility is, how the 9-point Beighton screen works, and why bendy does not always mean flexible.",
        "llm": "Explains joint hypermobility versus flexibility, the 9-point Beighton score and thresholds, the difference from HSD and hEDS, and when to seek assessment.",
        "answer": "<strong>The Beighton score is a 9-point screen for joint hypermobility, not a diagnosis.</strong> Hypermobility means lax joints and is common, while flexibility refers to muscle length, and the two do not always coincide. A positive Beighton score is 5 or more in adults (4 or more over age 50, 6 or more in children), but hypermobility only becomes a spectrum disorder or hEDS when specific additional criteria are met, which requires clinician assessment.",
        "sections": [
            ("Hypermobility vs flexibility", """
<p>These are different things. Hypermobility describes joints that move beyond the typical range because of ligament laxity; flexibility describes how far muscles lengthen. You can be hypermobile in some joints yet feel muscularly stiff, because muscles often tighten to stabilize lax joints.</p>
"""),
            ("The Beighton score, a 9-point screen", """
<p>The <a href="%(eds)s">Ehlers-Danlos Society</a> describes the 9-point Beighton system and its positive thresholds: 5 or more in adults, 4 or more over age 50, and 6 or more in children.</p>
<h3>The five maneuvers</h3>
<ul>
<li>Little-finger bends back beyond 90 degrees (1 point each hand).</li>
<li>Thumb touches the forearm (1 point each thumb).</li>
<li>Elbow hyperextends beyond 10 degrees (1 point each).</li>
<li>Knee hyperextends beyond 10 degrees (1 point each).</li>
<li>Palms flat on the floor with straight knees (1 point).</li>
</ul>
<h3>Age-adjusted positive thresholds</h3>
<p>Because laxity decreases with age, the cutoff is lower for older adults and higher for children.</p>
""" % {"eds": "https://www.ehlers-danlos.com/assessing-joint-hypermobility/"}),
            ("Hypermobility vs HSD vs hEDS", """
<p>Most hypermobility is harmless. <a href="%(mo)s">Missouri Medicine</a> notes about 10 to 30 percent of people have some joint hypermobility, but only about 1 in 500 meet criteria for hypermobility spectrum disorder or hypermobile Ehlers-Danlos syndrome. Per <a href="%(gr)s">GeneReviews</a>, hEDS requires generalized joint hypermobility plus systemic, family, and musculoskeletal criteria and exclusion of other conditions.</p>
""" % {"mo": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11578560/", "gr": "https://www.ncbi.nlm.nih.gov/books/NBK1279/"}),
            ("Why hypermobile does not always mean flexible", """
<p>Because muscles often tense to protect lax joints, some hypermobile people feel tight. This is why chasing more passive flexibility can backfire, and why strength and control usually matter more.</p>
"""),
            ("Training considerations", """
<p>For hypermobile people, the priority is strength and control through range rather than pushing into ever-greater passive range. Building stability around the joints tends to reduce the achy, unstable feeling.</p>
<div class="rx-note flag"><strong>Red flags.</strong> Recurrent dislocations or subluxations, chronic widespread pain, easy bruising, or skin or vascular signs warrant medical evaluation. This article screens and educates, it does not diagnose.</div>
"""),
            ("Build stability around your range with ROMRx", """
<p>ROMRx Base focuses on usable, controlled range, which is exactly what hypermobile people benefit from, so your plan builds stability rather than chasing more laxity.</p>
"""),
        ],
        "faq": [
            ("What is a positive Beighton score?", "5 or more out of 9 in adults, 4 or more over age 50, and 6 or more in children. It is a screening threshold for generalized joint hypermobility, not a diagnosis on its own."),
            ("Is hypermobility the same as being flexible?", "No. Hypermobility is joint laxity; flexibility is muscle length. You can be hypermobile yet feel muscularly stiff, because muscles often tighten to stabilize lax joints."),
            ("Does hypermobility mean I have EDS?", "Usually not. Some joint hypermobility is common, but only a small fraction of people meet criteria for hypermobility spectrum disorder or hEDS, which requires clinician assessment."),
            ("Can you be hypermobile but not flexible?", "Yes. Muscles often tense to protect lax joints, so a hypermobile person can score high on the Beighton screen yet feel tight in everyday stretching."),
            ("Should hypermobile people stretch or strengthen?", "Strength and control through range are usually the priority over pushing into more passive range. Building stability around the joints tends to help more than aggressive stretching."),
        ],
        "related": ["mobility-vs-flexibility", "one-side-more-flexible-asymmetry", "what-is-normal-range-of-motion", "does-flexibility-decline-with-age"],
    },
    {
        "slug": "one-side-more-flexible-asymmetry",
        "cluster": "Mobility Across Life",
        "kw": "one side more flexible",
        "title": "One Side More Flexible? Why, and What to Do",
        "card": "One Side More Flexible",
        "meta": "One side more flexible than the other is common and usually normal. Learn why the asymmetry happens, when it matters, and how to train the tighter side.",
        "h1": "One Side More Flexible Than the Other: What It Means",
        "excerpt": "Why some asymmetry is normal, how to measure the gap, and how to train the tighter side without chasing perfect symmetry.",
        "llm": "Explains that some left-right flexibility asymmetry is normal from dominance and habit; measure the gap and give the tighter side extra targeted work, escalating large painful gaps.",
        "answer": "<strong>Having one side more flexible than the other is common and usually normal.</strong> Left-right differences in range mostly reflect hand or leg dominance and daily habits rather than a problem. Measuring the gap, then giving the tighter side extra targeted volume (and unilateral strengthening where relevant) usually narrows it, while a large, painful, or newly appeared asymmetry deserves a closer look.",
        "sections": [
            ("Why having one side more flexible is often normal", """
<p>Perfect left-right symmetry is rare. Individual range <a href="%(age)s">varies and often differs from population norms</a>, so a modest side-to-side difference is expected. Symmetry is a rough goal, not a mandate.</p>
""" % {"age": L_AGE}),
            ("Common causes", """
<p>Hand and leg dominance, the side you habitually sit or sleep on, sport-specific patterns (a lead leg or throwing arm), and past minor injuries all nudge one side toward more or less range. These are ordinary explanations, not alarms.</p>
"""),
            ("How to measure your side-to-side difference", """
<p>Measure the same joint on both sides with a consistent method. On the <a href="%(wblt)s">weight-bearing lunge test</a>, for example, a difference greater than about 2 to 3 cm is worth noting, especially if the tighter side also has symptoms.</p>
""" % {"wblt": L_WBLT}),
            ("How to train the tighter side", """
<p>Give the tighter side extra volume and, where relevant, unilateral strengthening. <a href="%(rom)s">Training through range, including single-side work</a>, builds usable capacity on the weaker side. Practical steps:</p>
<ul>
<li>Start and finish sets with the tighter side.</li>
<li>Add an extra set or two of mobility for that side.</li>
<li>Use single-limb strength work through full range.</li>
</ul>
""" % {"rom": L_ROMADAPT}),
            ("When asymmetry is worth a closer look", """
<div class="rx-note flag"><strong>Red flags.</strong> A sudden, painful, or large new asymmetry, or asymmetry with weakness, numbness, or swelling, should be assessed by a clinician rather than aggressively stretched.</div>
<div class="rx-note"><strong>Nuance.</strong> Small differences are normal; you do not need to chase perfect balance to be healthy or to train well.</div>
"""),
            ("Track both sides with ROMRx", """
<p>ROMRx Base measures each joint on both sides, so you can see the gap, target the tighter side, and confirm it is closing over time.</p>
"""),
        ],
        "faq": [
            ("Is it normal for one side to be more flexible?", "Yes. Modest left-right differences are common and usually reflect dominance and daily habits. Individual range varies, so some asymmetry is expected rather than a problem."),
            ("What causes left-right flexibility differences?", "Hand and leg dominance, habitual postures, sport-specific patterns, and past minor injuries. These ordinary factors nudge one side toward more or less range."),
            ("Should I only stretch the tight side?", "Give the tighter side extra targeted volume rather than ignoring the other side entirely. Adding unilateral strength through range on the tighter side also helps."),
            ("How big a difference is a problem?", "Small differences are normal. A large, painful, or newly appeared asymmetry, or one with weakness, numbness, or swelling, is worth having assessed."),
            ("Can lifting cause asymmetry?", "A dominant side or uneven technique can create modest differences over time. Unilateral work and starting sets with the weaker side help keep the gap small."),
        ],
        "related": ["am-i-hypermobile-beighton", "hip-mobility-for-squats", "how-to-measure-range-of-motion-progress", "overhead-shoulder-mobility"],
    },
    {
        "slug": "hip-mobility-for-bjj",
        "cluster": "Sport-Specific",
        "kw": "hip mobility for bjj",
        "title": "Hip Mobility for BJJ: Build a Better Guard",
        "card": "Hip Mobility for BJJ",
        "meta": "Better guard starts at the hips. Learn evidence-informed hip mobility for BJJ, end-range strength drills for grappling, and how to test and track your range.",
        "h1": "Hip Mobility for BJJ: Open Your Guard the Smart Way",
        "excerpt": "Why usable, strength-supported hip range beats passive splits for guard, and the drills that transfer to the mat.",
        "llm": "How-to for hip mobility for BJJ: guard depends on usable, strength-supported hip rotation, flexion, and hip-flexor endurance more than passive splits; measure and load the range.",
        "answer": "<strong>Hip mobility for BJJ is about usable, strength-supported range, not extreme passive splits.</strong> Effective guard play depends on hip rotation, flexion, and hip-flexor endurance you can control, so the highest-transfer approach combines mobility work with end-range strengthening rather than passive stretching alone. Measuring hip range and training through it builds capacity that shows up on the mat, while a sharp groin pinch points toward assessment.",
        "howto": {
            "name": "Build hip mobility for BJJ",
            "steps": [
                {"name": "Assess hip rotation and flexion", "text": "Measure internal and external hip rotation and flexion, and compare left to right."},
                {"name": "Do rotational hip work", "text": "Use 90/90 transitions and controlled internal and external rotation drills."},
                {"name": "Train hip-flexor endurance", "text": "Add active leg raises and hollow-position work for guard retention."},
                {"name": "Load the end range", "text": "Use deep goblet squats, cossack squats, and controlled 90/90 lifts under light load."},
                {"name": "Program around mat time", "text": "Do heavier mobility and strength work away from hard rolling days."},
            ],
        },
        "sections": [
            ("Why hip mobility for BJJ drives guard and retention", """
<p>Guard play, from closed guard to butterfly to a deep open guard, is built on hip rotation, flexion, and the endurance to hold those positions. When the hips move and hold well, you retain guard longer and recover position with less effort. ROMRx starts with a free Base assessment and, for grapplers, the <a href="https://romrx.io/bjj">ROMRx+BJJ</a> pack layers guard-specific scoring on top, but the Base hip numbers come first.</p>
"""),
            ("Passive range vs on-the-mat usable range", """
<p>Being able to fold into a passive stretch is not the same as controlling that range under a resisting opponent. Usable, strength-supported range is what holds up when someone is trying to pass, which is why splits alone rarely translate to a better guard.</p>
"""),
            ("Assess your hip rotation and flexion", """
<p>Measure internal and external hip rotation and hip flexion, and compare sides, since grapplers often develop a lead-side bias. A baseline tells you whether you truly lack range or lack control.</p>
"""),
            ("Drills that transfer to grappling", """
<h3>Open and rotational hip work</h3>
<p>90/90 transitions and controlled rotation drills build the exact ranges guard uses.</p>
<h3>Hip-flexor strength and endurance</h3>
<p>Active leg raises and hollow-position holds build the hip-flexor endurance guard retention demands.</p>
<h3>End-range strength, loaded</h3>
<p><a href="%(rom)s">Full-range, end-range training builds greater lower-limb strength</a>, turning borrowed range into range you own. The <a href="%(dose)s">flexibility dose of about 10 minutes per muscle per week</a> underpins the mobility side.</p>
""" % {"rom": L_ROMADAPT, "dose": L_DOSE}),
            ("Programming around training days", """
<p>Do your heavier mobility and end-range strength work away from hard rolling days, and progress gradually to avoid adductor cramps early on. Consistency across the week beats occasional long stretching sessions.</p>
"""),
            ("When a hip issue needs a clinician", """
<div class="rx-note flag"><strong>Red flags.</strong> Sharp groin pain, catching, or locking with deep hip positions can indicate a structural cause such as <a href="%(fai)s">femoroacetabular impingement</a> and should be assessed rather than forced. This article educates and does not diagnose or promise injury prevention.</div>
""" % {"fai": L_FAI}),
            ("Build your BJJ hip profile with ROMRx", """
<p>ROMRx Base measures the hip range behind every guard position and tracks it over time, so your mobility work targets what your game actually needs.</p>
"""),
        ],
        "faq": [
            ("Do I need to be super flexible for BJJ?", "No. Control and end-range strength transfer to guard more than extreme passive flexibility. Usable, strength-supported hip range beats contortionist splits on the mat."),
            ("What hip mobility helps guard retention?", "Hip rotation, flexion, and hip-flexor endurance you can control. Drills like 90/90 transitions and active leg raises build the ranges and endurance guard retention needs."),
            ("Should I stretch or strengthen my hips for BJJ?", "Both, with an emphasis on strengthening through range. Passive stretching alone rarely transfers; loading the end range turns available range into usable, mat-ready capacity."),
            ("How often should I do hip mobility for jiu-jitsu?", "Spread mobility across most days for volume, and do heavier end-range strength work a couple of times a week away from hard rolling days. Progress gradually to avoid cramps."),
            ("Is a groin pinch normal in deep guard positions?", "A sharp groin pinch, catching, or locking is not something to force through. It can be structural, so have persistent or catching pain assessed by a clinician."),
        ],
        "related": ["hip-mobility-for-squats", "hip-impingement-deep-squat", "full-vs-partial-range-of-motion", "how-to-measure-range-of-motion-progress"],
        "cta_bjj": True,
    },
]
