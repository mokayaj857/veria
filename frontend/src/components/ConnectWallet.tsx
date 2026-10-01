"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { formatEther } from "viem";
import { ChevronDown, LogOut, Wallet } from "lucide-react";
import { polkadotHubTestnet } from "@/lib/config";
import { discoverWallets, ensurePolkadotHubNetwork, type DetectedWallet, walletErrorMessage } from "@/lib/wallet";
import { useVeriaWallet } from "@/lib/walletSession";

const LOGO = "/veria-logo.jpg";

export function ConnectWalletButton() {
  const { connect } = useVeriaWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const wallets = useMemo(() => (typeof window === "undefined" ? [] : discoverWallets()), [pickerOpen, busy]);

  async function connectProvider(wallet: DetectedWallet) {
    setBusy(true);
    setError(null);
    setPickerOpen(false);
    try {
      await connect(wallet);
    } catch (err) {
      const message = walletErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleConnect() {
    if (busy) return;
    const found = discoverWallets();
    if (found.length === 0) {
      const message = "No browser wallet found. Install MetaMask, unlock it, then refresh this page.";
      setError(message);
      toast.error(message);
      return;
    }
    if (found.length === 1) {
      await connectProvider(found[0]);
      return;
    }
    setPickerOpen(true);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleConnect}
        disabled={busy}
        className="btn-ink disabled:opacity-50"
      >
        <Wallet className="h-4 w-4" />
        <span className="hidden sm:inline">{busy ? "Check your wallet..." : "Connect Wallet"}</span>
        <span className="sm:hidden">{busy ? "..." : "Connect"}</span>
      </button>

      {pickerOpen ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[80] w-64 border-2 border-[#111217] bg-white p-3 shadow-[8px_8px_0_#1f3dff]">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#1f3dff]">Choose a wallet</p>
          {wallets.map((wallet) => (
            <button
              key={`${wallet.name}-${wallet.rdns}`}
              type="button"
              className="mb-1 w-full border-2 border-[#111217] bg-[#f2efe8] px-3 py-2 text-left text-sm font-bold hover:bg-[#1f3dff] hover:text-white"
              onClick={() => connectProvider(wallet)}
            >
              {wallet.name}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="absolute right-0 top-[calc(100%+0.4rem)] z-[70] w-64 text-right text-xs font-medium text-[#e23c2f]">{error}</p> : null}
    </div>
  );
}

export function WalletControl() {
  const { address, isConnected, chainId, provider, balance, disconnect } = useVeriaWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const isWrongNetwork = isConnected && chainId !== polkadotHubTestnet.id;

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
          <div className="min-w-0">
            <p className="text-sm font-semibold">Wallet connected</p>
            <p className="mt-1 truncate font-mono text-xs text-aegent-dim">{address}</p>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="border border-aegent-border bg-aegent-surface p-3">
              <p className="kicker">Network</p>
              {isWrongNetwork ? (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-aegent-warning">Wrong network</p>
                  <button
                    type="button"
                    onClick={() =>
                      ensurePolkadotHubNetwork(provider).catch((err) => toast.error(walletErrorMessage(err)))
                    }
                    className="border border-aegent-warning/40 bg-amber-50 px-3 py-1.5 text-xs font-medium text-aegent-warning"
                  >
                    Switch
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-sm">{polkadotHubTestnet.name}</p>
              )}
            </div>
            <div className="border border-aegent-border bg-aegent-surface p-3">
              <p className="kicker">Balance</p>
              <p className="mt-2 text-sm font-medium">
                {balance !== undefined ? `${Number(formatEther(balance)).toFixed(3)} PAS` : "..."}
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
          >
            <LogOut className="h-3.5 w-3.5" />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
