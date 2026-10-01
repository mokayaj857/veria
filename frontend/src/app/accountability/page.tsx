"use client";

import { AgentActionDesk } from "@/components/AgentActionDesk";
import { useLiveRegistryAgents } from "@/hooks/useLiveAgents";
import { lookupLiveAgent, type LiveAgent } from "@/lib/veriaSubject";
import { useMemo, useState } from "react";

export default function AccountabilityPage() {
  const { agents, isLoading } = useLiveRegistryAgents(20);
  const [selected, setSelected] = useState<string | null>(null);
  const [idInput, setIdInput] = useState("");
  const [lookup, setLookup] = useState<LiveAgent | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const roster = useMemo(() => {
    if (!lookup) return agents;
    if (agents.some((item) => item.address.toLowerCase() === lookup.address.toLowerCase())) return agents;
    return [lookup, ...agents];
  }, [agents, lookup]);

  const agent = lookup
    ? lookup
    : roster.find((item) => item.address.toLowerCase() === selected?.toLowerCase()) || null;

  async function loadExact() {
    setBusy(true);
    setLookupError(null);
    try {
      const found = await lookupLiveAgent(idInput);
      setLookup(found);
      setSelected(found.address);
    } catch (err) {
      setLookup(null);
      setLookupError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 sm:px-8">
      <section className="surface p-6">
        <p className="kicker">MeTTa layer</p>
        <h1 className="display mt-3 text-4xl text-[#111217]">VERIA Accountability Simulation</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#111217]">
          Paste the exact agent wallet. VERIA loads that AgentRegistry record only — no fallback to another
          agent. MeTTa then reasons over that id, and Omega stores the outcome so the leaderboard standing
          moves.
        </p>
        <form
          className="mt-5 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void loadExact();
          }}
        >
          <input
            value={idInput}
            onChange={(event) => setIdInput(event.target.value)}
            placeholder="0x… agent id (wallet address)"
            spellCheck={false}
            className="field flex-1 font-mono text-sm"
          />
          <button type="submit" className="btn-ink" disabled={busy}>
            {busy ? "Loading agent…" : "Test this agent id"}
          </button>
        </form>
        {lookupError ? <p className="mt-3 text-sm font-bold text-[#e23c2f]">{lookupError}</p> : null}
        {lookup ? (
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.18em] text-[#1f3dff]">
            Locked on {lookup.name} · {lookup.address}
          </p>
        ) : isLoading ? (
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-aegent-dim">
            Loading registry agents…
          </p>
        ) : (
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-aegent-dim">
            Enter an agent id to run MeTTa on that subject only
          </p>
        )}
      </section>
      <AgentActionDesk
        agent={agent}
        agents={lookup ? [lookup] : roster}
        whenPath="/accountability"
        onPick={(address) => {
          setLookup(null);
          setSelected(address);
        }}
        strict={Boolean(lookup)}
      />
    </div>
  );
}
