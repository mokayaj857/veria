from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


Identity = Literal["verified", "unverified", "revoked", "unknown"]
RequestType = Literal["transfer", "spawn", "export", "tool", "other"]


class AgentIn(BaseModel):
    id: str
    identity: Identity = "unknown"
    stake: int = 0
    reputation: int = 500
    successful: int = 0
    failed: int = 0
    violations: int = 0
    transactionLimit: int = 0
    status: str = "active"
    wallet: str | None = None
    invalidSignature: bool = False
    suspicious: bool = False
    failedThisRequest: bool = False


class RequestIn(BaseModel):
    type: RequestType = "transfer"
    amount: int = 0
    recipient: str | None = None
    recipientKnown: bool | None = None


class EvidenceIn(BaseModel):
    id: str
    type: str = "transaction-record"
    verified: bool = False
    confidence: float = Field(ge=0, le=1, default=0)
    source: str | None = None
    timestamp: str | None = None
    claimsAuthorized: bool | None = None
    claimsInvalidSignature: bool | None = None


class ReasonRequest(BaseModel):
    agent: AgentIn
    request: RequestIn
    evidence: list[EvidenceIn] = Field(default_factory=list)
    persistOmega: bool = True


class ReasonResponse(BaseModel):
    decision: str
    risk: str
    confidence: float
    confidenceBand: str
    trustScore: int
    violation: str
    severity: str
    slashPercentage: int
    slashAmount: int
    remainingStake: int
    recommendedReputationChange: int
    recommendedTransactionLimit: int
    permissionState: str
    evidenceStatus: str
    missingInformation: list[str]
    reasons: list[str]
    omegaMemoriesUsed: list[str]
    chainAction: dict[str, Any]
    explanation: str
