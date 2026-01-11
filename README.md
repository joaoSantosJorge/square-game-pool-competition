# Flappy Bird Competition Prize Pool

A blockchain-based competitive Flappy Bird game with USDC prize pools on Base Sepolia. Players pay to play, compete for high scores, and winners claim rewards through smart contracts.

**🎮 Live Demo**: [https://flappy-bird-leaderboard-463e0.web.app/](https://flappy-bird-leaderboard-463e0.web.app/)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development](#development)
- [Smart Contract](#smart-contract)
- [Deployment](#deployment)
- [Architecture](#architecture)
- [Roadmap](#roadmap)

## Overview

Each game cycle operates through a smart contract that handles micropayments and leaderboard management. Players pay **0.02 USDC for 20 attempts**, building a prize pool that is distributed to top performers at the end of each cycle.

### How It Works

1. **Payment**: Players connect their wallet and pay 0.02 USDC for 20 game attempts
2. **Competition**: Compete for high scores stored in Firebase Firestore
3. **Cycle End**: Backend function triggers end of competition cycle
4. **Distribution**: Smart contract allocates funds to top 1-10 winners based on rankings
5. **Claiming**: Winners have 7 days to claim rewards; unclaimed funds roll over to next cycle

## Features

### Current Features

- ✅ **Web3 Wallet Integration** - Connect with Coinbase Wallet or MetaMask
- ✅ **USDC Payments** - Pay-to-play with USDC on Base Sepolia
- ✅ **Prize Pool System** - Automated prize distribution via smart contract
- ✅ **Real-time Leaderboard** - Firebase Firestore integration
- ✅ **Retro UI Design** - Minimalist black/white theme with dark mode toggle
- ✅ **Anti-Cheat** - Address blocking functionality

### Smart Contract Controls (Owner Only)

- Set fee percentage
- Configure cycle duration
- Define winner allocation (1-10 winners with custom percentages)
- Block/unblock addresses
- Emergency functions

### Additional Capabilities

- Direct donations to prize pool (anyone can contribute)
- 7-day claim window with automatic rollover
- Complete transaction history tracking

## Prerequisites

- **Node.js** (v16+)
- **Python 3** (for local development server)
- **Foundry** (for smart contract development)
- **Firebase CLI** (for backend deployment)
- **Git**
- **Web3 Wallet** (Coinbase Wallet or MetaMask)
- **Base Sepolia ETH** (for testing)

## Quick Start

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd flappybird-pool-competition

# Install dependencies
npm install
cd functions && npm install && cd ..

# Start local development server
python3 -m http.server 8000

# Open browser
# Navigate to http://localhost:8000/frontend/
```

### Firebase Functions (Backend)

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy functions
firebase deploy --only functions
```

## Development

### Running Tests

```bash
# Smart contract tests (Foundry)
forge test

# Backend tests (Node.js)
cd functions
npm test
```

### Environment Variables

Create `.env` files in appropriate directories:

**Root `.env` (for contract deployment)**:
```env
PRIVATE_KEY=your_private_key
BASE_SEPOLIA_RPC_URL=your_rpc_url
```

**`functions/.env` (for backend)**:
```env
FIREBASE_SERVICE_ACCOUNT=path_to_service_account.json
CONTRACT_ADDRESS=0xdd0bbf48f85f5314c3754cd63103be927b55986c
```

See [docs/SECRET_KEY_MANAGEMENT.md](docs/SECRET_KEY_MANAGEMENT.md) for details.

## Smart Contract

### Deployed Contract (Base Sepolia)

- **Address**: `0xdd0bbf48f85f5314c3754cd63103be927b55986c`
- **Explorer**: [View on BaseScan](https://sepolia.basescan.org/address/0xdd0bbf48f85f5314c3754cd63103be927b55986c)
- **Network**: Base Sepolia Testnet

### Key Functions

- `allocateFunds(address[] winners, uint256[] percentages)` - Distribute prize pool
- `claimRewards()` - Winners claim their allocated rewards
- `blockAddress(address)` / `unblockAddress(address)` - Anti-cheat measures
- `setCycleDuration(uint256)` - Configure cycle length
- `setFeePercentage(uint256)` - Adjust platform fees

## Deployment

### Deployment Order

⚠️ **IMPORTANT**: What you practice in dev, you will do in prod.

1. **Deploy Smart Contract**
   ```bash
   forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast --verify
   ```

2. **Update Contract Address**
   - Edit `frontend/js/payments.js`
   - Set `flappyBirdContractAddress` to deployed contract address

3. **Deploy Database & Backend**
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,functions
   ```

4. **Deploy Frontend**
   ```bash
   firebase deploy --only hosting
   ```

### Deployment Checklist

- [ ] Smart contract deployed and verified
- [ ] Contract address updated in `payments.js`
- [ ] Firebase project configured
- [ ] Environment variables set
- [ ] Firestore rules deployed
- [ ] Cloud Functions deployed
- [ ] Frontend deployed to Firebase Hosting
- [ ] Test all functionality on testnet

## Architecture

The project uses a **monorepo structure** with three main layers:
## Architecture

The project uses a **monorepo structure** with three main layers:

### 1. Smart Contracts (`contracts/`)
- Solidity contracts handling payments, prize pools, and rewards
- Deployed on Base Sepolia testnet
- Tested with Foundry

### 2. Backend (`functions/`)
- Firebase Cloud Functions for serverless backend
- Cycle management automation
- Leaderboard synchronization with smart contract
- Firebase Firestore for data storage

### 3. Frontend (`frontend/`)
- Vanilla JavaScript game implementation
- Web3 wallet integration (Coinbase Wallet, MetaMask)
- Real-time leaderboard display
- Retro-themed minimalist UI

### File Structure

```
flappybird-pool-competition/
│
├── 📁 contracts/                   # Smart Contracts
│   ├── FlappyBirdPrizePool.sol    # Main contract
│   └── interfaces/
│
├── 📁 functions/                   # Backend (Firebase Cloud Functions)
│   ├── index.js                    # Entry point
│   ├── cycleManager.js             # Cycle management
│   └── package.json
│
├── 📁 frontend/                    # Frontend (Static hosting)
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── game.js                 # Game logic
│   │   ├── leaderboard.js          # Leaderboard UI
│   │   └── payments.js             # Web3 integration
│   └── assets/
│
├── 📁 script/                      # Deployment scripts
│   └── Deploy.s.sol
│
├── 📁 test/                        # Test suite
│   ├── FlappyBirdPrizePool.t.sol  # Contract tests
│   ├── MockUSDC.sol               # Test utilities
│   └── cycleManager.test.js       # Backend tests
│
├── 📁 docs/                        # Documentation
│   ├── FIREBASE_SETUP.md
│   ├── FIREBASE_CYCLE_MANAGER_DEPLOYMENT.md
│   └── SECRET_KEY_MANAGEMENT.md
│
├── firebase.json                   # Firebase configuration
├── firestore.rules                 # Database security rules
├── firestore.indexes.json          # Database indexes
├── foundry.toml                    # Foundry configuration
└── README.md
```


## Documentation

- [Firebase Setup Guide](docs/FIREBASE_SETUP.md)
- [Cycle Manager Deployment](docs/FIREBASE_CYCLE_MANAGER_DEPLOYMENT.md)
- [Secret Key Management](docs/SECRET_KEY_MANAGEMENT.md)

---

**⚠️ Testnet Only**: This project is currently deployed on Base Sepolia testnet. Do not use with real funds on mainnet without thorough auditing.