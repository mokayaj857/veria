# Aegent — Local Setup Guide

Step-by-step guide to get the Aegent project running on your machine. Written for team members who want to contribute (especially frontend).

> **TL;DR:** Clone repo → `forge install` → `cd frontend && npm install && npm run dev` → open `localhost:3000`.
> Contracts are already deployed on testnet — you don't need to deploy anything.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step 1: Clone & Install](#step-1-clone--install)
- [Step 2: Set Up MetaMask](#step-2-set-up-metamask)
- [Step 3: Get Testnet PAS Tokens](#step-3-get-testnet-pas-tokens)
- [Step 4: Run the Frontend](#step-4-run-the-frontend)
- [Step 5: Test the App](#step-5-test-the-app)
- [Working on the Frontend](#working-on-the-frontend)
- [Smart Contract Development (Optional)](#smart-contract-development-optional)
- [Deploying Your Own Contracts (Optional)](#deploying-your-own-contracts-optional)
- [Tips & Troubleshooting](#tips--troubleshooting)
- [Project Structure](#project-structure)
- [Key Files to Know](#key-files-to-know)

---

## Prerequisites

Make sure you have these installed:

| Tool | Version | How to Check | Installation |
|---|---|---|---|
| **Node.js** | >= 18.x | `node --version` | [nodejs.org](https://nodejs.org) |
| **npm** | >= 9.x | `npm --version` | Comes with Node.js |
| **Git** | >= 2.x | `git --version` | [git-scm.com](https://git-scm.com) |
| **MetaMask** | Latest | Browser extension | [metamask.io](https://metamask.io) |

**Only needed if you want to work on smart contracts:**

| Tool | Version | Installation |
|---|---|---|
| **Foundry** | Latest | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| **Rust** | Nightly | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |

---

## Step 1: Clone & Install

```bash
# Clone the repo
git clone https://github.com/<your-username>/aegent.git
cd aegent

# Install Foundry dependencies (OpenZeppelin, forge-std)
# This is needed even if you only work on frontend — the build references these
forge install

# Install frontend dependencies
cd frontend
npm install
```

**If you don't have Foundry installed** and only want to work on frontend, you can skip `forge install` — the frontend runs independently. But `forge build` won't work without it.

---

## Step 2: Set Up MetaMask

You need to add the **Polkadot Hub Paseo Testnet** to MetaMask manually:

1. Open MetaMask → click the network dropdown (top left) → "Add Network" → "Add a network manually"
2. Fill in:

| Field | Value |
|---|---|
| Network Name | `Polkadot Hub Paseo` |
| RPC URL | `https://services.polkadothub-rpc.com/testnet` |
| Chain ID | `420420417` |
| Currency Symbol | `PAS` |
| Block Explorer URL | `https://blockscout-testnet.polkadot.io` |

3. Click "Save" → switch to the Polkadot Hub Paseo network

**Alternative:** When you open the frontend and click "Connect Wallet", it should auto-prompt you to add the network if it's not configured yet.

---

## Step 3: Get Testnet PAS Tokens

You need PAS tokens for gas fees and staking (minimum 0.01 PAS to register an agent).

**Option A — Faucet:**
1. Go to [Polkadot Hub Paseo Faucet](https://faucet.polkadot.io/?parachain=paseo)
2. Enter your MetaMask wallet address
3. You should receive some PAS for testing

**Option B — Ask the team:**
If the faucet doesn't work, ask in the team chat. We can send PAS from the deployer account.

---

## Step 4: Run the Frontend

```bash
cd frontend
npm run dev
```

This starts the development server at **http://localhost:3000**.

The frontend connects to the **already deployed** testnet contracts. No `.env` file needed — everything is hardcoded:
- Contract addresses → `src/lib/contract.ts`
- Chain configuration → `src/lib/config.ts`

---

## Step 5: Test the App

Once the frontend is running and MetaMask is connected:

### 5a. Register an Agent
1. Go to `http://localhost:3000/register`
2. Fill in:
   - **Name**: Your agent's name (e.g., "My Test Bot")
   - **Model**: AI model spec (e.g., "gpt-4-turbo")
   - **Public Key**: Any 32-byte hex (for testing, MetaMask will help generate)
   - **Metadata**: JSON string like `{"description": "A test agent", "capabilities": ["trading"]}`
3. Set stake amount (minimum 0.01 PAS)
4. Click Register → confirm in MetaMask
5. Wait for transaction confirmation (can take 10-30 seconds on testnet)

### 5b. View Agents
- Go to `http://localhost:3000/explorer`
- You should see registered agents with reputation bars, staked amounts, and task stats

### 5c. Peer Review (requires 1-day wait)
- Agent must be registered for **at least 1 day** before they can review others
- After 1 day: thumbs up/down buttons appear on other agent cards
- Each agent can only review another agent once

### 5d. Stake Withdrawal
- On the Explorer page, the **Stake Withdrawal** panel appears if you're a registered agent
- Enter amount → click "Request" → wait 3-day cooldown → "Execute Withdrawal"
- You can cancel anytime during the cooldown

### 5e. Leaderboard
- Go to `http://localhost:3000/leaderboard`
- Shows agents ranked by reputation score

---

## Working on the Frontend

If you're here to improve the frontend (UI/UX), here's what you need to know:

### Tech Stack
- **Next.js 14** (App Router) — pages in `src/app/`
- **Tailwind CSS** — utility-first styling, config in `tailwind.config.ts`
- **Wagmi v2 + viem** — blockchain interaction (connect wallet, read/write contracts)
- **TanStack Query** — data fetching/caching (auto-refetch on block changes)
- **Lucide React** — icon library

### Key Files

| File | What It Does |
|---|---|
| `src/app/page.tsx` | Dashboard/home page |
| `src/app/register/page.tsx` | Agent registration form |
| `src/app/explorer/page.tsx` | Agent explorer + peer review buttons + withdrawal panel |
| `src/app/leaderboard/page.tsx` | Reputation leaderboard |
| `src/app/api/rpc/route.ts` | RPC proxy (rate limit mitigation) |
| `src/hooks/useAgentRegistry.ts` | All contract interaction hooks |
| `src/lib/contract.ts` | Contract addresses + ABI |
| `src/lib/config.ts` | Chain config (RPC, chain ID) |
| `src/lib/providers.tsx` | Wagmi + QueryClient providers |
| `src/components/UI.tsx` | Reusable UI components (StatusBadge, ReputationBar) |
| `src/components/Navigation.tsx` | Top navigation bar |

### Design System

The app uses a custom dark theme with CSS variables:
- `aegent-bg` — Background color
- `aegent-card` — Card/panel background
- `aegent-surface` — Input/surface background
- `aegent-border` — Border color
- `aegent-text` — Primary text
- `aegent-muted` — Secondary text
- `aegent-dim` — Dimmed text
- `aegent-accent` — Accent/brand color (emerald green)

### Adding a New Page

```bash
# Create a new page
mkdir -p src/app/my-page
touch src/app/my-page/page.tsx
```

```tsx
// src/app/my-page/page.tsx
"use client";

import { useAccount } from "wagmi";
import { useAgentCount } from "@/hooks/useAgentRegistry";

export default function MyPage() {
  const { address } = useAccount();
  const { data: count } = useAgentCount();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-aegent-text">My Page</h1>
      <p className="text-aegent-muted">Total agents: {count?.toString()}</p>
    </div>
  );
}
```

Don't forget to add navigation link in `src/components/Navigation.tsx`.

### Reading Contract Data

All contract hooks are in `src/hooks/useAgentRegistry.ts`. Use them like:

```tsx
import { useAgent, useAgentCount, useAgentsPaginated } from "@/hooks/useAgentRegistry";

// Get single agent
const { data: agent } = useAgent(address);

// Get total count
const { data: count } = useAgentCount();

// Get paginated list
const { data } = useAgentsPaginated(0, 10);
const agents = data ? data[0] : [];
const addresses = data ? data[1] : [];
```

### Building for Production

```bash
cd frontend
npm run build   # Creates optimized build in .next/
npm start       # Serves production build on port 3000
```

---

## Smart Contract Development (Optional)

Only needed if you're modifying the smart contracts.

### Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Verify
forge --version
cast --version
```

### Compile & Test

```bash
# From project root (not frontend/)
forge build        # Compile contracts
forge test -v      # Run all 38 tests
forge test -vvv    # Verbose output (see call traces)

# Run specific test
forge test --match-test test_PeerReviewPositive -vvv

# Gas report
forge test --gas-report
```

### Test Categories

| Category | Tests | What They Cover |
|---|---|---|
| Registration | 6 | Register, duplicate check, name validation, stake check |
| Verification | 3 | ECDSA verify, PVM verify, status update |
| Reputation | 4 | Task success/fail, score bounds |
| Peer Review | 6 | Positive/negative, self-review, double review, age check, weighting |
| Staking | 4 | Slash (burn), suspend, reinstate, add stake |
| Withdrawal | 6 | Request, execute, cooldown check, cancel, min stake, low rep |
| Access Control | 4 | Owner functions, authorized reporters, reporter add/remove |
| Views | 5 | Get agent, count, paginated, top agents, stats |

---

## Deploying Your Own Contracts (Optional)

> **You probably don't need this.** Contracts are already deployed on testnet. Only do this if you modified the smart contract code and need to test on-chain.

### 1. Create a Foundry Keystore

```bash
# Import your private key (from MetaMask: Account Details → Export Private Key)
cast wallet import dev-account --interactive
# Enter private key when prompted
# Set a password

# Verify
cast wallet list
# Should show: dev-account
```

### 2. Deploy AgentRegistry

```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://services.polkadothub-rpc.com/testnet \
  --account dev-account \
  --broadcast \
  --gas-limit 5000000
```

Save the deployed address from the output.

### 3. Deploy TaskManager

First, edit `script/DeployTaskManager.s.sol` and update the registry address:
```solidity
AgentRegistry registry = AgentRegistry(payable(0xYOUR_REGISTRY_ADDRESS));
```

Then deploy:
```bash
forge script script/DeployTaskManager.s.sol:DeployTaskManager \
  --rpc-url https://services.polkadothub-rpc.com/testnet \
  --account dev-account \
  --broadcast \
  --gas-limit 5000000
```

### 4. Post-Deployment Setup

```bash
RPC="https://services.polkadothub-rpc.com/testnet"

# Link PVM verifier (if you deployed one)
cast send <REGISTRY_ADDRESS> \
  "setVerifier(address)" <VERIFIER_ADDRESS> \
  --account dev-account --rpc-url $RPC --gas-limit 500000

# Whitelist TaskManager as reporter
cast send <REGISTRY_ADDRESS> \
  "addReporter(address)" <TASK_MANAGER_ADDRESS> \
  --account dev-account --rpc-url $RPC --gas-limit 500000

# Verify
cast call <REGISTRY_ADDRESS> "verifier()(address)" --rpc-url $RPC
cast call <REGISTRY_ADDRESS> "authorizedReporters(address)(bool)" <TASK_MANAGER_ADDRESS> --rpc-url $RPC
```

### 5. Update Frontend Addresses

Edit `frontend/src/lib/contract.ts`:
```typescript
export const AGENT_REGISTRY_ADDRESS = "0xYOUR_NEW_ADDRESS" as `0x${string}`;
export const VERIFIER_ADDRESS = "0xYOUR_VERIFIER" as `0x${string}`;
export const TASK_MANAGER_ADDRESS = "0xYOUR_TASK_MANAGER" as `0x${string}`;
```

---

## Tips & Troubleshooting

### RPC Errors (PALING SERING TERJADI!)

The Polkadot Hub Paseo testnet RPC is **very aggressive with rate limiting**. You WILL encounter these errors. Don't panic.

| Error | What's Happening | What To Do |
|---|---|---|
| `connection reset` | RPC rate limited you | **Tunggu 1-2 menit**, lalu coba lagi |
| `Transaction Already Imported` | Transaksi sebelumnya sudah masuk mempool tapi belum confirm | **Tunggu**, cek dengan `cast call` apakah sudah masuk. Jangan spam kirim ulang! |
| `Priority is too low` | Ada transaksi pending dengan nonce yang sama | Tunggu transaksi pending selesai, atau kirim ulang dengan `--gas-price` lebih tinggi |
| `Transaction is temporarily banned` | Terlalu banyak retry dengan nonce yang sama | **Tunggu 5-10 menit**. Serius, tunggu aja |
| `Invalid Transaction` | Gas price terlalu rendah/tinggi | Jangan set `--gas-price` manual kecuali tahu nilai yang benar. Cek dulu: `cast gas-price --rpc-url $RPC` |

**Tips yang sangat penting:**

1. **Selalu tambahkan `--gas-limit 500000`** di setiap `cast send`. Ini skip `eth_estimateGas` call (mengurangi 1 RPC request = kurang chance kena rate limit).

2. **Jangan spam retry.** Kalau error, tunggu 1-2 menit. Kalau masih error, tunggu 5 menit. RPC ini bukan Ethereum mainnet — dia testnet gratis dengan resource terbatas.

3. **Gunakan `cast call` (read-only) untuk cek** sebelum kirim transaksi. `cast call` jarang kena rate limit karena lebih ringan.

4. **Frontend sudah punya RPC proxy** (`/api/rpc`) yang otomatis delay request. Kalau frontend tiba-tiba ga load data, refresh page setelah beberapa detik.

5. **Kalau transaksi "berhasil error"** (error response tapi transaksi sebenarnya masuk), cek state on-chain:
   ```bash
   cast call $REGISTRY "getAgentCount()(uint256)" --rpc-url $RPC
   ```

### MetaMask Issues

| Problem | Fix |
|---|---|
| Wrong network | Switch to "Polkadot Hub Paseo" di MetaMask. Chain ID: 420420417 |
| "Nonce too high" | MetaMask → Settings → Advanced → Reset Account (resets nonce cache, NOT your balance) |
| Transaction stuck pending | Wait 2-3 minutes. If still stuck, try "Speed Up" in MetaMask or reset account |
| Can't see PAS balance | Make sure you're on the right network. PAS is the native currency, not a token |

### Foundry Issues

| Problem | Fix |
|---|---|
| `forge install` fails | Make sure git is configured: `git config --global user.email "you@example.com"` |
| `forge build` errors | Run `forge install` first. Contracts depend on OpenZeppelin from `lib/` |
| `Keystore file does not exist` | Check name: `cast wallet list`. Use the exact name with `--account` |
| `forge create` + `--constructor-args` + `--account` error | Known bug. Use `forge script` instead (see Deploy section) |

### Frontend Dev Issues

| Problem | Fix |
|---|---|
| `Module not found: @react-native-async-storage` | This is a harmless warning from MetaMask SDK. App still works fine |
| Data not loading | RPC might be rate limited. Check browser console for errors. Wait and refresh |
| Hooks returning undefined | Make sure wallet is connected and on correct network |
| Build error after editing | Run `npm run build` to check for TypeScript errors |

### WSL-Specific Issues (Windows)

| Problem | Fix |
|---|---|
| `localhost:3000` not accessible from Windows browser | Use `http://127.0.0.1:3000` instead, or check WSL network forwarding |
| DNS resolution failures | Add `nameserver 8.8.8.8` to `/etc/resolv.conf` in WSL |
| Slow `npm install` | Move project out of `/mnt/c/` — use `/home/` instead for faster I/O |

---

## Project Structure

```
aegent/
├── DOCS.md                          # Full project documentation
├── SETUP.md                         # This file — setup guide
├── README.md                        # Project overview
├── foundry.toml                     # Foundry configuration
├── .gitignore
│
├── src/                             # Smart contracts
│   ├── AgentRegistry.sol            # Core registry (V2) — 487 lines
│   ├── TaskManager.sol              # Dummy DApp — 66 lines
│   └── IAegentVerifier.sol          # PVM verifier interface
│
├── test/
│   └── AgentRegistry.t.sol          # 38 Foundry tests
│
├── script/
│   ├── Deploy.s.sol                 # Deploy AgentRegistry
│   ├── DeployTaskManager.s.sol      # Deploy TaskManager
│   └── RegisterAgent.s.sol          # Register agent via script
│
├── verifier/                        # Rust PVM verifier
│   ├── src/main.rs                  # Rust contract source
│   ├── Cargo.toml
│   └── Makefile
│
└── frontend/                        # Next.js 14 frontend
    ├── package.json
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── src/
        ├── app/                     # Pages (App Router)
        │   ├── page.tsx             # Dashboard
        │   ├── register/page.tsx    # Registration form
        │   ├── explorer/page.tsx    # Agent explorer + reviews + withdrawal
        │   ├── leaderboard/page.tsx # Reputation leaderboard
        │   └── api/rpc/route.ts     # RPC proxy
        ├── components/
        │   ├── Navigation.tsx       # Top nav bar
        │   └── UI.tsx               # Reusable components
        ├── hooks/
        │   └── useAgentRegistry.ts  # All contract hooks
        └── lib/
            ├── config.ts            # Chain config
            ├── contract.ts          # Addresses + ABI
            └── providers.tsx        # Wagmi + Query providers
```

---

## Key Files to Know

If you're working on the frontend, these are the most important files:

1. **`frontend/src/app/explorer/page.tsx`** — The biggest and most complex page. Contains `ReviewButtons` and `WithdrawalPanel` components inline.

2. **`frontend/src/hooks/useAgentRegistry.ts`** — All blockchain hooks. If you need to read/write contract data, add hooks here.

3. **`frontend/src/lib/contract.ts`** — Contract addresses and ABI. If contracts get redeployed, update addresses here.

4. **`frontend/src/components/UI.tsx`** — Shared components (`StatusBadge`, `ReputationBar`). Add new reusable components here.

5. **`src/AgentRegistry.sol`** — Read this to understand what data is available and what functions exist. You don't need to modify it, but understanding the contract helps when building UI.
