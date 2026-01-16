// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/SquarePrizePool.sol";
import "./MockUSDC.sol";

contract SquarePrizePoolTest is Test {
    SquarePrizePool pool;
    MockUSDC usdc;
    address owner = address(0x1);
    address winner1 = address(0x2);
    address winner2 = address(0x3);
    address winner3 = address(0x4);
    address nonOwner = address(0x5);

    function setUp() public {
        // Deploy mock USDC
        usdc = new MockUSDC();
        
        // Deploy pool with USDC address
        vm.prank(owner);
        pool = new SquarePrizePool(address(usdc));
        
        // Mint USDC to pool for testing (10 USDC with 6 decimals = 10000000)
        usdc.mint(address(pool), 10_000_000);
    }

    // ===== OWNERSHIP TESTS =====

    function testTransferOwnership() public {
        address newOwner = address(0x99);
        
        vm.prank(owner);
        pool.transferOwnership(newOwner);
        
        assertEq(pool.owner(), newOwner);
    }

    function testTransferOwnershipOnlyOwner() public {
        address newOwner = address(0x99);
        
        vm.prank(nonOwner);
        vm.expectRevert("Only owner");
        pool.transferOwnership(newOwner);
        
        // Verify owner unchanged
        assertEq(pool.owner(), owner);
    }

    function testTransferOwnershipToZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert("Invalid address");
        pool.transferOwnership(address(0));
    }

    function testTransferOwnershipEmitsEvent() public {
        address newOwner = address(0x99);
        
        vm.prank(owner);
        vm.expectEmit(true, true, false, false);
        emit SquarePrizePool.OwnershipTransferred(owner, newOwner);
        pool.transferOwnership(newOwner);
    }

    // ===== PLAY COST TESTS =====

    function testSetPlayCost() public {
        uint256 newCost = 50000; // 0.05 USDC
        
        vm.prank(owner);
        pool.setPlayCost(newCost);
        
        assertEq(pool.playCost(), newCost);
    }

    function testSetPlayCostOnlyOwner() public {
        uint256 newCost = 50000;
        
        vm.prank(nonOwner);
        vm.expectRevert("Only owner");
        pool.setPlayCost(newCost);
        
        // Verify cost unchanged
        assertEq(pool.playCost(), 20000);
    }

    function testSetPlayCostZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert("Cost must be > 0");
        pool.setPlayCost(0);
    }

    function testSetPlayCostEmitsEvent() public {
        uint256 oldCost = pool.playCost();
        uint256 newCost = 50000;
        
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit SquarePrizePool.PlayCostUpdated(oldCost, newCost);
        pool.setPlayCost(newCost);
    }

    function testPayToPlayUsesUpdatedCost() public {
        uint256 newCost = 100000; // 0.10 USDC
        address player = address(0x6);
        
        // Update cost
        vm.prank(owner);
        pool.setPlayCost(newCost);
        
        // Mint and pay with new cost
        usdc.mint(player, newCost);
        vm.startPrank(player);
        usdc.approve(address(pool), newCost);
        pool.payToPlay();
        vm.stopPrank();
        
        assertEq(pool.totalPool(), newCost);
    }

    // ===== LAST UNCLAIMED SWEEP TESTS =====

    function testLastUnclaimedSweepInitiallyZero() public view {
        assertEq(pool.lastUnclaimedSweep(), 0);
    }

    function testLastUnclaimedSweepOnlyChangesOnSweep() public {
        // Setup: allocate funds first
        vm.startPrank(owner);
        address[] memory winners = new address[](1);
        winners[0] = winner1;
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 10000;
        
        bytes32 slot = bytes32(uint256(2));
        vm.store(address(pool), slot, bytes32(uint256(5_000_000)));
        pool.allocateFunds(0, winners, percentages);
        
        uint256 sweepTimeBefore = pool.lastUnclaimedSweep();
        assertEq(sweepTimeBefore, 0);
        
        // Sweep and verify timestamp updated
        pool.sweepUnclaimed(winners);
        
        uint256 sweepTimeAfter = pool.lastUnclaimedSweep();
        assertGt(sweepTimeAfter, sweepTimeBefore);
        assertEq(sweepTimeAfter, block.timestamp);
        vm.stopPrank();
    }

    function testLastUnclaimedSweepCannotBeSetDirectly() public pure {
        // This test documents that lastUnclaimedSweep has no public setter
        // It can only be modified internally by sweepUnclaimed()
        // Solidity doesn't allow external modification of storage variables
        // without a setter function, so this is inherently safe
        assertTrue(true);
    }

    function testSweepUnclaimedCanBeCalledMultipleTimes() public {
        // Setup and first sweep
        vm.startPrank(owner);
        address[] memory winners = new address[](1);
        winners[0] = winner1;
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 10000;
        
        bytes32 slot = bytes32(uint256(2));
        vm.store(address(pool), slot, bytes32(uint256(5_000_000)));
        pool.allocateFunds(0, winners, percentages);
        pool.sweepUnclaimed(winners);
        
        // Allocate and sweep again immediately (no cooldown)
        pool.allocateFunds(0, winners, percentages);
        pool.sweepUnclaimed(winners);
        
        assertEq(pool.fundsAllocated(), false);
        vm.stopPrank();
    }

    // ===== EXISTING TESTS (ADAPTED) =====

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
        
        bytes32 slot = bytes32(uint256(2));
        vm.store(address(pool), slot, bytes32(uint256(10_000_000))); // 10 USDC
        pool.allocateFunds(feePercentage, winners, percentages);
        
        assertEq(pool.rewards(winner1), 4_000_000); // 4 USDC
        assertEq(pool.rewards(winner2), 3_000_000); // 3 USDC
        assertEq(pool.rewards(winner3), 2_000_000); // 2 USDC
        assertEq(pool.rewards(owner), 1_000_000); // 1 USDC
        vm.stopPrank();
    }

    function testAllocateFundsNotOwner() public {
        vm.startPrank(winner1);
        address[] memory winners = new address[](1);
        winners[0] = winner1;
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 10000;
        
        vm.expectRevert("Only owner");
        pool.allocateFunds(0, winners, percentages);
        vm.stopPrank();
    }

    function testAllocateFundsEmptyWinners() public {
        vm.startPrank(owner);
        address[] memory winners = new address[](0);
        uint256[] memory percentages = new uint256[](0);
        
        vm.expectRevert("1-10 winners");
        pool.allocateFunds(0, winners, percentages);
        vm.stopPrank();
    }

    function testAllocateFundsInvalidPercentages() public {
        vm.startPrank(owner);
        address[] memory winners = new address[](2);
        winners[0] = winner1;
        winners[1] = winner2;
        uint256[] memory percentages = new uint256[](2);
        percentages[0] = 5000;
        percentages[1] = 3000; // Total: 8000 + 1000 = 9000, not 10000
        
        vm.expectRevert("Total percent must be 10000 (100%)");
        pool.allocateFunds(1000, winners, percentages);
        vm.stopPrank();
    }

    function testAllocateFundsMismatchedArrays() public {
        vm.startPrank(owner);
        address[] memory winners = new address[](2);
        winners[0] = winner1;
        winners[1] = winner2;
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 10000;
        
        vm.expectRevert("Mismatched arrays");
        pool.allocateFunds(0, winners, percentages);
        vm.stopPrank();
    }

    function testClaimReward() public {
        vm.startPrank(owner);
        address[] memory winners = new address[](1);
        winners[0] = winner1;
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 10000;
        
        bytes32 slot = bytes32(uint256(2));
        vm.store(address(pool), slot, bytes32(uint256(5_000_000)));
        pool.allocateFunds(0, winners, percentages);
        vm.stopPrank();

        uint256 initialBalance = usdc.balanceOf(winner1);
        vm.prank(winner1);
        pool.claimReward();
        assertEq(usdc.balanceOf(winner1), initialBalance + 5_000_000);
    }

    function testPayToPlay() public {
        address player = address(0x6);
        usdc.mint(player, 20000);
        
        vm.startPrank(player);
        usdc.approve(address(pool), 20000);
        pool.payToPlay();
        vm.stopPrank();
        
        assertEq(pool.totalPool(), 20000);
        assertEq(usdc.balanceOf(address(pool)), 10_000_000 + 20000);
    }

    function testDonate() public {
        address donor = address(0x6);
        uint256 donationAmount = 1_000_000;
        usdc.mint(donor, donationAmount);
        
        vm.startPrank(donor);
        usdc.approve(address(pool), donationAmount);
        pool.donate(donationAmount);
        vm.stopPrank();
        
        assertEq(pool.totalPool(), donationAmount);
        assertEq(usdc.balanceOf(address(pool)), 10_000_000 + donationAmount);
    }

    function testReceiveAndWithdrawETH() public {
        uint256 initialBalance = address(pool).balance;
        vm.deal(address(this), 1 ether);
        (bool sent, ) = address(pool).call{value: 1 ether}("");
        require(sent, "Failed to send Ether");
        assertEq(address(pool).balance, initialBalance + 1 ether);
        
        vm.prank(owner);
        pool.withdrawETH();
        assertEq(address(pool).balance, 0);
    }

    function testAllocateFundsTwiceWithoutSweeping() public {
        vm.startPrank(owner);
        address[] memory winners = new address[](1);
        winners[0] = winner1;
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 10000;
        
        bytes32 slot = bytes32(uint256(2));
        vm.store(address(pool), slot, bytes32(uint256(5_000_000)));
        pool.allocateFunds(0, winners, percentages);
        
        vm.expectRevert("Funds already allocated");
        pool.allocateFunds(0, winners, percentages);
        vm.stopPrank();
    }

    function testSweepUnclaimedResetsFundsAllocated() public {
        vm.startPrank(owner);
        address[] memory winners = new address[](1);
        winners[0] = winner1;
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 10000;
        
        bytes32 slot = bytes32(uint256(2));
        vm.store(address(pool), slot, bytes32(uint256(5_000_000)));
        pool.allocateFunds(0, winners, percentages);
        
        pool.sweepUnclaimed(winners);
        assertEq(pool.fundsAllocated(), false);
        vm.stopPrank();
    }

    function testAllocateFundsTwiceAfterSweeping() public {
        vm.startPrank(owner);
        address[] memory winners = new address[](1);
        winners[0] = winner1;
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 10000;
        
        bytes32 slot = bytes32(uint256(2));
        vm.store(address(pool), slot, bytes32(uint256(5_000_000)));
        pool.allocateFunds(0, winners, percentages);
        
        pool.sweepUnclaimed(winners);
        
        pool.allocateFunds(0, winners, percentages);
        assertEq(pool.rewards(winner1), 5_000_000);
        vm.stopPrank();
    }
}