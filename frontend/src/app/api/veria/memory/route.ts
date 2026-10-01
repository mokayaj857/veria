import { NextRequest, NextResponse } from "next/server";
import { runMettaProcess } from "@/lib/mettaSpawn";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const agentId = req.nextUrl.searchParams.get("agentId")?.toLowerCase();
    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }
    const raw = await runMettaProcess(["memory", agentId]);
    return NextResponse.json(JSON.parse(raw));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Omega memory failed", detail: message }, { status: 500 });
  }
}
