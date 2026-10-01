import { defineChain } from "viem";

export const POLKADOT_HUB_CHAIN_ID = 420420417;
export const POLKADOT_HUB_CHAIN_ID_HEX = "0x190f1b41";

export const POLKADOT_HUB_RPC_URLS = [
  "https://eth-rpc-testnet.polkadot.io",
  "https://services.polkadothub-rpc.com/testnet",
] as const;

export const POLKADOT_HUB_EXPLORER = "https://blockscout-testnet.polkadot.io";

export const polkadotHubTestnet = defineChain({
  id: POLKADOT_HUB_CHAIN_ID,
  name: "Polkadot Hub Paseo",
  nativeCurrency: { decimals: 18, name: "PAS", symbol: "PAS" },
  rpcUrls: {
    default: { http: [...POLKADOT_HUB_RPC_URLS] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: POLKADOT_HUB_EXPLORER },
  },
  testnet: true,
});
