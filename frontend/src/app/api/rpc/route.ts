import { NextRequest, NextResponse } from "next/server";
import { POLKADOT_HUB_RPC_URLS } from "@/lib/config";

export async function POST(req: NextRequest) {
  const body = await req.text();
  let lastError = "RPC proxy: all upstreams unreachable";

  for (const url of POLKADOT_HUB_RPC_URLS) {
    try {
      const upstream = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        cache: "no-store",
      });

      const data = await upstream.text();
      if (upstream.ok) {
        return new NextResponse(data, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      lastError = data || `Upstream ${url} returned ${upstream.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json(
    {
      jsonrpc: "2.0",
      error: { code: -32000, message: lastError },
      id: null,
    },
    { status: 502 }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
