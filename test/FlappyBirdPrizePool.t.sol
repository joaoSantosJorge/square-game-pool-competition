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

    //test alocateFunds - not message sender owner.
    function testAllocateFundsNotOwner() public {
        vm.startPrank(winner1);
        address[] memory winners = new address[](1);
        winners[0] = winner1;
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 10000; // 100%
        uint256 feePercentage = 0; // 0%
        vm.expectRevert("Only owner");
        pool.allocateFunds(feePercentage, winners, percentages);
        vm.stopPrank();
    }

    //test empty winners array.
    function testAllocateFundsEmptyWinners() public {
        vm.startPrank(owner);
        address[] memory winners = new address[](0);
        uint256[] memory percentages = new uint256[](0);
        uint256 feePercentage = 0; // 0%
        vm.expectRevert("1-10 winners");
        pool.allocateFunds(feePercentage, winners, percentages);
        vm.stopPrank();
    }

    //test percentages do not sum to 100%.
    function testAllocateFundsInvalidPercentages() public {
        vm.startPrank(owner);
        address[] memory winners = new address[](2);
        winners[0] = winner1;
        winners[1] = winner2;
        uint256[] memory percentages = new uint256[](2);
        percentages[0] = 5000; // 50%
        percentages[1] = 3000; // 40%
        uint256 feePercentage = 1000; // 10%
        vm.expectRevert("Total percent must be 10000 (100%)");
        pool.allocateFunds(feePercentage, winners, percentages);
        vm.stopPrank();
    }

    //test lists of different lengths.
    function testAllocateFundsMismatchedArrays() public {
        vm.startPrank(owner);
        address[] memory winners = new address[](2);
        winners[0] = winner1;
        winners[1] = winner2;
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 10000; // 100%
        uint256 feePercentage = 0; // 0%
        vm.expectRevert("Mismatched arrays");
        pool.allocateFunds(feePercentage, winners, percentages);
        vm.stopPrank();
    }

    function testClaimReward() public {
        vm.startPrank(owner);
        address[] memory winners = new address[](1);
        winners[0] = winner1;
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 10000; // 100%
        uint256 feePercentage = 0; // 0%
        // Set totalPool directly via cheatcode (slot 1: after owner)
        bytes32 slot = bytes32(uint256(1));
        // print value of totalPool
        console.log("totalPool:", pool.totalPool());
        vm.store(address(pool), slot, bytes32(uint256(5 ether)));
        console.log("totalPool:", pool.totalPool());
        pool.allocateFunds(feePercentage, winners, percentages);
        vm.stopPrank();

        uint256 initialBalance = address(winner1).balance;
        vm.prank(winner1);
        pool.claimReward();
        assertEq(address(winner1).balance, initialBalance + 5 ether);
    }

    //test pool receives usdc.
    function testReceiveFunds() public {
        uint256 initialBalance = address(pool).balance;
        vm.deal(address(this), 1 ether);
        (bool sent, ) = address(pool).call{value: 1 ether}("");
        require(sent, "Failed to send Ether");
        assertEq(address(pool).balance, initialBalance + 1 ether);
    }
   
}
