import { NextRequest, NextResponse } from "next/server";

const TARGET_RPC = "https://services.polkadothub-rpc.com/testnet";
const MIN_DELAY_MS = 1500; // 1.5s minimum gap between upstream requests

// Serialization: each request waits for the previous one + delay.
// Works in next dev (long-running process). In serverless prod this
// degrades gracefully to a simple passthrough proxy.
let gate: Promise<void> = Promise.resolve();

export async function POST(req: NextRequest) {
  const body = await req.text();

  // Chain behind the previous request
  const prev = gate;
  let release!: () => void;
  gate = new Promise((r) => (release = r));

  await prev;

  try {
    // Enforce minimum gap
    await new Promise((r) => setTimeout(r, MIN_DELAY_MS));

    const upstream = await fetch(TARGET_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const data = await upstream.text();
    return new NextResponse(data, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32000, message: "RPC proxy: upstream unreachable" },
        id: null,
      },
      { status: 502 }
    );
  } finally {
    release();
  }
}

// CORS preflight (needed if MetaMask calls this endpoint)
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
