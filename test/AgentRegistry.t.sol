// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry public registry;
    address public owner;
    address public agent1;
    address public agent2;

    uint256 constant MIN_STAKE = 0.01 ether;
    bytes32 constant PUBLIC_KEY = keccak256("test-public-key");

    function setUp() public {
        owner = address(this);
        agent1 = vm.addr(1);
        agent2 = vm.addr(2);

        registry = new AgentRegistry();

        // Fund test accounts
        vm.deal(agent1, 10 ether);
        vm.deal(agent2, 10 ether);
    }

    // ─── Helper: create valid signature for agent registration ──────

    function _signRegistration(
        uint256 privateKey,
        address signer,
        string memory name,
        string memory model,
        bytes32 pubKey
    ) internal pure returns (bytes memory) {
        bytes32 messageHash = keccak256(abi.encodePacked(signer, name, model, pubKey));
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, ethSignedHash);
        return abi.encodePacked(r, s, v);
    }

    // ─── Deployment ─────────────────────────────────────────────────

    function test_DeployerIsOwner() public view {
        assertEq(registry.owner(), owner);
    }

    function test_StartsWithZeroAgents() public view {
        assertEq(registry.getAgentCount(), 0);
    }

    function test_StartsUnpaused() public view {
        assertFalse(registry.paused());
    }

    function test_VerifierStartsAsZero() public view {
        assertEq(registry.verifierAddress(), address(0));
    }

    // ─── Registration ───────────────────────────────────────────────

    function test_RegisterAgent() public {
        bytes memory sig = _signRegistration(1, agent1, "Bot-Alpha", "gpt-4", PUBLIC_KEY);

        vm.prank(agent1);
        registry.registerAgent{value: MIN_STAKE}(
            "Bot-Alpha", "gpt-4", '{"desc":"test"}', PUBLIC_KEY, sig
        );

        assertEq(registry.getAgentCount(), 1);
        assertTrue(registry.isVerifiedAgent(agent1));

        AgentRegistry.Agent memory a = registry.getAgent(agent1);
        assertEq(a.name, "Bot-Alpha");
        assertEq(a.modelSpec, "gpt-4");
        assertEq(a.reputationScore, 500);
        assertEq(a.stakedAmount, MIN_STAKE);
        assertTrue(a.agentHash != bytes32(0));
    }

    function test_RevertDoubleRegistration() public {
        bytes memory sig = _signRegistration(1, agent1, "Bot", "gpt-4", PUBLIC_KEY);
        vm.prank(agent1);
        registry.registerAgent{value: MIN_STAKE}("Bot", "gpt-4", "", PUBLIC_KEY, sig);

        vm.prank(agent1);
        vm.expectRevert("Aegent: already registered");
        registry.registerAgent{value: MIN_STAKE}("Bot", "gpt-4", "", PUBLIC_KEY, sig);
    }

    function test_RevertInsufficientStake() public {
        bytes memory sig = _signRegistration(1, agent1, "Bot", "gpt-4", PUBLIC_KEY);
        vm.prank(agent1);
        vm.expectRevert("Aegent: insufficient stake");
        registry.registerAgent{value: 0.001 ether}("Bot", "gpt-4", "", PUBLIC_KEY, sig);
    }

    function test_RevertEmptyName() public {
        bytes memory sig = _signRegistration(1, agent1, "", "gpt-4", PUBLIC_KEY);
        vm.prank(agent1);
        vm.expectRevert("Aegent: invalid name length");
        registry.registerAgent{value: MIN_STAKE}("", "gpt-4", "", PUBLIC_KEY, sig);
    }

    function test_RevertWhenPaused() public {
        registry.pause();
        bytes memory sig = _signRegistration(1, agent1, "Bot", "gpt-4", PUBLIC_KEY);
        vm.prank(agent1);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        registry.registerAgent{value: MIN_STAKE}("Bot", "gpt-4", "", PUBLIC_KEY, sig);
    }

    function test_RegisterAfterUnpause() public {
        registry.pause();
        registry.unpause();
        bytes memory sig = _signRegistration(1, agent1, "Bot", "gpt-4", PUBLIC_KEY);
        vm.prank(agent1);
        registry.registerAgent{value: MIN_STAKE}("Bot", "gpt-4", "", PUBLIC_KEY, sig);
        assertEq(registry.getAgentCount(), 1);
    }

    // ─── Reputation ─────────────────────────────────────────────────

    function test_ReputationIncrease() public {
        _registerAgent1();
        registry.reportTaskOutcome(agent1, true);
        assertEq(registry.getAgent(agent1).reputationScore, 510);
        assertEq(registry.getAgent(agent1).tasksCompleted, 1);
    }

    function test_ReputationDecrease() public {
        _registerAgent1();
        registry.reportTaskOutcome(agent1, false);
        assertEq(registry.getAgent(agent1).reputationScore, 480);
        assertEq(registry.getAgent(agent1).tasksFailed, 1);
    }

    function test_ReputationCapsAt1000() public {
        _registerAgent1();
        for (uint256 i = 0; i < 55; i++) {
            registry.reportTaskOutcome(agent1, true);
        }
        assertEq(registry.getAgent(agent1).reputationScore, 1000);
    }

    function test_ReputationFloorsAtZero() public {
        _registerAgent1();
        for (uint256 i = 0; i < 30; i++) {
            registry.reportTaskOutcome(agent1, false);
        }
        assertEq(registry.getAgent(agent1).reputationScore, 0);
    }

    function test_RevertReputationFromNonOwner() public {
        _registerAgent1();
        vm.prank(agent2);
        vm.expectRevert("Aegent: not authorized reporter");
        registry.reportTaskOutcome(agent1, true);
    }

    function test_AuthorizedReporterCanReport() public {
        _registerAgent1();
        address reporter = address(0xDABB);
        registry.addReporter(reporter);
        assertTrue(registry.authorizedReporters(reporter));

        vm.prank(reporter);
        registry.reportTaskOutcome(agent1, true);
        assertEq(registry.getAgent(agent1).reputationScore, 510);
        assertEq(registry.getAgent(agent1).tasksCompleted, 1);
    }

    function test_RemoveReporter() public {
        address reporter = address(0xDABB);
        registry.addReporter(reporter);
        registry.removeReporter(reporter);
        assertFalse(registry.authorizedReporters(reporter));
    }

    // ─── Staking ────────────────────────────────────────────────────

    function test_AddStake() public {
        _registerAgent1();
        vm.prank(agent1);
        registry.addStake{value: 0.05 ether}();
        assertEq(registry.getAgent(agent1).stakedAmount, MIN_STAKE + 0.05 ether);
    }

    // ─── Slashing ───────────────────────────────────────────────────

    function test_SlashAgent() public {
        bytes memory sig = _signRegistration(1, agent1, "Bot", "gpt-4", PUBLIC_KEY);
        vm.prank(agent1);
        registry.registerAgent{value: 1 ether}("Bot", "gpt-4", "", PUBLIC_KEY, sig);

        uint256 burnBalBefore = registry.BURN_ADDRESS().balance;
        registry.slashAgent(agent1);

        assertEq(registry.getAgent(agent1).stakedAmount, 0.5 ether);
        assertEq(registry.getAgent(agent1).reputationScore, 0);
        assertEq(uint256(registry.getAgent(agent1).status), 3); // Slashed
        // Slashed funds burned, not sent to owner
        assertEq(registry.BURN_ADDRESS().balance, burnBalBefore + 0.5 ether);
    }

    function test_SuspendAndReinstate() public {
        _registerAgent1();
        registry.suspendAgent(agent1);
        assertEq(uint256(registry.getAgent(agent1).status), 2); // Suspended
        registry.reinstateAgent(agent1);
        assertEq(uint256(registry.getAgent(agent1).status), 1); // Verified
    }

    // ─── Ownable (from OpenZeppelin) ────────────────────────────────

    function test_TransferOwnership() public {
        registry.transferOwnership(agent1);
        assertEq(registry.owner(), agent1);
    }

    function test_RevertPauseFromNonOwner() public {
        vm.prank(agent1);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", agent1));
        registry.pause();
    }

    // ─── Queries ────────────────────────────────────────────────────

    function test_GetTopAgents() public {
        _registerAgent1();
        bytes memory sig2 = _signRegistration(2, agent2, "Bot-2", "claude-3", PUBLIC_KEY);
        vm.prank(agent2);
        registry.registerAgent{value: MIN_STAKE}("Bot-2", "claude-3", "", PUBLIC_KEY, sig2);

        registry.reportTaskOutcome(agent1, true);
        registry.reportTaskOutcome(agent1, true);

        (address[] memory addrs, uint256[] memory scores) = registry.getTopAgents(2);
        assertEq(addrs[0], agent1);
        assertEq(scores[0], 520);
        assertEq(addrs[1], agent2);
        assertEq(scores[1], 500);
    }

    function test_GetRegistryStats() public {
        _registerAgent1();
        (uint256 total, uint256 verified, uint256 staked, uint256 avgRep) =
            registry.getRegistryStats();
        assertEq(total, 1);
        assertEq(verified, 1);
        assertEq(staked, MIN_STAKE);
        assertEq(avgRep, 500);
    }

    function test_Pagination() public {
        _registerAgent1();
        bytes memory sig2 = _signRegistration(2, agent2, "Bot-2", "claude-3", PUBLIC_KEY);
        vm.prank(agent2);
        registry.registerAgent{value: MIN_STAKE}("Bot-2", "claude-3", "", PUBLIC_KEY, sig2);

        (AgentRegistry.Agent[] memory agents, address[] memory addrs) =
            registry.getAgentsPaginated(0, 1);
        assertEq(agents.length, 1);
        assertEq(addrs[0], agent1);

        (agents, addrs) = registry.getAgentsPaginated(1, 10);
        assertEq(agents.length, 1);
        assertEq(addrs[0], agent2);
    }

    // ─── Verifier Management ────────────────────────────────────────

    function test_SetVerifier() public {
        address fakeVerifier = address(0xBEEF);
        registry.setVerifier(fakeVerifier);
        assertEq(registry.verifierAddress(), fakeVerifier);
    }

    // ─── Peer Review ─────────────────────────────────────────────────

    function test_PeerReviewPositive() public {
        _registerAgent1();
        _registerAgent2();

        // Fast-forward past MIN_AGE_TO_REVIEW (1 day)
        vm.warp(block.timestamp + 1 days + 1);

        vm.prank(agent1);
        registry.reviewAgent(agent2, true);

        // agent1 rep=500, weight=500/1000=50%, gain=10*500/1000=5
        assertEq(registry.getAgent(agent2).reputationScore, 505);
        assertTrue(registry.hasReviewed(agent1, agent2));
        // Reviews should NOT increment task counters
        assertEq(registry.getAgent(agent2).tasksCompleted, 0);
    }

    function test_PeerReviewNegative() public {
        _registerAgent1();
        _registerAgent2();

        vm.warp(block.timestamp + 1 days + 1);

        vm.prank(agent1);
        registry.reviewAgent(agent2, false);

        // agent1 rep=500, weight=500/1000=50%, loss=20*500/1000=10
        assertEq(registry.getAgent(agent2).reputationScore, 490);
        // Reviews should NOT increment task counters
        assertEq(registry.getAgent(agent2).tasksFailed, 0);
    }

    function test_RevertSelfReview() public {
        _registerAgent1();
        vm.warp(block.timestamp + 1 days + 1);

        vm.prank(agent1);
        vm.expectRevert("Aegent: cannot review self");
        registry.reviewAgent(agent1, true);
    }

    function test_RevertDoubleReview() public {
        _registerAgent1();
        _registerAgent2();
        vm.warp(block.timestamp + 1 days + 1);

        vm.prank(agent1);
        registry.reviewAgent(agent2, true);

        vm.prank(agent1);
        vm.expectRevert("Aegent: already reviewed this agent");
        registry.reviewAgent(agent2, true);
    }

    function test_RevertReviewTooNew() public {
        _registerAgent1();
        _registerAgent2();

        // Don't fast-forward — agent is too new
        vm.prank(agent1);
        vm.expectRevert("Aegent: account too new to review");
        registry.reviewAgent(agent2, true);
    }

    function test_HighRepReviewerMoreInfluence() public {
        _registerAgent1();
        _registerAgent2();

        // Boost agent1 rep to 800
        for (uint256 i = 0; i < 30; i++) {
            registry.reportTaskOutcome(agent1, true);
        }
        assertEq(registry.getAgent(agent1).reputationScore, 800);

        vm.warp(block.timestamp + 1 days + 1);

        vm.prank(agent1);
        registry.reviewAgent(agent2, true);

        // weight=800/1000=80%, gain=10*800/1000=8
        assertEq(registry.getAgent(agent2).reputationScore, 508);
    }

    // ─── Stake Withdrawal ─────────────────────────────────────────────

    function test_RequestAndExecuteWithdrawal() public {
        bytes memory sig = _signRegistration(1, agent1, "Bot", "gpt-4", PUBLIC_KEY);
        vm.prank(agent1);
        registry.registerAgent{value: 0.05 ether}("Bot", "gpt-4", "", PUBLIC_KEY, sig);

        uint256 balBefore = agent1.balance;

        vm.prank(agent1);
        registry.requestWithdrawal(0.04 ether);

        // Fast-forward past cooldown
        vm.warp(block.timestamp + 3 days + 1);

        vm.prank(agent1);
        registry.executeWithdrawal();

        assertEq(registry.getAgent(agent1).stakedAmount, 0.01 ether);
        assertEq(agent1.balance, balBefore + 0.04 ether);
    }

    function test_RevertWithdrawBeforeCooldown() public {
        bytes memory sig = _signRegistration(1, agent1, "Bot", "gpt-4", PUBLIC_KEY);
        vm.prank(agent1);
        registry.registerAgent{value: 0.05 ether}("Bot", "gpt-4", "", PUBLIC_KEY, sig);

        vm.prank(agent1);
        registry.requestWithdrawal(0.04 ether);

        // Try immediately — should fail
        vm.prank(agent1);
        vm.expectRevert("Aegent: cooldown not passed");
        registry.executeWithdrawal();
    }

    function test_RevertWithdrawBelowMinStake() public {
        _registerAgent1(); // stakes MIN_STAKE (0.01 ether)

        vm.prank(agent1);
        vm.expectRevert("Aegent: must keep minimum stake");
        registry.requestWithdrawal(0.005 ether); // would leave 0.005 < MIN_STAKE
    }

    function test_CancelWithdrawal() public {
        bytes memory sig = _signRegistration(1, agent1, "Bot", "gpt-4", PUBLIC_KEY);
        vm.prank(agent1);
        registry.registerAgent{value: 0.05 ether}("Bot", "gpt-4", "", PUBLIC_KEY, sig);

        vm.prank(agent1);
        registry.requestWithdrawal(0.04 ether);

        vm.prank(agent1);
        registry.cancelWithdrawal();

        // Can request again after cancel
        vm.prank(agent1);
        registry.requestWithdrawal(0.02 ether);
    }

    function test_SuspendCancelsWithdrawal() public {
        bytes memory sig = _signRegistration(1, agent1, "Bot", "gpt-4", PUBLIC_KEY);
        vm.prank(agent1);
        registry.registerAgent{value: 0.05 ether}("Bot", "gpt-4", "", PUBLIC_KEY, sig);

        vm.prank(agent1);
        registry.requestWithdrawal(0.04 ether);

        // Owner suspends — withdrawal auto-cancelled
        registry.suspendAgent(agent1);

        vm.warp(block.timestamp + 3 days + 1);

        vm.prank(agent1);
        vm.expectRevert("Aegent: no pending withdrawal");
        registry.executeWithdrawal();
    }

    function test_RevertWithdrawLowRep() public {
        bytes memory sig = _signRegistration(1, agent1, "Bot", "gpt-4", PUBLIC_KEY);
        vm.prank(agent1);
        registry.registerAgent{value: 0.05 ether}("Bot", "gpt-4", "", PUBLIC_KEY, sig);

        // Drop rep below 300
        for (uint256 i = 0; i < 11; i++) {
            registry.reportTaskOutcome(agent1, false);
        }
        // 500 - (11 * 20) = 280
        assertEq(registry.getAgent(agent1).reputationScore, 280);

        vm.prank(agent1);
        vm.expectRevert("Aegent: rep too low to withdraw");
        registry.requestWithdrawal(0.04 ether);
    }

    // ─── Helper ─────────────────────────────────────────────────────

    function _registerAgent1() internal {
        bytes memory sig = _signRegistration(1, agent1, "Bot-Alpha", "gpt-4", PUBLIC_KEY);
        vm.prank(agent1);
        registry.registerAgent{value: MIN_STAKE}("Bot-Alpha", "gpt-4", "", PUBLIC_KEY, sig);
    }

    function _registerAgent2() internal {
        bytes memory sig = _signRegistration(2, agent2, "Bot-Beta", "claude-3", PUBLIC_KEY);
        vm.prank(agent2);
        registry.registerAgent{value: MIN_STAKE}("Bot-Beta", "claude-3", "", PUBLIC_KEY, sig);
    }

    // Required to receive ETH from slashAgent
    receive() external payable {}
}
