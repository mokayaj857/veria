export const AGENT_REGISTRY_ADDRESS = "0x2550610275e2D031041Bea1b56326af77314eCFC" as `0x${string}`;
export const VERIFIER_ADDRESS = "0x39cefAE01ab73172a58e7c4EdCB4B119D609E4Ca" as `0x${string}`;
export const TASK_MANAGER_ADDRESS = "0x5FC64b295fD31d99154343Bd79D3f222483C044a" as `0x${string}`;

export const AGENT_REGISTRY_ABI = [
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "BURN_ADDRESS",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "INITIAL_REPUTATION",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_REPUTATION",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_REP_TO_REVIEW",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_REP_TO_WITHDRAW",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_STAKE",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "REPUTATION_GAIN",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "REPUTATION_LOSS",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "SLASH_PERCENTAGE",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "WITHDRAWAL_COOLDOWN",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "addStake",
    "inputs": [],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "cancelWithdrawal",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "executeWithdrawal",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getAgent",
    "inputs": [{ "name": "_agent", "type": "address", "internalType": "address" }],
    "outputs": [{
      "name": "", "type": "tuple", "internalType": "struct AgentRegistry.Agent",
      "components": [
        { "name": "owner", "type": "address", "internalType": "address" },
        { "name": "name", "type": "string", "internalType": "string" },
        { "name": "modelSpec", "type": "string", "internalType": "string" },
        { "name": "metadata", "type": "string", "internalType": "string" },
        { "name": "publicKey", "type": "bytes32", "internalType": "bytes32" },
        { "name": "agentHash", "type": "bytes32", "internalType": "bytes32" },
        { "name": "reputationScore", "type": "uint256", "internalType": "uint256" },
        { "name": "stakedAmount", "type": "uint256", "internalType": "uint256" },
        { "name": "status", "type": "uint8", "internalType": "enum AgentRegistry.AgentStatus" },
        { "name": "registeredAt", "type": "uint256", "internalType": "uint256" },
        { "name": "tasksCompleted", "type": "uint256", "internalType": "uint256" },
        { "name": "tasksFailed", "type": "uint256", "internalType": "uint256" }
      ]
    }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAgentAddresses",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address[]", "internalType": "address[]" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAgentCount",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAgentsPaginated",
    "inputs": [
      { "name": "_offset", "type": "uint256", "internalType": "uint256" },
      { "name": "_limit", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [{
      "name": "", "type": "tuple[]", "internalType": "struct AgentRegistry.Agent[]",
      "components": [
        { "name": "owner", "type": "address", "internalType": "address" },
        { "name": "name", "type": "string", "internalType": "string" },
        { "name": "modelSpec", "type": "string", "internalType": "string" },
        { "name": "metadata", "type": "string", "internalType": "string" },
        { "name": "publicKey", "type": "bytes32", "internalType": "bytes32" },
        { "name": "agentHash", "type": "bytes32", "internalType": "bytes32" },
        { "name": "reputationScore", "type": "uint256", "internalType": "uint256" },
        { "name": "stakedAmount", "type": "uint256", "internalType": "uint256" },
        { "name": "status", "type": "uint8", "internalType": "enum AgentRegistry.AgentStatus" },
        { "name": "registeredAt", "type": "uint256", "internalType": "uint256" },
        { "name": "tasksCompleted", "type": "uint256", "internalType": "uint256" },
        { "name": "tasksFailed", "type": "uint256", "internalType": "uint256" }
      ]
    }, {
      "name": "", "type": "address[]", "internalType": "address[]"
    }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRegistryStats",
    "inputs": [],
    "outputs": [
      { "name": "totalAgents", "type": "uint256", "internalType": "uint256" },
      { "name": "verifiedCount", "type": "uint256", "internalType": "uint256" },
      { "name": "totalStaked", "type": "uint256", "internalType": "uint256" },
      { "name": "avgReputation", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTopAgents",
    "inputs": [{ "name": "_count", "type": "uint256", "internalType": "uint256" }],
    "outputs": [
      { "name": "topAddresses", "type": "address[]", "internalType": "address[]" },
      { "name": "topScores", "type": "uint256[]", "internalType": "uint256[]" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "authorizedReporters",
    "inputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "addReporter",
    "inputs": [{ "name": "_reporter", "type": "address", "internalType": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeReporter",
    "inputs": [{ "name": "_reporter", "type": "address", "internalType": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "hasReviewed",
    "inputs": [
      { "name": "", "type": "address", "internalType": "address" },
      { "name": "", "type": "address", "internalType": "address" }
    ],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_AGE_TO_REVIEW",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isVerifiedAgent",
    "inputs": [{ "name": "_agent", "type": "address", "internalType": "address" }],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "paused",
    "inputs": [],
    "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "registerAgent",
    "inputs": [
      { "name": "_name", "type": "string", "internalType": "string" },
      { "name": "_modelSpec", "type": "string", "internalType": "string" },
      { "name": "_metadata", "type": "string", "internalType": "string" },
      { "name": "_publicKey", "type": "bytes32", "internalType": "bytes32" },
      { "name": "_signature", "type": "bytes", "internalType": "bytes" }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "reinstateAgent",
    "inputs": [{ "name": "_agent", "type": "address", "internalType": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "reportTaskOutcome",
    "inputs": [
      { "name": "_agent", "type": "address", "internalType": "address" },
      { "name": "_success", "type": "bool", "internalType": "bool" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "requestWithdrawal",
    "inputs": [{ "name": "_amount", "type": "uint256", "internalType": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "reviewAgent",
    "inputs": [
      { "name": "_target", "type": "address", "internalType": "address" },
      { "name": "_positive", "type": "bool", "internalType": "bool" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setVerifier",
    "inputs": [{ "name": "_verifier", "type": "address", "internalType": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "slashAgent",
    "inputs": [{ "name": "_agent", "type": "address", "internalType": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "suspendAgent",
    "inputs": [{ "name": "_agent", "type": "address", "internalType": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [{ "name": "newOwner", "type": "address", "internalType": "address" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "unpause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "verifierAddress",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "withdrawalRequests",
    "inputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "outputs": [
      { "name": "amount", "type": "uint256", "internalType": "uint256" },
      { "name": "requestedAt", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  { "type": "event", "name": "AgentRegistered", "inputs": [{ "name": "agentAddress", "type": "address", "indexed": true, "internalType": "address" }, { "name": "name", "type": "string", "indexed": false, "internalType": "string" }, { "name": "modelSpec", "type": "string", "indexed": false, "internalType": "string" }, { "name": "publicKey", "type": "bytes32", "indexed": false, "internalType": "bytes32" }, { "name": "agentHash", "type": "bytes32", "indexed": false, "internalType": "bytes32" }, { "name": "stakedAmount", "type": "uint256", "indexed": false, "internalType": "uint256" }, { "name": "verifiedByRust", "type": "bool", "indexed": false, "internalType": "bool" }], "anonymous": false },
  { "type": "event", "name": "AgentReinstated", "inputs": [{ "name": "agentAddress", "type": "address", "indexed": true, "internalType": "address" }], "anonymous": false },
  { "type": "event", "name": "AgentSlashed", "inputs": [{ "name": "agentAddress", "type": "address", "indexed": true, "internalType": "address" }, { "name": "slashedAmount", "type": "uint256", "indexed": false, "internalType": "uint256" }, { "name": "remainingStake", "type": "uint256", "indexed": false, "internalType": "uint256" }], "anonymous": false },
  { "type": "event", "name": "AgentSuspended", "inputs": [{ "name": "agentAddress", "type": "address", "indexed": true, "internalType": "address" }], "anonymous": false },
  { "type": "event", "name": "AgentVerified", "inputs": [{ "name": "agentAddress", "type": "address", "indexed": true, "internalType": "address" }], "anonymous": false },
  { "type": "event", "name": "CollateralAdded", "inputs": [{ "name": "agentAddress", "type": "address", "indexed": true, "internalType": "address" }, { "name": "addedAmount", "type": "uint256", "indexed": false, "internalType": "uint256" }, { "name": "totalStake", "type": "uint256", "indexed": false, "internalType": "uint256" }], "anonymous": false },
  { "type": "event", "name": "OwnershipTransferred", "inputs": [{ "name": "previousOwner", "type": "address", "indexed": true, "internalType": "address" }, { "name": "newOwner", "type": "address", "indexed": true, "internalType": "address" }], "anonymous": false },
  { "type": "event", "name": "Paused", "inputs": [{ "name": "account", "type": "address", "indexed": false, "internalType": "address" }], "anonymous": false },
  { "type": "event", "name": "ReputationUpdated", "inputs": [{ "name": "agentAddress", "type": "address", "indexed": true, "internalType": "address" }, { "name": "oldScore", "type": "uint256", "indexed": false, "internalType": "uint256" }, { "name": "newScore", "type": "uint256", "indexed": false, "internalType": "uint256" }, { "name": "taskSuccess", "type": "bool", "indexed": false, "internalType": "bool" }], "anonymous": false },
  { "type": "event", "name": "ReviewSubmitted", "inputs": [{ "name": "reviewer", "type": "address", "indexed": true, "internalType": "address" }, { "name": "target", "type": "address", "indexed": true, "internalType": "address" }, { "name": "positive", "type": "bool", "indexed": false, "internalType": "bool" }, { "name": "weight", "type": "uint256", "indexed": false, "internalType": "uint256" }], "anonymous": false },
  { "type": "event", "name": "Unpaused", "inputs": [{ "name": "account", "type": "address", "indexed": false, "internalType": "address" }], "anonymous": false },
  { "type": "event", "name": "VerifierUpdated", "inputs": [{ "name": "oldVerifier", "type": "address", "indexed": true, "internalType": "address" }, { "name": "newVerifier", "type": "address", "indexed": true, "internalType": "address" }], "anonymous": false },
  { "type": "event", "name": "ReporterAdded", "inputs": [{ "name": "reporter", "type": "address", "indexed": true, "internalType": "address" }], "anonymous": false },
  { "type": "event", "name": "ReporterRemoved", "inputs": [{ "name": "reporter", "type": "address", "indexed": true, "internalType": "address" }], "anonymous": false },
  { "type": "event", "name": "WithdrawalCancelled", "inputs": [{ "name": "agent", "type": "address", "indexed": true, "internalType": "address" }], "anonymous": false },
  { "type": "event", "name": "WithdrawalExecuted", "inputs": [{ "name": "agent", "type": "address", "indexed": true, "internalType": "address" }, { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }, { "name": "remainingStake", "type": "uint256", "indexed": false, "internalType": "uint256" }], "anonymous": false },
  { "type": "event", "name": "WithdrawalRequested", "inputs": [{ "name": "agent", "type": "address", "indexed": true, "internalType": "address" }, { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }, { "name": "unlockTime", "type": "uint256", "indexed": false, "internalType": "uint256" }], "anonymous": false },
  { "type": "error", "name": "EnforcedPause", "inputs": [] },
  { "type": "error", "name": "ExpectedPause", "inputs": [] },
  { "type": "error", "name": "OwnableInvalidOwner", "inputs": [{ "name": "owner", "type": "address", "internalType": "address" }] },
  { "type": "error", "name": "OwnableUnauthorizedAccount", "inputs": [{ "name": "account", "type": "address", "internalType": "address" }] },
  { "type": "error", "name": "ReentrancyGuardReentrantCall", "inputs": [] }
] as const;
