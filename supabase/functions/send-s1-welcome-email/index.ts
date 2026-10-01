import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

// Escape user-controlled values (name, email) before interpolating into email HTML.
const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Canonical Base onboarding. The welcome CTA for every brand points here (never a
// sport domain), preserving a recognized sport intent as ?add=bjj|bodybuilding.
const BASE_ASSESSMENT = "https://romrx.io/app/onboarding/assessment";

// ── Sport-aware branding config ────────────────────────────────────────────────
// The new-user trigger (auth.users INSERT) passes raw_user_meta_data, which the
// BB signup stamps with active_sport: 'bodybuilding' and BJJ signups with 'bjj'.
// Any signup that does NOT stamp a sport (Base / romrx.io) falls through to
// the 'general' brand, which is the sport-agnostic ROMRx Base experience.
interface Brand {
  brandName: string;
  fromName: string;
  fromEmail: string;
  domain: string;
  city: string;
  accent: string;
  protocol: string;
  markerCount: string;
  contextLine: string;
  ctaLabel: string;
  subject: string;
  alertTo: string;
}

const BRANDS: Record<string, Brand> = {
  bjj: {
    brandName: "ROMRxBJJ",
    fromName: "Jim Scott",
    fromEmail: "jim@romrxbjj.com",
    domain: "https://romrxbjj.com",
    city: "Dublin, Ohio",
    accent: "#c8102e",
    protocol: "Position Readiness Protocol&trade;",
    markerCount: "8 key ROM markers",
    contextLine: "which positions your body is ready for (and which ones are costing you on the mat)",
    ctaLabel: "&rarr; Start My Assessment Now",
    subject: "Your ROMRx account is ready. Here's your first move.",
    alertTo: "jim@romrx.io",
  },
  bodybuilding: {
    brandName: "ROMRxBodybuilding",
    fromName: "Jim Scott",
    fromEmail: "jim@romrxbodybuilding.com",
    domain: "https://romrxbodybuilding.com",
    city: "Dublin, Ohio",
    accent: "#1e6fd9",
    protocol: "Range of Motion Readiness Protocol&trade;",
    markerCount: "key ROM markers",
    contextLine: "which lifts your body is ready to load (and which ranges are leaking strength and risking injury)",
    ctaLabel: "&rarr; Start My ROM Assessment",
    subject: "Your ROMRx account is ready. Here's your first move.",
    alertTo: "jim@romrx.io",
  },
  general: {
    brandName: "ROMRx",
    fromName: "Jim Scott",
    fromEmail: "jim@romrx.io",
    domain: "https://romrx.io",
    city: "Dublin, Ohio",
    accent: "#1e6fd9",
    protocol: "Position Readiness Protocol&trade;",
    markerCount: "key ROM markers",
    contextLine: "which positions your body is ready for (and which restrictions are quietly holding you back)",
    ctaLabel: "&rarr; Start My ROM Assessment",
    subject: "Your ROMRx account is ready. Here's your first move.",
    alertTo: "jim@romrx.io",
  },
};

serve(async (req) => {
  try {
    const payload = await req.json();

    // Handle both DB webhook and direct call
    const record = payload?.record ?? payload;
    const email = record?.email ?? record?.new?.email;
    const meta = record?.raw_user_meta_data ?? record?.new?.raw_user_meta_data ?? {};
    const rawName = meta?.full_name ?? "";
    const firstName = rawName.split(" ")[0] || "there";

    // Route by explicit sport meta. Anything not bjj / bodybuilding is Base (general).
    const rawSport = String(meta?.active_sport ?? "").toLowerCase();
    const sport = rawSport === "bjj"
      ? "bjj"
      : rawSport === "bodybuilding"
      ? "bodybuilding"
      : "general";
    const b = BRANDS[sport];

    // Recognized sport intent for the CTA: active_sport (stamped by the sport apps)
    // or add_sport (stamped by Base +sport signups); anything else = generic Base.
    const addRaw = sport !== "general"
      ? sport
      : String(meta?.add_sport ?? "").toLowerCase();
    const ctaAdd = addRaw === "bjj" || addRaw === "bodybuilding" ? addRaw : "";
    const assessmentUrl = `${BASE_ASSESSMENT}${ctaAdd ? `?add=${ctaAdd}` : ""}`;

    // Signup metadata for the internal alert (routing data only; no secrets/PII beyond
    // what the operator needs to triage a new account).
    const userId = record?.id ?? record?.new?.id ?? "";
    const source = String(meta?.signup_source ?? "").trim();

    if (!email) {
      return new Response(JSON.stringify({ error: "No email found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your ROMRx account is ready.</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a1a;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;font-size:24px;margin:0;letter-spacing:2px;font-weight:700;">${b.brandName}</h1>
              <p style="color:#888888;font-size:12px;margin:6px 0 0 0;letter-spacing:1px;text-transform:uppercase;">${b.protocol}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px 40px;">
              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px 0;">Hey ${esc(firstName)},</p>
              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px 0;">You're in.</p>
              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px 0;">Most people who get real results with ${b.brandName} do one thing first: complete the <strong>${b.protocol} assessment</strong>.</p>
              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px 0;">It takes about 15 minutes. You'll measure ${b.markerCount}, and immediately see ${b.contextLine}.</p>
              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 32px 0;">This is the diagnostic that changes how you train.</p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom:32px;">
                    <a href="${assessmentUrl}"
                       style="display:inline-block;background-color:${b.accent};color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 36px;border-radius:6px;letter-spacing:0.5px;">
                      ${b.ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 16px 0;">Talk soon,</p>
              <p style="font-size:16px;color:#333333;line-height:1.6;margin:0 0 4px 0;"><strong>${b.fromName}</strong></p>
              <p style="font-size:14px;color:#666666;margin:0 0 24px 0;">Founder, ${b.brandName}</p>

              <hr style="border:none;border-top:1px solid #eeeeee;margin:0 0 24px 0;" />

              <p style="font-size:14px;color:#555555;line-height:1.6;margin:0 0 16px 0;"><em>P.S. The assessment is free. No expensive equipment needed. Just your body and a little floor space.</em></p>

              <p style="font-size:14px;color:#555555;line-height:1.6;margin:0;">This is my personal email. If you ever have any questions about ${b.brandName} or run into any difficulty, please save it. I'd be happy to help however I can.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9f9f9;padding:24px 40px;border-top:1px solid #eeeeee;">
              <p style="font-size:12px;color:#999999;text-align:center;margin:0;line-height:1.6;">
                ${b.brandName} &bull; ${b.city}<br />
                You're receiving this because you created a ${b.brandName} account.<br />
                <a href="mailto:${b.fromEmail}" style="color:#999999;">${b.fromEmail}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${b.fromName} <${b.fromEmail}>`,
        to: [email],
        subject: b.subject,
        html: htmlBody,
        headers: {
          "X-Entity-Ref-ID": `s1-welcome-${Date.now()}`,
        },
        tags: [
          { name: "stage", value: "s1_registered" },
          { name: "email_id", value: "s1_1_welcome" },
          { name: "sport", value: sport },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend error:", data);
      return new Response(JSON.stringify({ error: data }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`S1-1 welcome (${sport}) sent to:`, email, "| Resend ID:", data.id);

    // ── Internal signup alert (sport-routed) ───────────────────────────────────
    // Base signups fire the ROMRx (general) brand alert. BJJ and BB signups fire
    // their own on-brand alerts. Reply-to matches the sport-specific alias so
    // replies stay on-brand.
    // Best-effort: never block or fail the customer welcome on alert errors.
    try {
      const signupTime = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
      const alertHtml = `
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#222;line-height:1.6;">
          <h2 style="margin:0 0 12px;color:${b.accent};">\uD83C\uDF89 New ${b.brandName} signup</h2>
          <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
            <tr><td style="font-weight:bold;">Name</td><td>${esc(firstName)} ${esc(rawName.split(" ").slice(1).join(" "))}</td></tr>
            <tr><td style="font-weight:bold;">Email</td><td>${esc(email)}</td></tr>
            <tr><td style="font-weight:bold;">Sport</td><td>${esc(sport)}</td></tr>
            <tr><td style="font-weight:bold;">Sport intent</td><td>${esc(ctaAdd || "(none)")}</td></tr>
            <tr><td style="font-weight:bold;">Source</td><td>${esc(source || "(unknown)")}</td></tr>
            <tr><td style="font-weight:bold;">User ID</td><td>${esc(userId)}</td></tr>
            <tr><td style="font-weight:bold;">Signed up</td><td>${esc(signupTime)} ET</td></tr>
          </table>
          <p style="margin-top:16px;font-size:13px;color:#777;">Welcome email delivered (Resend ID: ${data.id}).</p>
        </div>`;

      const alertRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${b.brandName} Signups <${b.fromEmail}>`,
          to: [b.alertTo],
          reply_to: b.fromEmail,
          subject: `New ${b.brandName} signup: ${email}`,
          html: alertHtml,
          tags: [
            { name: "type", value: "internal_signup_alert" },
            { name: "sport", value: sport },
          ],
        }),
      });
      if (alertRes.ok) {
        console.log(`Signup alert (${sport}) sent to ${b.alertTo}`);
      } else {
        console.error("Signup alert failed:", await alertRes.text());
      }
    } catch (alertErr) {
      console.error("Signup alert error (non-blocking):", alertErr);
    }

    return new Response(JSON.stringify({ success: true, id: data.id, sport }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

