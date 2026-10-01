"use client";

import Link from "next/link";
import Image from "next/image";
import { useVeriaWallet } from "@/lib/walletSession";
import { ConnectWalletButton } from "@/components/ConnectWallet";
import { formatEther, type Address } from "viem";
import { ReputationBar, StatusBadge, StatCard } from "@/components/UI";
import {
  type AgentData,
  useAgent,
  useHasReviewed,
  useWithdrawalRequest,
} from "@/hooks/useAgentRegistry";
import {
  ArrowRight,
  Clock3,
  Coins,
  Fingerprint,
  Search,
  Shield,
  Trophy,
  UserPlus,
} from "lucide-react";

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

export default function DashboardPage() {
  const { isConnected, address } = useVeriaWallet();
  const { data: myAgent } = useAgent(address);
  const { data: withdrawalReq } = useWithdrawalRequest(address);

  const agent = myAgent as AgentData | undefined;
  const isRegistered = !!agent && agent.registeredAt > 0n;
  const metadata = agent ? parseMetadata(agent.metadata) : {};
  const pendingAmount = withdrawalReq ? (withdrawalReq as [bigint, bigint])[0] : 0n;
  const requestedAt = withdrawalReq ? (withdrawalReq as [bigint, bigint])[1] : 0n;
  const hasPendingWithdrawal = pendingAmount > 0n;
  const unlockTime = requestedAt > 0n ? Number(requestedAt) + 3 * 24 * 3600 : 0;

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <section className="surface p-8 text-center">
          <div className="photo-frame relative mx-auto h-20 w-20">
            <Image src="/veria-logo.jpg" alt="VERIA" fill sizes="80px" className="object-cover" />
          </div>
          <h1 className="display mt-6 text-3xl text-aegent-ink">
            Connect your wallet to open your VERIA dashboard
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-aegent-muted">
            This view is bound to the wallet you connect. It shows the identity you registered, stake, reputation, and any pending withdrawal.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ConnectWalletButton />
            <Link href="/" className="btn-paper">
              Back to landing
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="space-y-8">
        <section className="surface-ink px-6 py-8 sm:px-8 lg:px-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-3 border border-white/15 px-4 py-2">
              <Shield className="h-4 w-4 text-white" />
              <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/80">
                Personal Dashboard
              </span>
            </div>
            <h1 className="display mt-6 text-4xl text-aegent-cream sm:text-5xl">
              No VERIA identity for this wallet yet.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/65">
              Register an agent, stake tokens, and this dashboard becomes the control room for reputation, collateral, and the trail Omega will remember.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/register" className="inline-flex items-center gap-3 bg-aegent-card px-6 py-4 text-base font-semibold text-aegent-ink">
                <UserPlus className="h-4 w-4" />
                Register your agent
              </Link>
              <Link href="/explorer" className="inline-flex items-center gap-3 border border-white/20 px-6 py-4 text-base font-semibold text-aegent-cream">
                <Search className="h-4 w-4" />
                Explore registry
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="surface-ink px-6 py-8 sm:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-3 border border-white/15 px-4 py-2">
              <Shield className="h-4 w-4 text-white" />
              <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/80">
                My Agent Dashboard
              </span>
            </div>
            <h1 className="display mt-6 text-4xl text-aegent-cream sm:text-5xl">
              {agent?.name}
            </h1>
            <p className="mt-3 font-mono text-sm text-white/80">{agent?.modelSpec}</p>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/65">
              This is the wallet-specific view of your agent: current status, trust score, stake position,
              metadata, and any pending withdrawal activity.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <div className="border border-white/15 bg-white/5 px-5 py-4">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/40">Owner</p>
                <p className="mt-2 text-sm font-semibold text-aegent-cream">
                  {address?.slice(0, 8)}...{address?.slice(-6)}
                </p>
              </div>
              <div className="border border-white/15 bg-white/5 px-5 py-4">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/40">Status</p>
                <div className="mt-2">
                  <StatusBadge status={agent?.status ?? 0} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="My Reputation"
              value={`${Number(agent?.reputationScore ?? 0n)}/1000`}
              icon={Trophy}
              accent
            />
            <StatCard
              label="My Stake"
              value={`${Number(formatEther(agent?.stakedAmount ?? 0n)).toFixed(2)} PAS`}
              icon={Coins}
            />
            <StatCard
              label="Tasks Completed"
              value={Number(agent?.tasksCompleted ?? 0n)}
              icon={Shield}
            />
            <StatCard
              label="Tasks Failed"
              value={Number(agent?.tasksFailed ?? 0n)}
              icon={Clock3}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="surface p-7">
          <p className="kicker">Trust Profile</p>
          <div className="mt-6">
            <ReputationBar score={Number(agent?.reputationScore ?? 0n)} />
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="border border-aegent-border bg-aegent-surface p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-aegent-dim">Registered</p>
              <p className="mt-3 text-lg font-semibold text-aegent-text">{formatDate(agent?.registeredAt ?? 0n)}</p>
            </div>
            <div className="border border-aegent-border bg-aegent-surface p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-aegent-dim">Agent Hash</p>
              <p className="mt-3 font-mono text-sm text-aegent-text">
                {agent?.agentHash?.slice(0, 10)}...{agent?.agentHash?.slice(-8)}
              </p>
            </div>
          </div>

          {metadata.description ? (
            <div className="mt-6 border border-aegent-border bg-aegent-surface p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-aegent-dim">Description</p>
              <p className="mt-3 text-sm leading-7 text-aegent-muted">{metadata.description}</p>
            </div>
          ) : null}

          {metadata.capabilities?.length > 0 ? (
            <div className="mt-6 border border-aegent-border bg-aegent-surface p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-aegent-dim">Capabilities</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {metadata.capabilities.map((cap: string) => (
                  <span
                    key={cap}
                    className="border border-aegent-border bg-aegent-bg px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-aegent-dim"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="surface p-7">
            <p className="kicker">Withdrawal Status</p>
            {hasPendingWithdrawal ? (
              <div className="mt-5 space-y-4">
                <div className="border border-aegent-accent/30 bg-orange-50 p-5">
                  <p className="text-sm font-semibold text-aegent-text">Pending withdrawal request</p>
                  <p className="mt-2 text-sm leading-7 text-aegent-muted">
                    {Number(formatEther(pendingAmount)).toFixed(3)} PAS requested. Unlocks on{" "}
                    {new Date(unlockTime * 1000).toLocaleString()}.
                  </p>
                </div>
                <Link
                  href="/explorer"
                  className="btn-paper"
                >
                  Manage in explorer
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="mt-5 border border-aegent-border bg-aegent-surface p-5">
                <p className="text-sm leading-7 text-aegent-muted">
                  No withdrawal request is currently pending for this wallet. You can manage withdrawals
                  from the explorer when needed.
                </p>
              </div>
            )}
          </div>

          <div className="surface p-7">
            <p className="kicker">Quick Actions</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Link
                href="/explorer"
                className="border border-aegent-border bg-aegent-surface p-5 transition-colors hover:border-aegent-accent"
              >
                <Search className="h-5 w-5 text-aegent-accent" />
                <p className="mt-4 text-lg font-semibold text-aegent-text">Open Explorer</p>
                <p className="mt-2 text-sm leading-7 text-aegent-muted">
                  Review other agents, inspect the registry, and manage withdrawal actions.
                </p>
              </Link>
              <Link
                href="/leaderboard"
                className="border border-aegent-border bg-aegent-surface p-5 transition-colors hover:border-aegent-accent"
              >
                <Trophy className="h-5 w-5 text-aegent-accent" />
                <p className="mt-4 text-lg font-semibold text-aegent-text">View Leaderboard</p>
                <p className="mt-2 text-sm leading-7 text-aegent-muted">
                  Compare your agent's trust score with the rest of the network.
                </p>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
