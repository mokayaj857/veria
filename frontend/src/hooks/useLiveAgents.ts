"use client";

import { useEffect, useState } from "react";
import { useTopAgents, useAgentsPaginated, type AgentData } from "@/hooks/useAgentRegistry";
import {
  fetchOmegaStandings,
  POLICY_EVENT,
  type LiveAgent,
  type OmegaStanding,
  toLiveAgent,
} from "@/lib/veriaSubject";
import type { Address } from "viem";

export function useOmegaStandings() {
  const [standings, setStandings] = useState<Record<string, OmegaStanding>>({});

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchOmegaStandings()
        .then((data) => {
          if (!cancelled) setStandings(data);
        })
        .catch(() => {
          if (!cancelled) setStandings({});
        });
    };
    load();
    const onPolicy = () => load();
    window.addEventListener(POLICY_EVENT, onPolicy);
    return () => {
      cancelled = true;
      window.removeEventListener(POLICY_EVENT, onPolicy);
    };
  }, []);

  return standings;
}

export function useLiveRegistryAgents(limit = 20) {
  const top = useTopAgents(limit);
  const page = useAgentsPaginated(0, limit);

  const topAddresses: Address[] = top.data ? (top.data[0] as Address[]) : [];
  const topScores: bigint[] = top.data ? (top.data[1] as bigint[]) : [];
  const pageAgents: AgentData[] = page.data ? (page.data[0] as unknown as AgentData[]) : [];
  const pageAddresses: Address[] = page.data ? (page.data[1] as unknown as Address[]) : [];

  const byAddr = new Map<string, AgentData>();
  pageAddresses.forEach((addr, i) => {
    if (pageAgents[i]) byAddr.set(addr.toLowerCase(), pageAgents[i]);
  });

  const ranked = topAddresses
    .map((addr, index) => {
      const record = byAddr.get(addr.toLowerCase());
      if (!record) return null;
      return {
        rank: index,
        score: Number(topScores[index] || record.reputationScore),
        live: toLiveAgent(addr, record, index),
      };
    })
    .filter((row): row is { rank: number; score: number; live: LiveAgent } => Boolean(row));

  const extras = pageAddresses
    .map((addr, index) => {
      if (ranked.some((row) => row.live.address.toLowerCase() === addr.toLowerCase())) return null;
      const record = pageAgents[index];
      if (!record) return null;
      return {
        rank: ranked.length + index,
        score: Number(record.reputationScore),
        live: toLiveAgent(addr, record, ranked.length + index),
      };
    })
    .filter((row): row is { rank: number; score: number; live: LiveAgent } => Boolean(row));

  const rows = [...ranked, ...extras];
  return {
    isLoading: top.isLoading || page.isLoading,
    isError: Boolean(top.isError || page.isError),
    rows,
    agents: rows.map((row) => row.live),
  };
}
