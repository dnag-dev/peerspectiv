import { NextRequest, NextResponse } from "next/server";
import { db, toCamel, toSnake } from "@/lib/db";
import { providers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { id } = params;

    const update = toCamel(body as Record<string, unknown>);
    const [row] = await db
      .update(providers)
      .set(update)
      .where(eq(providers.id, id))
      .returning();

    if (!row) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    return NextResponse.json(toSnake(row));
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
