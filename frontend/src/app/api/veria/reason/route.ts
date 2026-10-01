import { NextRequest, NextResponse } from "next/server";
import { runMettaProcess } from "@/lib/mettaSpawn";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const raw = await runMettaProcess([], JSON.stringify(body));
    return NextResponse.json(JSON.parse(raw));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "MeTTa reasoning failed", detail: message }, { status: 500 });
  }
}
