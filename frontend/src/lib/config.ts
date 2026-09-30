import { defineChain } from "viem";
export const polkadotHubTestnet = defineChain({
  id: 420420417,
  name: "Polkadot Hub Paseo",
  nativeCurrency: { decimals: 18, name: "PAS", symbol: "PAS" },
  rpcUrls: { default: { http: ["https://services.polkadothub-rpc.com/testnet"] } },
  blockExplorers: { default: { name: "Blockscout", url: "https://blockscout-testnet.polkadot.io" } },
  testnet: true,
});