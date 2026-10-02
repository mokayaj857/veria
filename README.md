# VERIA

**MeTTa reasons. OmegaClaw remembers. The blockchain holds the agent to it.**

VERIA is the trust layer for autonomous agents in Web3: a **MeTTa** policy engine that decides whether an agent may act, **OmegaClaw** (Omega) memory so the next request is not amnesia, and a **blockchain** identity + stake so bad behavior has an economic cost.

Not a canned demo bot. Subjects are real registered wallets. Decisions are real `.metta` rules. Memory is persistent. The dApp shows **exactly why**.

[Problem](#problem) · [MeTTa & OmegaClaw](#metta--omegaclaw) · [Web3 accountability](#web3-accountability) · [How it works](#how-it-works) · [Architecture](#architecture) · [Application](#application) · [Quick start](#quick-start) · [Trust boundary](#trust-boundary)

| Layer | Job |
|---|---|
| **MeTTa** | Symbolic reasoning over identity, stake, reputation, evidence, history |
| **OmegaClaw** | Persistent agent memory — violations change the next decision |
| **Blockchain** | Verifiable identity, slashable stake, on-chain reputation for Web3 dApps |
| **Keys** | Stay in the wallet. MeTTa never receives private keys |

---

## Problem

AI agents are becoming users of **Web3** — trading, governing, calling contracts — with no way to trust them.

| Gap | Consequence |
|---|---|
| No identity | Anyone can impersonate an agent on-chain |
| No collateral | A malicious agent can vanish with no cost |
| No reputation | dApps cannot rank who is safe to call |
| No reasoning | A registered agent can request an over-limit transfer and nothing *explains* approve, reject, or slash |
| No memory | The same violation can happen again as if it never did |

Blockchains already know how to hold value. They do not, by themselves, **reason** over an agent’s request. That is what MeTTa and OmegaClaw are for.

---

## MeTTa & OmegaClaw

This is the product.

**MeTTa** is the reasoning and policy engine. It loads explicit `.metta` rules, injects facts about *this* agent and *this* request, and returns a decision: approve, approve-with-limit, reject, investigate, slash, or suspend — plus trust, risk, violation, recommended slash %, remaining stake, and human-readable reasons.

**OmegaClaw** (Omega in code) is persistent memory. After a decision, the incident is stored for that agent id. The next request on the same wallet feeds those facts back into MeTTa. A slash today is not forgotten tomorrow. The leaderboard standing moves from OmegaClaw immediately.

```
Live Web3 agent  →  evidence + OmegaClaw history
                 →  MeTTa (.metta rules)
                 →  decision JSON + explanation
                 →  OmegaClaw persist
                 →  optional on-chain slash / suspend
```

Facts are not invented. They come from the **on-chain registry**: wallet as agent id, staked collateral, reputation, tasks completed / failed, identity status, agent hash as evidence. Action sizes (authorized vs over-limit transfer, spawn, unknown recipient) are derived from that stake and reputation.

MeTTa **does not sign transactions**. It recommends. The blockchain still owns money.

### Rule files

| File | Role |
|---|---|
| `metta/rules.metta` | Identity and stake gates |
| `metta/permissions.metta` | Requested amount vs authorized limit |
| `metta/evidence.metta` | Verified, missing, or conflicting evidence |
| `metta/violations.metta` | Unauthorized transfer, identity mismatch, failure vs malice |
| `metta/reputation.metta` | Reputation as one factor, not the whole decision |
| `metta/slashing.metta` | Recommended slash % and remaining stake |
| `metta/omega.metta` | OmegaClaw history as facts |
| `metta/trust.metta` | Explainable trust and risk |
| `metta/reasoning.metta` | Final `reason-bundle` |

Python: `backend/metta/` — `engine.py` executes S-expressions, `adapter.py` loads rules, `omega.py` is OmegaClaw storage, `chain.py` only *names* the on-chain functions to call. Interpreter tests live in `backend/metta/tests/`.

### APIs

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/veria/reason` | Run MeTTa (`persistOmega` default true) |
| `GET` | `/api/veria/memory?agentId=0x…` | OmegaClaw for one agent |
| `GET` | `/api/veria/memory?all=1` | Standings overlay (last decision, reputation delta, remaining stake) |

### What “good” looks like

On a **clean** OmegaClaw store, TraderBot-01, verified, stake 1000, limit 400, transfer **900**, strong evidence:

- decision **slash**
- 30% → amount **300**, remaining **700**
- new limit **100**
- violation `unauthorized-transfer`

Send a later request on the **same id**. OmegaClaw’s stored incident must raise risk: **reject or limit**, not a silent approve.

In the app: **06 MeTTa** → paste the exact `0x` agent id → **Test this agent id** (no fallback to another agent). Leaderboard **Action** runs the same engine on live Web3 agents.

CLI demo and expected JSON: [`metta/README.md`](metta/README.md).

```bash
cd veria
pip install -r backend/metta/requirements.txt
pytest backend/metta/tests/test_reasoning.py -q
python backend/metta/service.py   # JSON on stdin → decision on stdout
```

**MeTTa units:** 0.01 of native stake = **1000** units.  
**Authorized limit:** `floor(stakeUnits × 0.4 × reputation / 500)` (min 1).

---

## Web3 accountability

MeTTa needs a subject that exists in the open. VERIA binds every agent to a **blockchain** record so dApps can know who they are talking to.

### Identity

An operator connects a **Web3 wallet**, signs `keccak256(sender + name + modelSpec + publicKey)`, and registers with collateral. One agent per wallet. The contract stores name, model, metadata, public key, **agent hash**, stake, verified status, reputation **500**, and timestamps. Explorer and dashboard show **My Stake**, **Tasks Completed**, **Tasks Failed**.

### Stake

Collateral is slashable. Add stake any time. Withdrawals use a **3-day cooldown**, min remaining stake, and a reputation floor so an agent cannot hit-and-run. On-chain slash **burns** a fixed share of stake (not paid to an admin) and can suspend or zero reputation. MeTTa may recommend a *different* percentage; that is policy until a signed chain transaction executes.

### Reputation

Score **0–1000**. Tasks and peer reviews are separate so you cannot farm “tasks done” with thumbs-up.

| Event | Reputation | Task counters |
|---|---|---|
| Task success | +10 | completed++ |
| Task failure | −20 | failed++ |
| Positive review | weighted by reviewer score | no |
| Negative review | weighted (heavier) | no |

Anti-Sybil on the social graph: wait after registration, minimum reputation to review, one review per pair, no self-review. Failure costs twice success — agents need roughly a **2:1** win ratio to hold score.

This is the Know Your Agent layer Web3 dApps can query. MeTTa is what happens **when the agent asks to move value**.

---

## How it works

```
1. Register the agent on-chain (wallet, stake, identity hash)
2. Reputation and tasks accrue on the blockchain
3. A dApp (or the VERIA UI) requests an action for that 0x id
4. Facts = registry row + OmegaClaw memory
5. MeTTa returns approve / reject / limit / slash / suspend + reasons
6. OmegaClaw stores the incident
7. Leaderboard standing updates from memory
8. If enforcement is required, a signed blockchain tx slashes or suspends
```

---

## Architecture

```
 Wallet (user signs; keys never leave the client)
              │
              v
 Web3 dApp  — Next.js, wallet connect, registry + MeTTa UI
              │
       ┌──────┴──────┐
       v             v
 Blockchain        MeTTa + OmegaClaw
 identity          .metta rules
 stake             Python engine
 reputation        persistent memory
 slash / suspend   no private keys
```

```
veria/
├── metta/                 MeTTa source of truth (.metta)
├── backend/metta/         Engine, OmegaClaw store, CLI / API worker
├── frontend/              Web3 app + /api/veria/reason + /api/veria/memory
├── src/                   Smart contracts (registry, tasks, verifier)
├── test/                  Contract tests
└── verifier/              On-chain identity hashing helper
```

---

## Application

| Path | Role |
|---|---|
| `/` | Story + live trust desk (MeTTa on registry agents) |
| `/explorer` | On-chain registry, reviews, withdrawals |
| `/leaderboard` | Rank by **MeTTa standing** (chain score + OmegaClaw deltas) |
| `/dashboard` | Your agent: stake, completed, failed |
| `/register` | Blockchain registration (one agent per wallet) |
| `/accountability` | MeTTa lab — exact agent id, OmegaClaw traces, reasons |

A MeTTa slash drops leaderboard standing **now**. Native stake on the chain moves only when a slash transaction is sent. That split is the point: reasoning is live; settlement is Web3.

---

## Quick start

| Tool | Need |
|---|---|
| Python ≥ 3.10 | MeTTa + OmegaClaw |
| Node.js ≥ 18 | dApp |
| Web3 wallet | Register / stake / reviews |
| Foundry | Only if you change contracts |

```bash
cd veria
pip install -r backend/metta/requirements.txt

cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**.

1. Connect a wallet on the configured Web3 testnet (the app can prompt the chain).
2. **Register** an agent with stake (min 0.01 native).
3. **Leaderboard** → pick a live agent → over-limit action → **Run MeTTa**.
4. **MeTTa** tab → paste that `0x` id → **Test this agent id**.
5. Confirm OmegaClaw traces and standing moved. Confirm reasons cite identity, limit, evidence, and memory.

Faucet and exact chain RPC for *this* deployment are in [Deployment](#deployment-this-repo). They are not the product.

---

## Protocol parameters

| Constant | Value |
|---|---|
| Min stake | 0.01 native |
| Initial / max reputation | 500 / 1000 |
| Task gain / loss | +10 / −20 |
| On-chain slash | 50% burned (not paid to admin) |
| Min rep to review | 200 |
| Min age to review | 1 day |
| Min rep to withdraw | 300 |
| Withdrawal cooldown | 3 days |

---

## Trust boundary

| Layer | Owns |
|---|---|
| Wallet | Signatures |
| Smart contracts | Identity, collateral, reputation, status |
| **MeTTa** | Policy decision and recommended slash % |
| **OmegaClaw** | Incident history and standing overlay |
| Contract admin | Actual on-chain slash / suspend |

If MeTTa says slash and no one sends the chain transaction, **on-chain stake does not change**. OmegaClaw remaining-stake is policy, not a balance. Do not put keys in the reasoner.

---

## Known limitations

- Task completion on the demo dApp is not oracle-proven.
- On-chain slash/suspend is admin-gated, not DAO-gated.
- Many wallets can still Sybil; stake is a cost, not uniqueness.
- Reviews cannot be revoked.
- MeTTa’s recommended % is not automatically the on-chain burn (fixed 50% today).
- Auto-verify on register is an MVP shortcut.

[`DOCS.md`](DOCS.md) · [`SETUP.md`](SETUP.md) · [`metta/README.md`](metta/README.md)

---

## Use cases

DeFi trading agents · DAO governance agents · AI marketplaces · autonomous services that must stay inside a spend or spawn limit · any Web3 app that needs **slashable identity** plus an **explainable allow / deny** from MeTTa, with OmegaClaw as the audit trail.

---

## Status

**Shipped:** MeTTa over live registry agents, OmegaClaw memory, explainable decisions, leaderboard overlay, strict agent-id lab, blockchain identity + stake + reputation.

**Next:** execute MeTTa’s recommended % on-chain when the contract allows it, oracle task proofs, governance over slash, richer OmegaClaw (decay, review staking).

VERIA’s bet: in Web3, agent trust is **reasoned** (MeTTa), **remembered** (OmegaClaw), and **bonded** (blockchain).

---

## Deployment (this repo)

The dApp in this repository talks to a public EVM testnet so identity and stake are real. Chain id `420420417`, min stake 0.01 PAS. Contracts:

| Contract | Address |
|---|---|
| AgentRegistry | [`0x2550610275e2D031041Bea1b56326af77314eCFC`](https://blockscout-testnet.polkadot.io/address/0x2550610275e2D031041Bea1b56326af77314eCFC) |
| Verifier | [`0x39cefAE01ab73172a58e7c4EdCB4B119D609E4Ca`](https://blockscout-testnet.polkadot.io/address/0x39cefAE01ab73172a58e7c4EdCB4B119D609E4Ca) |
| TaskManager | [`0x5FC64b295fD31d99154343Bd79D3f222483C044a`](https://blockscout-testnet.polkadot.io/address/0x5FC64b295fD31d99154343Bd79D3f222483C044a) |

Wallet network name / RPC if you add it manually: Polkadot Hub Paseo, `https://services.polkadothub-rpc.com/testnet`, explorer `https://blockscout-testnet.polkadot.io`, faucet [paseo](https://faucet.polkadot.io/?parachain=paseo). Addresses: `frontend/src/lib/contract.ts`. MeTTa and OmegaClaw do not depend on that brand — they reason over whatever Web3 registry the app reads.

---

## License

MIT
