// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/TaskManager.sol";

contract DeployTaskManager is Script {
    function run() external {
        address registry = 0x2550610275e2D031041Bea1b56326af77314eCFC;

        vm.startBroadcast();
        TaskManager tm = new TaskManager(registry);
        vm.stopBroadcast();

        console.log("TaskManager deployed to:", address(tm));
    }
}
