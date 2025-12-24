// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/FlappyBirdPrizePool.sol";

contract FlappyBirdPrizePoolTest is Test {
    FlappyBirdPrizePool pool;
    address owner = address(0x1);
    address winner1 = address(0x2);
    address winner2 = address(0x3);
    address winner3 = address(0x4);

    function setUp() public {
        vm.prank(owner);
        pool = new FlappyBirdPrizePool();
        vm.deal(address(pool), 10 ether);
        pool.totalPool(); // just to avoid unused warning
    }

    function testAllocateFunds() public {
        vm.startPrank(owner);
        address[] memory winners = new address[](3);
        winners[0] = winner1;
        winners[1] = winner2;
        winners[2] = winner3;
        uint256[] memory percentages = new uint256[](3);
        percentages[0] = 4000; // 40%
        percentages[1] = 3000; // 30%
        percentages[2] = 2000; // 20%
        uint256 feePercentage = 1000; // 10%
        // Set totalPool directly via cheatcode (slot 1: after owner)
        bytes32 slot = bytes32(uint256(1));
        vm.store(address(pool), slot, bytes32(uint256(10 ether)));
        pool.allocateFunds(feePercentage, winners, percentages);
        assertEq(pool.rewards(winner1), 4 ether);
        assertEq(pool.rewards(winner2), 3 ether);
        assertEq(pool.rewards(winner3), 2 ether);
        assertEq(pool.rewards(owner), 1 ether);
        vm.stopPrank();
    }

    //test edge cases.
    //test failures.
    
}
