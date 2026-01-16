// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract SquarePrizePool {
    address public owner;
    IERC20 public usdc;
    uint256 public totalPool;
    mapping(address => uint256) public rewards;
    bool public fundsAllocated;
    uint256 public lastUnclaimedSweep;
    uint256 public playCost = 20000; // 0.02 USDC (6 decimals)

    event FundsAllocated(address[] winners, uint256[] percentages, uint256 feePercentage, uint256 totalPool);
    event UnclaimedFundsSwept(address indexed winner, uint256 amount);
    event PlayerPaid(address indexed player, uint256 amount);
    event DonationReceived(address indexed donor, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PlayCostUpdated(uint256 oldCost, uint256 newCost);

    constructor(address usdcAddress) {
        owner = msg.sender;
        usdc = IERC20(usdcAddress);
    }

    // Transfer ownership to a new address
    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Only owner");
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // Update the play cost (only owner)
    function setPlayCost(uint256 newCost) external {
        require(msg.sender == owner, "Only owner");
        require(newCost > 0, "Cost must be > 0");
        emit PlayCostUpdated(playCost, newCost);
        playCost = newCost;
    }

    // Function for players to pay to play
    function payToPlay() external {
        require(usdc.transferFrom(msg.sender, address(this), playCost), "USDC transfer failed");
        totalPool += playCost;
        emit PlayerPaid(msg.sender, playCost);
    }

    // Function to accept USDC donations
    function donate(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(usdc.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");
        totalPool += amount;
        emit DonationReceived(msg.sender, amount);
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
            totalPool -= amount;
            rewards[winners[i]] += amount;
        }
        // Allocate fee to owner
        uint256 feeAmount = pool * feePercentage / 10000;
        rewards[owner] += feeAmount;
        totalPool -= feeAmount;
        fundsAllocated = true;
        emit FundsAllocated(winners, percentages, feePercentage, pool);
    }

    function claimReward() external {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No reward available");
        rewards[msg.sender] = 0;
        require(usdc.transfer(msg.sender, reward), "USDC transfer failed");
    }

    // Owner can reclaim unclaimed rewards to totalPool
    function sweepUnclaimed(address[] calldata winners) external {
        require(msg.sender == owner, "Only owner");
        for (uint i = 0; i < winners.length; i++) {
            uint256 amount = rewards[winners[i]];
            if (amount > 0) {
                rewards[winners[i]] = 0;
                totalPool += amount;
                emit UnclaimedFundsSwept(winners[i], amount);
            }
        }
        fundsAllocated = false;
        lastUnclaimedSweep = block.timestamp;
    }

    // Owner can withdraw ETH that was sent to the contract
    function withdrawETH() external {
        require(msg.sender == owner, "Only owner");
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        (bool sent, ) = payable(owner).call{value: balance}("");
        require(sent, "Failed to send ETH");
    }

    // Allow contract to receive ETH
    receive() external payable {}
}
