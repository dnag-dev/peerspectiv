export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/ai/anthropic";

const pdfParse = require("pdf-parse");

const MAX_CHARS = 80_000;

interface ImportProvider {
  first_name: string | null;
  last_name: string | null;
  specialty: string | null;
  npi: string | null;
  email: string | null;
}

function stripCodeFences(input: string): string {
  let text = input.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z0-9]*\s*\n?/, "");
    text = text.replace(/\n?```\s*$/, "");
  }
  return text.trim();
}

function detectDelimiter(headerLine: string): string {
  if (headerLine.includes("\t")) return "\t";
  if (headerLine.includes(",")) return ",";
  return ",";
}

function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delim) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

const HEADER_MAP: Record<string, keyof ImportProvider> = {
  first_name: "first_name",
  firstname: "first_name",
  first: "first_name",
  given_name: "first_name",
  last_name: "last_name",
  lastname: "last_name",
  last: "last_name",
  surname: "last_name",
  family_name: "last_name",
  specialty: "specialty",
  speciality: "specialty",
  taxonomy: "specialty",
  npi: "npi",
  npi_number: "npi",
  email: "email",
  email_address: "email",
};

function parseDelimited(text: string): ImportProvider[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const delim = detectDelimiter(lines[0]);
  const headerCells = splitCsvLine(lines[0], delim).map(normalizeHeader);

  // If no recognizable header, attempt full-name single-column fallback
  const hasKnown = headerCells.some((h) => HEADER_MAP[h]);
  const out: ImportProvider[] = [];

  if (!hasKnown) {
    // Treat first line as data; assume "Full Name, Specialty, NPI, Email" or just full name
    for (const line of lines) {
      const cols = splitCsvLine(line, delim);
      const fullName = cols[0] || "";
      const parts = fullName.split(/\s+/);
      const first = parts[0] || null;
      const last = parts.length > 1 ? parts.slice(1).join(" ") : null;
      out.push({
        first_name: first,
        last_name: last,
        specialty: cols[1] || null,
        npi: cols[2] || null,
        email: cols[3] || null,
      });
    }
    return out;
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i], delim);
    const row: ImportProvider = {
      first_name: null,
      last_name: null,
      specialty: null,
      npi: null,
      email: null,
    };
    headerCells.forEach((h, idx) => {
      const key = HEADER_MAP[h];
      if (key) {
        const v = (cols[idx] ?? "").trim();
        row[key] = v.length > 0 ? v : null;
      }
    });

    // If only "name" column existed, split it
    const nameIdx = headerCells.findIndex((h) => h === "name" || h === "full_name" || h === "provider_name");
    if (nameIdx >= 0 && !row.first_name && !row.last_name) {
      const fullName = (cols[nameIdx] ?? "").trim();
      const parts = fullName.split(/\s+/);
      row.first_name = parts[0] || null;
      row.last_name = parts.length > 1 ? parts.slice(1).join(" ") : null;
    }

    if (row.first_name || row.last_name || row.npi || row.email) {
      out.push(row);
    }
  }
  return out;
}

async function extractWithClaude(text: string): Promise<ImportProvider[]> {
  const truncated = text.slice(0, MAX_CHARS);
  const system = "You extract structured provider rosters from documents. Return ONLY valid JSON, no preamble, no code fences.";
  const prompt = `Extract the list of healthcare providers from the document below.
Return ONLY valid JSON matching this exact schema:
{
  "providers": [
    {
      "first_name": "string | null",
      "last_name": "string | null",
      "specialty": "string | null",
      "npi": "string | null",
      "email": "string | null"
    }
  ]
}
Document text:
${truncated}`;

  const raw = await callClaude(system, prompt, 4096);
  const cleaned = stripCodeFences(raw);
  let parsed: { providers?: ImportProvider[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("[providers/import] JSON parse failed", err, cleaned.slice(0, 500));
    throw new Error("AI response was not valid JSON");
  }
  if (!Array.isArray(parsed.providers)) return [];
  return parsed.providers.map((p) => ({
    first_name: p.first_name ?? null,
    last_name: p.last_name ?? null,
    specialty: p.specialty ?? null,
    npi: p.npi ?? null,
    email: p.email ?? null,
  }));
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const companyId = formData.get("company_id");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!companyId || typeof companyId !== "string") {
      return NextResponse.json({ error: "company_id is required" }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    const ext = filename.includes(".") ? filename.split(".").pop() : "";

    if (ext === "xlsx") {
      return NextResponse.json(
        { error: "XLSX import is coming — convert to CSV" },
        { status: 400 }
      );
    }
    if (ext === "docx") {
      return NextResponse.json(
        { error: "DOCX import is coming — convert to CSV" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (ext === "csv" || ext === "tsv") {
      const text = buffer.toString("utf-8");
      const candidates = parseDelimited(text);
      return NextResponse.json({ candidates, format: "csv" });
    }

    if (ext === "pdf" || file.type === "application/pdf") {
      let extractedText: string;
      try {
        const parsed = await pdfParse(buffer);
        extractedText = parsed.text ?? "";
      } catch (err) {
        console.error("[providers/import] pdf-parse failed", err);
        return NextResponse.json({ error: "Failed to parse PDF" }, { status: 400 });
      }
      const candidates = await extractWithClaude(extractedText);
      return NextResponse.json({ candidates, format: "pdf" });
    }

    return NextResponse.json(
      { error: "Unsupported file type. Use CSV, TSV, or PDF." },
      { status: 400 }
    );
  } catch (err) {
    console.error("[providers/import] unexpected error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
