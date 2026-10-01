"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { VERIA_SLOGAN } from "@/lib/veriaMedia";
import { WalletControl } from "@/components/ConnectWallet";
import { Menu, X } from "lucide-react";

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
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

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
              <span className="kicker block max-w-[10.5rem] truncate tracking-[0.12em] sm:max-w-[28rem] sm:tracking-[0.26em]">
                {VERIA_SLOGAN}
              </span>
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
            <WalletControl />
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
