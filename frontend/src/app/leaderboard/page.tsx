"use client";

import { formatEther, type Address } from "viem";
import { ReputationBar, AgentVitalStats } from "@/components/UI";
import { type AgentData, useAgentsPaginated, useTopAgents } from "@/hooks/useAgentRegistry";
import { agentStillFor } from "@/lib/veriaMedia";
import Image from "next/image";
import { Crown, ExternalLink, Medal, Trophy } from "lucide-react";
import { AgentActionDesk } from "@/components/AgentActionDesk";
import { useLiveRegistryAgents } from "@/hooks/useLiveAgents";
import { useState } from "react";

const LEADERBOARD_SIZE = 20;

export default function LeaderboardPage() {
  const { data: topData, isLoading } = useTopAgents(LEADERBOARD_SIZE);
  const { data: agentsPaginatedData } = useAgentsPaginated(0, LEADERBOARD_SIZE);
  const live = useLiveRegistryAgents(LEADERBOARD_SIZE);
  const [selected, setSelected] = useState<string | null>(null);

  const topAddresses: Address[] = topData ? (topData[0] as Address[]) : [];
  const topScores: bigint[] = topData ? (topData[1] as bigint[]) : [];

  const agents: AgentData[] = agentsPaginatedData
    ? (agentsPaginatedData[0] as unknown as AgentData[])
    : [];
  const paginatedAddresses: Address[] = agentsPaginatedData
    ? (agentsPaginatedData[1] as unknown as Address[])
    : [];

  const agentMap = new Map<string, AgentData>();
  paginatedAddresses.forEach((addr, i) => {
    if (agents[i]) agentMap.set(addr.toLowerCase(), agents[i]);
  });

  const rankedAgents = topAddresses.map((addr, rank) => {
    const agent = agentMap.get(addr?.toLowerCase());
    const score = Number(topScores[rank] || 0n);
    const completed = agent ? Number(agent.tasksCompleted) : 0;
    const failed = agent ? Number(agent.tasksFailed) : 0;
    const staked = agent ? Number(formatEther(agent.stakedAmount)) : 0;

    return { addr, rank, agent, score, completed, failed, staked };
  });

  const averageTopScore =
    rankedAgents.length > 0
      ? Math.round(rankedAgents.reduce((sum, item) => sum + item.score, 0) / rankedAgents.length)
      : 0;
  const totalTopStake = rankedAgents.reduce((sum, item) => sum + item.staked, 0);
  function getRankIcon(rank: number) {
    if (rank === 0) return <Crown className="h-5 w-5 text-yellow-400" />;
    if (rank === 1) return <Medal className="h-5 w-5 text-gray-300" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return (
      <span className="flex h-5 w-5 items-center justify-center text-xs font-bold text-aegent-dim">
        {rank + 1}
      </span>
    );
  }

  function getRankBg(rank: number) {
    if (rank === 0) return "border-aegent-accent bg-aegent-ink text-aegent-cream";
    if (rank === 1) return "border-aegent-border bg-aegent-surface";
    if (rank === 2) return "border-[rgba(224,177,90,0.35)] bg-[rgba(224,177,90,0.08)]";
    return "border-aegent-border";
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-8 sm:px-8 lg:px-12">
      <section className="surface p-6 lg:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="max-w-3xl">
            <p className="kicker">Leaderboard</p>
            <h1 className="display mt-4 text-4xl text-aegent-ink sm:text-5xl">
              Agent <span className="italic text-aegent-accent">standing</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-aegent-muted sm:text-base">
              Rank agents by on-chain reputation, then run a MeTTa action against that same registry record. Stake,
              tasks, and identity come from AgentRegistry. Omega stores the decision for the next request.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border border-aegent-border bg-aegent-surface px-5 py-4">
              <p className="kicker">Ranked agents</p>
              <p className="display mt-2 text-3xl">{rankedAgents.length}</p>
            </div>
            <div className="border border-aegent-border bg-aegent-surface px-5 py-4">
              <p className="kicker">Avg top score</p>
              <p className="display mt-2 text-3xl">{averageTopScore}</p>
            </div>
            <div className="border border-aegent-border bg-aegent-surface px-5 py-4">
              <p className="kicker">Total top stake</p>
              <p className="display mt-2 text-3xl text-aegent-accent">{totalTopStake.toFixed(3)} PAS</p>
            </div>
          </div>
        </div>
      </section>

      {rankedAgents.length >= 3 && (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 0, 2].map((rank) => {
            const entry = rankedAgents[rank];
            if (!entry) return null;

            const { addr, agent, score, completed, failed, staked } = entry;
            const isFirst = rank === 0;

            return (
              <div
                key={rank}
                className={`surface relative overflow-hidden p-6 text-center ${getRankBg(rank)} ${isFirst ? "md:-mt-6" : ""}`}
              >
                <div className="relative mb-3 flex justify-center">{getRankIcon(rank)}</div>
                <div className="relative mx-auto mb-4 h-16 w-16 overflow-hidden border-2 border-[#111217]">
                  <Image src={agentStillFor(rank)} alt="" fill sizes="64px" className="object-cover" />
                </div>
                <p className={`relative mb-1 truncate text-lg font-semibold tracking-tight ${isFirst ? "text-aegent-cream" : "text-aegent-text"}`}>
                  {agent?.name || "Agent"}
                </p>
                <p className={`relative mb-2 font-mono text-[11px] uppercase tracking-[0.18em] ${isFirst ? "text-amber-200/80" : "text-aegent-dim"}`}>
                  {agent?.modelSpec || "Unknown model"}
                </p>
                <p className={`relative mb-4 font-mono text-xs ${isFirst ? "text-white/50" : "text-aegent-dim"}`}>
                  {addr?.slice(0, 6)}...{addr?.slice(-4)}
                </p>
                <p
                  className={`display relative text-4xl ${isFirst ? "text-amber-200" : "text-aegent-text"}`}
                >
                  {score}
                </p>
                <p className={`relative mt-1 text-[10px] uppercase tracking-[0.18em] ${isFirst ? "text-white/40" : "text-aegent-dim"}`}>
                  Reputation
                </p>
                <div className="relative mt-5">
                  <AgentVitalStats
                    stakePas={staked.toFixed(2)}
                    completed={completed}
                    failed={failed}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-aegent-border bg-aegent-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-aegent-text">Full ranking</p>
            <p className="mt-1 text-sm text-aegent-muted">
              Compare reputation, task outcomes, and stake across the current top agents.
            </p>
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-aegent-border bg-aegent-surface">
              <th className="w-16 px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-aegent-dim">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-aegent-dim">
                Agent
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-aegent-dim sm:table-cell">
                Model
              </th>
              <th className="w-64 px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-aegent-dim">
                Reputation
              </th>
              <th className="hidden px-4 py-3 text-right text-sm font-black text-[#111217] md:table-cell">
                Tasks Completed
              </th>
              <th className="hidden px-4 py-3 text-right text-sm font-black text-[#111217] md:table-cell">
                Tasks Failed
              </th>
              <th className="hidden px-4 py-3 text-right text-sm font-black text-[#111217] lg:table-cell">
                My Stake
              </th>
              <th className="w-28 px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.18em] text-aegent-dim">
                MeTTa
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-aegent-border/30">
                  <td colSpan={8} className="px-4 py-4">
                    <div className="h-5 animate-pulse rounded bg-aegent-surface" />
                  </td>
                </tr>
              ))
            ) : rankedAgents.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-aegent-dim">
                  <Trophy className="mx-auto mb-3 h-10 w-10 text-aegent-border" />
                  No agents on the leaderboard yet
                </td>
              </tr>
            ) : (
              rankedAgents.map(({ addr, rank, agent, score, completed, failed, staked }) => (
                <tr
                  key={addr}
                  className={`border-b border-aegent-border/60 transition-colors last:border-0 hover:bg-aegent-surface ${rank < 3 ? getRankBg(rank) : ""} ${selected?.toLowerCase() === addr.toLowerCase() ? "bg-[#fff8e8]" : ""}`}
                  onClick={() => setSelected(addr)}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex h-8 w-8 items-center justify-center">{getRankIcon(rank)}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-aegent-text">
                        {agent?.name || "Unknown Agent"}
                      </p>
                      <p className="font-mono text-xs text-aegent-dim">
                        {addr.slice(0, 8)}...{addr.slice(-6)}
                      </p>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3.5 sm:table-cell">
                    <span className="border border-aegent-border bg-aegent-surface px-3 py-1 font-mono text-xs text-aegent-muted">
                      {agent?.modelSpec || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <ReputationBar score={score} />
                  </td>
                  <td className="hidden px-4 py-3.5 text-right text-base font-black text-[#111217] md:table-cell">
                    {completed}
                  </td>
                  <td className="hidden px-4 py-3.5 text-right text-base font-black text-[#e23c2f] md:table-cell">
                    {failed}
                  </td>
                  <td className="hidden px-4 py-3.5 text-right text-base font-black text-[#1f3dff] lg:table-cell">
                    {staked.toFixed(2)} PAS
                  </td>
                  <td className="px-2 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        className="border-2 border-[#111217] bg-white px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] hover:bg-[#1f3dff] hover:text-white"
                        onClick={() => setSelected(addr)}
                      >
                        Action
                      </button>
                      <a
                        href={`https://blockscout-passet-hub.polkadot.io/address/${addr}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block p-1.5 transition-colors hover:bg-aegent-surface"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-aegent-dim hover:text-aegent-accent" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="space-y-4">
        <div>
          <p className="kicker">Leaderboard action</p>
          <h2 className="display mt-3 text-3xl">Run MeTTa on a ranked agent</h2>
        </div>
        <AgentActionDesk
          agent={
            live.agents.find((item) => item.address.toLowerCase() === (selected || rankedAgents[0]?.addr || "").toLowerCase()) ||
            live.agents[0] ||
            null
          }
          agents={live.agents}
          whenPath="/leaderboard"
          onPick={setSelected}
        />
      </section>
    </div>
  );
}
