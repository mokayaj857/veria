"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { injected } from "wagmi/connectors";
import { ChevronDown, LogOut, Wallet } from "lucide-react";
import { polkadotHubTestnet } from "@/lib/config";
import {
  ensurePolkadotHubNetwork,
  getInjectedProvider,
  requestWalletAccounts,
  walletErrorMessage,
} from "@/lib/wallet";

const LOGO = "/veria-logo.jpg";

export function ConnectWalletButton() {
  const { connectAsync, connectors, isPending } = useConnect();
  const [busy, setBusy] = useState(false);

  async function handleConnect() {
    if (!getInjectedProvider()) {
      toast.error("Install the MetaMask browser extension, then refresh this page.");
      window.open("https://metamask.io/download/", "_blank", "noopener,noreferrer");
      return;
    }

    setBusy(true);
    try {
      await requestWalletAccounts();
      const connector = connectors[0] ?? injected();
      await connectAsync({ connector });
      try {
        await ensurePolkadotHubNetwork();
      } catch (networkErr) {
        toast.error(walletErrorMessage(networkErr));
      }
    } catch (err) {
      const message = walletErrorMessage(err);
      if (!/already connected|connected/i.test(message)) {
        toast.error(message);
      }
    } finally {
      setBusy(false);
    }
  }

  const connecting = busy || isPending;

  return (
    <button type="button" onClick={handleConnect} disabled={connecting} className="btn-ink disabled:opacity-50">
      <Wallet className="h-4 w-4" />
      <span className="hidden sm:inline">{connecting ? "Connecting..." : "Connect MetaMask"}</span>
      <span className="sm:hidden">{connecting ? "..." : "Connect"}</span>
    </button>
  );
}

export function WalletControl() {
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({
    address,
    chainId: polkadotHubTestnet.id,
    query: { enabled: Boolean(address) },
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const isWrongNetwork = isConnected && chain?.id !== polkadotHubTestnet.id;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button type="button" className="btn-ink" disabled>
        <Wallet className="h-4 w-4" />
        <span className="hidden sm:inline">Connect MetaMask</span>
        <span className="sm:hidden">Connect</span>
      </button>
    );
  }

  if (!isConnected) {
    return <ConnectWalletButton />;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        className="flex items-center gap-2 border border-aegent-border bg-aegent-card px-2 py-1.5 text-sm"
      >
        <div className="relative h-9 w-9 overflow-hidden bg-aegent-ink">
          <Image src={LOGO} alt="Connected wallet" fill sizes="36px" className="object-cover" />
        </div>
        <div className="hidden text-left md:block">
          <p className="font-mono text-xs text-aegent-text">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 text-aegent-dim transition-transform ${menuOpen ? "rotate-180" : ""}`} />
      </button>

      {menuOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(20rem,calc(100vw-1.5rem))] border-2 border-[#111217] bg-white p-4 shadow-[8px_8px_0_#1f3dff]">
          <div className="flex items-start gap-3">
            <div className="relative h-12 w-12 overflow-hidden bg-aegent-ink">
              <Image src={LOGO} alt="Connected wallet" fill sizes="48px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Wallet connected</p>
              <p className="mt-1 truncate font-mono text-xs text-aegent-dim">{address}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="border border-aegent-border bg-aegent-surface p-3">
              <p className="kicker">Network</p>
              {isWrongNetwork ? (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-aegent-warning">Wrong network</p>
                    <p className="mt-1 text-xs text-aegent-dim">Switch to {polkadotHubTestnet.name}.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      ensurePolkadotHubNetwork().catch((err) => toast.error(walletErrorMessage(err)))
                    }
                    className="border border-aegent-warning/40 bg-amber-50 px-3 py-1.5 text-xs font-medium text-aegent-warning"
                  >
                    Switch
                  </button>
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-700" />
                  <p className="text-sm">{polkadotHubTestnet.name}</p>
                </div>
              )}
            </div>

            <div className="border border-aegent-border bg-aegent-surface p-3">
              <p className="kicker">Balance</p>
              <p className="mt-2 text-sm font-medium">
                {balance ? `${Number(balance.formatted).toFixed(3)} PAS` : "..."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              disconnect();
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
            title={address}
          >
            <LogOut className="h-3.5 w-3.5" />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
