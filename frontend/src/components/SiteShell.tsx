"use client";

import HomePage from "@/app/page";
import ExplorerPage from "@/app/explorer/page";
import LeaderboardPage from "@/app/leaderboard/page";
import DashboardPage from "@/app/dashboard/page";
import RegisterPage from "@/app/register/page";
import { useAppPath } from "@/lib/appPath";

const ROUTES = [
  { path: "/", Page: HomePage },
  { path: "/explorer", Page: ExplorerPage },
  { path: "/leaderboard", Page: LeaderboardPage },
  { path: "/dashboard", Page: DashboardPage },
  { path: "/register", Page: RegisterPage },
] as const;

export function SiteShell() {
  const { path } = useAppPath();

  return (
    <>
      {ROUTES.map(({ path: href, Page }) => (
        <div key={href} hidden={path !== href}>
          <Page />
        </div>
      ))}
    </>
  );
}
