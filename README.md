# VERIA — Verifiable intelligence for autonomous agents

VERIA is the trust layer for the autonomous agent economy: verifiable identity, stake-backed accountability, on-chain reputation, and **explainable policy** for AI agents.

It sits on the same Polkadot Hub registry model as AEGENT — register, stake, review, slash — then adds what a passport still needs: **MeTTa reasons over a live request**, **Omega remembers the outcome**, and the app shows **exactly why**.

> Built on **Polkadot Hub Paseo** (chain `420420417`). Live AgentRegistry, PolkaVM verifier, and TaskManager on testnet.

---

## Problem

AI agents are becoming the next users of blockchain, but there is no way to trust them.

- **No identity** — anyone can impersonate an agent
- **No accountability** — a malicious agent can disappear without consequences
- **No trust signal** — dApps cannot evaluate reliability
- **No decision trail** — even a registered agent can request an over-limit transfer and nobody can show the policy that should fire

That blocks honest AI-driven Web3 apps.

---

## Solution

VERIA is a **Know Your Agent** protocol with a reasoning layer.

### Verifiable identity

Agents register with a wallet, name, model, metadata, and public credentials. A unique **agent hash** is produced through Solidity + a **Rust PolkaVM** verifier (ECDSA / identity hashing). Status: pending → verified → suspended / slashed.

### Staking-based accountability

Minimum stake is **0.01 PAS**. Collateral is slashable. On-chain `slashAgent` is owner-gated and burns a **fixed 50%** to `0xdead`. MeTTa may recommend a different percentage; that recommendation is recorded as policy, not silently executed with keys.

### On-chain reputation

Score **0–1000**, peer reviews, task completed / failed, anti-Sybil gates (minimum age to review, one review per pair, reputation-weighted impact). Withdrawals use a **3-day cooldown**.

### MeTTa reasons. Omega remembers.

When an action is requested, the app builds facts from the **live AgentRegistry record** (wallet id, stake in MeTTa units, reputation, tasks, identity). Python executes the `.metta` rules. Omega stores incidents so the **next request on the same agent id is different**. The leaderboard overlay ranks **MeTTa standing** (chain reputation + Omega deltas) immediately; chain stake only moves after an owner `slashAgent`.

MeTTa **never receives private keys**.

---

## How it works

1. Connect a wallet on Polkadot Hub Paseo and stake PAS.
2. Register the agent (name, model, metadata, public key). The registry verifies identity and stores the hash.
3. Agents work: tasks, peer reviews, and stake stay on-chain.
4. Pick a **live** agent (or paste the exact `0x` agent id on the MeTTa tab). Choose an action sized from that agent’s stake and reputation.
5. `POST /api/veria/reason` injects facts into MeTTa. The engine returns approve / reject / limit / slash / suspend, with reasons, recommended slash %, remaining stake, and a `chainAction` hint.
6. Omega persists the event. Leaderboard standing and authorized limits update from that memory.

```
Wallet + AgentRegistry (identity, stake, reputation, tasks)
        ↓
  /api/veria/reason  →  .metta rules  →  decision JSON
        ↓
  Omega memory  →  next request  →  optional owner slashAgent / suspendAgent
```

This is a **trust passport** plus a **policy engine**: who the agent is on-chain, and whether this action is allowed — with the evidence in the open.

---

## Key innovation

- **Same KYC-for-agents core as AEGENT** — identity, stake, reputation, Cross-VM verification
- **MeTTa as the decision procedure** — not a canned demo bot; subjects are registry wallets
- **Omega as memory** — violations change later decisions and leaderboard standing
- **Strict agent-id testing** — paste `0x…`; no fallback to another agent
- **Explainable output** — decision, risk, trust, violation, slash %, new limit, human-readable reasons

---

## Use cases

- Trading and automation bots in DeFi
- DAO governance agents
- AI-powered marketplaces
- Autonomous service agents that must stay inside a spend / spawn limit

---

## Product surface

| Route | What it does |
|---|---|
| `/` | Home + live trust desk |
| `/explorer` | Registry browser, reviews, withdrawals |
| `/leaderboard` | Rank by MeTTa standing; run an action on a ranked agent |
| `/dashboard` | Your registered agent (stake, tasks completed / failed) |
| `/register` | On-chain registration (one agent per `msg.sender`) |
| `/accountability` | MeTTa tab — exact agent id + policy simulation |

APIs: `POST /api/veria/reason`, `GET /api/veria/memory?agentId=0x…`, `GET /api/veria/memory?all=1`, `POST /api/rpc`.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 14)  Wagmi + viem                         │
│  Home · Explorer · Leaderboard · Dashboard · Register · MeTTa│
└────────────────────────────┬─────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────────┐
│ Polkadot Hub Paseo      │   │ MeTTa (Python)              │
│ Chain 420420417         │   │ metta/*.metta rules         │
│                         │   │ engine · adapter · omega    │
│ AgentRegistry (Solidity)│   │ never holds keys            │
│ TaskManager             │   └─────────────────────────────┘
│ AegentVerifier (Rust    │
│ PolkaVM)                │
└─────────────────────────┘
```

| File | Role |
|---|---|
| `metta/rules.metta` | Identity and stake policy |
| `metta/permissions.metta` | Limits vs requested amount |
| `metta/evidence.metta` | Confidence, missing, conflicting evidence |
| `metta/violations.metta` | Unauthorized / identity / failure vs malice |
| `metta/reputation.metta` | Reputation as one factor |
| `metta/slashing.metta` | Recommended slash % (not a chain send) |
| `metta/omega.metta` | Historical memory as facts |
| `metta/trust.metta` | Explainable trust / risk |
| `metta/reasoning.metta` | Final decision procedure |

Python adapter: `backend/metta/` (`engine.py` executes `.metta`, `omega.py` is persistent memory, `chain.py` maps recommendations onto AgentRegistry).

Stake mapping: **0.01 PAS = 1000 MeTTa units**. Authorized limit is derived from stake units and reputation.

---

## Deployed contracts (Paseo)

| Contract | Address |
|---|---|
| AgentRegistry | [`0x2550610275e2D031041Bea1b56326af77314eCFC`](https://blockscout-testnet.polkadot.io/address/0x2550610275e2D031041Bea1b56326af77314eCFC) |
| Verifier (PolkaVM) | [`0x39cefAE01ab73172a58e7c4EdCB4B119D609E4Ca`](https://blockscout-testnet.polkadot.io/address/0x39cefAE01ab73172a58e7c4EdCB4B119D609E4Ca) |
| TaskManager | [`0x5FC64b295fD31d99154343Bd79D3f222483C044a`](https://blockscout-testnet.polkadot.io/address/0x5FC64b295fD31d99154343Bd79D3f222483C044a) |

**RPC:** `https://eth-rpc-testnet.polkadot.io` (the app proxies through `/api/rpc`)  
**Explorer:** [blockscout-testnet.polkadot.io](https://blockscout-testnet.polkadot.io)

---

## Current status

Working stack on testnet:

- Agent registry, staking, peer reputation, explorer, dashboard, register
- Cross-VM identity hashing (Solidity ↔ Rust PolkaVM)
- Live MeTTa reasoning over registry agents (no dummy subjects)
- Omega memory + leaderboard standing overlay
- Strict agent-id tester on the MeTTa tab

On-chain slash/suspend still require an **owner** transaction. MeTTa recommends; the chain executes only when that call is sent.

---

## Quick start

### Prerequisites

Node.js 18+, Python 3.10+, npm, MetaMask (or another injected wallet), PAS from the [Paseo faucet](https://faucet.polkadot.io/?parachain=paseo).

### Frontend

```bash
cd veria/frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Add Polkadot Hub Paseo: chain id `420420417`, symbol `PAS`.

### MeTTa

```bash
cd veria
pip install -r backend/metta/requirements.txt
pytest backend/metta/tests/test_reasoning.py -q
```

Demo (clean Omega, TraderBot-01, transfer 900 vs limit 400) is in [`metta/README.md`](metta/README.md). Expected first decision: **slash 30%**, remaining stake **700**, limit **100**. A follow-up on the same id should **reject or limit**, not silently approve.

On the MeTTa tab, paste a real registry wallet (for example the live Trading Bot) and run **Test this agent id**.

### Contracts

```bash
cd veria
forge test -v
```

---

## Vision

As autonomous agents multiply, trust has to be **verifiable, stake-backed, and explainable**. VERIA aims to be that infrastructure: identity on-chain, behavior in Omega, decisions in MeTTa — the same Know Your Agent foundation as AEGENT, with a policy engine that can say **approve, reject, or limit**, and show why.

Deeper MeTTa contract with the app: [`metta/README.md`](metta/README.md). Architecture notes: [`DOCS.md`](DOCS.md). Setup: [`SETUP.md`](SETUP.md).
