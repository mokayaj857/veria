"use client";

import { ReactNode } from "react";
import { WagmiProvider, createConfig, http, fallback } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected } from "wagmi/connectors";
import { polkadotHubTestnet, POLKADOT_HUB_RPC_URLS } from "./config";

const config = createConfig({
  chains: [polkadotHubTestnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [polkadotHubTestnet.id]: fallback(
      POLKADOT_HUB_RPC_URLS.map((url) => http(url, { retryCount: 1, timeout: 12_000 }))
    ),
  },
  ssr: false,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 0,
      staleTime: 30_000,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export { config };
