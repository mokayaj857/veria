# VERIA MeTTa reasoning layer

MeTTa is the **reasoning and policy engine**. The Next.js app and AgentRegistry still own wallets, transactions, and slashing execution. MeTTa never receives private keys.

```
Agent → /api/veria/reason → evidence facts → MeTTa (.metta rules)
      → decision JSON → application policy → optional slashAgent/suspendAgent
      → Omega memory → next request
```

## Files

| File | Role |
|---|---|
| `rules.metta` | Identity and stake policy |
| `permissions.metta` | Limits vs requested amount |
| `evidence.metta` | Confidence, missing, conflicting evidence |
| `violations.metta` | Unauthorized / identity / failure vs malice |
| `reputation.metta` | Reputation as one factor |
| `slashing.metta` | Recommended slash % (not a chain send) |
| `omega.metta` | Historical memory as facts |
| `trust.metta` | Explainable trust/risk |
| `reasoning.metta` | Final decision procedure |

Python adapter: `backend/metta/` (`engine.py` executes the `.metta` files, `omega.py` is persistent memory, `chain.py` maps recommendations onto AgentRegistry).

## Install

```bash
cd veria
pip install -r backend/metta/requirements.txt
```

## Tests

```bash
cd veria
pytest backend/metta/tests/test_reasoning.py -q
```

## Demo request (TraderBot-01, transfer 900 vs limit 400)

```bash
cd veria
python backend/metta/service.py <<'EOF'
{"agent":{"id":"traderbot-01","identity":"verified","stake":1000,"reputation":850,"successful":100,"failed":2,"violations":0,"transactionLimit":400},"request":{"type":"transfer","amount":900,"recipient":"wallet-123"},"evidence":[{"id":"evidence-001","type":"transaction-record","verified":true,"confidence":0.98}],"persistOmega":true}
EOF
```

Expected (clean Omega store):

```json
{
  "decision": "slash",
  "risk": "high",
  "confidence": 0.98,
  "trustScore": 31,
  "violation": "unauthorized-transfer",
  "severity": "high",
  "slashPercentage": 30,
  "slashAmount": 300,
  "remainingStake": 700,
  "recommendedReputationChange": -240,
  "recommendedTransactionLimit": 100
}
```

Then send amount `300` with the updated agent state. Omega’s stored violation raises risk; MeTTa should `reject` or limit, not silently approve.

## App

1. `cd frontend && npm run dev`
2. Open `http://localhost:3000/accountability`
3. Trust desk on Home also calls `POST /api/veria/reason`

## Chain

MeTTa returns `chainAction.function` of `slashAgent` or `suspendAgent`. Those are **owner** calls on `AgentRegistry` (`0x2550610275e2D031041Bea1b56326af77314eCFC`). The live `slashAgent` implementation burns a fixed 50%; the MeTTa percentage is the policy recommendation the app must record and, if you extend the contract, execute.
