"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { formatEther, parseEther, type Address } from "viem";
import { toast } from "sonner";
import {
  type AgentData,
  useAgent,
  useAgentCount,
  useAgentsPaginated,
  useCancelWithdrawal,
  useExecuteWithdrawal,
  useHasReviewed,
  useRequestWithdrawal,
  useRegistryStats,
  useReviewAgent,
  useWithdrawalRequest,
} from "@/hooks/useAgentRegistry";
import { ReputationBar, StatusBadge } from "@/components/UI";
import { agentStillFor } from "@/lib/veriaMedia";
import Image from "next/image";
import {
  ArrowDownToLine,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  ExternalLink,
  Filter,
  Loader2,
  Search,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";

const PAGE_SIZE = 12;

function ReviewButtons({ targetAddr }: { targetAddr: Address }) {
  const { address } = useAccount();
  const { data: hasReviewed } = useHasReviewed(address, targetAddr);
  const { data: myAgent } = useAgent(address);
  const { review, isPending, isConfirming, isSuccess, error, reset } = useReviewAgent();

  const agent = myAgent as AgentData | undefined;
  const isRegistered = agent && agent.registeredAt > 0n;
  const isSelf = address?.toLowerCase() === targetAddr.toLowerCase();
  const alreadyReviewed = hasReviewed === true;

  // Pre-checks for toast notifications
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const isTooNew = isRegistered && (nowSec - agent.registeredAt) < 86400n;
  const repTooLow = isRegistered && Number(agent.reputationScore) < 200;
  const canReview = address && isRegistered && !isSelf && !alreadyReviewed && !isTooNew && !repTooLow;

  function handleReview(positive: boolean) {
    if (isTooNew) {
      toast.error("Account too new", {
        description: "Your agent must be registered for at least 1 day before reviewing others.",
      });
      return;
    }
    if (repTooLow) {
      toast.error("Reputation too low", {
        description: "You need at least 200 reputation to review.",
      });
      return;
    }
    reset();
    review(targetAddr, positive);
  }

  if (!address || !isRegistered || isSelf) return null;

  if (isSuccess) {
    toast.success("Review submitted!", {
      description: "Your peer review has been recorded on-chain.",
    });
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-300">
        <CheckCircle className="h-3 w-3" /> Review submitted
      </div>
    );
  }

  if (alreadyReviewed) {
    return <span className="text-xs text-aegent-dim">Already reviewed</span>;
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => handleReview(true)}
        disabled={isPending || isConfirming}
        title={isTooNew ? "Account too new (wait 1 day)" : "Positive review"}
        className="border border-emerald-400/30 p-1.5 text-emerald-300 transition-colors hover:bg-emerald-500/10 disabled:opacity-30"
      >
        {isPending || isConfirming ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <ThumbsUp className="h-3 w-3" />
        )}
      </button>
      <button
        onClick={() => handleReview(false)}
        disabled={isPending || isConfirming}
        title={isTooNew ? "Account too new (wait 1 day)" : "Negative review"}
        className="border border-rose-400/30 p-1.5 text-rose-300 transition-colors hover:bg-rose-500/10 disabled:opacity-30"
      >
        <ThumbsDown className="h-3 w-3" />
      </button>
    </div>
  );
}

function ReviewStatus({ targetAddr }: { targetAddr: Address }) {
  const { address, isConnected } = useAccount();
  const { data: hasReviewed } = useHasReviewed(address, targetAddr);
  const { data: myAgent } = useAgent(address);

  const isRegistered = !!myAgent && (myAgent as AgentData).registeredAt > 0n;
  const isSelf = address?.toLowerCase() === targetAddr.toLowerCase();
  const alreadyReviewed = hasReviewed === true;

  if (!isConnected) {
    return <span className="text-xs text-aegent-dim">Connect wallet to review</span>;
  }

  if (!isRegistered) {
    return <span className="text-xs text-aegent-dim">Register your agent to review</span>;
  }

  if (isSelf) {
    return <span className="text-xs text-aegent-dim">You cannot review your own agent</span>;
  }

  if (alreadyReviewed) {
    return <span className="text-xs text-aegent-dim">You already reviewed this agent</span>;
  }

  return <span className="text-xs text-aegent-dim">Review this agent</span>;
}

function ReviewFooter({ targetAddr }: { targetAddr: Address }) {
  const { isConnected } = useAccount();

  if (!isConnected) return null;

  return (
    <div className="flex items-center justify-between gap-3">
      <ReviewStatus targetAddr={targetAddr} />
      <div className="flex items-center gap-3">
        <ReviewButtons targetAddr={targetAddr} />
      </div>
    </div>
  );
}

function WithdrawalPanel() {
  const { address } = useAccount();
  const { data: myAgent } = useAgent(address);
  const { data: withdrawalReq } = useWithdrawalRequest(address);
  const { requestWithdrawal, isPending: reqPending, isSuccess: reqSuccess, reset: reqReset } =
    useRequestWithdrawal();
  const { executeWithdrawal, isPending: execPending, isSuccess: execSuccess, reset: execReset } =
    useExecuteWithdrawal();
  const { cancelWithdrawal, isPending: cancelPending } = useCancelWithdrawal();
  const [amount, setAmount] = useState("");

  if (!address || !myAgent) return null;
  const agent = myAgent as AgentData;
  if (agent.registeredAt === 0n) return null;

  const pendingAmount = withdrawalReq ? (withdrawalReq as [bigint, bigint])[0] : 0n;
  const requestedAt = withdrawalReq ? (withdrawalReq as [bigint, bigint])[1] : 0n;
  const hasPending = pendingAmount > 0n;
  const cooldownEnd = requestedAt > 0n ? Number(requestedAt) + 3 * 24 * 3600 : 0;
  const canExecute = hasPending && Date.now() / 1000 >= cooldownEnd;
  const maxWithdraw = agent.stakedAmount - parseEther("0.01");

  return (
    <section className="surface p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center border border-aegent-border bg-aegent-surface">
          <ArrowDownToLine className="h-5 w-5 text-aegent-accent" />
        </div>
        <div>
          <p className="kicker">Stake Withdrawal</p>
          <h2 className="mt-1 text-lg font-semibold text-aegent-text">Manage collateral</h2>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-xs text-aegent-muted">
        <span className="border border-aegent-border bg-aegent-surface px-3 py-1.5">
          Staked: {Number(formatEther(agent.stakedAmount)).toFixed(3)} PAS
        </span>
        <span className="border border-aegent-border bg-aegent-surface px-3 py-1.5">
          Reputation: {Number(agent.reputationScore)}/1000
        </span>
        {Number(agent.reputationScore) < 300 && (
          <span className="border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-amber-200">
            Min rep 300 required
          </span>
        )}
      </div>

      {reqSuccess || execSuccess ? (
        <div className="flex items-center gap-2 text-sm text-emerald-300">
          <CheckCircle className="h-4 w-4" />
          {execSuccess ? "Withdrawal executed." : "Withdrawal requested. 3-day cooldown started."}
          <button onClick={() => { reqReset(); execReset(); }} className="text-aegent-dim underline">
            Dismiss
          </button>
        </div>
      ) : hasPending ? (
        <div className="space-y-3">
          <div className="text-sm text-aegent-muted">
            Pending: {Number(formatEther(pendingAmount)).toFixed(3)} PAS
            {canExecute
              ? " — Ready to withdraw."
              : ` — Unlocks ${new Date(cooldownEnd * 1000).toLocaleString()}`}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => executeWithdrawal()}
              disabled={!canExecute || execPending}
              className="btn-ink px-4 py-2 text-sm disabled:opacity-30"
            >
              {execPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Execute Withdrawal"}
            </button>
            <button
              onClick={() => cancelWithdrawal()}
              disabled={cancelPending}
              className="inline-flex items-center gap-2 border border-aegent-border px-4 py-2 text-sm text-aegent-muted transition-colors hover:text-aegent-text"
            >
              {cancelPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (PAS)"
            step="0.01"
            min="0.001"
            max={Number(formatEther(maxWithdraw > 0n ? maxWithdraw : 0n))}
            className="field flex-1"
          />
          <button
            onClick={() => {
              if (!amount || Number(amount) <= 0) return;
              requestWithdrawal(parseEther(amount));
            }}
            disabled={
              reqPending ||
              !amount ||
              Number(amount) <= 0 ||
              Number(agent.reputationScore) < 300 ||
              maxWithdraw <= 0n
            }
            className="btn-ink disabled:opacity-30"
          >
            {reqPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request Withdrawal"}
          </button>
        </div>
      )}
    </section>
  );
}

export default function ExplorerPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reputationFilter, setReputationFilter] = useState("all");

  const { data: totalCount } = useAgentCount();
  const { data: registryStats } = useRegistryStats();
  const { data, isLoading } = useAgentsPaginated(page * PAGE_SIZE, PAGE_SIZE);

  const agents: AgentData[] = data ? (data[0] as unknown as AgentData[]) : [];
  const addresses: Address[] = data ? (data[1] as unknown as Address[]) : [];
  const total = totalCount ? Number(totalCount) : 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = agents.filter((a, i) => {
    const matchesSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.modelSpec.toLowerCase().includes(search.toLowerCase()) ||
      addresses[i]?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || String(a.status) === statusFilter;

    const reputation = Number(a.reputationScore);
    const matchesReputation =
      reputationFilter === "all" ||
      (reputationFilter === "high" && reputation >= 700) ||
      (reputationFilter === "mid" && reputation >= 400 && reputation < 700) ||
      (reputationFilter === "low" && reputation < 400);

    return matchesSearch && matchesStatus && matchesReputation;
  });

  function formatDate(timestamp: bigint) {
    if (!timestamp || timestamp === 0n) return "—";
    return new Date(Number(timestamp) * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function parseMetadata(metaStr: string) {
    try {
      return JSON.parse(metaStr);
    } catch {
      return {};
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-8 sm:px-8 lg:px-12">
      <section className="surface overflow-hidden p-6 lg:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="max-w-3xl">
            <p className="kicker">Registry</p>
            <h1 className="display mt-4 text-4xl text-aegent-ink sm:text-5xl">
              Agent <span className="italic text-aegent-accent">registry</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-aegent-muted sm:text-base">
              Browse VERIA identities, inspect stake and reputation, and review the public trail Omega will remember.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="surface px-5 py-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aegent-accent">Total agents</p>
              <p className="display mt-2 text-3xl">
                {total.toLocaleString()}
              </p>
            </div>
            <div className="surface px-5 py-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aegent-accent">Staked PAS</p>
              <p className="display mt-2 text-3xl text-[#1f3dff]">
                {registryStats ? Number(formatEther(registryStats[2])).toFixed(3) : "0.000"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 xl:grid-cols-[1fr_auto_auto] xl:items-center">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-aegent-dim" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, model, or address..."
              className="field pl-11"
            />
          </div>

          <label className="inline-flex items-center gap-3 border border-aegent-border bg-aegent-surface px-4 py-3 text-sm text-aegent-muted">
            <Filter className="h-4 w-4 text-aegent-accent" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent pr-2 text-sm text-aegent-text focus:outline-none"
            >
              <option value="all" className="bg-aegent-surface text-aegent-text">
                All statuses
              </option>
              <option value="1" className="bg-aegent-surface text-aegent-text">
                Verified
              </option>
              <option value="0" className="bg-aegent-surface text-aegent-text">
                Pending
              </option>
              <option value="2" className="bg-aegent-surface text-aegent-text">
                Suspended
              </option>
              <option value="3" className="bg-aegent-surface text-aegent-text">
                Slashed
              </option>
            </select>
          </label>

          <label className="inline-flex items-center gap-3 border border-aegent-border bg-aegent-surface px-4 py-3 text-sm text-aegent-muted">
            <Sparkles className="h-4 w-4 text-aegent-accent" />
            <select
              value={reputationFilter}
              onChange={(e) => setReputationFilter(e.target.value)}
              className="bg-transparent pr-2 text-sm text-aegent-text focus:outline-none"
            >
              <option value="all" className="bg-aegent-surface text-aegent-text">
                All reputation
              </option>
              <option value="high" className="bg-aegent-surface text-aegent-text">
                High: 700+
              </option>
              <option value="mid" className="bg-aegent-surface text-aegent-text">
                Mid: 400-699
              </option>
              <option value="low" className="bg-aegent-surface text-aegent-text">
                Low: below 400
              </option>
            </select>
          </label>
        </div>
      </section>

      <WithdrawalPanel />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="surface h-72 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface p-12 text-center">
          <div className="photo-frame relative mx-auto mb-4 h-24 w-24">
            <Image src="/veria-logo.jpg" alt="VERIA" fill sizes="96px" className="object-cover" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-aegent-text">
            {search ? "No agents found" : "No agents yet"}
          </h3>
          <p className="text-sm text-aegent-muted">
            {search ? "Try a different search term." : "Be the first to register an AI agent."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-4">
          {filtered.map((agent, idx) => {
            const addr = addresses[idx];
            const meta = parseMetadata(agent.metadata);
            return (
              <article
                key={addr || idx}
                className="surface group relative flex h-full flex-col overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-14 overflow-hidden border border-[#111217]">
                      <Image src={agentStillFor(idx)} alt="" fill sizes="56px" className="object-cover" />
                    </div>
                    <div>
                      <h2 className="display text-[1.45rem] leading-tight text-aegent-ink">
                        {agent.name}
                      </h2>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-aegent-dim">
                        {agent.modelSpec}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={agent.status} />
                </div>

                {meta.description && (
                  <div className="mb-5">
                    <p className="mb-2 text-[11px] font-mono uppercase tracking-[0.2em] text-aegent-dim">
                      Agent description
                    </p>
                    <p className="min-h-[78px] line-clamp-3 text-[15px] leading-8 text-aegent-muted">
                      {meta.description}
                    </p>
                  </div>
                )}

                {meta.capabilities?.length > 0 && (
                  <div className="mb-5">
                    <p className="mb-2 text-[11px] font-mono uppercase tracking-[0.2em] text-aegent-dim">
                      Capabilities
                    </p>
                    <div className="flex min-h-[38px] flex-wrap gap-2">
                    {meta.capabilities.slice(0, 3).map((cap: string) => (
                      <span
                        key={cap}
                        className="border border-aegent-border bg-aegent-surface px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-aegent-dim"
                      >
                        {cap}
                      </span>
                    ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-1 flex-col space-y-4">
                  <div className="border border-aegent-border bg-aegent-surface p-4">
                    <p className="mb-3 text-[11px] font-mono uppercase tracking-[0.24em] text-aegent-dim">
                      Reputation
                    </p>
                    <ReputationBar score={Number(agent.reputationScore)} />

                    {(agent.tasksCompleted > 0n || agent.tasksFailed > 0n) && (
                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        <span className="border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-emerald-300">
                          {Number(agent.tasksCompleted)} succeeded
                        </span>
                        {agent.tasksFailed > 0n && (
                          <span className="border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-rose-300">
                            {Number(agent.tasksFailed)} failed
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-aegent-border bg-aegent-surface p-4">
                      <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-aegent-dim">
                        Stake
                      </p>
                      <p className="mt-3 flex items-center gap-2 text-base font-semibold text-aegent-text">
                        <Coins className="h-4 w-4 text-aegent-warning" />
                        {Number(formatEther(agent.stakedAmount)).toFixed(3)} PAS
                      </p>
                    </div>
                    <div className="border border-aegent-border bg-aegent-surface p-4">
                      <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-aegent-dim">
                        Registered
                      </p>
                      <p className="mt-3 flex items-center gap-2 text-base font-semibold text-aegent-text">
                        <Clock className="h-4 w-4 text-aegent-accent" />
                        {formatDate(agent.registeredAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-aegent-border/60 pt-4">
                  <div className="mb-3 flex items-center justify-between gap-3 text-xs text-aegent-dim">
                    <div className="font-mono text-[12px]">
                      {addr?.slice(0, 8)}...{addr?.slice(-6)}
                    </div>
                    {addr && (
                      <a
                        href={`https://blockscout-testnet.polkadot.io/address/${addr}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-medium text-aegent-accent hover:underline"
                      >
                        View on-chain
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>

                  {addr && <ReviewFooter targetAddr={addr} />}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 && !search && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="border border-aegent-border bg-aegent-surface p-2 text-aegent-muted transition-colors hover:border-aegent-accent hover:text-aegent-text disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-3 text-sm text-aegent-muted">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="border border-aegent-border bg-aegent-surface p-2 text-aegent-muted transition-colors hover:border-aegent-accent hover:text-aegent-text disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
