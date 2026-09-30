"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CheckCircle2, ShieldAlert, ShieldCheck, Slash } from "lucide-react";

type AgentProfile = {
  name: string;
  reputation: number;
  serial: string;
  model: string;
  stake: string;
  memories: string[];
  still?: string;
};

const ACTIONS = [
  {
    id: "treasury",
    label: "Move treasury funds",
    risk: "High",
  },
  {
    id: "spawn",
    label: "Spawn a child agent",
    risk: "Medium",
  },
  {
    id: "export",
    label: "Export private context",
    risk: "Critical",
  },
  {
    id: "tool",
    label: "Call an untrusted tool",
    risk: "Medium",
  },
] as const;

function verdictFor(agent: AgentProfile, actionId: string) {
  if (actionId === "export") {
    return {
      decision: "Reject" as const,
      color: "bg-[#e23c2f] text-white",
      icon: Slash,
      why: `${agent.name} requested an irreversible data export. Omega recalls prior boundary tests, and MeTTa will not authorize private-context exfiltration without a human co-sign.`,
      checks: [
        { label: "Identity", ok: true, note: "Wallet and serial match the registry." },
        { label: "Stake", ok: true, note: `${agent.stake} PAS is locked.` },
        { label: "Reputation", ok: agent.reputation >= 700, note: `${agent.reputation}/1000 on file.` },
        { label: "Omega", ok: false, note: "Remembered a previous attempt to widen data access." },
        { label: "MeTTa", ok: false, note: "Rule: export of private context requires dual control." },
      ],
    };
  }

  if (actionId === "treasury" && agent.reputation < 950) {
    return {
      decision: "Limit" as const,
      color: "bg-[#111217] text-white",
      icon: ShieldAlert,
      why: `MeTTa allows a capped transfer only. ${agent.name} is identified and staked, but Omega’s history does not yet support uncapped treasury movement.`,
      checks: [
        { label: "Identity", ok: true, note: "On-chain identity verified." },
        { label: "Stake", ok: true, note: `${agent.stake} PAS collateral is live.` },
        { label: "Reputation", ok: true, note: `${agent.reputation}/1000 is sufficient for a limited path.` },
        { label: "Omega", ok: true, note: "No slash events. Two successful settlements remembered." },
        { label: "MeTTa", ok: true, note: "Cap the action at 5% of treasury until more evidence arrives." },
      ],
    };
  }

  if (actionId === "spawn" && agent.reputation < 930) {
    return {
      decision: "Limit" as const,
      color: "bg-[#111217] text-white",
      icon: ShieldAlert,
      why: `Child agents inherit risk. Omega remembers incomplete supervision on a prior spawn, so MeTTa approves only a sandboxed child with no spend rights.`,
      checks: [
        { label: "Identity", ok: true, note: "Parent identity is registered." },
        { label: "Stake", ok: true, note: "Parent stake remains slashable." },
        { label: "Reputation", ok: true, note: `${agent.reputation}/1000.` },
        { label: "Omega", ok: false, note: "A previous child was left unsupervised for 11 hours." },
        { label: "MeTTa", ok: true, note: "Allow spawn with spend=0 and a 24h review gate." },
      ],
    };
  }

  return {
    decision: "Approve" as const,
    color: "bg-[#1f3dff] text-white",
    icon: ShieldCheck,
    why: `Identity, stake, and reputation all clear. Omega has no blocking memories for this action, and MeTTa’s ruleset returns allow — with the evidence trail shown below.`,
    checks: [
      { label: "Identity", ok: true, note: `${agent.serial} is bound to the operator wallet.` },
      { label: "Stake", ok: true, note: `${agent.stake} PAS is posted as accountability.` },
      { label: "Reputation", ok: true, note: `${agent.reputation}/1000 from recorded outcomes.` },
      { label: "Omega", ok: true, note: "Past behavior is consistent with this class of action." },
      { label: "MeTTa", ok: true, note: "No conflicting rule fired. Decision is allow." },
    ],
  };
}

export function TrustDesk({
  agent,
  agents,
  onPickAgent,
}: {
  agent: AgentProfile;
  agents: AgentProfile[];
  onPickAgent: (name: string) => void;
}) {
  const [actionId, setActionId] = useState<(typeof ACTIONS)[number]["id"]>("tool");
  const [running, setRunning] = useState(false);
  const [shownChecks, setShownChecks] = useState(0);
  const [memoryIndex, setMemoryIndex] = useState(0);

  const result = useMemo(() => verdictFor(agent, actionId), [agent, actionId]);
  const Icon = result.icon;

  useEffect(() => {
    setShownChecks(0);
    setRunning(true);
    const timers = result.checks.map((_, index) =>
      window.setTimeout(() => setShownChecks(index + 1), 280 * (index + 1))
    );
    const done = window.setTimeout(() => setRunning(false), 280 * result.checks.length + 200);
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(done);
    };
  }, [agent.name, actionId, result.checks.length]);

  return (
    <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Live trust desk</p>
          <h2 className="display mt-3 max-w-3xl text-4xl sm:text-5xl">Ask VERIA. See exactly why.</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-aegent-muted">
            Pick an agent and an action. VERIA checks identity, stake, reputation, and evidence. MeTTa reasons. Omega remembers. Then you get approve, reject, or limit — with the trail.
          </p>
        </div>
        <div className="flex items-center gap-2 border-2 border-[#111217] bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.18em]">
          <span className="pulse-live h-2.5 w-2.5 bg-[#e23c2f]" />
          {running ? "Reasoning" : "Verdict ready"}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className="surface p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#1f3dff]">Subject</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {agents.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => onPickAgent(item.name)}
                  className={`flex items-center gap-2 border-2 px-2 py-2 text-sm font-bold ${
                    item.name === agent.name ? "border-[#111217] bg-[#1f3dff] text-white" : "border-[#111217] bg-white"
                  }`}
                >
                  {item.still ? (
                    <span className="relative h-8 w-8 overflow-hidden">
                      <Image src={item.still} alt="" fill sizes="32px" className="object-cover" />
                    </span>
                  ) : null}
                  {item.name}
                </button>
              ))}
            </div>
            {agent.still ? (
              <div className="photo-frame relative mt-4 h-52 w-full">
                <Image src={agent.still} alt={`${agent.name} AGI portrait`} fill sizes="480px" className="object-cover object-top" />
              </div>
            ) : null}
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div className="border-2 border-[#111217] p-3">
                <p className="font-mono text-[10px] uppercase text-aegent-dim">Rep</p>
                <p className="mt-1 font-bold">{agent.reputation}</p>
              </div>
              <div className="border-2 border-[#111217] p-3">
                <p className="font-mono text-[10px] uppercase text-aegent-dim">Stake</p>
                <p className="mt-1 font-bold">{agent.stake}</p>
              </div>
              <div className="border-2 border-[#111217] p-3">
                <p className="font-mono text-[10px] uppercase text-aegent-dim">ID</p>
                <p className="mt-1 font-bold">{agent.serial}</p>
              </div>
            </div>
          </div>

          <div className="surface p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#1f3dff]">Requested action</p>
            <div className="mt-3 grid gap-2">
              {ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => setActionId(action.id)}
                  className={`flex items-center justify-between border-2 px-3 py-3 text-left text-sm font-bold ${
                    actionId === action.id ? "border-[#111217] bg-[#111217] text-white" : "border-[#111217] bg-white"
                  }`}
                >
                  {action.label}
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] opacity-70">{action.risk}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="surface p-5">
            <div className="mb-3 flex items-center gap-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#e23c2f]">Omega memory</p>
            </div>
            <div className="space-y-2">
              {agent.memories.map((memory, index) => (
                <button
                  key={memory}
                  type="button"
                  onClick={() => setMemoryIndex(index)}
                  className={`w-full border-2 px-3 py-3 text-left text-sm ${
                    memoryIndex === index ? "border-[#e23c2f] bg-[#fff1ef]" : "border-[#111217] bg-white"
                  }`}
                >
                  <span className="font-mono text-[10px] uppercase text-aegent-dim">Trace {index + 1}</span>
                  <p className="mt-1 font-medium leading-6">{memory}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="surface-ink p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#8ea0ff]">
                MeTTa reasoning
              </div>
              <p className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-bold ${result.color}`}>
                <Icon className="h-4 w-4" />
                {result.decision}
              </p>
            </div>
            <p className="font-mono text-[11px] text-white/50">{agent.model}</p>
          </div>

          <p className="mt-6 text-base leading-8 text-white/80">{result.why}</p>

          <div className="mt-8 space-y-3">
            {result.checks.slice(0, shownChecks).map((check, index) => (
              <div key={check.label} className="reason-line flex items-start gap-3 border-2 border-white/15 p-3" style={{ animationDelay: `${index * 40}ms` }}>
                {check.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8ea0ff]" />
                ) : (
                  <Slash className="mt-0.5 h-4 w-4 shrink-0 text-[#e23c2f]" />
                )}
                <div>
                  <p className="text-sm font-bold">{check.label}</p>
                  <p className="mt-1 text-sm leading-6 text-white/65">{check.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
