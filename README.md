# Aegent — Verifiable AI Agent Registry on Polkadot Hub

**Aegent** is an on-chain identity and reputation system for AI agents, built on Polkadot Hub (Paseo Testnet). It provides verifiable registration, staking-based accountability, peer reputation scoring, and cross-VM verification using both Solidity (EVM) and Rust (PolkaVM).

> Built for the **Polkadot Solidity Hackathon 2026** — Track 2: PVM Smart Contracts

---

## Features

- **Verifiable Agent Identity** — On-chain registration with ECDSA signature verification
- **Cross-VM Verification** — Solidity contract delegates to a Rust PolkaVM verifier for identity hashing
- **Staking & Accountability** — Agents stake PAS tokens as collateral; misbehavior results in slashing (burn to `0xdead`)
- **Peer Reputation System** — Verified agents review each other with weighted scoring (no central authority bias)
- **Stake Withdrawal with Cooldown** — 3-day notice period prevents hit-and-run attacks
- **DApp Integration** — TaskManager demonstrates cross-contract task reporting to the registry
- **Anti-Sybil Protections** — Minimum age to review (1 day), one review per pair, reputation-weighted impact
- **Modern Frontend** — Next.js 14 dashboard with wallet connect, agent explorer, leaderboard

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                 │
│  Dashboard │ Register │ Explorer │ Leaderboard           │
│  Wagmi + viem + TanStack Query                          │
└──────────────────────┬──────────────────────────────────┘
                       │ JSON-RPC (via /api/rpc proxy)
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Polkadot Hub Paseo Testnet                  │
│                   (Chain ID: 420420417)                  │
│                                                         │
│  ┌──────────────────┐   ┌─────────────────────────┐     │
│  │  AgentRegistry   │◄──│  TaskManager (DApp)     │     │
│  │  (Solidity/EVM)  │   │  reportTaskOutcome()    │     │
│  │                  │   └─────────────────────────┘     │
│  │  Registration    │                                   │
│  │  Reputation      │   ┌─────────────────────────┐     │
│  │  Staking         │──►│  AegentVerifier         │     │
│  │  Peer Reviews    │   │  (Rust/PolkaVM)         │     │
│  │  Withdrawal      │   │  verifyAndHash()        │     │
│  └──────────────────┘   │  computeAgentId()       │     │
│                         └─────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## Deployed Contracts (Testnet)

| Contract | Address | Explorer |
|---|---|---|
| AgentRegistry | `0x2550610275e2D031041Bea1b56326af77314eCFC` | [Blockscout](https://blockscout-testnet.polkadot.io/address/0x2550610275e2D031041Bea1b56326af77314eCFC) |
| AegentVerifier (PVM) | `0x39cefAE01ab73172a58e7c4EdCB4B119D609E4Ca` | [Blockscout](https://blockscout-testnet.polkadot.io/address/0x39cefAE01ab73172a58e7c4EdCB4B119D609E4Ca) |
| TaskManager | `0x5FC64b295fD31d99154343Bd79D3f222483C044a` | [Blockscout](https://blockscout-testnet.polkadot.io/address/0x5FC64b295fD31d99154343Bd79D3f222483C044a) |

**Network:** Polkadot Hub Paseo Testnet | **Chain ID:** `420420417` | **RPC:** `https://services.polkadothub-rpc.com/testnet`

---

## Local Installation Guide

### Prerequisites

| Tool | Version | Installation |
|---|---|---|
| **Node.js** | >= 18.x | [nodejs.org](https://nodejs.org) |
| **npm** | >= 9.x | Comes with Node.js |
| **Foundry** | Latest | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| **Git** | >= 2.x | [git-scm.com](https://git-scm.com) |
| **MetaMask** | Latest | Browser extension |

### Step 1: Clone & Install

```bash
git clone https://github.com/<your-username>/aegent.git
cd aegent

# Install Foundry dependencies (OpenZeppelin, forge-std)
forge install

# Install frontend dependencies
cd frontend
npm install
```

### Step 2: Add Polkadot Hub Paseo to MetaMask

Open MetaMask → Add Network → Add manually:

| Field | Value |
|---|---|
| Network Name | `Polkadot Hub Paseo` |
| RPC URL | `https://services.polkadothub-rpc.com/testnet` |
| Chain ID | `420420417` |
| Currency Symbol | `PAS` |
| Block Explorer | `https://blockscout-testnet.polkadot.io` |

### Step 3: Get Testnet PAS Tokens

Go to the [Polkadot Hub Paseo Faucet](https://faucet.polkadot.io/?parachain=paseo) and enter your MetaMask address. You need PAS for gas fees and staking (minimum 0.01 PAS).

### Step 4: Run the Frontend

```bash
cd frontend
npm run dev
# Open http://localhost:3000
```

The frontend connects to the **already deployed** testnet contracts automatically. No `.env` file or contract deployment needed.

### Step 5: Test the Features

1. **Connect Wallet** — Click "Connect Wallet" top-right, select MetaMask (make sure you're on Polkadot Hub Paseo network)
2. **Register Agent** — Go to `/register`, fill in agent name, model spec, public key, metadata JSON, set stake (min 0.01 PAS)
3. **Explorer** — Go to `/explorer` to browse agents with reputation bars, task stats, and staking info
4. **Peer Review** — Thumbs up/down on agent cards (requires 1-day wait after registration — see note below)
5. **Stake Withdrawal** — Withdrawal panel appears at top of Explorer for registered agents
6. **Leaderboard** — Go to `/leaderboard` for agents ranked by reputation

> **Note on time-gated features:** Peer reviews require the reviewer's agent to be registered for at least 1 day (anti-sybil protection). Stake withdrawal requires a 3-day cooldown after requesting. These are by design — see [DOCS.md](DOCS.md) for full explanation.

### Step 6: Run Smart Contract Tests

```bash
# From project root (not frontend/)
forge test -v          # Run all 38 tests
forge test -vvv        # Verbose with call traces
```

---

## Documentation

| Document | Description |
|---|---|
| **[DOCS.md](DOCS.md)** | Full project documentation — architecture, application flow, smart contract details, design decisions |
| **[SETUP.md](SETUP.md)** | Detailed setup guide for contributors — frontend development tips, troubleshooting, deployment instructions |

---

## Team

Built by the Aegent team for the Polkadot Solidity Hackathon 2026.

## License

MIT
