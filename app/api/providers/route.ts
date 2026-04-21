import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company_id, first_name, last_name, specialty, npi, email, status } = body;

    if (!first_name?.trim() || !last_name?.trim()) {
      return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
    }

    if (!specialty?.trim()) {
      return NextResponse.json({ error: "Specialty is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("providers")
      .insert({
        company_id,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        specialty: specialty.trim(),
        npi: npi || null,
        email: email || null,
        status: status || "active",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
