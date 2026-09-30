// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title IAegentVerifier
/// @notice Interface for the Rust PVM verifier contract (cross-VM bridge).
///         AgentRegistry.sol CALLS these functions.
///         aegent-verifier (Rust/PVM) IMPLEMENTS them.
interface IAegentVerifier {
    function verifyAndHash(bytes32 publicKey, bytes32 messageHash)
        external pure returns (bool valid, bytes32 agentHash);

    function computeAgentId(bytes32 publicKey, bytes32 salt)
        external pure returns (bytes32 agentId);
}
