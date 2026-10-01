"use client";

import { createContext, useContext, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

type AppPath = {
  path: string;
  go: (href: string) => void;
};

const AppPathContext = createContext<AppPath>({
  path: "/",
  go: () => undefined,
});

export function AppPathProvider({ children }: { children: ReactNode }) {
  const path = usePathname() || "/";
  const router = useRouter();

  function go(href: string) {
    const next = href.split("?")[0] || "/";
    if (next === path) return;
    router.push(href);
  }

  return <AppPathContext.Provider value={{ path, go }}>{children}</AppPathContext.Provider>;
}

export function useAppPath() {
  return useContext(AppPathContext);
}
