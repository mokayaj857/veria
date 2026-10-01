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

export type DetectedWallet = {
  name: string;
  rdns: string;
  provider: EthereumProvider;
};

export function discoverWallets(): DetectedWallet[] {
  if (typeof window === "undefined") return [];

  const detected: DetectedWallet[] = [];
  const seen = new WeakSet<object>();

  function add(name: string, provider: EthereumProvider | undefined, rdns = "") {
    if (!provider || seen.has(provider)) return;
    seen.add(provider);
    detected.push({ name, rdns, provider });
  }

  const onAnnounce = (event: Event) => {
    const detail = (event as CustomEvent).detail as
      | { info?: { name?: string; rdns?: string }; provider?: EthereumProvider }
      | undefined;
    if (detail?.provider) {
      add(detail.info?.name || "Wallet", detail.provider, detail.info?.rdns || "");
    }
  };

  window.addEventListener("eip6963:announceProvider", onAnnounce);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  window.removeEventListener("eip6963:announceProvider", onAnnounce);

  // Only fall back to window.ethereum when no EIP-6963 wallet announced.
  // Phantom and MetaMask both try to own window.ethereum; using it causes
  // "Cannot redefine property: ethereum" and broken connect prompts.
  if (detected.length === 0) {
    const ethereum = (window as Window & { ethereum?: EthereumProvider }).ethereum;
    if (ethereum) {
      add(ethereum.isMetaMask ? "MetaMask" : "Browser wallet", ethereum);
    }
  }

  detected.sort((a, b) => {
    const score = (wallet: DetectedWallet) =>
      wallet.rdns === "io.metamask" || /metamask/i.test(wallet.name) ? 0 : 1;
    return score(a) - score(b);
  });

  return detected;
}

export function parseChainId(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
      return Number.parseInt(trimmed, 16);
    }
    return Number(trimmed);
  }
  return NaN;
}

export async function promptWallet(provider: EthereumProvider) {
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts?.length) {
    throw new Error("The wallet did not return an account.");
  }

  await ensurePolkadotHubNetwork(provider);
  return accounts;
}

export async function ensurePolkadotHubNetwork(provider: EthereumProvider | undefined) {
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
  const anyErr = err as {
    shortMessage?: string;
    message?: string;
    code?: number;
    cause?: { message?: string };
  };
  if (anyErr.code === 4001) return "You rejected the request in the wallet.";
  const raw = anyErr.shortMessage || anyErr.cause?.message || anyErr.message || "Wallet request failed.";
  if (/already registered/i.test(raw)) {
    return "This wallet already has an agent on AgentRegistry. One wallet can register only once. Switch to a different wallet to register another agent.";
  }
  return raw.replace(/^ConnectorNotFoundError:\s*/i, "");
}
