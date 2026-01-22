#!/bin/bash

# Deploy SquarePrizePool to Base Sepolia Testnet
# This script uses Foundry's forge to deploy the contract

set -e  # Exit on error

echo "======================================"
echo "SquarePrizePool Contract Deployment"
echo "Target: Base Sepolia Testnet"
echo "======================================"
echo ""

# Base Sepolia configuration
CHAIN_ID=84532
RPC_URL="https://sepolia.base.org"
USDC_ADDRESS="0x036CbD53842c5426634e7929541eC2318f3dCF7e"  # USDC on Base Sepolia
EXPLORER_URL="https://sepolia.basescan.org"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo ""
    echo "Please create a .env file with:"
    echo "PRIVATE_KEY=your_private_key_here"
    echo "USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e  # Optional, defaults to Base Sepolia USDC"
    echo ""
    exit 1
fi

# Load environment variables
source .env

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY not set in .env file"
    exit 1
fi

# Use environment USDC_ADDRESS or default
USDC_ADDRESS="${USDC_ADDRESS:-0x036CbD53842c5426634e7929541eC2318f3dCF7e}"

echo "Configuration:"
echo "  Chain ID: $CHAIN_ID"
echo "  RPC URL: $RPC_URL"
echo "  USDC Address: $USDC_ADDRESS"
echo ""

# Check if user wants to proceed
read -p "Deploy to Base Sepolia? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "Deploying contract..."
echo ""

# Run the deployment script
forge script script/DeploySquare.s.sol:DeploySquareScript \
    --rpc-url $RPC_URL \
    --broadcast \
    --verify \
    -vvvv

echo ""
echo "======================================"
echo "Deployment Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Copy the deployed contract address from above"
echo "2. Update frontend/js/config.js with the new address"
echo "3. Update functions/.env with the new address"
echo "4. Get testnet USDC from faucet if needed"
echo "5. Test the payment flow on testnet"
echo ""
echo "Useful links:"
echo "  Base Sepolia Explorer: $EXPLORER_URL"
echo "  Base Sepolia Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet"
echo ""
