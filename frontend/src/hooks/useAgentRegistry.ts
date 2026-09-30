"use client";

import { useState } from "react";
import { useReadContract, useSendTransaction, useWaitForTransactionReceipt, useAccount, useSignMessage } from "wagmi";
import { AGENT_REGISTRY_ADDRESS, AGENT_REGISTRY_ABI } from "@/lib/contract";
import { parseEther, keccak256, encodePacked, encodeFunctionData, type Address } from "viem";

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
    address: AGENT_REGISTRY_ADDRESS,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getRegistryStats",
  });
}

export function useAgentCount() {
  return useReadContract({
    address: AGENT_REGISTRY_ADDRESS,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getAgentCount",
  });
}

export function useAgent(address: Address | undefined) {
  return useReadContract({
    address: AGENT_REGISTRY_ADDRESS,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getAgent",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useIsVerified(address: Address | undefined) {
  return useReadContract({
    address: AGENT_REGISTRY_ADDRESS,
    abi: AGENT_REGISTRY_ABI,
    functionName: "isVerifiedAgent",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
}

export function useAgentsPaginated(offset: number, limit: number) {
  return useReadContract({
    address: AGENT_REGISTRY_ADDRESS,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getAgentsPaginated",
    args: [BigInt(offset), BigInt(limit)],
  });
}

export function useTopAgents(count: number) {
  return useReadContract({
    address: AGENT_REGISTRY_ADDRESS,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getTopAgents",
    args: [BigInt(count)],
  });
}

export function useAgentAddresses() {
  return useReadContract({
    address: AGENT_REGISTRY_ADDRESS,
    abi: AGENT_REGISTRY_ABI,
    functionName: "getAgentAddresses",
  });
}

// ─── Write Hook ─────────────────────────────────────────────────
// Uses useSendTransaction instead of useWriteContract.
// Why: useWriteContract always runs eth_call simulation before sending,
// which hits Polkadot testnet RPC rate limit. useSendTransaction
// sends the raw tx directly to MetaMask — zero extra RPC calls from viem.

export function useRegisterAgent() {
  const { sendTransactionAsync, data: hash, isPending, error, reset } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    pollingInterval: 5_000, // Poll every 5s (global pollingInterval is 0)
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
    // Encode calldata manually — same as what writeContract would produce
    const data = encodeFunctionData({
      abi: AGENT_REGISTRY_ABI,
      functionName: "registerAgent",
      args: [name, modelSpec, metadata, publicKey, signature],
    });

    // Polkadot testnet RPC rate-limits aggressively (-32002).
    // MetaMask also calls eth_estimateGas/eth_gasPrice internally,
    // which compete with the frontend for the same rate limit.
    // Retry with 30s backoff (same wait time as cast CLI).
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          setRetryStatus(
            `RPC rate limited — retrying in 30s (${attempt + 1}/${MAX_RETRIES})...`
          );
          await new Promise((r) => setTimeout(r, 30_000));
          setRetryStatus(null);
          reset();
        } else {
          // Initial cooldown so RPC rate limit settles after signing step
          await new Promise((r) => setTimeout(r, 3000));
        }

        await sendTransactionAsync({
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
  const { sendTransactionAsync, data: hash, isPending, error, reset } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    pollingInterval: 5_000,
  });

  async function review(target: Address, positive: boolean) {
    const data = encodeFunctionData({
      abi: AGENT_REGISTRY_ABI,
      functionName: "reviewAgent",
      args: [target, positive],
    });

    await new Promise((r) => setTimeout(r, 3000));
    await sendTransactionAsync({
      to: AGENT_REGISTRY_ADDRESS,
      data,
      gas: BigInt(500_000),
    });
  }

  return { review, hash, isPending, isConfirming, isSuccess, error, reset };
}

export function useHasReviewed(reviewer: Address | undefined, target: Address | undefined) {
  return useReadContract({
    address: AGENT_REGISTRY_ADDRESS,
    abi: AGENT_REGISTRY_ABI,
    functionName: "hasReviewed",
    args: reviewer && target ? [reviewer, target] : undefined,
    query: { enabled: !!reviewer && !!target },
  });
}

// ─── Withdrawal Hooks ────────────────────────────────────────────

export function useWithdrawalRequest(agent: Address | undefined) {
  return useReadContract({
    address: AGENT_REGISTRY_ADDRESS,
    abi: AGENT_REGISTRY_ABI,
    functionName: "withdrawalRequests",
    args: agent ? [agent] : undefined,
    query: { enabled: !!agent },
  });
}

export function useRequestWithdrawal() {
  const { sendTransactionAsync, data: hash, isPending, error, reset } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    pollingInterval: 5_000,
  });

  async function requestWithdrawal(amount: bigint) {
    const data = encodeFunctionData({
      abi: AGENT_REGISTRY_ABI,
      functionName: "requestWithdrawal",
      args: [amount],
    });

    await new Promise((r) => setTimeout(r, 3000));
    await sendTransactionAsync({
      to: AGENT_REGISTRY_ADDRESS,
      data,
      gas: BigInt(500_000),
    });
  }

  return { requestWithdrawal, hash, isPending, isConfirming, isSuccess, error, reset };
}

export function useExecuteWithdrawal() {
  const { sendTransactionAsync, data: hash, isPending, error, reset } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    pollingInterval: 5_000,
  });

  async function executeWithdrawal() {
    const data = encodeFunctionData({
      abi: AGENT_REGISTRY_ABI,
      functionName: "executeWithdrawal",
      args: [],
    });

    await new Promise((r) => setTimeout(r, 3000));
    await sendTransactionAsync({
      to: AGENT_REGISTRY_ADDRESS,
      data,
      gas: BigInt(500_000),
    });
  }

  return { executeWithdrawal, hash, isPending, isConfirming, isSuccess, error, reset };
}

export function useCancelWithdrawal() {
  const { sendTransactionAsync, data: hash, isPending, error, reset } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    pollingInterval: 5_000,
  });

  async function cancelWithdrawal() {
    const data = encodeFunctionData({
      abi: AGENT_REGISTRY_ABI,
      functionName: "cancelWithdrawal",
      args: [],
    });

    await new Promise((r) => setTimeout(r, 3000));
    await sendTransactionAsync({
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