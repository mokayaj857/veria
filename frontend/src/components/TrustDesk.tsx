"use client";

import { AgentActionDesk } from "@/components/AgentActionDesk";
import { useLiveRegistryAgents } from "@/hooks/useLiveAgents";

export function TrustDesk({
  selectedAddress,
  onPickAgent,
}: {
  selectedAddress?: string;
  onPickAgent?: (address: string) => void;
}) {
  const { agents, isLoading } = useLiveRegistryAgents(20);
  const selected =
    agents.find((item) => item.address.toLowerCase() === selectedAddress?.toLowerCase()) || agents[0] || null;

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-12">
      <div className="mb-6">
        <p className="kicker">Live trust desk</p>
        <h2 className="display mt-3 max-w-3xl text-4xl sm:text-5xl">Ask VERIA. See exactly why.</h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-aegent-muted">
          Subjects come from the AgentRegistry. Actions are sized from real stake and reputation. MeTTa reasons.
          Omega remembers.
        </p>
        {isLoading ? <p className="mt-3 font-mono text-xs uppercase tracking-[0.18em] text-aegent-dim">Loading registry…</p> : null}
      </div>
      <AgentActionDesk
        agent={selected}
        agents={agents}
        whenPath="/"
        onPick={(address) => onPickAgent?.(address)}
      />
    </section>
  );
}
