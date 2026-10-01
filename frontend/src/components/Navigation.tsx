"use client";

import Image from "next/image";
import Link from "next/link";
import { VERIA_SLOGAN } from "@/lib/veriaMedia";
import { WalletControl } from "@/components/ConnectWallet";
import { useAppPath } from "@/lib/appPath";

const NAV_ITEMS = [
  { href: "/", label: "Home", index: "01" },
  { href: "/explorer", label: "Explorer", index: "02" },
  { href: "/leaderboard", label: "Leaderboard", index: "03" },
  { href: "/dashboard", label: "Dashboard", index: "04" },
  { href: "/register", label: "Register", index: "05" },
  { href: "/accountability", label: "MeTTa", index: "06" },
];

const LOGO = "/veria-logo.jpg";

export function Navigation() {
  const { path } = useAppPath();

  return (
    <nav className="sticky top-0 z-50 border-b-2 border-[#111217] bg-[#f2efe8]">
      <div className="mx-auto w-full max-w-[1440px] px-3 sm:px-6 lg:px-10">
        <div className="flex min-h-[4.4rem] items-center justify-between gap-2 py-2 sm:gap-4 sm:py-3">
          <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="relative h-10 w-10 flex-none overflow-hidden border-2 border-[#111217] sm:h-11 sm:w-11">
              <Image src={LOGO} alt="VERIA mark" fill sizes="44px" className="object-cover" priority />
            </div>
            <div className="min-w-0 text-left">
              <span className="display block text-[1.55rem] leading-none sm:text-[1.85rem]">VERIA</span>
              <span className="kicker block max-w-[10.5rem] truncate tracking-[0.12em] sm:max-w-[28rem] sm:tracking-[0.26em]">
                {VERIA_SLOGAN}
              </span>
            </div>
          </Link>
          <WalletControl />
        </div>

        <div className="flex gap-1 overflow-x-auto pb-3">
          {NAV_ITEMS.map(({ href, label, index }) => {
            const isActive = path === href;
            return (
              <Link
                key={href}
                href={href}
                prefetch
                className={`flex flex-none items-center gap-2 px-3 py-2 text-sm font-black ${
                  isActive ? "bg-[#111217] text-white" : "border-2 border-[#111217] bg-white text-[#111217] hover:bg-[#1f3dff] hover:text-white"
                }`}
              >
                <span className="font-mono text-[11px]">{index}</span>
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
