// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lib/forge-std/src/Test.sol";
import "../contracts/FlappyBirdPrizePool.sol";
import "./MockUSDC.sol";

contract FlappyBirdPrizePoolTest is Test {
    FlappyBirdPrizePool public pool;
    MockUSDC public usdc;
    address public admin;
    address public player1;
    address public player2;
    address public winner;

function setUp() public {
    admin = address(this);
    vm.prank(admin);
    usdc = new MockUSDC();
    pool = new FlappyBirdPrizePool(address(usdc));
    player1 = address(0x1);
    player2 = address(0x2);
    winner = address(0x3);
    usdc.mint(player1, 1e6); // 1 USDC
    usdc.mint(player2, 1e6);
}

    function testPlay() public {
        setUp();
        usdc.approve(address(pool), 2e4);
        pool.play();
        require(usdc.balanceOf(address(pool)) == 2e4, "Play failed");
    }

    function testSetFee() public {
        setUp();
        pool.setFee(15);
        require(pool.fee() == 15, "Fee not set");
    }

    function testPayout() public {
        setUp();
        usdc.approve(address(pool), 2e4);
        pool.play();
        // Simulate time passing
        pool.lastPayoutTimestamp() - pool.payoutInterval();
        usdc.mint(address(pool), 2e4); // Add funds for payout
        pool.setFee(10);
        pool.payout(winner);
        require(usdc.balanceOf(winner) == 18000, "Winner did not get correct amount");
        require(usdc.balanceOf(admin) == 2000, "Admin did not get correct amount");
    }
}
