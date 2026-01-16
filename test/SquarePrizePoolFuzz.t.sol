// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/SquarePrizePool.sol";
import "./MockUSDC.sol";

/**
 * @title SquarePrizePoolFuzzTest
 * @notice Fuzz tests for allocateFunds function
 * 
 * CONTRACT BEHAVIOR:
 * The allocateFunds function:
 * - Subtracts winner rewards from totalPool
 * - Subtracts fee from totalPool
 * - All funds are accounted for: rewards[winners] + rewards[owner] + totalPool = original pool
 * 
 * This means after allocation:
 * - totalPool = rounding_dust only (minimal, bounded by numWinners + 1)
 */
contract SquarePrizePoolFuzzTest is Test {
    SquarePrizePool pool;
    MockUSDC usdc;
    address owner = address(this); // Test contract is the owner
    
    // Pre-defined winner addresses
    address[] winnerAddresses;

    function setUp() public {
        usdc = new MockUSDC();
        
        // Test contract deploys and owns the pool
        pool = new SquarePrizePool(address(usdc));
        
        // Create 10 winner addresses
        for (uint i = 0; i < 10; i++) {
            winnerAddresses.push(address(uint160(0x100 + i)));
        }
    }
    
    // Helper to create a fresh pool owned by this test contract
    function createFreshPool() internal returns (SquarePrizePool) {
        return new SquarePrizePool(address(usdc));
    }

    // ===== HELPER: Calculate percentages (mirrors cycleManager.js) =====
    
    function calculatePercentages(uint256 numWinners, uint256 feePercentage) 
        internal 
        pure 
        returns (uint256[] memory) 
    {
        require(numWinners >= 1 && numWinners <= 10, "Invalid numWinners");
        
        uint256[] memory percentages = new uint256[](numWinners);
        uint256 totalForWinners = 10000 - feePercentage;

        if (numWinners == 1) {
            percentages[0] = totalForWinners;
        } else if (numWinners == 2) {
            percentages[0] = (totalForWinners * 70) / 100;
            percentages[1] = (totalForWinners * 30) / 100;
        } else if (numWinners == 3) {
            percentages[0] = (totalForWinners * 60) / 100;
            percentages[1] = (totalForWinners * 30) / 100;
            percentages[2] = (totalForWinners * 10) / 100;
        } else if (numWinners == 4) {
            percentages[0] = (totalForWinners * 60) / 100;
            percentages[1] = (totalForWinners * 25) / 100;
            percentages[2] = (totalForWinners * 10) / 100;
            percentages[3] = (totalForWinners * 5) / 100;
        } else if (numWinners == 5) {
            percentages[0] = (totalForWinners * 50) / 100;
            percentages[1] = (totalForWinners * 25) / 100;
            percentages[2] = (totalForWinners * 15) / 100;
            percentages[3] = (totalForWinners * 7) / 100;
            percentages[4] = (totalForWinners * 3) / 100;
        } else if (numWinners == 6) {
            percentages[0] = (totalForWinners * 40) / 100;
            percentages[1] = (totalForWinners * 25) / 100;
            percentages[2] = (totalForWinners * 15) / 100;
            percentages[3] = (totalForWinners * 10) / 100;
            percentages[4] = (totalForWinners * 6) / 100;
            percentages[5] = (totalForWinners * 4) / 100;
        } else if (numWinners == 7) {
            percentages[0] = (totalForWinners * 35) / 100;
            percentages[1] = (totalForWinners * 25) / 100;
            percentages[2] = (totalForWinners * 15) / 100;
            percentages[3] = (totalForWinners * 10) / 100;
            percentages[4] = (totalForWinners * 8) / 100;
            percentages[5] = (totalForWinners * 4) / 100;
            percentages[6] = (totalForWinners * 3) / 100;
        } else if (numWinners == 8) {
            percentages[0] = (totalForWinners * 30) / 100;
            percentages[1] = (totalForWinners * 25) / 100;
            percentages[2] = (totalForWinners * 15) / 100;
            percentages[3] = (totalForWinners * 10) / 100;
            percentages[4] = (totalForWinners * 10) / 100;
            percentages[5] = (totalForWinners * 5) / 100;
            percentages[6] = (totalForWinners * 3) / 100;
            percentages[7] = (totalForWinners * 2) / 100;
        } else if (numWinners == 9) {
            percentages[0] = (totalForWinners * 28) / 100;
            percentages[1] = (totalForWinners * 25) / 100;
            percentages[2] = (totalForWinners * 15) / 100;
            percentages[3] = (totalForWinners * 10) / 100;
            percentages[4] = (totalForWinners * 10) / 100;
            percentages[5] = (totalForWinners * 6) / 100;
            percentages[6] = (totalForWinners * 3) / 100;
            percentages[7] = (totalForWinners * 2) / 100;
            percentages[8] = (totalForWinners * 1) / 100;
        } else if (numWinners == 10) {
            percentages[0] = (totalForWinners * 25) / 100;
            percentages[1] = (totalForWinners * 20) / 100;
            percentages[2] = (totalForWinners * 15) / 100;
            percentages[3] = (totalForWinners * 10) / 100;
            percentages[4] = (totalForWinners * 10) / 100;
            percentages[5] = (totalForWinners * 7) / 100;
            percentages[6] = (totalForWinners * 5) / 100;
            percentages[7] = (totalForWinners * 4) / 100;
            percentages[8] = (totalForWinners * 3) / 100;
            percentages[9] = (totalForWinners * 1) / 100;
        }

        // Adjust last percentage to ensure total is exactly (10000 - feePercentage)
        uint256 sum = 0;
        for (uint i = 0; i < percentages.length; i++) {
            sum += percentages[i];
        }
        percentages[percentages.length - 1] += (totalForWinners - sum);

        return percentages;
    }

    // ===== TEST: Percentages always sum to 100% =====

    function testFuzz_PercentagesSumTo100(uint8 numWinnersRaw, uint8 feeMultiplierRaw) public pure {
        // Bound numWinners to 1-10
        uint256 numWinners = bound(uint256(numWinnersRaw), 1, 10);
        
        // Fee in multiples of 5% (0%, 5%, 10%, ... 45%)
        // feeMultiplier: 0-9 => fee: 0, 500, 1000, ... 4500
        uint256 feeMultiplier = bound(uint256(feeMultiplierRaw), 0, 9);
        uint256 feePercentage = feeMultiplier * 500;

        uint256[] memory percentages = calculatePercentages(numWinners, feePercentage);

        // Sum percentages
        uint256 totalPercent = feePercentage;
        for (uint i = 0; i < percentages.length; i++) {
            totalPercent += percentages[i];
        }

        // Must equal exactly 10000 (100%)
        assertEq(totalPercent, 10000, "Total percent must be 10000");
    }

    // ===== TEST: Allocation with fuzzed totalPool =====
    // Contract subtracts both winner rewards AND fee from totalPool
    // So totalPool after allocation = rounding dust only

    function testFuzz_AllocateFundsWithDifferentPools(
        uint256 totalPoolRaw,
        uint8 numWinnersRaw,
        uint8 feeMultiplierRaw
    ) public {
        // Bound totalPool: 1 USDC to 1,000,000 USDC (in 6 decimals)
        uint256 totalPoolAmount = bound(totalPoolRaw, 1_000_000, 1_000_000_000_000);
        
        // Bound numWinners to 1-10
        uint256 numWinners = bound(uint256(numWinnersRaw), 1, 10);
        
        // Fee in multiples of 5% (0%, 5%, 10%, ... 45%)
        uint256 feeMultiplier = bound(uint256(feeMultiplierRaw), 0, 9);
        uint256 feePercentage = feeMultiplier * 500;

        // Setup: mint USDC to pool and set totalPool
        usdc.mint(address(pool), totalPoolAmount);
        bytes32 slot = bytes32(uint256(2)); // totalPool slot
        vm.store(address(pool), slot, bytes32(totalPoolAmount));

        // Build winners array
        address[] memory winners = new address[](numWinners);
        for (uint i = 0; i < numWinners; i++) {
            winners[i] = winnerAddresses[i];
        }

        // Calculate percentages
        uint256[] memory percentages = calculatePercentages(numWinners, feePercentage);

        // Execute allocation (this contract is owner)
        pool.allocateFunds(feePercentage, winners, percentages);

        // Calculate total allocated
        uint256 totalAllocated = 0;
        
        // Check winner rewards
        for (uint i = 0; i < numWinners; i++) {
            uint256 expectedReward = (totalPoolAmount * percentages[i]) / 10000;
            uint256 actualReward = pool.rewards(winners[i]);
            assertEq(actualReward, expectedReward, "Winner reward mismatch");
            totalAllocated += actualReward;
        }

        // Check owner fee
        uint256 expectedFee = (totalPoolAmount * feePercentage) / 10000;
        uint256 ownerReward = pool.rewards(address(this));
        assertEq(ownerReward, expectedFee, "Owner fee mismatch");
        totalAllocated += ownerReward;

        // Remaining in pool = dust only (both winners and fee subtracted)
        uint256 dust = pool.totalPool();
        
        // Total accounted = allocated + dust should equal original pool
        assertEq(totalAllocated + dust, totalPoolAmount, "Funds not fully accounted");
        
        // Dust should be minimal (numWinners + 1 divisions max)
        assertLe(dust, numWinners + 1, "Too much rounding dust");
    }

    // ===== TEST: No funds lost during allocation =====
    // Verifies that: all_rewards + remaining_pool = original (conservation)

    function testFuzz_NoFundsLost(
        uint256 totalPoolRaw,
        uint8 numWinnersRaw,
        uint8 feeMultiplierRaw
    ) public {
        uint256 totalPoolAmount = bound(totalPoolRaw, 1_000_000, 1_000_000_000_000);
        uint256 numWinners = bound(uint256(numWinnersRaw), 1, 10);
        uint256 feeMultiplier = bound(uint256(feeMultiplierRaw), 0, 9);
        uint256 feePercentage = feeMultiplier * 500;

        // Setup
        usdc.mint(address(pool), totalPoolAmount);
        bytes32 slot = bytes32(uint256(2));
        vm.store(address(pool), slot, bytes32(totalPoolAmount));

        address[] memory winners = new address[](numWinners);
        for (uint i = 0; i < numWinners; i++) {
            winners[i] = winnerAddresses[i];
        }
        uint256[] memory percentages = calculatePercentages(numWinners, feePercentage);

        // Record USDC balance before
        uint256 contractBalanceBefore = usdc.balanceOf(address(pool));

        // Execute
        pool.allocateFunds(feePercentage, winners, percentages);

        // USDC balance should not change (no actual transfers during allocation)
        uint256 contractBalanceAfter = usdc.balanceOf(address(pool));
        assertEq(contractBalanceAfter, contractBalanceBefore, "USDC balance changed during allocation");

        // Sum all rewards (winners + owner)
        uint256 totalRewards = pool.rewards(address(this)); // owner fee
        for (uint i = 0; i < numWinners; i++) {
            totalRewards += pool.rewards(winners[i]);
        }

        // Check conservation: all_rewards + remaining = original
        uint256 remaining = pool.totalPool();
        assertEq(totalRewards + remaining, totalPoolAmount, "Funds conservation violated");
        
        // Check fee is correctly allocated to owner
        uint256 expectedFee = (totalPoolAmount * feePercentage) / 10000;
        assertEq(pool.rewards(address(this)), expectedFee, "Owner fee incorrect");
    }

    // ===== TEST: Specific fee percentages (5% increments) =====

    function testFuzz_FeePercentageMultiplesOf5(
        uint256 totalPoolRaw,
        uint8 numWinnersRaw,
        uint8 feeIndexRaw
    ) public {
        uint256 totalPoolAmount = bound(totalPoolRaw, 1_000_000, 100_000_000_000);
        uint256 numWinners = bound(uint256(numWinnersRaw), 1, 10);
        
        // Valid fee indices: 0-9 => 0%, 5%, 10%, 15%, 20%, 25%, 30%, 35%, 40%, 45%
        uint256 feeIndex = bound(uint256(feeIndexRaw), 0, 9);
        uint256 feePercentage = feeIndex * 500;

        // Setup
        usdc.mint(address(pool), totalPoolAmount);
        bytes32 slot = bytes32(uint256(2));
        vm.store(address(pool), slot, bytes32(totalPoolAmount));

        address[] memory winners = new address[](numWinners);
        for (uint i = 0; i < numWinners; i++) {
            winners[i] = winnerAddresses[i];
        }
        uint256[] memory percentages = calculatePercentages(numWinners, feePercentage);

        // Verify percentages sum to 10000
        uint256 totalPercent = feePercentage;
        for (uint i = 0; i < percentages.length; i++) {
            totalPercent += percentages[i];
        }
        assertEq(totalPercent, 10000, "Percentages don't sum to 100%");

        // Execute
        pool.allocateFunds(feePercentage, winners, percentages);

        // Verify fee calculation
        uint256 expectedFee = (totalPoolAmount * feePercentage) / 10000;
        assertEq(pool.rewards(address(this)), expectedFee, "Fee calculation incorrect");
    }

    // ===== TEST: Edge case - Single winner, 0% fee =====

    function testFuzz_SingleWinnerZeroFee(uint256 totalPoolRaw) public {
        uint256 totalPoolAmount = bound(totalPoolRaw, 1_000_000, 1_000_000_000_000);
        uint256 feePercentage = 0; // 0% fee
        uint256 numWinners = 1;

        usdc.mint(address(pool), totalPoolAmount);
        bytes32 slot = bytes32(uint256(2));
        vm.store(address(pool), slot, bytes32(totalPoolAmount));

        address[] memory winners = new address[](numWinners);
        winners[0] = winnerAddresses[0];
        uint256[] memory percentages = calculatePercentages(numWinners, feePercentage);

        // Single winner with 0% fee should get 100%
        assertEq(percentages[0], 10000, "Single winner should get 100%");

        pool.allocateFunds(feePercentage, winners, percentages);

        // Winner should get everything
        assertEq(pool.rewards(winners[0]), totalPoolAmount, "Winner should get entire pool");
        assertEq(pool.rewards(address(this)), 0, "Owner should get nothing with 0% fee");
        assertEq(pool.totalPool(), 0, "Pool should be empty");
    }

    // ===== TEST: Edge case - Maximum fee (45%) =====

    function testFuzz_MaximumFee(uint256 totalPoolRaw, uint8 numWinnersRaw) public {
        uint256 totalPoolAmount = bound(totalPoolRaw, 1_000_000, 1_000_000_000_000);
        uint256 numWinners = bound(uint256(numWinnersRaw), 1, 10);
        uint256 feePercentage = 4500; // 45% fee (maximum in our 5% increments)

        usdc.mint(address(pool), totalPoolAmount);
        bytes32 slot = bytes32(uint256(2));
        vm.store(address(pool), slot, bytes32(totalPoolAmount));

        address[] memory winners = new address[](numWinners);
        for (uint i = 0; i < numWinners; i++) {
            winners[i] = winnerAddresses[i];
        }
        uint256[] memory percentages = calculatePercentages(numWinners, feePercentage);

        pool.allocateFunds(feePercentage, winners, percentages);

        // Owner should get 45%
        uint256 expectedFee = (totalPoolAmount * 4500) / 10000;
        assertEq(pool.rewards(address(this)), expectedFee, "Owner should get 45%");

        // Sum winner rewards
        uint256 totalWinnerRewards = 0;
        for (uint i = 0; i < numWinners; i++) {
            totalWinnerRewards += pool.rewards(winners[i]);
        }
        
        // Winners share remaining 55%
        uint256 expectedWinnerTotal = (totalPoolAmount * 5500) / 10000;
        // Allow for rounding: actual should be within numWinners of expected
        assertApproxEqAbs(totalWinnerRewards, expectedWinnerTotal, numWinners, "Winner total mismatch");
        
        // Conservation check: all rewards + dust = original
        uint256 dust = pool.totalPool();
        assertEq(totalWinnerRewards + expectedFee + dust, totalPoolAmount, "Funds not conserved");
    }

    // ===== TEST: Rounding dust accumulation =====
    // Dust = remaining pool = rounding errors from all divisions (winners + fee)

    function testFuzz_RoundingDustIsMinimal(
        uint256 totalPoolRaw,
        uint8 numWinnersRaw,
        uint8 feeMultiplierRaw
    ) public {
        // Allow very small pools to test edge cases
        uint256 totalPoolAmount = bound(totalPoolRaw, 100, 1_000_000_000_000);
        uint256 numWinners = bound(uint256(numWinnersRaw), 1, 10);
        uint256 feeMultiplier = bound(uint256(feeMultiplierRaw), 0, 9);
        uint256 feePercentage = feeMultiplier * 500;

        usdc.mint(address(pool), totalPoolAmount);
        bytes32 slot = bytes32(uint256(2));
        vm.store(address(pool), slot, bytes32(totalPoolAmount));

        address[] memory winners = new address[](numWinners);
        for (uint i = 0; i < numWinners; i++) {
            winners[i] = winnerAddresses[i];
        }
        uint256[] memory percentages = calculatePercentages(numWinners, feePercentage);

        pool.allocateFunds(feePercentage, winners, percentages);

        // Dust = remaining pool (now that fee is also subtracted)
        uint256 dust = pool.totalPool();
        
        // Dust should be bounded by number of divisions (numWinners + 1 for fee)
        // Each division can lose at most 1 unit
        assertLe(dust, numWinners + 1, "Dust exceeds acceptable limit");
    }

    // ===== TEST: Specific scenarios from calculatePercentages =====
    // Contract subtracts both winner rewards AND fee from totalPool

    function test_ThreeWinners10PercentFee() public {
        uint256 totalPoolAmount = 10_000_000; // 10 USDC
        uint256 feePercentage = 1000; // 10%
        uint256 numWinners = 3;

        usdc.mint(address(pool), totalPoolAmount);
        bytes32 slot = bytes32(uint256(2));
        vm.store(address(pool), slot, bytes32(totalPoolAmount));

        address[] memory winners = new address[](numWinners);
        winners[0] = winnerAddresses[0];
        winners[1] = winnerAddresses[1];
        winners[2] = winnerAddresses[2];
        
        uint256[] memory percentages = calculatePercentages(numWinners, feePercentage);
        
        // Expected: 60%, 30%, 10% of 90% (after 10% fee)
        // totalForWinners = 9000
        // winner1: 9000 * 60 / 100 = 5400
        // winner2: 9000 * 30 / 100 = 2700
        // winner3: 9000 * 10 / 100 = 900
        assertEq(percentages[0], 5400, "Winner 1 percentage incorrect");
        assertEq(percentages[1], 2700, "Winner 2 percentage incorrect");
        assertEq(percentages[2], 900, "Winner 3 percentage incorrect");

        pool.allocateFunds(feePercentage, winners, percentages);

        // Verify exact allocations
        // 10 USDC * 54% = 5.4 USDC = 5,400,000
        assertEq(pool.rewards(winners[0]), 5_400_000, "Winner 1 reward incorrect");
        // 10 USDC * 27% = 2.7 USDC = 2,700,000
        assertEq(pool.rewards(winners[1]), 2_700_000, "Winner 2 reward incorrect");
        // 10 USDC * 9% = 0.9 USDC = 900,000
        assertEq(pool.rewards(winners[2]), 900_000, "Winner 3 reward incorrect");
        // 10 USDC * 10% = 1 USDC = 1,000,000
        assertEq(pool.rewards(address(this)), 1_000_000, "Owner fee incorrect");
        
        // Remaining = original - winner_allocations - fee = 0 (with clean numbers)
        assertEq(pool.totalPool(), 0, "Should have no dust with clean numbers");
        
        // Conservation: all rewards + remaining = original
        uint256 totalRewards = pool.rewards(winners[0]) + pool.rewards(winners[1]) + pool.rewards(winners[2]) + pool.rewards(address(this));
        assertEq(totalRewards + pool.totalPool(), totalPoolAmount, "Conservation violated");
    }

    // ===== TEST: Invalid percentages should fail =====

    function testFuzz_InvalidPercentagesFail(uint256 wrongPercent) public {
        // Bound to invalid values (not summing to 10000 - fee)
        wrongPercent = bound(wrongPercent, 1, 9999);
        
        uint256 totalPoolAmount = 10_000_000;
        usdc.mint(address(pool), totalPoolAmount);
        bytes32 slot = bytes32(uint256(2));
        vm.store(address(pool), slot, bytes32(totalPoolAmount));

        address[] memory winners = new address[](1);
        winners[0] = winnerAddresses[0];
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = wrongPercent; // Invalid: doesn't sum to 10000

        vm.expectRevert("Total percent must be 10000 (100%)");
        pool.allocateFunds(0, winners, percentages);
    }

    // ===== TEST: All winner counts with standard 10% fee =====

    function test_AllWinnerCountsWithStandardFee() public {
        uint256 feePercentage = 1000; // 10%
        
        for (uint256 numWinners = 1; numWinners <= 10; numWinners++) {
            // Reset pool state for each test - create fresh pool owned by this contract
            pool = createFreshPool();
            
            uint256 totalPoolAmount = 100_000_000; // 100 USDC
            usdc.mint(address(pool), totalPoolAmount);
            bytes32 slot = bytes32(uint256(2));
            vm.store(address(pool), slot, bytes32(totalPoolAmount));

            address[] memory winners = new address[](numWinners);
            for (uint i = 0; i < numWinners; i++) {
                winners[i] = winnerAddresses[i];
            }
            
            uint256[] memory percentages = calculatePercentages(numWinners, feePercentage);
            
            // Verify sum
            uint256 sum = feePercentage;
            for (uint i = 0; i < percentages.length; i++) {
                sum += percentages[i];
            }
            assertEq(sum, 10000, string(abi.encodePacked("Sum incorrect for ", vm.toString(numWinners), " winners")));

            // Execute (this contract is owner)
            pool.allocateFunds(feePercentage, winners, percentages);

            // Verify conservation: all_rewards + remaining = original
            uint256 totalRewards = pool.rewards(address(this)); // owner fee
            for (uint i = 0; i < numWinners; i++) {
                totalRewards += pool.rewards(winners[i]);
            }
            
            uint256 remaining = pool.totalPool();
            assertEq(totalRewards + remaining, totalPoolAmount, 
                string(abi.encodePacked("Conservation violated for ", vm.toString(numWinners), " winners")));
            
            // Verify dust is minimal (remaining should be small)
            assertLe(remaining, numWinners + 1, 
                string(abi.encodePacked("Too much dust for ", vm.toString(numWinners), " winners")));
        }
    }
}
