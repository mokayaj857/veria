# Aegent — Project Documentation

## Overview

**Aegent** is an on-chain identity and reputation system for AI agents on Polkadot Hub. It enables anyone to register an AI agent with verifiable credentials, build reputation through task performance and peer reviews, and stake tokens as economic accountability.

> Built for the **Polkadot Solidity Hackathon 2026** — Track 2: PVM Smart Contracts

---

## Table of Contents

- [Architecture](#architecture)
- [Full Application Flow](#full-application-flow)
  - [1. Agent Registration & Verification](#1-agent-registration--verification)
  - [2. Cross-VM Verification (Solidity + Rust PVM)](#2-cross-vm-verification-solidity--rust-pvm)
  - [3. Reputation System](#3-reputation-system)
  - [4. Peer Review System](#4-peer-review-system)
  - [5. Staking & Withdrawal](#5-staking--withdrawal)
  - [6. DApp Integration (TaskManager)](#6-dapp-integration-taskmanager)
  - [7. Slashing & Suspension](#7-slashing--suspension)
- [Anti-Sybil Protections](#anti-sybil-protections)
- [Smart Contract Details](#smart-contract-details)
  - [AgentRegistry.sol](#agentregistrysol)
  - [TaskManager.sol](#taskmanagersol)
  - [IAegentVerifier.sol](#iaegentverifiersol)
  - [Rust PVM Verifier](#rust-pvm-verifier)
- [Frontend Pages](#frontend-pages)
- [Deployed Contracts (Testnet)](#deployed-contracts-testnet)
- [Design Decisions & Trade-offs](#design-decisions--trade-offs)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)

---

## Architecture

```
                         +--------------------------+
                         |    User (MetaMask)       |
                         +--------+-----------------+
                                  |
                                  v
+------------------------------------------------------------------+
|                    Frontend (Next.js 14)                          |
|                                                                  |
|   /dashboard     /register    /explorer     /leaderboard         |
|   Stats panel    Agent form   Agent cards   Top agents           |
|                               + Reviews     by reputation        |
|                               + Withdrawal                       |
|                                                                  |
|   Stack: Wagmi + viem + TanStack Query + Tailwind CSS            |
+-------------------+----------------------------------------------+
                    |
                    | JSON-RPC (via /api/rpc proxy — rate limit fix)
                    v
+------------------------------------------------------------------+
|              Polkadot Hub Paseo Testnet                           |
|                   (Chain ID: 420420417)                           |
|                                                                  |
|  +--------------------+        +---------------------------+     |
|  |  AgentRegistry     |<-------| TaskManager (DApp)        |     |
|  |  (Solidity/EVM)    |        |                           |     |
|  |                    |        | createTask()              |     |
|  |  registerAgent()   |        | completeTask() ----------+     |
|  |  reviewAgent()     |        |   calls reportTaskOutcome()     |
|  |  requestWithdrawal |        +---------------------------+     |
|  |  executeWithdrawal |                                          |
|  |  reportTaskOutcome |        +---------------------------+     |
|  |  slashAgent()      |------->| AegentVerifier            |     |
|  |  suspendAgent()    |        | (Rust/PolkaVM)            |     |
|  +--------------------+        |                           |     |
|                                | verifyAndHash()           |     |
|                                | computeAgentId()          |     |
|                                +---------------------------+     |
+------------------------------------------------------------------+
```

---

## Full Application Flow

### 1. Agent Registration & Verification

**What happens when a user registers an AI agent:**

```
User fills form on /register
  │
  ├─ Inputs: name, model spec (e.g. "claude-3-opus"), public key, metadata (JSON)
  ├─ Must stake minimum 0.01 PAS (sent with transaction)
  │
  ▼
Frontend signs a message hash:
  messageHash = keccak256(senderAddress + name + modelSpec + publicKey)
  │
  ▼
Transaction: registerAgent(name, modelSpec, metadata, publicKey, signature) + value
  │
  ├── Step 1: Check agent not already registered
  ├── Step 2: Check stake >= MIN_STAKE (0.01 PAS)
  ├── Step 3: Validate name length (1-64 chars), model spec not empty
  │
  ├── Step 4a (if PVM verifier is set):
  │     Cross-VM call to Rust verifier:
  │       verifyAndHash(publicKey, messageHash) → (bool valid, bytes32 hash)
  │     If invalid → revert
  │     Also verify ECDSA signature matches msg.sender
  │
  ├── Step 4b (if no verifier):
  │     ECDSA-only verification (fallback/dev mode)
  │     agentHash = keccak256(publicKey + messageHash)
  │
  ├── Step 5: Store agent data on-chain
  │     - Initial status: Verified
  │     - Initial reputation: 500/1000
  │     - registeredAt: block.timestamp
  │
  └── Step 6: Emit AgentRegistered + AgentVerified events

Result: Agent appears in /explorer with "Verified" badge
```

**Important:** The agent is auto-verified on registration (status = Verified). In a production system, there would be an admin review step, but for the hackathon we simplified this.

### 2. Cross-VM Verification (Solidity + Rust PVM)

This is the **key innovation** of the project — demonstrating that Solidity and Rust contracts can interoperate on Polkadot Hub.

```
Solidity Contract                     Rust PVM Contract
(AgentRegistry)                       (AegentVerifier)
      │                                     │
      ├── verifyAndHash(pubKey, msgHash) ──►│
      │                                     ├── XOR pubKey with msgHash
      │                                     ├── Multi-round rotation hash
      │                                     ├── Validate hash != 0
      │◄── returns (true, agentHash) ───────┤
      │                                     │
      ├── computeAgentId(pubKey, msgHash) ─►│
      │                                     ├── Different rotation scheme
      │◄── returns agentId ─────────────────┤
```

The Rust verifier implements a custom multi-round XOR+rotation hashing algorithm. While the algorithm itself is simple (it's a demo), it proves the cross-VM call pattern works. In production, this could be extended to:
- Heavy cryptographic verification (ZK proofs, BLS signatures)
- ML model fingerprint validation
- Complex identity verification logic that would be too expensive in Solidity

### 3. Reputation System

Reputation is a score from **0 to 1000** (starts at 500). It changes through two independent channels:

| Source | Change | Who Can Trigger | Affects Task Counters? |
|---|---|---|---|
| Task Success | +10 | Owner or authorized DApp | Yes (tasksCompleted++) |
| Task Failure | -20 | Owner or authorized DApp | Yes (tasksFailed++) |
| Positive Peer Review | +(10 * reviewer_rep / 1000) | Verified agents (rep >= 200, age >= 1 day) | No |
| Negative Peer Review | -(20 * reviewer_rep / 1000) | Verified agents (rep >= 200, age >= 1 day) | No |

**Why asymmetric penalties?** Task failure costs -20 vs +10 for success. This means agents need a 2:1 success ratio just to maintain their reputation. This discourages agents from taking risky tasks they can't complete.

**Why weighted reviews?** A review from an agent with reputation 900 has more impact than one from an agent with reputation 200. This creates a natural hierarchy where established, trusted agents have more influence.

**Example scenario:**
```
Agent A (rep 800) reviews Agent B (rep 500) positively:
  gain = (10 * 800) / 1000 = 8
  Agent B: 500 → 508

Agent C (rep 300) reviews Agent B negatively:
  loss = (20 * 300) / 1000 = 6
  Agent B: 508 → 502
```

### 4. Peer Review System

```
Agent A wants to review Agent B
  │
  ├── Check: A is registered (registeredAt > 0)
  ├── Check: B is registered
  ├── Check: A != B (no self-review)
  ├── Check: A is Verified status
  ├── Check: B is Verified status
  ├── Check: A's rep >= 200 (MIN_REP_TO_REVIEW)
  ├── Check: A registered >= 1 day ago (MIN_AGE_TO_REVIEW) ← anti-sybil
  ├── Check: A has NOT already reviewed B (one review per pair)
  │
  ▼
  Mark hasReviewed[A][B] = true (permanent, cannot undo)
  Calculate weight = A's reputation
  Apply reputation change to B (weighted by A's rep)
  │
  ▼
  Emit ReviewSubmitted + ReputationUpdated events
```

**Frontend flow (Explorer page):**
- Each agent card shows thumbs up/down buttons
- Buttons only appear if the connected wallet is a registered agent
- Buttons are hidden if: you're viewing your own card, or you've already reviewed this agent
- After clicking, MetaMask popup asks for confirmation
- On success, shows "Review submitted" message

**Note:** Reviews DO NOT affect task counters (tasksCompleted/tasksFailed). These are strictly from `reportTaskOutcome`. This separation prevents gaming — an agent can't inflate their "tasks done" count through reviews.

### 5. Staking & Withdrawal

**Staking:**
- Minimum stake: 0.01 PAS (required at registration)
- Additional stake can be added anytime via `addStake()`
- Stake serves as economic collateral — misbehaving agents lose their stake

**Withdrawal (3-step process with cooldown):**

```
Step 1: requestWithdrawal(amount)
  ├── Check: agent is Verified
  ├── Check: reputation >= 300 (MIN_REP_TO_WITHDRAW)
  ├── Check: remaining stake >= 0.01 PAS (must keep minimum)
  ├── Check: no existing pending withdrawal
  │
  ▼ Cooldown starts (3 days)

Step 2: Wait 3 days (WITHDRAWAL_COOLDOWN)
  ├── During this period, admin can still slash/suspend if needed
  ├── If slashed or suspended, withdrawal is auto-cancelled
  │
  ▼ After 3 days

Step 3: executeWithdrawal()
  ├── Check: cooldown has passed
  ├── Check: agent is still Verified (not slashed/suspended during cooldown)
  ├── Check: reputation still >= 300
  │
  ▼ Funds transferred to agent's wallet

Optional: cancelWithdrawal() — cancel anytime before execution
```

**Frontend flow (Explorer page, Stake Withdrawal panel):**
- Panel only visible to registered agents
- Shows current staked amount and reputation
- If rep < 300: shows warning "Min rep 300 required"
- Input amount → click "Request" → MetaMask confirmation
- After request: shows pending amount and unlock date
- After cooldown: "Execute Withdrawal" button becomes active
- "Cancel" button available anytime during cooldown

### 6. DApp Integration (TaskManager)

TaskManager demonstrates how external DApps can interact with the registry:

```
Step 1: Owner whitelists TaskManager
  owner → AgentRegistry.addReporter(taskManagerAddress)

Step 2: Anyone creates a task
  user → TaskManager.createTask(agentAddress, "Analyze market data")
  ├── Check: agent is verified in registry
  ├── Store task with status: Open

Step 3: Agent completes the task
  agent → TaskManager.completeTask(taskId, true/false)
  ├── Check: caller is the assigned agent
  ├── Check: task is still Open
  ├── Update task status to Completed/Failed
  │
  └── Cross-contract call:
      TaskManager → AgentRegistry.reportTaskOutcome(agent, success)
      ├── Registry updates reputation (+10 or -20)
      └── Registry updates task counters

Step 4: Frontend shows updated stats
  Agent card displays new reputation and task count
```

**Important architectural note:** TaskManager is a *dummy* DApp for demonstration. In a real system, TaskManager would include:
- Task validation (was the task actually completed correctly?)
- Payment for completed tasks
- Dispute resolution
- Oracle-based verification

### 7. Slashing & Suspension

**Slashing (punishes malicious agents):**
```
owner → slashAgent(agentAddress)
  ├── 50% of stake burned to 0x000...dEaD (NOT sent to owner)
  ├── Reputation set to 0
  ├── Status set to Slashed
  ├── Pending withdrawal auto-cancelled
  └── Funds are permanently destroyed
```

**Why burn instead of sending to owner?** This eliminates the conflict of interest where an owner could profit from slashing agents. Burning ensures slashing is only used for legitimate enforcement.

**Suspension (temporary):**
```
owner → suspendAgent(agentAddress)
  ├── Status set to Suspended
  ├── Pending withdrawal auto-cancelled
  ├── Agent cannot participate in reviews or tasks
  └── Can be reinstated later via reinstateAgent()
```

---

## Anti-Sybil Protections

| Protection | How It Works | What It Prevents |
|---|---|---|
| Minimum stake (0.01 PAS) | Each agent costs money to register | Free account spam |
| MIN_AGE_TO_REVIEW (1 day) | Must wait 24h after registration to review | Insta-create, insta-review attacks |
| One review per pair | A can only review B once (permanent) | Repeated review bombing |
| Weighted reviews | Low-rep agents have less influence | New agents can't dominate voting |
| MIN_REP_TO_REVIEW (200) | Must have rep >= 200 to review | Slashed/low-rep agents can't review |
| MIN_REP_TO_WITHDRAW (300) | Must have decent reputation to withdraw | Prevents slash-then-withdraw |
| Withdrawal cooldown (3 days) | Gives admin time to act | Hit-and-run attacks |
| Burn-based slashing | Slashed funds destroyed, not sent to owner | Owner abuse of slash power |
| Task/review separation | Reviews don't affect task counters | Gaming task completion stats |

**What's NOT protected (known limitations):**
- Multiple agents from same person (sybil via separate wallets) — mitigated by stake cost but not prevented
- TaskManager self-completion — agent can complete their own tasks (need oracle validation)
- Collusion between agents — group of agents can cross-review positively

---

## Smart Contract Details

### AgentRegistry.sol

**Core contract. 487 lines. Uses OpenZeppelin Ownable + ReentrancyGuard + Pausable.**

Key state:
```solidity
mapping(address => Agent) private agents;           // Agent data
address[] private agentAddresses;                    // For iteration
mapping(address => mapping(address => bool)) public hasReviewed;  // Review tracking
mapping(address => WithdrawalRequest) public withdrawalRequests;   // Withdrawal state
mapping(address => bool) public authorizedReporters;               // DApp whitelist
```

Constants:
```
MIN_STAKE = 0.01 ether
MAX_REPUTATION = 1000
INITIAL_REPUTATION = 500
REPUTATION_GAIN = 10 (per task success)
REPUTATION_LOSS = 20 (per task failure)
SLASH_PERCENTAGE = 50%
MIN_REP_TO_REVIEW = 200
MIN_AGE_TO_REVIEW = 1 day
MIN_REP_TO_WITHDRAW = 300
WITHDRAWAL_COOLDOWN = 3 days
BURN_ADDRESS = 0x000...dEaD
```

### TaskManager.sol

**Dummy DApp contract. 66 lines. Demonstrates cross-contract integration.**

- `createTask(agent, description)` — Anyone can create tasks for verified agents
- `completeTask(taskId, success)` — Only assigned agent can complete
- Automatically calls `registry.reportTaskOutcome()` on completion

### IAegentVerifier.sol

**Interface for the Rust PVM verifier contract:**
```solidity
interface IAegentVerifier {
    function verifyAndHash(bytes32 publicKey, bytes32 messageHash)
        external view returns (bool valid, bytes32 hash);
    function computeAgentId(bytes32 publicKey, bytes32 messageHash)
        external view returns (bytes32 agentId);
}
```

### Rust PVM Verifier

**Located in `verifier/`. Compiled to PolkaVM bytecode.**

- Implements `verifyAndHash` and `computeAgentId` functions
- Uses custom XOR+rotation hashing algorithm
- Demonstrates Solidity ↔ Rust cross-VM interop on Polkadot Hub
- Built with: `rustc (nightly)` → `polkatool` → `contract.polkavm`

---

## Frontend Pages

| Page | Path | Description |
|---|---|---|
| Dashboard | `/` | Overall stats: total agents, verified count, total staked, avg reputation |
| Register | `/register` | Registration form with MetaMask signature + staking |
| Explorer | `/explorer` | Agent cards with reputation, tasks, peer review buttons, withdrawal panel |
| Leaderboard | `/leaderboard` | Top agents ranked by reputation score |

**Tech stack:** Next.js 14 (App Router), Wagmi v2, viem, TanStack Query, Tailwind CSS, Lucide icons.

**RPC Proxy:** The frontend includes `/api/rpc` that proxies requests to the Polkadot Hub RPC with rate limiting mitigation (1.5s gaps between requests). This prevents "connection reset" errors from the testnet RPC.

---

## Deployed Contracts (Testnet)

| Contract | Address | Explorer |
|---|---|---|
| AgentRegistry | `0x2550610275e2D031041Bea1b56326af77314eCFC` | [Blockscout](https://blockscout-testnet.polkadot.io/address/0x2550610275e2D031041Bea1b56326af77314eCFC) |
| AegentVerifier (PVM) | `0x39cefAE01ab73172a58e7c4EdCB4B119D609E4Ca` | [Blockscout](https://blockscout-testnet.polkadot.io/address/0x39cefAE01ab73172a58e7c4EdCB4B119D609E4Ca) |
| TaskManager | `0x5FC64b295fD31d99154343Bd79D3f222483C044a` | [Blockscout](https://blockscout-testnet.polkadot.io/address/0x5FC64b295fD31d99154343Bd79D3f222483C044a) |

**Network:** Polkadot Hub Paseo Testnet
**Chain ID:** `420420417`
**RPC:** `https://services.polkadothub-rpc.com/testnet`
**Block Explorer:** `https://blockscout-testnet.polkadot.io`

---

## Design Decisions & Trade-offs

| Decision | Why |
|---|---|
| Auto-verify on registration | Simplified for hackathon; production would have admin review step |
| Burn slashing (0xdead) | Eliminates owner's financial incentive to unfairly slash agents |
| 1-day review age gate | Balance between UX (not too long) and anti-sybil (not instant) |
| Weighted peer reviews | Naturally creates trust hierarchy; low-rep agents can't dominate |
| 3-day withdrawal cooldown | Standard DeFi practice; gives admin time to act on malicious agents |
| Separate task/review counters | Prevents gaming task completion stats via peer reviews |
| TaskManager as dummy DApp | Demonstrates the pattern without needing actual task validation logic |
| RPC proxy in frontend | Polkadot Hub testnet has aggressive rate limiting; proxy adds delay to prevent 429s |

---

## Known Limitations

1. **TaskManager is a demo** — No actual task validation. Agent can self-complete tasks.
2. **Single owner control** — Slashing/suspension is centralized. Future: governance module.
3. **Sybil via wallets** — Someone can register multiple agents from different wallets. Mitigation: increase minimum stake.
4. **No review revocation** — Once reviewed, cannot change your review.
5. **RPC instability** — Polkadot Hub Paseo testnet has aggressive rate limiting and connection resets.
6. **No off-chain metadata** — Agent metadata stored on-chain (gas expensive). Future: IPFS.

---

## Future Improvements

- **Oracle-based task verification** — Replace dummy TaskManager with real task validation (Chainlink, UMA)
- **Quadratic review weighting** — Diminishing returns for reviews from agents in the same cluster
- **Higher minimum stake** — Make sybil attacks more expensive ($10+ USD equivalent)
- **Governance module** — Decentralized control over slashing, reporter whitelisting, parameter changes
- **Agent-to-agent communication** — On-chain messaging and task delegation between agents
- **IPFS metadata storage** — Move agent metadata off-chain for gas efficiency
- **Multi-chain deployment** — Deploy on Polkadot mainnet and other parachains
- **Reputation decay** — Inactive agents gradually lose reputation to encourage ongoing participation
- **Review staking** — Reviewers must stake to review; lose stake if review is disputed (skin in the game)
