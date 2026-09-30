// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AgentRegistry.sol";

/// @title TaskManager
/// @notice Dummy DApp that assigns tasks to AI agents and reports outcomes
///         to AgentRegistry. Demonstrates cross-contract integration.
contract TaskManager {

    AgentRegistry public immutable registry;

    enum TaskStatus { Open, Completed, Failed }

    struct Task {
        address assignedAgent;
        string description;
        TaskStatus status;
        uint256 createdAt;
    }

    Task[] public tasks;

    event TaskCreated(uint256 indexed taskId, address indexed agent, string description);
    event TaskCompleted(uint256 indexed taskId, address indexed agent, bool success);

    constructor(address _registry) {
        registry = AgentRegistry(payable(_registry));
    }

    /// @notice Create a task and assign it to a verified agent.
    function createTask(address _agent, string calldata _description) external {
        require(registry.isVerifiedAgent(_agent), "TaskManager: agent not verified");
        require(bytes(_description).length > 0, "TaskManager: empty description");

        uint256 taskId = tasks.length;
        tasks.push(Task({
            assignedAgent: _agent,
            description: _description,
            status: TaskStatus.Open,
            createdAt: block.timestamp
        }));

        emit TaskCreated(taskId, _agent, _description);
    }

    /// @notice Complete a task. Only the assigned agent can call this.
    ///         Reports outcome to AgentRegistry automatically.
    function completeTask(uint256 _taskId, bool _success) external {
        require(_taskId < tasks.length, "TaskManager: invalid task");
        Task storage task = tasks[_taskId];
        require(task.status == TaskStatus.Open, "TaskManager: task not open");
        require(msg.sender == task.assignedAgent, "TaskManager: not assigned agent");

        task.status = _success ? TaskStatus.Completed : TaskStatus.Failed;

        // Cross-contract call: report to AgentRegistry
        registry.reportTaskOutcome(msg.sender, _success);

        emit TaskCompleted(_taskId, msg.sender, _success);
    }

    function getTaskCount() external view returns (uint256) {
        return tasks.length;
    }
}
