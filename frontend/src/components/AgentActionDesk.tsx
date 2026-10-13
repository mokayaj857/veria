"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  History,
  Minus,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Slash,
  Sliders,
  Zap,
} from "lucide-react";
import { useAppPath } from "@/lib/appPath";
import { AGENT_REGISTRY_ADDRESS } from "@/lib/contract";
import {
  fetchOmega,
  forgetOmega,
  notifyPolicyChange,
  policyActions,
  reasonPayload,
  reasonWithMetta,
  type LiveAgent,
  type MettaDecision,
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
  const presetActions = useMemo(() => (agent ? policyActions(agent, peer) : []), [agent, peer]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MettaDecision | null>(null);
  const [omega, setOmega] = useState<string[]>([]);
  const [limitOverride, setLimitOverride] = useState<number | undefined>(undefined);

  // Customized numerical test parameters
  const [amountInput, setAmountInput] = useState<string>("");
  const [actionType, setActionType] = useState<"transfer" | "spawn" | "export" | "tool">("transfer");
  const [recipientMode, setRecipientMode] = useState<"peer" | "unknown">("peer");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const effectiveLimit = limitOverride ?? (agent ? agent.transactionLimit : 1);
  const numericAmount = Math.max(1, parseInt(amountInput, 10) || 1);
  const isOverLimit = numericAmount > effectiveLimit;
  const delta = numericAmount - effectiveLimit;
  const loadPercentage = Math.round((numericAmount / Math.max(1, effectiveLimit)) * 100);

  useEffect(() => {
    setResult(null);
    setError(null);
    setLimitOverride(undefined);
    setActionType("transfer");
    setRecipientMode("peer");
    setActivePreset(null);

    if (!agent || !visible) {
      setOmega([]);
      setAmountInput("");
      return;
    }

    const defaultAmount = Math.max(1, Math.floor(agent.transactionLimit * 0.5));
    setAmountInput(String(defaultAmount));

    let cancelled = false;
    fetchOmega(agent.address)
      .then((data) => {
        if (cancelled) return;
        setOmega(data.summaries || []);
        if (typeof data.lastLimit === "number" && data.lastLimit > 0) {
          setLimitOverride(data.lastLimit);
        }
      })
      .catch(() => {
        if (!cancelled) setOmega([]);
      });

    return () => {
      cancelled = true;
    };
  }, [agent?.address, visible]);

  function applyPreset(presetId: string) {
    const preset = presetActions.find((item) => item.id === presetId);
    if (!preset) return;
    setActivePreset(presetId);
    setAmountInput(String(preset.amount));
    setActionType(preset.type);
    setRecipientMode(preset.recipient ? "peer" : "unknown");
  }

  function adjustAmount(deltaAmount: number) {
    setActivePreset(null);
    const next = Math.max(1, numericAmount + deltaAmount);
    setAmountInput(String(next));
  }

  async function run() {
    if (!agent || numericAmount <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const recipient =
        recipientMode === "unknown"
          ? null
          : peer
          ? peer.address
          : AGENT_REGISTRY_ADDRESS;

      const actionToRun = {
        type: actionType,
        amount: numericAmount,
        recipient,
      };

      const out = await reasonWithMetta(
        reasonPayload(agent, actionToRun, { persistOmega: true, limitOverride })
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
        <p className="kicker">MeTTa verification</p>
        <h2 className="display mt-3 text-3xl">No on-chain agent selected</h2>
        <p className="mt-3 text-sm leading-7 text-aegent-muted">
          The accountability sandbox reasons over registered agents on the AgentRegistry contract. Register an
          agent or pick one from the roster to test custom numerical workloads.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      {/* Left Column: Subject Card + Customized Testing Workbench */}
      <div className="space-y-6">
        {/* On-Chain Subject Identification */}
        <div className="surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#1f3dff]">
              Subject Agent
            </p>
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-aegent-dim">
              Registry Verified
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {(strict ? [agent] : agents).map((item) => {
              const isPicked = item.address.toLowerCase() === agent.address.toLowerCase();
              return (
                <button
                  key={item.address}
                  type="button"
                  onClick={() => onPick(item.address)}
                  className={`flex items-center gap-2 border-2 px-2.5 py-1.5 text-xs font-bold transition-all ${
                    isPicked
                      ? "border-[#111217] bg-[#1f3dff] text-white shadow-[3px_3px_0_#111217]"
                      : "border-[#111217] bg-white text-[#111217] hover:bg-[#f2efe8]"
                  }`}
                >
                  <span className="relative h-6 w-6 overflow-hidden border border-[#111217]">
                    <Image src={item.still} alt="" fill sizes="24px" className="object-cover" />
                  </span>
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>

          <div className="photo-frame relative mt-4 h-44 w-full">
            <Image
              src={agent.still}
              alt={agent.name}
              fill
              sizes="540px"
              className="object-cover object-top"
              priority
            />
            <div className="absolute bottom-2 left-2 border-2 border-[#111217] bg-[#111217]/90 px-3 py-1 text-white backdrop-blur">
              <span className="font-mono text-xs font-bold">{agent.name}</span>
              <span className="ml-2 font-mono text-[10px] text-white/70">({agent.model})</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Stat label="Reputation" value={String(agent.reputation)} />
            <Stat label="Stake" value={`${agent.stakePas} PAS`} />
            <Stat label="Identity" value={agent.identity} />
            <Stat label="Authorized Limit" value={`${effectiveLimit} units`} highlight />
            <Stat label="Completed" value={String(agent.completed)} />
            <Stat label="Failed" value={String(agent.failed)} />
            <Stat label="Wallet" value={`${agent.address.slice(0, 6)}…${agent.address.slice(-4)}`} />
            <Stat label="Model" value={agent.model} />
          </div>
        </div>

        {/* Customized Test Bench */}
        <div className="surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#111217] pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-[#1f3dff]" />
              <p className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[#111217]">
                Simulation Workbench
              </p>
            </div>
            <span className="border-2 border-[#111217] bg-[#f2efe8] px-2.5 py-1 font-mono text-xs font-bold text-[#111217]">
              Limit Ceiling: <strong className="text-[#1f3dff]">{effectiveLimit}</strong> units
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-aegent-muted">
            Configure the test payload below. Input any custom integer load to observe how MeTTa rules enforce
            economic boundaries, assess collateral exposure, and adjust governance standings.
          </p>

          {/* Primary Numeric Input with Steppers */}
          <div className="mt-5 border-2 border-[#111217] bg-[#f2efe8]/60 p-4">
            <div className="flex items-center justify-between">
              <label htmlFor="test-numeric-input" className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#111217]">
                Test Load Amount
              </label>
              <span className="font-mono text-xs font-bold text-aegent-dim">
                Ratio: <span className={isOverLimit ? "text-[#e23c2f]" : "text-[#1f3dff]"}>{loadPercentage}%</span> of limit
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustAmount(-10)}
                title="Decrease by 10"
                className="flex h-11 w-11 items-center justify-center border-2 border-[#111217] bg-white font-mono text-sm font-bold shadow-[2px_2px_0_#111217] transition-all hover:bg-[#111217] hover:text-white active:translate-x-[1px] active:translate-y-[1px]"
              >
                -10
              </button>
              <button
                type="button"
                onClick={() => adjustAmount(-1)}
                title="Decrease by 1"
                className="flex h-11 w-11 items-center justify-center border-2 border-[#111217] bg-white font-mono text-base font-bold shadow-[2px_2px_0_#111217] transition-all hover:bg-[#111217] hover:text-white active:translate-x-[1px] active:translate-y-[1px]"
              >
                <Minus className="h-4 w-4" />
              </button>

              <div className="relative flex-1">
                <input
                  id="test-numeric-input"
                  type="number"
                  min="1"
                  step="1"
                  value={amountInput}
                  onChange={(event) => {
                    setActivePreset(null);
                    setAmountInput(event.target.value);
                  }}
                  placeholder="Enter a number…"
                  className="field w-full text-center font-mono text-xl font-black text-[#111217]"
                />
              </div>

              <button
                type="button"
                onClick={() => adjustAmount(1)}
                title="Increase by 1"
                className="flex h-11 w-11 items-center justify-center border-2 border-[#111217] bg-white font-mono text-base font-bold shadow-[2px_2px_0_#111217] transition-all hover:bg-[#111217] hover:text-white active:translate-x-[1px] active:translate-y-[1px]"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => adjustAmount(10)}
                title="Increase by 10"
                className="flex h-11 w-11 items-center justify-center border-2 border-[#111217] bg-white font-mono text-sm font-bold shadow-[2px_2px_0_#111217] transition-all hover:bg-[#111217] hover:text-white active:translate-x-[1px] active:translate-y-[1px]"
              >
                +10
              </button>
            </div>

            {/* Range Slider for Fluid Dragging */}
            <div className="mt-3">
              <input
                type="range"
                min="1"
                max={Math.max(100, Math.ceil(effectiveLimit * 3))}
                step="1"
                value={numericAmount}
                onChange={(e) => {
                  setActivePreset(null);
                  setAmountInput(e.target.value);
                }}
                className="h-2 w-full cursor-pointer appearance-none border border-[#111217] bg-white accent-[#1f3dff]"
              />
              <div className="mt-1 flex justify-between font-mono text-[10px] text-aegent-dim">
                <span>1 unit</span>
                <span>Limit: {effectiveLimit}</span>
                <span>3x: {effectiveLimit * 3}</span>
              </div>
            </div>

            {/* Quick Multiplier Buttons */}
            <div className="mt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-aegent-dim">
                Quick Multipliers:
              </p>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  { label: "25%", val: Math.max(1, Math.floor(effectiveLimit * 0.25)) },
                  { label: "50%", val: Math.max(1, Math.floor(effectiveLimit * 0.5)) },
                  { label: "100%", val: effectiveLimit },
                  { label: "150%", val: Math.max(effectiveLimit + 1, Math.floor(effectiveLimit * 1.5)) },
                  { label: "250%", val: Math.max(effectiveLimit + 1, Math.floor(effectiveLimit * 2.5)) },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setActivePreset(null);
                      setAmountInput(String(item.val));
                    }}
                    className={`border-2 border-[#111217] px-2 py-1.5 font-mono text-xs font-bold transition-all ${
                      numericAmount === item.val
                        ? "bg-[#111217] text-white"
                        : "bg-white text-[#111217] hover:bg-[#1f3dff] hover:text-white"
                    }`}
                  >
                    {item.label} ({item.val})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Real-time Dynamic Risk Assessment Meter */}
          <div
            className={`mt-4 border-2 p-4 transition-colors ${
              isOverLimit
                ? "border-[#e23c2f] bg-[#e23c2f]/10"
                : "border-[#1f3dff] bg-[#1f3dff]/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOverLimit ? (
                  <AlertTriangle className="h-5 w-5 text-[#e23c2f]" />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-[#1f3dff]" />
                )}
                <span
                  className={`font-mono text-xs font-black uppercase tracking-[0.14em] ${
                    isOverLimit ? "text-[#e23c2f]" : "text-[#1f3dff]"
                  }`}
                >
                  {isOverLimit ? "Policy Breach Hazard · Over Limit" : "Compliant Range · Authorized"}
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-[#111217]">
                {numericAmount} / {effectiveLimit} units
              </span>
            </div>

            {/* Visual Load Progress Bar */}
            <div className="mt-2.5 h-3 w-full overflow-hidden border border-[#111217] bg-white">
              <div
                className={`h-full transition-all duration-300 ${
                  isOverLimit ? "bg-[#e23c2f]" : "bg-[#1f3dff]"
                }`}
                style={{ width: `${Math.min(100, loadPercentage)}%` }}
              />
            </div>

            <p className="mt-2 text-xs leading-5 text-[#111217]">
              {isOverLimit
                ? `Input load exceeds authorized ceiling by +${delta} units (${loadPercentage}%). MeTTa will evaluate Rule #1 (over-limit threshold) and is expected to trigger a penalty or slash.`
                : `Input load is within the authorized ceiling of ${effectiveLimit} units. MeTTa will evaluate stake backing, reputation score, and incident memory.`}
            </p>
          </div>

          {/* Action Type & Recipient Controls */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="action-type-select" className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-aegent-dim">
                Action Type
              </label>
              <select
                id="action-type-select"
                value={actionType}
                onChange={(event) => {
                  setActivePreset(null);
                  setActionType(event.target.value as "transfer" | "spawn" | "export" | "tool");
                }}
                className="field mt-1.5 w-full py-2 font-mono text-xs font-bold"
              >
                <option value="transfer">Token Transfer (Value)</option>
                <option value="spawn">Spawn Sub-Agent</option>
                <option value="export">Export Model Weights</option>
                <option value="tool">Privileged Tool Execution</option>
              </select>
            </div>

            <div>
              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-aegent-dim">
                Recipient Target
              </label>
              <button
                type="button"
                onClick={() => {
                  setActivePreset(null);
                  setRecipientMode((prev) => (prev === "unknown" ? "peer" : "unknown"));
                }}
                className={`mt-1.5 flex w-full items-center justify-between border-2 border-[#111217] px-3 py-2 font-mono text-xs font-bold transition-all ${
                  recipientMode === "unknown"
                    ? "bg-[#e23c2f] text-white shadow-[2px_2px_0_#111217]"
                    : "bg-white text-[#111217] hover:bg-[#f2efe8]"
                }`}
              >
                <span>{recipientMode === "unknown" ? "Unknown Recipient" : "Valid Peer Agent"}</span>
                <span className="font-mono text-[10px] uppercase opacity-75">
                  {recipientMode === "unknown" ? "Violate" : "OK"}
                </span>
              </button>
            </div>
          </div>

          {/* Preset Scenario Shortcuts */}
          <div className="mt-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-aegent-dim">
              Quick Scenarios:
            </p>
            <div className="mt-1.5 grid gap-1.5">
              {presetActions.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`flex items-center justify-between border-2 px-3 py-2 text-left text-xs font-bold transition-all ${
                    activePreset === preset.id
                      ? "border-[#111217] bg-[#111217] text-white"
                      : "border-[#111217] bg-white hover:bg-[#f2efe8]"
                  }`}
                >
                  <span>{preset.label}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] opacity-70">
                    {preset.amount} units · {preset.risk}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Trigger Button */}
          <button
            type="button"
            className="btn-ink mt-5 w-full py-4 text-base"
            disabled={busy || numericAmount <= 0}
            onClick={run}
          >
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Cpu className="h-5 w-5 animate-spin" />
                Reasoning in MeTTa Symbolic Engine…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Run MeTTa Verification ({numericAmount} Units)
              </span>
            )}
          </button>
          {error ? <p className="mt-3 text-sm font-bold text-[#e23c2f]">{error}</p> : null}
        </div>

        {/* Omega Incident Memory Ledger */}
        <div className="surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-[#e23c2f]" />
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#e23c2f]">
                Omega Incident Memory
              </p>
            </div>
            <span className="font-mono text-[11px] text-aegent-dim">
              {omega.length} trace{omega.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {omega.length ? (
              omega.map((memory, index) => (
                <div
                  key={`${memory}-${index}`}
                  className="border-2 border-[#111217] bg-[#f7f4ee] p-3 text-sm"
                >
                  <span className="font-mono text-[10px] uppercase text-aegent-dim">
                    Record #{index + 1}
                  </span>
                  <p className="mt-1 font-medium leading-6 text-[#111217]">{memory}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-aegent-muted">
                No stored governance incidents for this agent wallet. MeTTa actions that violate policy will be
                logged here persistently.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: MeTTa Reasoning Terminal Output */}
      <div className="surface-ink flex flex-col justify-between p-6 sm:p-8">
        <div>
          <div className="flex items-center justify-between border-b border-white/15 pb-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8ea0ff]">
                Symbolic Logic Terminal
              </p>
              <h3 className="display mt-1 text-2xl text-white">MeTTa Reasoning</h3>
            </div>
            {result ? (
              <div
                className={`inline-flex items-center gap-2 border-2 border-white px-3 py-1.5 font-mono text-xs font-black uppercase tracking-wider ${
                  result.decision === "slash" || result.decision === "reject"
                    ? "bg-[#e23c2f] text-white"
                    : result.decision === "approve" || result.decision === "approve-with-limit"
                    ? "bg-[#1f3dff] text-white"
                    : "bg-[#c45c12] text-white"
                }`}
              >
                {result.decision === "slash" || result.decision === "reject" ? (
                  <Slash className="h-4 w-4" />
                ) : result.decision === "approve" || result.decision === "approve-with-limit" ? (
                  <ShieldCheck className="h-4 w-4" />
                ) : (
                  <ShieldAlert className="h-4 w-4" />
                )}
                {result.decision}
              </div>
            ) : null}
          </div>

          {result ? (
            <div className="mt-6 space-y-6">
              {/* Natural language reasoning proof */}
              <div className="border-l-4 border-[#1f3dff] bg-white/5 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8ea0ff]">
                  Formal Deductive Verdict
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/90">
                  {result.explanation}
                </p>
              </div>

              {/* Core Output Telemetry Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <InkStat label="Trust Score" value={`${result.trustScore} / 1000`} />
                <InkStat label="Assessed Risk" value={result.risk} highlight={result.risk === "High"} />
                <InkStat label="Confidence" value={`${(result.confidence * 100).toFixed(1)}%`} />
                <InkStat
                  label="Policy Violation"
                  value={result.violation}
                  highlight={result.violation !== "none"}
                />
                <InkStat
                  label="Slash Imposed"
                  value={result.slashPercentage > 0 ? `${result.slashPercentage}%` : "0%"}
                  highlight={result.slashPercentage > 0}
                />
                <InkStat
                  label="Adjusted Limit"
                  value={`${result.recommendedTransactionLimit} units`}
                />
              </div>

              {/* Chain Action Dispatch */}
              <div className="border-2 border-white/15 bg-white/5 p-3.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">
                  On-Chain Action Trigger
                </p>
                <p className="mt-1 font-mono text-xs font-bold text-white">
                  {result.chainAction.function || "NO_DISPATCH"}
                </p>
                <p className="mt-1 text-xs text-white/70">{result.chainAction.note}</p>
              </div>

              {/* Deductive Proof Reasons */}
              {result.reasons?.length ? (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
                    Proof Derivation Steps
                  </p>
                  <div className="mt-2 space-y-2">
                    {result.reasons.map((reason, index) => (
                      <div
                        key={reason}
                        className="flex items-start gap-3 border border-white/10 bg-white/[0.03] p-3"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8ea0ff]" />
                        <p
                          className="text-xs leading-5 text-white/85"
                          style={{ animationDelay: `${index * 40}ms` }}
                        >
                          {reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-10 flex flex-col items-center justify-center py-12 text-center text-white/60">
              <div className="relative mb-4 flex h-16 w-16 items-center justify-center border-2 border-white/20 bg-white/5">
                <Cpu className="h-8 w-8 text-[#8ea0ff]" />
              </div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8ea0ff]">
                Awaiting Execution
              </p>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
                Input any test number or adjust parameters on the left, then click{" "}
                <strong className="text-white">Run MeTTa Verification</strong> to watch the symbolic engine
                evaluate policies and trace governance memories in real time.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-white/10 pt-4 text-center font-mono text-[11px] text-white/40">
          VERIA POLKADOT HUB TESTNET · MeTTa REASONING LAYER
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`border-2 p-3 ${highlight ? "border-[#1f3dff] bg-[#1f3dff]/5" : "border-[#111217] bg-white"}`}>
      <p className="font-mono text-[10px] uppercase text-aegent-dim">{label}</p>
      <p className={`mt-1 truncate font-bold ${highlight ? "text-[#1f3dff]" : "text-[#111217]"}`}>{value}</p>
    </div>
  );
}

function InkStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`border-2 p-3 ${
        highlight ? "border-[#e23c2f] bg-[#e23c2f]/20" : "border-white/15 bg-white/[0.04]"
      }`}
    >
      <p className="font-mono text-[10px] uppercase text-white/45">{label}</p>
      <p className={`mt-1 font-mono text-xs font-bold ${highlight ? "text-[#ff6b6b]" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
