export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { anthropic, AI_MODEL } from "@/lib/ai/anthropic";


const pdfParse = require("pdf-parse");

const MAX_CHARS = 80_000;

interface Provider {
  first_name: string | null;
  last_name: string | null;
  specialty: string | null;
  npi: string | null;
}

interface ExtractedOrg {
  name: string;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  providers: Provider[];
}

function stripCodeFences(input: string): string {
  let text = input.trim();
  if (text.startsWith("```")) {
    // Remove opening fence (with optional language, e.g. ```json)
    text = text.replace(/^```[a-zA-Z0-9]*\s*\n?/, "");
    // Remove trailing fence
    text = text.replace(/\n?```\s*$/, "");
  }
  return text.trim();
}

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get('content-type') || '';
    if (!ct.toLowerCase().includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Expected multipart/form-data', code: 'UNSUPPORTED_MEDIA_TYPE' },
        { status: 415 }
      );
    }
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText: string;
    try {
      const parsed = await pdfParse(buffer);
      extractedText = parsed.text ?? "";
    } catch (err) {
      console.error("[clients/onboard] pdf-parse failed", err);
      return NextResponse.json(
        { error: "Failed to parse PDF" },
        { status: 400 }
      );
    }

    const truncated = extractedText.slice(0, MAX_CHARS);

    const prompt = `Extract organization and provider information from this document.
Return ONLY valid JSON matching this exact schema with no preamble:
{
  "name": "string",
  "contact_person": "string | null",
  "contact_email": "string | null",
  "contact_phone": "string | null",
  "address": "string | null",
  "city": "string | null",
  "state": "string | null",
  "providers": [
    {
      "first_name": "string | null",
      "last_name": "string | null",
      "specialty": "string | null",
      "npi": "string | null"
    }
  ]
}
Document text: ${truncated}`;

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 502 }
      );
    }

    const raw = stripCodeFences(textBlock.text);

    let data: ExtractedOrg;
    try {
      data = JSON.parse(raw) as ExtractedOrg;
    } catch (err) {
      console.error("[clients/onboard] JSON parse failed", err, raw);
      return NextResponse.json(
        { error: "AI response was not valid JSON" },
        { status: 502 }
      );
    }

    // Normalise providers to always be an array
    if (!Array.isArray(data.providers)) {
      data.providers = [];
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[clients/onboard] unexpected error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
