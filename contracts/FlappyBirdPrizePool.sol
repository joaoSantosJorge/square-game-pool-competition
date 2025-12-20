// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract FlappyBirdPrizePool {
    address public admin;
    IERC20 public usdc;
    uint256 public constant PLAY_AMOUNT = 2e4; // 0.02 USDC (USDC has 6 decimals)
    uint256 public lastPayoutTimestamp;
    uint256 public payoutInterval = 30 days;
    uint256 public fee = 10; // fee percent (default 10%)

    event Played(address indexed player, uint256 amount);
    event Payout(address indexed winner, uint256 winnerAmount, address indexed admin, uint256 adminAmount);
    event FeeChanged(uint256 newFee);

    constructor(address _usdc) {
        admin = msg.sender;
        usdc = IERC20(_usdc);
        lastPayoutTimestamp = block.timestamp;
    }

    function setFee(uint256 newFee) external {
        require(msg.sender == admin, "Only admin");
        require(newFee <= 100, "Fee too high");
        fee = newFee;
        emit FeeChanged(newFee);
    }

    function play() external {
        require(usdc.transferFrom(msg.sender, address(this), PLAY_AMOUNT), "USDC transfer failed");
        emit Played(msg.sender, PLAY_AMOUNT);
    }

    // Admin sets the winner (top leaderboard address) and triggers payout
    function payout(address winner) external {
        require(msg.sender == admin, "Only admin");
        require(block.timestamp >= lastPayoutTimestamp + payoutInterval, "Too early");

        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "Nothing to payout");

        uint256 adminShare = (balance * fee) / 100;
        uint256 winnerShare = balance - adminShare;

        require(usdc.transfer(winner, winnerShare), "Winner transfer failed");
        require(usdc.transfer(admin, adminShare), "Admin transfer failed");

        lastPayoutTimestamp = block.timestamp;
        emit Payout(winner, winnerShare, admin, adminShare);
    }
}
