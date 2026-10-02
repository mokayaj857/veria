# VERIA

**Verifiable intelligence for autonomous agents.**

VERIA is a Know Your Agent protocol on [Polkadot Hub](https://blockscout-testnet.polkadot.io): on-chain identity, stake-backed accountability, peer reputation — and a live **MeTTa** policy engine that decides whether an agent may act, then **Omega** memory so the next request is not amnesia.

Same registry, staking, and Cross-VM verification as a KYC layer for agents. The difference is the decision trail: who the agent is on-chain, whether **this** transfer / spawn / export is allowed, and **why**.

[Problem](#problem) · [What VERIA does](#what-veria-does) · [How it works](#how-it-works) · [Architecture](#architecture) · [MeTTa & Omega](#metta--omega) · [App](#application) · [Network](#network--contracts) · [Quick start](#quick-start) · [Protocol parameters](#protocol-parameters) · [Limitations](#known-limitations)

| | |
|---|---|
| Network | Polkadot Hub Paseo testnet |
| Chain ID | `420420417` |
| Native token | PAS |
| Min stake | 0.01 PAS |
| Reputation | 0–1000 (starts at 500) |
| Agent id | Owner wallet (`msg.sender`), one agent per wallet |
| Reasoning | Python MeTTa over `.metta` files — **no dummy agents** |
| Keys | MeTTa never receives private keys |

---

## Problem

AI agents are becoming users of blockchains. There is still no reliable way to trust them.

| Gap | Consequence |
|---|---|
| No identity | Anyone can impersonate an agent |
| No collateral | A malicious agent can vanish with no cost |
| No reputation | dApps cannot rank reliability |
| No policy | A registered agent can request an over-limit transfer and nothing explains the refusal — or the slash |

That is the barrier for DeFi bots, DAO agents, and autonomous services.

---

## What VERIA does

VERIA issues a **trust passport** and a **policy engine**.

### 1. Verifiable identity

An operator connects a wallet, signs `keccak256(sender + name + modelSpec + publicKey)`, and calls `registerAgent` with stake. The registry:

- Rejects a second agent from the same `msg.sender`
- Requires name length 1–64, non-empty model spec, stake ≥ `MIN_STAKE`
- Calls the **Rust PolkaVM** verifier (`verifyAndHash`) when configured, then checks the ECDSA signature against `msg.sender`
- Stores name, model, metadata JSON, public key, **agent hash**, stake, status **Verified**, reputation **500**, `registeredAt`

Explorer and dashboard show **My Stake**, **Tasks Completed**, **Tasks Failed**.

### 2. Economic accountability

Stake is collateral, not decoration.

- Extra stake via `addStake()`
- Withdrawal: `requestWithdrawal` → **3-day cooldown** → `executeWithdrawal` (or cancel). Remaining stake must stay ≥ 0.01 PAS; reputation must be ≥ 300
- Owner `slashAgent`: **50% burned** to `0x…dEaD` (not paid to the owner), reputation 0, status Slashed, pending withdrawal cancelled
- Owner `suspendAgent` / `reinstateAgent`

MeTTa may recommend a **different slash %**. That is policy. The live contract still burns a fixed 50% only when the owner sends `slashAgent`.

### 3. On-chain reputation

Two independent channels — reviews never inflate task counters.

| Event | Reputation | Tasks |
|---|---|---|
| Task success (`reportTaskOutcome`) | +10 | `tasksCompleted++` |
| Task failure | −20 | `tasksFailed++` |
| Positive peer review | `+(10 × reviewer_rep / 1000)` | no |
| Negative peer review | `−(20 × reviewer_rep / 1000)` | no |

Failure costs twice success: agents need roughly a **2:1** success ratio to hold score. High-rep reviewers weigh more. Anti-Sybil: min age **1 day**, min rep **200** to review, **one review per pair**, no self-review, both parties Verified.

TaskManager is a demo dApp: create a task for a verified agent, the agent completes it, the registry is updated via `addReporter`.

### 4. MeTTa reasons. Omega remembers.

The registry answers *who is this agent?* MeTTa answers *may they do this now?*

Facts come from the **live AgentRegistry row** (wallet as agent id, stake in MeTTa units, reputation, tasks, identity). Evidence is the on-chain agent hash and verification status. Python executes `veria/metta/*.metta`. Omega writes the incident. The leaderboard **re-ranks immediately** using chain reputation **plus** Omega reputation deltas. Chain PAS only moves after an owner slash.

---

## How it works

```
Connect wallet (Paseo) → stake PAS → registerAgent
        → identity hash (Solidity + PolkaVM) → explorer / dashboard
        → tasks & peer reviews update reputation on-chain

Pick a real agent (leaderboard, home, or paste 0x id on MeTTa)
        → action amounts from stake × reputation
        → POST /api/veria/reason
        → MeTTa decision JSON (approve / reject / limit / slash / suspend)
        → Omega persist
        → leaderboard standing + authorized limit overlay
        → optional owner slashAgent / suspendAgent
```

**MeTTa stake units:** `0.01 PAS = 1000` units (`1e13` wei per unit).  
**Authorized limit:** `floor(stakeUnits × 0.4 × reputation / 500)` (floored, minimum 1).

Example policy actions on a live agent: authorized transfer (~50% of limit), over-limit (~2.25×), spawn child, transfer with unknown recipient.

---

## Architecture

```
 User wallet (MetaMask / injected EIP-6963)
              │
              v
 ┌─────────────────────────────────────────────────────────────┐
 │  Next.js 14  ·  Wagmi + viem  ·  TanStack Query              │
 │  /  /explorer  /leaderboard  /dashboard  /register  /accountability
 │  /api/rpc  /api/veria/reason  /api/veria/memory             │
 └───────────────┬────────────────────────────┬────────────────┘
                 │                            │
                 v                            v
 ┌───────────────────────────┐   ┌────────────────────────────────┐
 │ Polkadot Hub Paseo        │   │ MeTTa service (Python)         │
 │                           │   │ metta/*.metta                  │
 │ AgentRegistry (Solidity)  │   │ engine · adapter · schemas     │
 │ TaskManager               │   │ omega.json (memory, gitignored)│
 │ AegentVerifier (Rust PVM) │   │ chain.py maps slash/suspend    │
 └───────────────────────────┘   │ keys never enter this process  │
                                 └────────────────────────────────┘
```

```
veria/
├── README.md
├── DOCS.md                 Full contract & product documentation
├── SETUP.md                Local setup and troubleshooting
├── foundry.toml
├── src/                    AgentRegistry.sol, TaskManager.sol, IAegentVerifier.sol
├── test/                   Foundry tests
├── script/                 Deploy / register scripts
├── verifier/               Rust PolkaVM verifier
├── metta/                  Policy source (.metta) + MeTTa README
├── backend/metta/          Python interpreter, Omega, HTTP-facing CLI
└── frontend/               Next.js app
```

Frontend stack: Next.js 14 App Router, Wagmi v2, viem, TanStack Query, Tailwind, Lucide, Sonner. RPC goes through `/api/rpc` because Paseo public RPCs rate-limit aggressively.

---

## MeTTa & Omega

MeTTa is the **reasoning layer**. Omega is **memory**. The chain still owns money and identity.

| File | Role |
|---|---|
| `metta/rules.metta` | Identity and stake gates |
| `metta/permissions.metta` | Requested amount vs authorized limit |
| `metta/evidence.metta` | Verified / missing / conflicting evidence |
| `metta/violations.metta` | Unauthorized transfer, identity mismatch, failure vs malice |
| `metta/reputation.metta` | Reputation as one factor, not the whole decision |
| `metta/slashing.metta` | Recommended slash % and remaining stake |
| `metta/omega.metta` | Prior incidents as facts |
| `metta/trust.metta` | Explainable trust and risk |
| `metta/reasoning.metta` | Final `reason-bundle` |

Adapter: `backend/metta/adapter.py` loads those files, injects current agent + Omega, runs `!(reason-bundle)`, returns JSON. `chain.py` only **names** `slashAgent` / `suspendAgent`; it does not sign.

### HTTP

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/veria/reason` | Run MeTTa on a payload (`persistOmega` default true) |
| `GET` | `/api/veria/memory?agentId=0x…` | Omega for one id |
| `GET` | `/api/veria/memory?all=1` | Standings overlay (last decision, reputation delta, remaining stake) |
| `POST` | `/api/rpc` | Proxied Hub JSON-RPC |

### Demo (clean Omega)

```bash
cd veria
pip install -r backend/metta/requirements.txt
python backend/metta/service.py <<'EOF'
{"agent":{"id":"traderbot-01","identity":"verified","stake":1000,"reputation":850,"successful":100,"failed":2,"violations":0,"transactionLimit":400},"request":{"type":"transfer","amount":900,"recipient":"wallet-123"},"evidence":[{"id":"evidence-001","type":"transaction-record","verified":true,"confidence":0.98}],"persistOmega":true}
EOF
```

Expected first shot: **slash 30%**, amount **300**, remaining **700**, limit **100**, trust in the 30s, violation `unauthorized-transfer`. Repeat a milder transfer on the same id: Omega history should **reject or limit**, not silently approve.

In the UI: **06 MeTTa** → paste the exact registry wallet → **Test this agent id**. No fallback to another agent. Leaderboard **Action** uses the same engine on ranked live agents.

Full MeTTa contract: [`metta/README.md`](metta/README.md).

---

## Application

| Path | Role |
|---|---|
| `/` | Product story + live trust desk (registry subjects) |
| `/explorer` | Paginated registry, search, status/reputation filters, peer review, withdrawal |
| `/leaderboard` | Rank by **MeTTa standing** (chain score + Omega deltas); MeTTa action desk |
| `/dashboard` | Agent for the connected wallet: stake, completed, failed |
| `/register` | On-chain registration (fails if that wallet already registered) |
| `/accountability` | MeTTa lab: strict agent id, policy actions, Omega traces, reasons |

Leaderboard standing drops after a MeTTa slash even when on-chain PAS has not moved. That is intentional: policy is live; owner slash is a separate transaction.

---

## Network & contracts

**Polkadot Hub Paseo** · chain `420420417` · explorer [blockscout-testnet.polkadot.io](https://blockscout-testnet.polkadot.io)

| Contract | Address |
|---|---|
| AgentRegistry | [`0x2550610275e2D031041Bea1b56326af77314eCFC`](https://blockscout-testnet.polkadot.io/address/0x2550610275e2D031041Bea1b56326af77314eCFC) |
| AegentVerifier (PolkaVM) | [`0x39cefAE01ab73172a58e7c4EdCB4B119D609E4Ca`](https://blockscout-testnet.polkadot.io/address/0x39cefAE01ab73172a58e7c4EdCB4B119D609E4Ca) |
| TaskManager | [`0x5FC64b295fD31d99154343Bd79D3f222483C044a`](https://blockscout-testnet.polkadot.io/address/0x5FC64b295fD31d99154343Bd79D3f222483C044a) |

RPC used by the app: `/api/rpc` → `https://eth-rpc-testnet.polkadot.io` (and Hub fallbacks). Addresses live in `frontend/src/lib/contract.ts`. No `.env` required for the public testnet deploy.

---

## Quick start

### Requirements

| Tool | Version |
|---|---|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Python | ≥ 3.10 (MeTTa) |
| Git | ≥ 2 |
| Injected wallet | MetaMask or EIP-6963 |
| Foundry | only for Solidity work |

PAS: [Paseo faucet](https://faucet.polkadot.io/?parachain=paseo). You need gas plus **≥ 0.01 PAS** to register.

### MetaMask network

| Field | Value |
|---|---|
| Name | Polkadot Hub Paseo |
| RPC | `https://services.polkadothub-rpc.com/testnet` |
| Chain ID | `420420417` |
| Symbol | PAS |
| Explorer | `https://blockscout-testnet.polkadot.io` |

Connect in the app: it can prompt to add the chain.

### Run the app

```bash
cd veria
pip install -r backend/metta/requirements.txt   # MeTTa + pytest

cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** (not a stale tab on another port). First compile after a cache wipe can take a couple of minutes; later routes are faster.

### Tests

```bash
cd veria
pytest backend/metta/tests/test_reasoning.py -q   # MeTTa + Omega standings
forge test -v                                     # AgentRegistry (Foundry)
```

Optional: `forge install` then `forge build` if you change Solidity.

### Walk the product

1. Connect on Paseo → **Register** (one agent per wallet).
2. **Explorer** — identity, stake, tasks; reviews after 1 day and rep ≥ 200.
3. **Leaderboard** — pick an agent → Over-limit transfer → **Run MeTTa**. Standing and Omega traces should move.
4. **MeTTa** — paste that wallet → **Test this agent id** → same engine, that subject only.
5. **Dashboard** — your on-chain stake / completed / failed.

---

## Protocol parameters

| Constant | Value |
|---|---|
| `MIN_STAKE` | 0.01 PAS |
| `INITIAL_REPUTATION` | 500 |
| `MAX_REPUTATION` | 1000 |
| `REPUTATION_GAIN` / `LOSS` | +10 / −20 per task |
| `SLASH_PERCENTAGE` (chain) | 50% burn to `0xdead` |
| `MIN_REP_TO_REVIEW` | 200 |
| `MIN_AGE_TO_REVIEW` | 1 day |
| `MIN_REP_TO_WITHDRAW` | 300 |
| `WITHDRAWAL_COOLDOWN` | 3 days |

Slash burns rather than paying the owner so enforcement is not a profit center.

---

## Trust boundary

| Layer | Owns |
|---|---|
| Wallet / frontend | Signing, `registerAgent`, reviews, withdrawals |
| AgentRegistry | Identity, PAS, reputation, status |
| MeTTa | Policy decision and recommended % |
| Omega | Incident history and standing overlay |
| Contract owner | Actual `slashAgent` / `suspendAgent` |

If MeTTa says slash and nobody sends the owner transaction, **chain stake does not change**. The leaderboard still shows policy standing. Do not treat Omega remaining-stake as PAS in the registry.

---

## Known limitations

Honest constraints of the current MVP:

- TaskManager does **not** prove a task was done (self-complete is possible).
- Slash and suspend are **owner-gated**, not DAO-gated.
- One person can still Sybil with many wallets; stake is a cost, not a proof of uniqueness.
- Reviews cannot be revoked.
- Agent metadata is on-chain (gas).
- Paseo RPC rate-limits; use the app proxy and expect occasional retries.
- Auto-verify on register is a hackathon simplification (production would gate verification).
- MeTTa slash % is **not** what `slashAgent` burns today (fixed 50%).

Deeper design notes: [`DOCS.md`](DOCS.md). Contributor setup: [`SETUP.md`](SETUP.md).

---

## Use cases

Trading and automation bots · DAO governance agents · AI marketplaces · service agents that must stay inside a spend or spawn limit · any dApp that needs a **slashable identity** plus an **explainable allow / deny**.

---

## Status and direction

**Now:** live Paseo registry, Cross-VM hash, staking, reviews, explorer/dashboard/register, MeTTa over real wallets, Omega memory, leaderboard overlay, strict agent-id lab.

**Next:** oracle task verification, governance over slash, IPFS metadata, reputation decay, review staking, executing MeTTa’s recommended % on-chain when the contract allows it.

VERIA’s bet: as agents multiply, trust has to be **verifiable, bonded, and explainable** — identity on-chain, memory in Omega, decisions in MeTTa.

---

## License

MIT
