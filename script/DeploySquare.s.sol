// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../contracts/SquarePrizePool.sol";

contract DeploySquareScript is Script {
    function run() external {
        // Get the deployer's private key from environment variable
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Get USDC address from environment variable or use default Base Sepolia USDC
        address usdcAddress = vm.envOr("USDC_ADDRESS", address(0x036CbD53842c5426634e7929541eC2318f3dCF7e));

        console.log("Deploying SquarePrizePool...");
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        console.log("USDC address:", usdcAddress);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy the contract
        SquarePrizePool pool = new SquarePrizePool(usdcAddress);

        vm.stopBroadcast();

        console.log("");
        console.log("==========================================");
        console.log("SquarePrizePool deployed at:", address(pool));
        console.log("Owner:", pool.owner());
        console.log("USDC token:", address(pool.usdc()));
        console.log("Play cost:", pool.playCost());
        console.log("==========================================");
        console.log("");
        console.log("Save this contract address to:");
        console.log("1. frontend/js/config.js (CONTRACT_ADDRESS)");
        console.log("2. functions/.env (CONTRACT_ADDRESS)");
        console.log("");
        console.log("Verify on BaseScan with:");
        console.log("forge verify-contract");
        console.log(address(pool));
        console.log("contracts/SquarePrizePool.sol:SquarePrizePool");
        console.log("--chain-id 84532");
        console.log("--constructor-args");
        console.log(usdcAddress);
    }
}
