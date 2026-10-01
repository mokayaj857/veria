"use client";

import { useState } from "react";
import { useReadContract, useSendTransaction, useWaitForTransactionReceipt, useAccount, useSignMessage } from "wagmi";
import { AGENT_REGISTRY_ADDRESS, AGENT_REGISTRY_ABI } from "@/lib/contract";
import { polkadotHubTestnet } from "@/lib/config";
import { ensurePolkadotHubNetwork } from "@/lib/wallet";
import { parseEther, keccak256, encodePacked, encodeFunctionData, type Address } from "viem";

const registry = {
  address: AGENT_REGISTRY_ADDRESS,
  abi: AGENT_REGISTRY_ABI,
  chainId: polkadotHubTestnet.id,
} as const;

// ─── Types ──────────────────────────────────────────────────────

export interface AgentData {
  owner: Address;
  name: string;
  modelSpec: string;
  metadata: string;
  publicKey: `0x${string}`;
  agentHash: `0x${string}`;
  reputationScore: bigint;
  stakedAmount: bigint;
  status: number;
  registeredAt: bigint;
  tasksCompleted: bigint;
  tasksFailed: bigint;
}

export const STATUS_LABELS = ["Pending", "Verified", "Suspended", "Slashed"] as const;
export const STATUS_COLORS = {
  0: "text-yellow-400",
  1: "text-aegent-accent",
  2: "text-aegent-warning",
  3: "text-aegent-danger",
} as const;

// ─── Read Hooks ─────────────────────────────────────────────────

export function useRegistryStats() {
  return useReadContract({
    ...registry,
    functionName: "getRegistryStats",
  });
}

export function useAgentCount() {
  return useReadContract({
    ...registry,
    functionName: "getAgentCount",
  });
}

export function useAgent(address: Address | undefined) {
  return useReadContract({
    ...registry,
    functionName: "getAgent",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useIsVerified(address: Address | undefined) {
  return useReadContract({
    ...registry,
    functionName: "isVerifiedAgent",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useAgentsPaginated(offset: number, limit: number) {
  return useReadContract({
    ...registry,
    functionName: "getAgentsPaginated",
    args: [BigInt(offset), BigInt(limit)],
  });
}

export function useTopAgents(count: number) {
  return useReadContract({
    ...registry,
    functionName: "getTopAgents",
    args: [BigInt(count)],
  });
}

export function useAgentAddresses() {
  return useReadContract({
    ...registry,
    functionName: "getAgentAddresses",
  });
}

// ─── Write Hook ─────────────────────────────────────────────────
// Uses useSendTransaction instead of useWriteContract.
// Why: useWriteContract always runs eth_call simulation before sending,
// which hits Polkadot testnet RPC rate limit. useSendTransaction
// sends the raw tx directly to MetaMask — zero extra RPC calls from viem.

export function useRegisterAgent() {
  const { address } = useAccount();
  const { sendTransactionAsync, data: hash, isPending, error, reset } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId: polkadotHubTestnet.id,
    pollingInterval: 4_000,
  });
  const [retryStatus, setRetryStatus] = useState<string | null>(null);

  async function register(
    name: string,
    modelSpec: string,
    metadata: string,
    publicKey: `0x${string}`,
    signature: `0x${string}`,
    stakeEther: string
  ) {
    await ensurePolkadotHubNetwork();

    const data = encodeFunctionData({
      abi: AGENT_REGISTRY_ABI,
      functionName: "registerAgent",
      args: [name, modelSpec, metadata, publicKey, signature],
    });

    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          setRetryStatus(`RPC busy — retrying (${attempt + 1}/${MAX_RETRIES})...`);
          await new Promise((r) => setTimeout(r, 4_000));
          setRetryStatus(null);
          reset();
        }

        await sendTransactionAsync({
          account: address,
          chainId: polkadotHubTestnet.id,
          to: AGENT_REGISTRY_ADDRESS,
          data,
          value: parseEther(stakeEther),
          gas: BigInt(1_000_000),
        });
        return;
      } catch (err: any) {
        const isRateLimit =
          err?.code === -32002 ||
          err?.message?.includes("too many errors") ||
          err?.message?.includes("resource not available");

        if (isRateLimit && attempt < MAX_RETRIES - 1) {
          continue;
        }
        setRetryStatus(null);
        throw err;
      }
    }
  }

  return {
    register,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
    retryStatus,
  };
}

// ─── Peer Review Hook ────────────────────────────────────────────

export function useReviewAgent() {
  const { address } = useAccount();
  const { sendTransactionAsync, data: hash, isPending, error, reset } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId: polkadotHubTestnet.id,
    pollingInterval: 4_000,
  });

  async function review(target: Address, positive: boolean) {
    await ensurePolkadotHubNetwork();
    const data = encodeFunctionData({
      abi: AGENT_REGISTRY_ABI,
      functionName: "reviewAgent",
      args: [target, positive],
    });

    await sendTransactionAsync({
      account: address,
      chainId: polkadotHubTestnet.id,
      to: AGENT_REGISTRY_ADDRESS,
      data,
      gas: BigInt(500_000),
    });
  }

  return { review, hash, isPending, isConfirming, isSuccess, error, reset };
}

export function useHasReviewed(reviewer: Address | undefined, target: Address | undefined) {
  return useReadContract({
    ...registry,
    functionName: "hasReviewed",
    args: reviewer && target ? [reviewer, target] : undefined,
    query: { enabled: !!reviewer && !!target },
  });
}

// ─── Withdrawal Hooks ────────────────────────────────────────────

export function useWithdrawalRequest(agent: Address | undefined) {
  return useReadContract({
    ...registry,
    functionName: "withdrawalRequests",
    args: agent ? [agent] : undefined,
    query: { enabled: !!agent },
  });
}

export function useRequestWithdrawal() {
  const { address } = useAccount();
  const { sendTransactionAsync, data: hash, isPending, error, reset } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId: polkadotHubTestnet.id,
    pollingInterval: 4_000,
  });

  async function requestWithdrawal(amount: bigint) {
    await ensurePolkadotHubNetwork();
    const data = encodeFunctionData({
      abi: AGENT_REGISTRY_ABI,
      functionName: "requestWithdrawal",
      args: [amount],
    });

    await sendTransactionAsync({
      account: address,
      chainId: polkadotHubTestnet.id,
      to: AGENT_REGISTRY_ADDRESS,
      data,
      gas: BigInt(500_000),
    });
  }

  return { requestWithdrawal, hash, isPending, isConfirming, isSuccess, error, reset };
}

export function useExecuteWithdrawal() {
  const { address } = useAccount();
  const { sendTransactionAsync, data: hash, isPending, error, reset } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId: polkadotHubTestnet.id,
    pollingInterval: 4_000,
  });

  async function executeWithdrawal() {
    await ensurePolkadotHubNetwork();
    const data = encodeFunctionData({
      abi: AGENT_REGISTRY_ABI,
      functionName: "executeWithdrawal",
      args: [],
    });

    await sendTransactionAsync({
      account: address,
      chainId: polkadotHubTestnet.id,
      to: AGENT_REGISTRY_ADDRESS,
      data,
      gas: BigInt(500_000),
    });
  }

  return { executeWithdrawal, hash, isPending, isConfirming, isSuccess, error, reset };
}

export function useCancelWithdrawal() {
  const { address } = useAccount();
  const { sendTransactionAsync, data: hash, isPending, error, reset } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId: polkadotHubTestnet.id,
    pollingInterval: 4_000,
  });

  async function cancelWithdrawal() {
    await ensurePolkadotHubNetwork();
    const data = encodeFunctionData({
      abi: AGENT_REGISTRY_ABI,
      functionName: "cancelWithdrawal",
      args: [],
    });

    await sendTransactionAsync({
      account: address,
      chainId: polkadotHubTestnet.id,
      to: AGENT_REGISTRY_ADDRESS,
      data,
      gas: BigInt(500_000),
    });
  }

  return { cancelWithdrawal, hash, isPending, isConfirming, isSuccess, error, reset };
}

// ─── Signature Helper ───────────────────────────────────────────

export function useCreateRegistrationSignature() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  async function createSignature(
    name: string,
    modelSpec: string,
    publicKey: `0x${string}`
  ): Promise<`0x${string}`> {
    if (!address) throw new Error("Wallet not connected");

    const innerHash = keccak256(
      encodePacked(
        ["address", "string", "string", "bytes32"],
        [address, name, modelSpec, publicKey]
      )
    );

    const signature = await signMessageAsync({
      message: { raw: innerHash as `0x${string}` },
    });

    return signature;
  }

  return { createSignature };
}