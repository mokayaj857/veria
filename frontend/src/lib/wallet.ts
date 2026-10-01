import {
  POLKADOT_HUB_CHAIN_ID,
  POLKADOT_HUB_CHAIN_ID_HEX,
  POLKADOT_HUB_EXPLORER,
  POLKADOT_HUB_RPC_URLS,
} from "./config";

export type EthereumProvider = {
  isMetaMask?: boolean;
  providers?: EthereumProvider[];
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export function getInjectedProvider(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  const ethereum = (window as Window & { ethereum?: EthereumProvider }).ethereum;
  if (!ethereum) return undefined;

  if (Array.isArray(ethereum.providers) && ethereum.providers.length > 0) {
    return (
      ethereum.providers.find((provider: EthereumProvider) => provider?.isMetaMask) ??
      ethereum.providers[0]
    );
  }

  return ethereum;
}

export function parseChainId(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) return Number.parseInt(trimmed, 16);
    return Number(trimmed);
  }
  return NaN;
}

export async function requestWalletAccounts() {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error("No browser wallet found. Install MetaMask and refresh this page.");
  }
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.length) {
    throw new Error("MetaMask did not return an account.");
  }
  return accounts;
}

export async function ensurePolkadotHubNetwork(provider = getInjectedProvider()) {
  if (!provider) return;

  const current = parseChainId(await provider.request({ method: "eth_chainId" }));
  if (current === POLKADOT_HUB_CHAIN_ID) return;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: POLKADOT_HUB_CHAIN_ID_HEX }],
    });
    return;
  } catch (err: unknown) {
    const code = typeof err === "object" && err && "code" in err ? Number((err as { code: number }).code) : 0;
    if (code === 4001) throw err;
  }

  await provider.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: POLKADOT_HUB_CHAIN_ID_HEX,
        chainName: "Polkadot Hub Paseo",
        nativeCurrency: { name: "PAS", symbol: "PAS", decimals: 18 },
        rpcUrls: [...POLKADOT_HUB_RPC_URLS],
        blockExplorerUrls: [POLKADOT_HUB_EXPLORER],
      },
    ],
  });
}

export function walletErrorMessage(err: unknown) {
  if (!err) return "Wallet request failed.";
  if (typeof err === "string") return err;
  const anyErr = err as { shortMessage?: string; message?: string; code?: number; cause?: { message?: string } };
  if (anyErr.code === 4001) return "Request rejected in MetaMask.";
  const raw = anyErr.shortMessage || anyErr.cause?.message || anyErr.message || "Wallet request failed.";
  if (raw.toLowerCase().includes("connector") && raw.toLowerCase().includes("not found")) {
    return "MetaMask is installed but not reachable. Unlock MetaMask and refresh.";
  }
  return raw.replace(/^ConnectorNotFoundError:\s*/i, "");
}
