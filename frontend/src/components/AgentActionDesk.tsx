"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CheckCircle2, ShieldAlert, ShieldCheck, Slash } from "lucide-react";
import { useAppPath } from "@/lib/appPath";
import {
  fetchOmega,
  forgetOmega,
  notifyPolicyChange,
  policyActions,
  reasonPayload,
  reasonWithMetta,
  type LiveAgent,
  type MettaDecision,
  type PolicyAction,
} from "@/lib/veriaSubject";

export function AgentActionDesk({
  agent,
  agents,
  onPick,
  whenPath,
  strict = false,
}: {
  agent: LiveAgent | null;
  agents: LiveAgent[];
  onPick: (address: string) => void;
  whenPath?: string;
  strict?: boolean;
}) {
  const { path } = useAppPath();
  const visible = !whenPath || path === whenPath;
  const peer = agents.find((item) => item.address.toLowerCase() !== agent?.address.toLowerCase()) || null;
  const actions = useMemo(() => (agent ? policyActions(agent, peer) : []), [agent, peer]);
  const [actionId, setActionId] = useState("authorized");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MettaDecision | null>(null);
  const [omega, setOmega] = useState<string[]>([]);
  const [limitOverride, setLimitOverride] = useState<number | undefined>(undefined);

  const selected: PolicyAction | undefined = actions.find((item) => item.id === actionId) || actions[0];

  useEffect(() => {
    setActionId("authorized");
    setResult(null);
    setError(null);
    setLimitOverride(undefined);
    if (!agent || !visible) {
      setOmega([]);
      return;
    }
    let cancelled = false;
    fetchOmega(agent.address)
      .then((data) => {
        if (cancelled) return;
        setOmega(data.summaries || []);
        if (typeof data.lastLimit === "number" && data.lastLimit > 0) setLimitOverride(data.lastLimit);
      })
      .catch(() => {
        if (!cancelled) setOmega([]);
      });
    return () => {
      cancelled = true;
    };
  }, [agent?.address, visible]);

  async function run() {
    if (!agent || !selected) return;
    setBusy(true);
    setError(null);
    try {
      const out = await reasonWithMetta(
        reasonPayload(agent, selected, { persistOmega: true, limitOverride })
      );
      setResult(out);
      forgetOmega(agent.address);
      notifyPolicyChange(agent.address);
      const nextOmega = await fetchOmega(agent.address);
      setOmega(nextOmega.summaries?.length ? nextOmega.summaries : out.omegaMemoriesUsed || []);
      if (out.recommendedTransactionLimit) setLimitOverride(out.recommendedTransactionLimit);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!agent) {
    return (
      <section className="surface p-6">
        <p className="kicker">MeTTa action</p>
        <h2 className="display mt-3 text-3xl">No on-chain agent selected</h2>
        <p className="mt-3 text-sm leading-7 text-aegent-muted">
          The leaderboard and trust desk only reason over agents that exist in the AgentRegistry. Register an
          agent, then pick it here. There are no placeholder subjects.
        </p>
      </section>
    );
  }

  const limit = limitOverride ?? agent.transactionLimit;

  return (
    <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-4">
        <div className="surface p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#1f3dff]">On-chain subject</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(strict ? [agent] : agents).map((item) => (
              <button
                key={item.address}
                type="button"
                onClick={() => onPick(item.address)}
                className={`flex items-center gap-2 border-2 px-2 py-2 text-sm font-bold ${
                  item.address === agent.address ? "border-[#111217] bg-[#1f3dff] text-white" : "border-[#111217] bg-white"
                }`}
              >
                <span className="relative h-8 w-8 overflow-hidden">
                  <Image src={item.still} alt="" fill sizes="32px" className="object-cover" />
                </span>
                {item.name}
              </button>
            ))}
          </div>
          <div className="photo-frame relative mt-4 h-40 w-full">
            <Image src={agent.still} alt={agent.name} fill sizes="480px" className="object-cover object-top" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Reputation" value={String(agent.reputation)} />
            <Stat label="Stake" value={`${agent.stakePas} PAS`} />
            <Stat label="Identity" value={agent.identity} />
            <Stat label="Limit" value={String(limit)} />
            <Stat label="Completed" value={String(agent.completed)} />
            <Stat label="Failed" value={String(agent.failed)} />
            <Stat label="Wallet" value={`${agent.address.slice(0, 6)}…${agent.address.slice(-4)}`} />
            <Stat label="Model" value={agent.model} />
          </div>
        </div>

        <div className="surface p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#1f3dff]">Requested action</p>
          <p className="mt-2 text-sm text-aegent-muted">
            Amounts are computed from this agent’s on-chain stake and reputation. MeTTa compares them to the
            authorized limit, then Omega stores the outcome.
          </p>
          <div className="mt-3 grid gap-2">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => setActionId(action.id)}
                className={`flex items-center justify-between border-2 px-3 py-3 text-left text-sm font-bold ${
                  selected?.id === action.id ? "border-[#111217] bg-[#111217] text-white" : "border-[#111217] bg-white"
                }`}
              >
                {action.label}
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] opacity-70">{action.risk}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn-ink mt-4" disabled={busy} onClick={run}>
            {busy ? "Reasoning in MeTTa..." : "Run MeTTa on this agent"}
          </button>
          {error ? <p className="mt-3 text-sm font-bold text-[#e23c2f]">{error}</p> : null}
        </div>

        <div className="surface p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#e23c2f]">Omega memory</p>
          <div className="mt-3 space-y-2">
            {omega.length ? (
              omega.map((memory, index) => (
                <p key={`${memory}-${index}`} className="border-2 border-[#111217] px-3 py-3 text-sm">
                  <span className="font-mono text-[10px] uppercase text-aegent-dim">Trace {index + 1}</span>
                  <span className="mt-1 block font-medium leading-6">{memory}</span>
                </p>
              ))
            ) : (
              <p className="text-sm text-aegent-muted">No stored incidents for this wallet yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="surface-ink p-6">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#8ea0ff]">MeTTa reasoning</p>
        {result ? (
          <>
            <p className="inline-flex items-center gap-2 bg-[#1f3dff] px-3 py-1.5 text-sm font-bold text-white">
              {result.decision === "slash" || result.decision === "reject" ? (
                <Slash className="h-4 w-4" />
              ) : result.decision === "approve" || result.decision === "approve-with-limit" ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
              {result.decision}
            </p>
            <p className="mt-6 whitespace-pre-wrap text-base leading-8 text-white/80">{result.explanation}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <InkStat label="Trust" value={String(result.trustScore)} />
              <InkStat label="Risk" value={result.risk} />
              <InkStat label="Confidence" value={result.confidence.toFixed(2)} />
              <InkStat label="Violation" value={result.violation} />
              <InkStat label="Slash %" value={String(result.slashPercentage)} />
              <InkStat label="New limit" value={String(result.recommendedTransactionLimit)} />
            </div>
            <p className="mt-4 text-sm text-white/70">
              {result.chainAction.function || "none"} — {result.chainAction.note}
            </p>
          </>
        ) : (
          <p className="text-base leading-8 text-white/70">
            Choose a live leaderboard agent and an action. The request is built from registry stake, reputation,
            tasks, identity status, and Omega history — then executed by the MeTTa engine.
          </p>
        )}
        {result?.reasons?.length ? (
          <div className="mt-6 space-y-3">
            {result.reasons.map((reason, index) => (
              <div key={reason} className="flex items-start gap-3 border-2 border-white/15 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8ea0ff]" />
                <p className="text-sm leading-6 text-white/80" style={{ animationDelay: `${index * 40}ms` }}>
                  {reason}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-[#111217] p-3">
      <p className="font-mono text-[10px] uppercase text-aegent-dim">{label}</p>
      <p className="mt-1 truncate font-bold">{value}</p>
    </div>
  );
}

function InkStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-white/15 p-3">
      <p className="font-mono text-[10px] uppercase text-white/45">{label}</p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}
