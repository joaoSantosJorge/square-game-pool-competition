// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FlappyBirdPrizePool {
    address public owner;
    uint256 public totalPool;
    mapping(address => uint256) public rewards;
    bool public fundsAllocated;
    uint256 public lastUnclaimedSweep;

    event FundsAllocated(address[] winners, uint256[] percentages, uint256 feePercentage, uint256 totalPool);
    event UnclaimedFundsSwept(address indexed winner, uint256 amount);

    constructor() {
        owner = msg.sender;
    }


    function allocateFunds(
        uint256 feePercentage,
        address[] calldata winners,
        uint256[] calldata percentages
    ) external {
        require(msg.sender == owner, "Only owner");
        require(!fundsAllocated, "Funds already allocated");
        require(winners.length == percentages.length, "Mismatched arrays");
        require(winners.length > 0 && winners.length <= 10, "1-10 winners");
        uint256 totalPercent = feePercentage;
        for (uint i = 0; i < percentages.length; i++) {
            totalPercent += percentages[i];
        }
        require(totalPercent == 10000, "Total percent must be 10000 (100%)");

        uint256 pool = totalPool;
        // Allocate to winners
        for (uint i = 0; i < winners.length; i++) {
            uint256 amount = pool * percentages[i] / 10000;
            rewards[winners[i]] += amount;
        }
        // Allocate fee to owner
        uint256 feeAmount = pool * feePercentage / 10000;
        rewards[owner] += feeAmount;
        fundsAllocated = true;
        emit FundsAllocated(winners, percentages, feePercentage, pool);
    }

    function claimReward() external {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No reward available");
        rewards[msg.sender] = 0;
        (bool sent, ) = payable(msg.sender).call{value: reward}("");
        require(sent, "Failed to send reward");
    }

    // Owner can reclaim unclaimed rewards to totalPool after 7 days
    function sweepUnclaimed(address[] calldata winners) external {
        require(msg.sender == owner, "Only owner");
        require(block.timestamp >= lastUnclaimedSweep + 7 days, "Can only sweep every 7 days");
        for (uint i = 0; i < winners.length; i++) {
            uint256 amount = rewards[winners[i]];
            if (amount > 0) {
                rewards[winners[i]] = 0;
                totalPool += amount;
                emit UnclaimedFundsSwept(winners[i], amount);
            }
        }
        lastUnclaimedSweep = block.timestamp;
    }
}
