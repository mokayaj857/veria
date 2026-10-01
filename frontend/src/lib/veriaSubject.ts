import { formatEther, type Address } from "viem";
import { AGENT_REGISTRY_ADDRESS } from "@/lib/contract";
import { agentStillFor } from "@/lib/veriaMedia";

/** 0.01 PAS = 1000 MeTTa stake units, matching the policy examples. */
export const STAKE_UNIT = 10n ** 13n;

export type IdentityState = "verified" | "unverified" | "revoked" | "unknown";

export type ChainAgent = {
  name: string;
  modelSpec: string;
  reputationScore: bigint;
  stakedAmount: bigint;
  status: number;
  registeredAt: bigint;
  tasksCompleted: bigint;
  tasksFailed: bigint;
  agentHash: `0x${string}`;
};

export type LiveAgent = {
  address: Address;
  name: string;
  model: string;
  reputation: number;
  stakePas: string;
  stakeUnits: number;
  completed: number;
  failed: number;
  status: number;
  identity: IdentityState;
  transactionLimit: number;
  registeredAt: string;
  agentHash: `0x${string}`;
  still: string;
};

export type MettaDecision = {
  decision: string;
  risk: string;
  confidence: number;
  confidenceBand?: string;
  trustScore: number;
  violation: string;
  severity: string;
  slashPercentage: number;
  slashAmount: number;
  remainingStake: number;
  recommendedReputationChange: number;
  recommendedTransactionLimit: number;
  permissionState?: string;
  evidenceStatus?: string;
  missingInformation: string[];
  reasons: string[];
  omegaMemoriesUsed: string[];
  explanation: string;
  chainAction: { function: string | null; note: string };
};

export function identityFromStatus(status: number): IdentityState {
  if (status === 1) return "verified";
  if (status === 0) return "unverified";
  if (status === 2 || status === 3) return "revoked";
  return "unknown";
}

export function stakeUnitsFromWei(stakedAmount: bigint): number {
  if (stakedAmount <= 0n) return 0;
  return Number(stakedAmount / STAKE_UNIT);
}

export function authorizedLimit(stakeUnits: number, reputation: number): number {
  const base = Math.max(1, Math.floor(stakeUnits * 0.4));
  const cappedRep = Math.min(Math.max(reputation, 1), 1000);
  return Math.max(1, Math.floor((base * cappedRep) / 500));
}

export function toLiveAgent(address: Address, agent: ChainAgent, index: number): LiveAgent {
  const units = stakeUnitsFromWei(agent.stakedAmount);
  const reputation = Number(agent.reputationScore);
  return {
    address,
    name: agent.name || `${address.slice(0, 6)}…${address.slice(-4)}`,
    model: agent.modelSpec || "unknown-model",
    reputation,
    stakePas: Number(formatEther(agent.stakedAmount)).toFixed(3),
    stakeUnits: units,
    completed: Number(agent.tasksCompleted),
    failed: Number(agent.tasksFailed),
    status: Number(agent.status),
    identity: identityFromStatus(Number(agent.status)),
    transactionLimit: authorizedLimit(units, reputation),
    registeredAt: agent.registeredAt.toString(),
    agentHash: agent.agentHash,
    still: agentStillFor(index),
  };
}

export function reasonPayload(
  agent: LiveAgent,
  request: { type: "transfer" | "spawn" | "export" | "tool"; amount: number; recipient?: string | null },
  options?: { persistOmega?: boolean; limitOverride?: number; violations?: number }
) {
  const verified = agent.identity === "verified";
  return {
    agent: {
      id: agent.address.toLowerCase(),
      identity: agent.identity,
      stake: agent.stakeUnits,
      reputation: agent.reputation,
      successful: agent.completed,
      failed: agent.failed,
      violations: options?.violations ?? 0,
      transactionLimit: options?.limitOverride ?? agent.transactionLimit,
      status: agent.identity === "revoked" ? "suspended" : "active",
      wallet: agent.address,
    },
    request: {
      type: request.type,
      amount: request.amount,
      recipient: request.recipient ?? undefined,
    },
    evidence: [
      {
        id: agent.agentHash,
        type: "transaction-record",
        verified,
        confidence: verified ? 0.95 : 0.42,
        source: AGENT_REGISTRY_ADDRESS,
        timestamp: agent.registeredAt,
      },
    ],
    persistOmega: options?.persistOmega ?? true,
  };
}

export type PolicyAction = {
  id: string;
  label: string;
  risk: string;
  type: "transfer" | "spawn" | "export" | "tool";
  amount: number;
  recipient?: string | null;
};

export function policyActions(agent: LiveAgent, peer?: LiveAgent | null): PolicyAction[] {
  const limit = Math.max(1, agent.transactionLimit);
  const peerWallet =
    peer && peer.address.toLowerCase() !== agent.address.toLowerCase()
      ? peer.address
      : AGENT_REGISTRY_ADDRESS;
  return [
    {
      id: "authorized",
      label: `Authorized transfer (${Math.max(1, Math.floor(limit * 0.5))} units)`,
      risk: "Low",
      type: "transfer",
      amount: Math.max(1, Math.floor(limit * 0.5)),
      recipient: peerWallet,
    },
    {
      id: "over-limit",
      label: `Over-limit transfer (${Math.floor(limit * 2.25)} units)`,
      risk: "High",
      type: "transfer",
      amount: Math.max(limit + 1, Math.floor(limit * 2.25)),
      recipient: peerWallet,
    },
    {
      id: "spawn",
      label: "Spawn a child agent",
      risk: "Medium",
      type: "spawn",
      amount: Math.max(1, Math.floor(limit * 0.15)),
      recipient: peerWallet,
    },
    {
      id: "no-recipient",
      label: "Transfer with unknown recipient",
      risk: "Challenge",
      type: "transfer",
      amount: Math.max(1, Math.floor(limit * 0.5)),
      recipient: null,
    },
  ];
}

export async function reasonWithMetta(payload: unknown): Promise<MettaDecision> {
  const res = await fetch("/api/veria/reason", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.error || "MeTTa failed");
  return data as MettaDecision;
}

const omegaCache = new Map<string, { at: number; data: Awaited<ReturnType<typeof fetchOmegaUncached>> }>();

async function fetchOmegaUncached(agentId: string) {
  const res = await fetch(`/api/veria/memory?agentId=${encodeURIComponent(agentId.toLowerCase())}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.error || "Omega failed");
  return data as {
    violationCount: number;
    lastSeverity: string;
    lastDecision?: string;
    lastLimit?: number;
    remainingStake?: number;
    summaries: string[];
    events: Record<string, unknown>[];
  };
}

export function forgetOmega(agentId: string) {
  omegaCache.delete(agentId.toLowerCase());
}

export async function fetchOmega(agentId: string) {
  const key = agentId.toLowerCase();
  const hit = omegaCache.get(key);
  if (hit && Date.now() - hit.at < 10_000) return hit.data;
  const data = await fetchOmegaUncached(key);
  omegaCache.set(key, { at: Date.now(), data });
  return data;
}

export const POLICY_EVENT = "veria-policy";

export function notifyPolicyChange(agentId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(POLICY_EVENT, { detail: { agentId: agentId.toLowerCase() } }));
}

export type OmegaStanding = {
  violationCount: number;
  lastDecision: string;
  lastSeverity: string;
  lastSlash: number;
  lastLimit?: number;
  remainingStake?: number;
  reputationDelta: number;
  trustScore?: number;
  summaries: string[];
};

export async function fetchOmegaStandings() {
  const res = await fetch(`/api/veria/memory?all=1&t=${Date.now()}`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || data.error || "Omega failed");
  return (data.agents || {}) as Record<string, OmegaStanding>;
}

export function applyOmegaScore(chainRep: number, standing?: OmegaStanding | null) {
  return Math.max(0, Math.min(1000, chainRep + (standing?.reputationDelta ?? 0)));
}

export function policyStakePas(standing?: OmegaStanding | null, chainPas?: string) {
  if (standing?.remainingStake == null) return chainPas ?? "0.000";
  return ((standing.remainingStake * Number(STAKE_UNIT)) / 1e18).toFixed(3);
}

export function parseAgentId(raw: string): Address | null {
  const value = raw.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) return null;
  return value as Address;
}

export async function lookupLiveAgent(id: string): Promise<LiveAgent> {
  const { createPublicClient, getAddress, http } = await import("viem");
  const { AGENT_REGISTRY_ABI, AGENT_REGISTRY_ADDRESS } = await import("@/lib/contract");
  const { polkadotHubTestnet } = await import("@/lib/config");
  const parsed = parseAgentId(id);
  if (!parsed) throw new Error("Agent id must be a 40-character 0x wallet address.");
  const address = getAddress(parsed);
  const rpc =
    typeof window !== "undefined" ? `${window.location.origin}/api/rpc` : "https://eth-rpc-testnet.polkadot.io";
  const client = createPublicClient({ chain: polkadotHubTestnet, transport: http(rpc) });
  const raw = (await client.readContract({
    address: AGENT_REGISTRY_ADDRESS,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getAgent",
    args: [address],
  })) as ChainAgent & Record<number, unknown>;
  const record: ChainAgent = {
    name: String(raw.name ?? raw[1] ?? ""),
    modelSpec: String(raw.modelSpec ?? raw[2] ?? ""),
    reputationScore: (raw.reputationScore ?? raw[6] ?? 0n) as bigint,
    stakedAmount: (raw.stakedAmount ?? raw[7] ?? 0n) as bigint,
    status: Number(raw.status ?? raw[8] ?? 0),
    registeredAt: (raw.registeredAt ?? raw[9] ?? 0n) as bigint,
    tasksCompleted: (raw.tasksCompleted ?? raw[10] ?? 0n) as bigint,
    tasksFailed: (raw.tasksFailed ?? raw[11] ?? 0n) as bigint,
    agentHash: (raw.agentHash ?? raw[5] ?? "0x") as `0x${string}`,
  };
  if (!record.registeredAt || record.registeredAt === 0n) {
    throw new Error("That agent id is not registered on AgentRegistry.");
  }
  return toLiveAgent(address, record, 0);
}
