"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePublicClient } from "wagmi";
import { polkadotHubTestnet } from "./config";
import {
  discoverWallets,
  parseChainId,
  promptWallet,
  type DetectedWallet,
  type EthereumProvider,
} from "./wallet";

type Session = {
  address?: `0x${string}`;
  provider?: EthereumProvider;
  chainId?: number;
  walletName?: string;
};

let session: Session = {};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getWalletSession() {
  return session;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getServerSnapshot(): Session {
  return {};
}

export async function connectDetectedWallet(wallet: DetectedWallet) {
  const accounts = await promptWallet(wallet.provider);
  const address = accounts[0] as `0x${string}`;
  const chainId = parseChainId(await wallet.provider.request({ method: "eth_chainId" }));
  session = {
    address,
    provider: wallet.provider,
    chainId: Number.isFinite(chainId) ? chainId : undefined,
    walletName: wallet.name,
  };
  emit();
  return session;
}

export function disconnectWallet() {
  session = {};
  emit();
}

export function useVeriaWallet() {
  const snap = useSyncExternalStore(subscribe, getWalletSession, getServerSnapshot);
  const publicClient = usePublicClient({ chainId: polkadotHubTestnet.id });
  const [balance, setBalance] = useState<bigint | undefined>();

  useEffect(() => {
    if (!snap.address || !publicClient) {
      setBalance(undefined);
      return;
    }
    let cancelled = false;
    publicClient
      .getBalance({ address: snap.address })
      .then((value) => {
        if (!cancelled) setBalance(value);
      })
      .catch(() => {
        if (!cancelled) setBalance(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [publicClient, snap.address]);

  return {
    address: snap.address,
    isConnected: Boolean(snap.address),
    chainId: snap.chainId,
    provider: snap.provider,
    walletName: snap.walletName,
    balance,
    connect: connectDetectedWallet,
    disconnect: disconnectWallet,
    wallets: typeof window === "undefined" ? [] : discoverWallets(),
  };
}
