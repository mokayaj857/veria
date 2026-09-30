// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";

contract RegisterAgent is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address sender = vm.addr(pk);
        address registry = vm.envAddress("REGISTRY");

        string memory name = "AegentBot-Alpha";
        string memory model = "gpt-4-turbo";
        string memory metadata = '{"description":"AI trading agent","capabilities":["trading","analysis"],"registeredVia":"forge-script","version":"1.0.0"}';
        bytes32 publicKey = keccak256(abi.encodePacked("aegent:", sender, ":", name, ":", model));

        // This matches the contract's _verifyECDSA exactly
        bytes32 messageHash = keccak256(abi.encodePacked(sender, name, model, publicKey));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, ethSignedHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        console.log("Sender:", sender);
        console.log("PublicKey:", vm.toString(publicKey));
        console.log("MessageHash:", vm.toString(messageHash));

        vm.startBroadcast(pk);
        AgentRegistry(registry).registerAgent{value: 0.01 ether}(
            name, model, metadata, publicKey, signature
        );
        vm.stopBroadcast();

        console.log("Agent registered!");
    }
}
