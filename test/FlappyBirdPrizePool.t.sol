// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/FlappyBirdPrizePool.sol";
import "./MockUSDC.sol";

contract FlappyBirdPrizePoolTest is Test {
    FlappyBirdPrizePool pool;
    MockUSDC usdc;
    address owner = address(0x1);
    address winner1 = address(0x2);
    address winner2 = address(0x3);
    address winner3 = address(0x4);

    function setUp() public {
        // Deploy mock USDC
        usdc = new MockUSDC();
        
        // Deploy pool with USDC address
        vm.prank(owner);
        pool = new FlappyBirdPrizePool(address(usdc));
        
        // Mint USDC to pool for testing (10 USDC with 6 decimals = 10000000)
        usdc.mint(address(pool), 10_000_000);
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
        // Set totalPool directly via cheatcode (slot 2: after owner and usdc)
        bytes32 slot = bytes32(uint256(2));
        vm.store(address(pool), slot, bytes32(uint256(10_000_000))); // 10 USDC
        pool.allocateFunds(feePercentage, winners, percentages);
        assertEq(pool.rewards(winner1), 4_000_000); // 4 USDC
        assertEq(pool.rewards(winner2), 3_000_000); // 3 USDC
        assertEq(pool.rewards(winner3), 2_000_000); // 2 USDC
        assertEq(pool.rewards(owner), 1_000_000); // 1 USDC
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
        // Set totalPool directly via cheatcode (slot 2: after owner and usdc)
        bytes32 slot = bytes32(uint256(2));
        vm.store(address(pool), slot, bytes32(uint256(5_000_000))); // 5 USDC
        pool.allocateFunds(feePercentage, winners, percentages);
        vm.stopPrank();

        uint256 initialBalance = usdc.balanceOf(winner1);
        vm.prank(winner1);
        pool.claimReward();
        assertEq(usdc.balanceOf(winner1), initialBalance + 5_000_000); // 5 USDC
    }

    // Test pool receives USDC via payToPlay
    function testPayToPlay() public {
        address player = address(0x5);
        usdc.mint(player, 20000); // 0.02 USDC
        
        vm.startPrank(player);
        usdc.approve(address(pool), 20000);
        pool.payToPlay();
        vm.stopPrank();
        
        assertEq(pool.totalPool(), 20000); // 0.02 USDC
        assertEq(usdc.balanceOf(address(pool)), 10_000_000 + 20000);
    }
    
    // Test pool receives USDC via donate
    function testDonate() public {
        address donor = address(0x6);
        uint256 donationAmount = 1_000_000; // 1 USDC
        usdc.mint(donor, donationAmount);
        
        vm.startPrank(donor);
        usdc.approve(address(pool), donationAmount);
        pool.donate(donationAmount);
        vm.stopPrank();
        
        assertEq(pool.totalPool(), donationAmount);
        assertEq(usdc.balanceOf(address(pool)), 10_000_000 + donationAmount);
    }
    
    // Test pool can still receive ETH and owner can withdraw it
    function testReceiveAndWithdrawETH() public {
        uint256 initialBalance = address(pool).balance;
        vm.deal(address(this), 1 ether);
        (bool sent, ) = address(pool).call{value: 1 ether}("");
        require(sent, "Failed to send Ether");
        assertEq(address(pool).balance, initialBalance + 1 ether);
        
        // Owner withdraws ETH
        vm.prank(owner);
        pool.withdrawETH();
        assertEq(address(pool).balance, 0);
    }

    // test two allocateFunds calls without sweeping
    function testAllocateFundsTwiceWithoutSweeping() public {
        vm.startPrank(owner);
        address[] memory winners = new address[](1);
        winners[0] = winner1;
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 10000; // 100%
        uint256 feePercentage = 0; // 0%
        // Set totalPool directly via cheatcode (slot 2: after owner and usdc)
        bytes32 slot = bytes32(uint256(2));
        vm.store(address(pool), slot, bytes32(uint256(5_000_000))); // 5 USDC
        pool.allocateFunds(feePercentage, winners, percentages);
        
        // Attempt to allocate again without sweeping
        vm.expectRevert("Funds already allocated");
        pool.allocateFunds(feePercentage, winners, percentages);
        vm.stopPrank();
    }

    //test sweepUnclaimed resets fundsAllocated to false
    function testSweepUnclaimedResetsFundsAllocated() public {
        vm.startPrank(owner);
        address[] memory winners = new address[](1);
        winners[0] = winner1;
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 10000; // 100%
        uint256 feePercentage = 0; // 0%
        // Set totalPool directly via cheatcode (slot 2: after owner and usdc)
        bytes32 slot = bytes32(uint256(2));
        vm.store(address(pool), slot, bytes32(uint256(5_000_000))); // 5 USDC
        pool.allocateFunds(feePercentage, winners, percentages);
        // Move time forward by 8 days
        vm.warp(block.timestamp + 8 days);
        pool.sweepUnclaimed(winners);
        assertEq(pool.fundsAllocated(), false);
        vm.stopPrank();
    }

    //test two allocateFunds calls after sweeping
    function testAllocateFundsTwiceAfterSweeping() public {
        vm.startPrank(owner);
        address[] memory winners = new address[](1);
        winners[0] = winner1;
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 10000; // 100%
        uint256 feePercentage = 0; // 0%
        // Set totalPool directly via cheatcode (slot 2: after owner and usdc)
        bytes32 slot = bytes32(uint256(2));
        vm.store(address(pool), slot, bytes32(uint256(5_000_000))); // 5 USDC
        pool.allocateFunds(feePercentage, winners, percentages);
        // Move time forward by 8 days
        vm.warp(block.timestamp + 8 days);
        pool.sweepUnclaimed(winners);
        // Allocate again after sweeping
        pool.allocateFunds(feePercentage, winners, percentages);
        assertEq(pool.rewards(winner1), 5_000_000); // 5 USDC
        vm.stopPrank();


        //invariant: totalPool amount is correct after allocations and sweeps
    }
}