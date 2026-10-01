"use client";

import { AgentActionDesk } from "@/components/AgentActionDesk";
import { useLiveRegistryAgents } from "@/hooks/useLiveAgents";
import { useState } from "react";

export default function AccountabilityPage() {
  const { agents, isLoading } = useLiveRegistryAgents(20);
  const [selected, setSelected] = useState<string | null>(null);
  const agent = agents.find((item) => item.address.toLowerCase() === selected?.toLowerCase()) || agents[0] || null;

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-8 sm:px-8">
      <section className="surface p-6">
        <p className="kicker">MeTTa layer</p>
        <h1 className="display mt-3 text-4xl text-[#111217]">VERIA Accountability Simulation</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#111217]">
          This is not a canned TraderBot. Every subject is a wallet from AgentRegistry. Every action amount is
          derived from that agent’s stake and reputation. MeTTa executes the `.metta` rules. Omega stores the
          incident, so the next request on the same wallet is different.
        </p>
        {isLoading ? (
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-aegent-dim">Loading registry agents…</p>
        ) : (
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-aegent-dim">
            {agents.length} on-chain agent{agents.length === 1 ? "" : "s"} available
          </p>
        )}
      </section>
      <AgentActionDesk agent={agent} agents={agents} whenPath="/accountability" onPick={setSelected} />
    </div>
  );
}
