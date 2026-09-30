"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { injected } from "wagmi/connectors";
import { polkadotHubTestnet } from "@/lib/config";
import { VERIA_SLOGAN } from "@/lib/veriaMedia";
import { ChevronDown, LogOut, Menu, Wallet, X } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", index: "01" },
  { href: "/explorer", label: "Explorer", index: "02" },
  { href: "/leaderboard", label: "Leaderboard", index: "03" },
  { href: "/dashboard", label: "Dashboard", index: "04" },
  { href: "/register", label: "Register", index: "05" },
];

const LOGO = "/veria-logo.jpg";

export function Navigation() {
  const pathname = usePathname();
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hasAttemptedNetworkSwitch, setHasAttemptedNetworkSwitch] = useState(false);

  const isWrongNetwork = isConnected && chain?.id !== polkadotHubTestnet.id;
  const metaMaskConnector = connectors[0];

  function getMetaMaskProvider() {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return undefined;

    if (ethereum.isMetaMask) return ethereum;

    if (Array.isArray(ethereum.providers)) {
      return ethereum.providers.find((provider: any) => provider?.isMetaMask);
    }

    return undefined;
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!mounted || !isConnected || !isWrongNetwork) {
      setHasAttemptedNetworkSwitch(false);
    }
  }, [mounted, isConnected, isWrongNetwork]);

  async function handleConnect() {
    connect(
      { connector: metaMaskConnector ?? injected({ target: "metaMask" }) },
      {
        onSuccess: async () => {
          const provider = getMetaMaskProvider();
          if (!provider || hasAttemptedNetworkSwitch) return;

          const currentChainId = await provider.request({ method: "eth_chainId" });
          if (Number(currentChainId) !== polkadotHubTestnet.id) {
            setHasAttemptedNetworkSwitch(true);
            await switchToPolkadot();
          }
        },
      }
    );
  }

  async function switchToPolkadot() {
    const ethereum = getMetaMaskProvider();
    if (!ethereum) return;

    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x190F1B41" }],
      });
    } catch (err: any) {
      if (err?.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x190F1B41",
              chainName: "Polkadot Hub Paseo",
              nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
              rpcUrls: ["https://services.polkadothub-rpc.com/testnet"],
              blockExplorerUrls: ["https://blockscout-testnet.polkadot.io"],
            },
          ],
        });
      }
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-[#111217] bg-[#f2efe8]">
      <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-10">
        <div className="flex min-h-[4.4rem] items-center justify-between gap-2 py-2 sm:gap-4 sm:py-3">
          <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="relative h-10 w-10 flex-none overflow-hidden border-2 border-[#111217] sm:h-11 sm:w-11">
              <Image src={LOGO} alt="VERIA mark" fill sizes="44px" className="object-cover" priority />
            </div>
            <div className="min-w-0">
              <span className="display block text-[1.55rem] leading-none sm:text-[1.85rem]">VERIA</span>
              <span className="kicker block max-w-[10.5rem] truncate tracking-[0.12em] sm:max-w-[28rem] sm:tracking-[0.26em]">{VERIA_SLOGAN}</span>
            </div>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {NAV_ITEMS.map(({ href, label, index }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-bold ${
                    isActive ? "bg-[#111217] text-white" : "text-[#111217] hover:bg-[#1f3dff] hover:text-white"
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-70">{index}</span>
                  {label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {mounted && isConnected ? (
              <div className="relative">
                <button
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
                        <p className="text-sm font-semibold">Connected wallet</p>
                        <p className="mt-1 truncate font-mono text-xs text-aegent-dim">{address}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="border border-aegent-border bg-aegent-surface p-3">
                        <p className="kicker">Network</p>
                        {isWrongNetwork ? (
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-aegent-warning">Connected to the wrong network</p>
                              <p className="mt-1 text-xs text-aegent-dim">
                                Switch to {polkadotHubTestnet.name} to use VERIA.
                              </p>
                            </div>
                            <button
                              onClick={switchToPolkadot}
                              className="border border-aegent-warning/40 bg-amber-50 px-3 py-1.5 text-xs font-medium text-aegent-warning"
                            >
                              Switch Network
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
            ) : (
              <button
                onClick={handleConnect}
                disabled={!mounted || isConnecting}
                className="btn-ink disabled:opacity-50"
              >
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
                <span className="sm:hidden">{isConnecting ? "..." : "Connect"}</span>
              </button>
            )}

            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center border-2 border-[#111217] bg-white lg:hidden"
              aria-expanded={drawerOpen}
              aria-label={drawerOpen ? "Close menu" : "Open menu"}
              onClick={() => setDrawerOpen((open) => !open)}
            >
              {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {drawerOpen ? (
        <div className="border-t-2 border-[#111217] bg-[#111217] text-white lg:hidden">
          <p className="px-4 pt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-[#8ea0ff] sm:px-6">
            {VERIA_SLOGAN}
          </p>
          <div className="grid gap-0 py-3">
            {NAV_ITEMS.map(({ href, label, index }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 text-lg font-bold sm:px-6 ${
                    isActive ? "bg-[#1f3dff]" : "hover:bg-white/10"
                  }`}
                >
                  <span>{label}</span>
                  <span className="font-mono text-[11px] text-white/50">{index}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </nav>
  );
}
