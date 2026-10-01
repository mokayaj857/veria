"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type AppPath = {
  path: string;
  go: (href: string) => void;
};

const AppPathContext = createContext<AppPath>({
  path: "/",
  go: () => undefined,
});

export function AppPathProvider({ children }: { children: ReactNode }) {
  const nextPath = usePathname();
  const [path, setPath] = useState(nextPath);

  useEffect(() => {
    setPath(nextPath);
  }, [nextPath]);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function go(href: string) {
    const next = href.split("?")[0] || "/";
    if (next === path) return;
    window.history.pushState(null, "", href);
    setPath(next);
  }

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const link = target?.closest("a");
      if (!link) return;
      if (link.target === "_blank" || link.hasAttribute("download")) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#")) return;
      event.preventDefault();
      const next = href.split("?")[0] || "/";
      if (next === window.location.pathname) return;
      window.history.pushState(null, "", href);
      setPath(next);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return <AppPathContext.Provider value={{ path, go }}>{children}</AppPathContext.Provider>;
}

export function useAppPath() {
  return useContext(AppPathContext);
}
