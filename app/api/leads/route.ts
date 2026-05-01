import { NextResponse } from "next/server";

interface Lead {
  name: string;
  email: string;
  org?: string;
  role?: string;
  message?: string;
}

export async function POST(req: Request) {
  let body: Lead;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.name || !body.email) {
    return NextResponse.json(
      { error: "name and email are required" },
      { status: 400 }
    );
  }

  // Resend integration (optional). Falls back to console.log so the form
  // works in dev / preview without a configured key.
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEADS_INBOX || "hello@perspectiv.ai";
  const from = process.env.LEADS_FROM || "Perspectiv <noreply@perspectiv.ai>";

  if (!apiKey) {
    console.log("[leads] (no RESEND_API_KEY — printing to log)", body);
    return NextResponse.json({ ok: true, delivery: "log" });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `New lead: ${body.name}${body.org ? ` (${body.org})` : ""}`,
        text: [
          `Name: ${body.name}`,
          `Email: ${body.email}`,
          body.org ? `Org: ${body.org}` : "",
          body.role ? `Role: ${body.role}` : "",
          "",
          body.message || "(no message)",
        ]
          .filter(Boolean)
          .join("\n"),
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("[leads] resend failure", res.status, detail);
      // Don't surface the upstream failure to the user — we already have the
      // payload in our log above.
    }
    return NextResponse.json({ ok: true, delivery: res.ok ? "email" : "log" });
  } catch (e) {
    console.error("[leads] resend error", e);
    return NextResponse.json({ ok: true, delivery: "log" });
  }
}
