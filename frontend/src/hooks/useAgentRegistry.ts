"use client";

import { useState } from "react";
import { useReadContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { AGENT_REGISTRY_ADDRESS, AGENT_REGISTRY_ABI } from "@/lib/contract";
import { polkadotHubTestnet } from "@/lib/config";
import { ensurePolkadotHubNetwork } from "@/lib/wallet";
import { getWalletSession, useVeriaWallet } from "@/lib/walletSession";
import {
  parseEther,
  keccak256,
  encodePacked,
  encodeFunctionData,
  createWalletClient,
  custom,
  type Address,
  type Hex,
} from "viem";

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

export function useMinStake() {
  return useReadContract({
    ...registry,
    functionName: "MIN_STAKE",
  });
}

export function useAgentCount() {
  return useReadContract({
    ...registry,
    functionName: "getAgentCount",
  });
}

export function useAgent(address: Address | undefined) {
  const listed = useAgentAddresses();
  const known =
    !!address &&
    Array.isArray(listed.data) &&
    listed.data.some((item) => item.toLowerCase() === address.toLowerCase());

  return useReadContract({
    ...registry,
    functionName: "getAgent",
    args: address && known ? [address] : undefined,
    query: { enabled: Boolean(address && known), retry: false },
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

function useRegistryWrite() {
  const { address } = useVeriaWallet();
  const publicClient = usePublicClient({ chainId: polkadotHubTestnet.id });
  const [hash, setHash] = useState<Hex | undefined>();
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId: polkadotHubTestnet.id,
    pollingInterval: 4_000,
  });

  async function send(data: Hex, value?: bigint, gas = BigInt(500_000)) {
    const { provider, address: sessionAddress } = getWalletSession();
    const account = sessionAddress || address;
    if (!provider || !account) throw new Error("Connect a wallet first");

    setPending(true);
    setError(null);
    try {
      await ensurePolkadotHubNetwork(provider);
      const client = createWalletClient({
        account,
        chain: polkadotHubTestnet,
        transport: custom(provider),
      });
      const txHash = await client.sendTransaction({
        account,
        to: AGENT_REGISTRY_ADDRESS,
        data,
        value,
        gas,
        chain: polkadotHubTestnet,
      });
      setHash(txHash);

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
          pollingInterval: 4_000,
        });
        if (receipt.status === "reverted") {
          throw new Error("The registry transaction reverted on-chain.");
        }
      }

      return txHash;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setHash(undefined);
    setError(null);
  }

  return {
    address,
    send,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

export function useRegisterAgent() {
  const write = useRegistryWrite();
  const [retryStatus, setRetryStatus] = useState<string | null>(null);

  async function register(
    name: string,
    modelSpec: string,
    metadata: string,
    publicKey: `0x${string}`,
    signature: `0x${string}`,
    stakeEther: string
  ) {
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
          write.reset();
        }

        await write.send(data, parseEther(stakeEther), BigInt(1_000_000));
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
    hash: write.hash,
    isPending: write.isPending,
    isConfirming: write.isConfirming,
    isSuccess: write.isSuccess,
    error: write.error,
    reset: write.reset,
    retryStatus,
  };
}

// ─── Peer Review Hook ────────────────────────────────────────────

export function useReviewAgent() {
  const { send, hash, isPending, isConfirming, isSuccess, error, reset } = useRegistryWrite();

  async function review(target: Address, positive: boolean) {
    const data = encodeFunctionData({
      abi: AGENT_REGISTRY_ABI,
      functionName: "reviewAgent",
      args: [target, positive],
    });
    await send(data);
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
  const { send, hash, isPending, isConfirming, isSuccess, error, reset } = useRegistryWrite();

  async function requestWithdrawal(amount: bigint) {
    const data = encodeFunctionData({
      abi: AGENT_REGISTRY_ABI,
      functionName: "requestWithdrawal",
      args: [amount],
    });
    await send(data);
  }

  return { requestWithdrawal, hash, isPending, isConfirming, isSuccess, error, reset };
}

export function useExecuteWithdrawal() {
  const { send, hash, isPending, isConfirming, isSuccess, error, reset } = useRegistryWrite();

  async function executeWithdrawal() {
    const data = encodeFunctionData({
      abi: AGENT_REGISTRY_ABI,
      functionName: "executeWithdrawal",
      args: [],
    });
    await send(data);
  }

  return { executeWithdrawal, hash, isPending, isConfirming, isSuccess, error, reset };
}

export function useCancelWithdrawal() {
  const { send, hash, isPending, isConfirming, isSuccess, error, reset } = useRegistryWrite();

  async function cancelWithdrawal() {
    const data = encodeFunctionData({
      abi: AGENT_REGISTRY_ABI,
      functionName: "cancelWithdrawal",
      args: [],
    });
    await send(data);
  }

  return { cancelWithdrawal, hash, isPending, isConfirming, isSuccess, error, reset };
}

export function useCreateRegistrationSignature() {
  const { address, provider } = useVeriaWallet();

  async function createSignature(
    name: string,
    modelSpec: string,
    publicKey: `0x${string}`
  ): Promise<`0x${string}`> {
    const session = getWalletSession();
    const account = session.address || address;
    const wallet = session.provider || provider;
    if (!account || !wallet) throw new Error("Wallet not connected");

    const innerHash = keccak256(
      encodePacked(
        ["address", "string", "string", "bytes32"],
        [account, name, modelSpec, publicKey]
      )
    );

    const client = createWalletClient({
      account,
      chain: polkadotHubTestnet,
      transport: custom(wallet),
    });

    return client.signMessage({
      account,
      message: { raw: innerHash },
    });
  }

  return { createSignature };
}