// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./IAegentVerifier.sol";

/**
 * @title AgentRegistry
 * @author Aegent Team — Polkadot Solidity Hackathon 2026
 * @notice Know Your Agent: Verifiable identity registry for AI agents on Polkadot Hub.
 *
 * @dev Track 2 (PVM Smart Contracts) + OpenZeppelin Sponsor Track.
 *
 *   OpenZeppelin usage (non-trivial, beyond standard token deployments):
 *     - Ownable: Role-based admin control for emergency slashing & suspension
 *     - ReentrancyGuard: Protects registerAgent, slashAgent, executeWithdrawal (all handle ETH)
 *     - Pausable: Emergency circuit breaker to halt registrations during incidents
 *
 *   Architecture:
 *     Frontend (Next.js) → this contract (Solidity/PVM) → AegentVerifier (Rust/PVM)
 *
 *   When verifierAddress is set, registerAgent delegates compute-heavy credential
 *   verification to the Rust PVM contract via cross-VM call. When not set (address(0)),
 *   it falls back to ECDSA-only mode for development/testing.
 *
 *   V2 Improvements:
 *     - Peer reputation: verified agents can review each other (weighted by reviewer rep)
 *     - Stake withdrawal: agents can withdraw stake with 3-day cooldown
 *     - Fair slashing: slashed funds are burned, not sent to owner
 */
contract AgentRegistry is Ownable, ReentrancyGuard, Pausable {

    // ─── Types ────────────────────────────────────────────────────────

    enum AgentStatus { Pending, Verified, Suspended, Slashed }

    struct Agent {
        address owner;
        string name;
        string modelSpec;
        string metadata;
        bytes32 publicKey;
        bytes32 agentHash;
        uint256 reputationScore;
        uint256 stakedAmount;
        AgentStatus status;
        uint256 registeredAt;
        uint256 tasksCompleted;
        uint256 tasksFailed;
    }

    struct WithdrawalRequest {
        uint256 amount;
        uint256 requestedAt;
    }

    // ─── State ────────────────────────────────────────────────────────

    mapping(address => Agent) private agents;
    address[] private agentAddresses;
    address public verifierAddress;

    // Peer review: reviewer => target => has reviewed
    mapping(address => mapping(address => bool)) public hasReviewed;

    // Withdrawal requests
    mapping(address => WithdrawalRequest) public withdrawalRequests;

    // Authorized task reporters (DApps that can report task outcomes)
    mapping(address => bool) public authorizedReporters;

    // ─── Constants ────────────────────────────────────────────────────

    uint256 public constant MIN_STAKE = 0.01 ether;
    uint256 public constant MAX_REPUTATION = 1000;
    uint256 public constant INITIAL_REPUTATION = 500;
    uint256 public constant REPUTATION_GAIN = 10;
    uint256 public constant REPUTATION_LOSS = 20;
    uint256 public constant SLASH_PERCENTAGE = 50;
    uint256 public constant MIN_REP_TO_REVIEW = 200;
    uint256 public constant MIN_AGE_TO_REVIEW = 1 days;
    uint256 public constant MIN_REP_TO_WITHDRAW = 300;
    uint256 public constant WITHDRAWAL_COOLDOWN = 3 days;

    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // ─── Events ───────────────────────────────────────────────────────

    event AgentRegistered(
        address indexed agentAddress, string name, string modelSpec,
        bytes32 publicKey, bytes32 agentHash, uint256 stakedAmount, bool verifiedByRust
    );
    event AgentVerified(address indexed agentAddress);
    event ReputationUpdated(
        address indexed agentAddress, uint256 oldScore, uint256 newScore, bool taskSuccess
    );
    event AgentSlashed(address indexed agentAddress, uint256 slashedAmount, uint256 remainingStake);
    event CollateralAdded(address indexed agentAddress, uint256 addedAmount, uint256 totalStake);
    event AgentSuspended(address indexed agentAddress);
    event AgentReinstated(address indexed agentAddress);
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event ReviewSubmitted(address indexed reviewer, address indexed target, bool positive, uint256 weight);
    event WithdrawalRequested(address indexed agent, uint256 amount, uint256 unlockTime);
    event WithdrawalExecuted(address indexed agent, uint256 amount, uint256 remainingStake);
    event WithdrawalCancelled(address indexed agent);
    event ReporterAdded(address indexed reporter);
    event ReporterRemoved(address indexed reporter);

    // ─── Modifiers ────────────────────────────────────────────────────

    modifier agentExists(address _agent) {
        require(agents[_agent].registeredAt > 0, "Aegent: agent not found");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ─── Verifier Management (onlyOwner) ──────────────────────────────

    function setVerifier(address _verifier) external onlyOwner {
        address old = verifierAddress;
        verifierAddress = _verifier;
        emit VerifierUpdated(old, _verifier);
    }

    // ─── Reporter Management (onlyOwner) ────────────────────────────

    /// @notice Authorize a DApp contract to report task outcomes.
    function addReporter(address _reporter) external onlyOwner {
        require(_reporter != address(0), "Aegent: zero address");
        require(!authorizedReporters[_reporter], "Aegent: already authorized");
        authorizedReporters[_reporter] = true;
        emit ReporterAdded(_reporter);
    }

    function removeReporter(address _reporter) external onlyOwner {
        require(authorizedReporters[_reporter], "Aegent: not authorized");
        authorizedReporters[_reporter] = false;
        emit ReporterRemoved(_reporter);
    }

    // ─── Pause (onlyOwner) ────────────────────────────────────────────

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ─── Registration ─────────────────────────────────────────────────

    function registerAgent(
        string calldata _name,
        string calldata _modelSpec,
        string calldata _metadata,
        bytes32 _publicKey,
        bytes calldata _signature
    ) external payable nonReentrant whenNotPaused {
        require(agents[msg.sender].registeredAt == 0, "Aegent: already registered");
        require(msg.value >= MIN_STAKE, "Aegent: insufficient stake");
        require(bytes(_name).length > 0 && bytes(_name).length <= 64, "Aegent: invalid name length");
        require(bytes(_modelSpec).length > 0, "Aegent: model spec required");
        require(_publicKey != bytes32(0), "Aegent: public key required");
        require(_signature.length > 0, "Aegent: signature required");

        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, _name, _modelSpec, _publicKey));

        bool verifiedByRust;
        bytes32 agentHash;

        if (verifierAddress != address(0)) {
            (bool valid, bytes32 hash) = IAegentVerifier(verifierAddress).verifyAndHash(
                _publicKey, messageHash
            );
            require(valid, "Aegent: Rust verifier rejected credential");
            agentHash = hash;
            verifiedByRust = true;
            require(_verifyECDSA(messageHash, _signature), "Aegent: invalid ECDSA signature");
        } else {
            require(_verifyECDSA(messageHash, _signature), "Aegent: invalid credential signature");
            agentHash = keccak256(abi.encodePacked(_publicKey, messageHash));
            verifiedByRust = false;
        }

        agents[msg.sender] = Agent({
            owner: msg.sender,
            name: _name,
            modelSpec: _modelSpec,
            metadata: _metadata,
            publicKey: _publicKey,
            agentHash: agentHash,
            reputationScore: INITIAL_REPUTATION,
            stakedAmount: msg.value,
            status: AgentStatus.Verified,
            registeredAt: block.timestamp,
            tasksCompleted: 0,
            tasksFailed: 0
        });
        agentAddresses.push(msg.sender);

        emit AgentRegistered(msg.sender, _name, _modelSpec, _publicKey, agentHash, msg.value, verifiedByRust);
        emit AgentVerified(msg.sender);
    }

    // ─── Peer Review ──────────────────────────────────────────────────

    /// @notice Verified agents can review other agents. Review weight scales
    ///         with the reviewer's own reputation (higher rep = more influence).
    ///         Anti-sybil: reviewer must be registered >= MIN_AGE_TO_REVIEW.
    ///         Reviews affect reputation only — task counters are separate (reportTaskOutcome).
    function reviewAgent(address _target, bool _positive)
        external agentExists(msg.sender) agentExists(_target)
    {
        require(msg.sender != _target, "Aegent: cannot review self");
        require(agents[msg.sender].status == AgentStatus.Verified, "Aegent: reviewer not active");
        require(agents[_target].status == AgentStatus.Verified, "Aegent: target not active");
        require(agents[msg.sender].reputationScore >= MIN_REP_TO_REVIEW, "Aegent: rep too low to review");
        require(
            block.timestamp >= agents[msg.sender].registeredAt + MIN_AGE_TO_REVIEW,
            "Aegent: account too new to review"
        );
        require(!hasReviewed[msg.sender][_target], "Aegent: already reviewed this agent");

        hasReviewed[msg.sender][_target] = true;

        uint256 weight = agents[msg.sender].reputationScore;
        uint256 oldScore = agents[_target].reputationScore;
        uint256 newScore;

        if (_positive) {
            uint256 gain = (REPUTATION_GAIN * weight) / MAX_REPUTATION;
            if (gain == 0) gain = 1;
            newScore = oldScore + gain;
            if (newScore > MAX_REPUTATION) newScore = MAX_REPUTATION;
        } else {
            uint256 loss = (REPUTATION_LOSS * weight) / MAX_REPUTATION;
            if (loss == 0) loss = 1;
            newScore = oldScore > loss ? oldScore - loss : 0;
        }

        agents[_target].reputationScore = newScore;

        emit ReviewSubmitted(msg.sender, _target, _positive, weight);
        emit ReputationUpdated(_target, oldScore, newScore, _positive);
    }

    // ─── Stake Withdrawal ─────────────────────────────────────────────

    /// @notice Request a withdrawal. Funds unlock after WITHDRAWAL_COOLDOWN.
    function requestWithdrawal(uint256 _amount)
        external agentExists(msg.sender)
    {
        require(agents[msg.sender].status == AgentStatus.Verified, "Aegent: not active");
        require(agents[msg.sender].reputationScore >= MIN_REP_TO_WITHDRAW, "Aegent: rep too low to withdraw");
        require(_amount > 0, "Aegent: zero amount");
        require(
            agents[msg.sender].stakedAmount - _amount >= MIN_STAKE,
            "Aegent: must keep minimum stake"
        );
        require(withdrawalRequests[msg.sender].amount == 0, "Aegent: pending withdrawal exists");

        uint256 unlockTime = block.timestamp + WITHDRAWAL_COOLDOWN;
        withdrawalRequests[msg.sender] = WithdrawalRequest({
            amount: _amount,
            requestedAt: block.timestamp
        });

        emit WithdrawalRequested(msg.sender, _amount, unlockTime);
    }

    /// @notice Execute a withdrawal after cooldown has passed.
    function executeWithdrawal() external nonReentrant agentExists(msg.sender) {
        WithdrawalRequest memory req = withdrawalRequests[msg.sender];
        require(req.amount > 0, "Aegent: no pending withdrawal");
        require(
            block.timestamp >= req.requestedAt + WITHDRAWAL_COOLDOWN,
            "Aegent: cooldown not passed"
        );
        require(agents[msg.sender].status == AgentStatus.Verified, "Aegent: not active");
        require(agents[msg.sender].reputationScore >= MIN_REP_TO_WITHDRAW, "Aegent: rep too low");

        uint256 amount = req.amount;
        delete withdrawalRequests[msg.sender];

        agents[msg.sender].stakedAmount -= amount;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "Aegent: withdrawal transfer failed");

        emit WithdrawalExecuted(msg.sender, amount, agents[msg.sender].stakedAmount);
    }

    /// @notice Cancel a pending withdrawal request.
    function cancelWithdrawal() external {
        require(withdrawalRequests[msg.sender].amount > 0, "Aegent: no pending withdrawal");
        delete withdrawalRequests[msg.sender];
        emit WithdrawalCancelled(msg.sender);
    }

    // ─── Query Functions ──────────────────────────────────────────────

    function getAgent(address _agent) external view returns (Agent memory) {
        require(agents[_agent].registeredAt > 0, "Aegent: agent not found");
        return agents[_agent];
    }

    function isVerifiedAgent(address _agent) external view returns (bool) {
        return agents[_agent].status == AgentStatus.Verified;
    }

    function getAgentCount() external view returns (uint256) {
        return agentAddresses.length;
    }

    function getAgentAddresses() external view returns (address[] memory) {
        return agentAddresses;
    }

    function getAgentsPaginated(uint256 _offset, uint256 _limit)
        external view returns (Agent[] memory, address[] memory)
    {
        uint256 total = agentAddresses.length;
        if (_offset >= total) return (new Agent[](0), new address[](0));
        uint256 end = _offset + _limit > total ? total : _offset + _limit;
        uint256 count = end - _offset;
        Agent[] memory result = new Agent[](count);
        address[] memory addrs = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            address addr = agentAddresses[_offset + i];
            result[i] = agents[addr];
            addrs[i] = addr;
        }
        return (result, addrs);
    }

    // ─── Reputation — Admin Override (onlyOwner) ──────────────────────

    /// @notice Report task outcome. Callable by owner OR authorized DApp reporters.
    function reportTaskOutcome(address _agent, bool _success)
        external agentExists(_agent)
    {
        require(
            msg.sender == owner() || authorizedReporters[msg.sender],
            "Aegent: not authorized reporter"
        );
        require(agents[_agent].status == AgentStatus.Verified, "Aegent: agent not active");
        uint256 oldScore = agents[_agent].reputationScore;
        uint256 newScore;
        if (_success) {
            agents[_agent].tasksCompleted++;
            newScore = oldScore + REPUTATION_GAIN;
            if (newScore > MAX_REPUTATION) newScore = MAX_REPUTATION;
        } else {
            agents[_agent].tasksFailed++;
            newScore = oldScore > REPUTATION_LOSS ? oldScore - REPUTATION_LOSS : 0;
        }
        agents[_agent].reputationScore = newScore;
        emit ReputationUpdated(_agent, oldScore, newScore, _success);
    }

    function getTopAgents(uint256 _count)
        external view returns (address[] memory topAddresses, uint256[] memory topScores)
    {
        uint256 total = agentAddresses.length;
        uint256 count = _count > total ? total : _count;
        address[] memory tmpA = new address[](total);
        uint256[] memory tmpS = new uint256[](total);
        for (uint256 i = 0; i < total; i++) {
            tmpA[i] = agentAddresses[i];
            tmpS[i] = agents[agentAddresses[i]].reputationScore;
        }
        for (uint256 i = 0; i < count; i++) {
            uint256 mx = i;
            for (uint256 j = i + 1; j < total; j++) {
                if (tmpS[j] > tmpS[mx]) mx = j;
            }
            if (mx != i) {
                (tmpA[i], tmpA[mx]) = (tmpA[mx], tmpA[i]);
                (tmpS[i], tmpS[mx]) = (tmpS[mx], tmpS[i]);
            }
        }
        topAddresses = new address[](count);
        topScores = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            topAddresses[i] = tmpA[i];
            topScores[i] = tmpS[i];
        }
    }

    // ─── Staking ──────────────────────────────────────────────────────

    function addStake() external payable agentExists(msg.sender) {
        require(msg.value > 0, "Aegent: must send value");
        agents[msg.sender].stakedAmount += msg.value;
        emit CollateralAdded(msg.sender, msg.value, agents[msg.sender].stakedAmount);
    }

    // ─── Slashing & Suspension (onlyOwner) ────────────────────────────

    /// @notice Slash an agent: 50% of stake is burned (sent to dead address).
    /// @dev Funds go to BURN_ADDRESS — owner has no financial incentive to slash.
    function slashAgent(address _agent)
        external onlyOwner agentExists(_agent) nonReentrant
    {
        require(agents[_agent].stakedAmount > 0, "Aegent: no stake to slash");
        require(
            agents[_agent].status == AgentStatus.Verified ||
            agents[_agent].status == AgentStatus.Suspended,
            "Aegent: agent already slashed"
        );
        uint256 slashAmount = (agents[_agent].stakedAmount * SLASH_PERCENTAGE) / 100;
        agents[_agent].stakedAmount -= slashAmount;
        agents[_agent].reputationScore = 0;
        agents[_agent].status = AgentStatus.Slashed;

        // Cancel pending withdrawal if any
        if (withdrawalRequests[_agent].amount > 0) {
            delete withdrawalRequests[_agent];
            emit WithdrawalCancelled(_agent);
        }

        // Burn slashed funds — no profit for owner
        (bool sent, ) = payable(BURN_ADDRESS).call{value: slashAmount}("");
        require(sent, "Aegent: slash burn failed");

        emit AgentSlashed(_agent, slashAmount, agents[_agent].stakedAmount);
    }

    function suspendAgent(address _agent) external onlyOwner agentExists(_agent) {
        require(agents[_agent].status == AgentStatus.Verified, "Aegent: not active");
        agents[_agent].status = AgentStatus.Suspended;

        // Cancel pending withdrawal if any
        if (withdrawalRequests[_agent].amount > 0) {
            delete withdrawalRequests[_agent];
            emit WithdrawalCancelled(_agent);
        }

        emit AgentSuspended(_agent);
    }

    function reinstateAgent(address _agent) external onlyOwner agentExists(_agent) {
        require(agents[_agent].status == AgentStatus.Suspended, "Aegent: not suspended");
        agents[_agent].status = AgentStatus.Verified;
        emit AgentReinstated(_agent);
    }

    // ─── Aggregate Views ──────────────────────────────────────────────

    function getRegistryStats()
        external view returns (
            uint256 totalAgents, uint256 verifiedCount,
            uint256 totalStaked, uint256 avgReputation
        )
    {
        totalAgents = agentAddresses.length;
        uint256 repSum;
        for (uint256 i = 0; i < totalAgents; i++) {
            Agent storage a = agents[agentAddresses[i]];
            if (a.status == AgentStatus.Verified) verifiedCount++;
            totalStaked += a.stakedAmount;
            repSum += a.reputationScore;
        }
        avgReputation = totalAgents > 0 ? repSum / totalAgents : 0;
    }

    // ─── Internal ─────────────────────────────────────────────────────

    function _verifyECDSA(bytes32 _messageHash, bytes calldata _signature)
        internal view returns (bool)
    {
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash)
        );
        if (_signature.length != 65) return false;
        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := calldataload(_signature.offset)
            s := calldataload(add(_signature.offset, 32))
            v := byte(0, calldataload(add(_signature.offset, 64)))
        }
        if (v < 27) v += 27;
        if (v != 27 && v != 28) return false;
        return ecrecover(ethSignedHash, v, r, s) == msg.sender;
    }
}
