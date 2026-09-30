"use client";
import { ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected } from "wagmi/connectors";
import { polkadotHubTestnet } from "./config";

// Route all wagmi RPC calls through our /api/rpc proxy.
// The proxy serialises requests with a 1.5s gap so we never
// hit Polkadot testnet's aggressive rate limit (-32002).
// MetaMask still calls the upstream RPC directly for tx sends,
// but wagmi reads no longer compete for the same quota.
const config = createConfig({
  chains: [polkadotHubTestnet],
  connectors: [injected({ target: "metaMask" })],
  transports: {
    [polkadotHubTestnet.id]: http("/api/rpc", {
      batch: {
        batchSize: 100,
        wait: 300, // collect calls into one proxy request
      },
      retryCount: 3,
      retryDelay: 5000,
      timeout: 60_000,
    }),
  },
  pollingInterval: 0,
});

// react-query: disable background refetching globally.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      retry: 2,
      retryDelay: 3000,
      staleTime: 60_000,      // data stays fresh for 60s
      gcTime: 5 * 60_000,     // garbage collect after 5min
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
export { config };
