# Flappy Bird Prize Pool Competition - Project Overview

> **Living Document**: Update this file when making significant architectural changes.

## Quick Reference

| File | Purpose |
|------|---------|
| `frontend/js/config.js` | Contract addresses, chain IDs, RPC URLs |
| `frontend/js/wallet.js` | Multi-wallet connection (MetaMask, Phantom, WalletConnect) |
| `frontend/js/payments.js` | USDC payments, contract interaction, prize claiming |
| `frontend/js/game.js` | Flappy Bird game mechanics and rendering |
| `frontend/js/leaderboard.js` | Score submission, leaderboard display |
| `functions/index.js` | Cloud Functions API endpoints |
| `functions/cycleManager.js` | Cycle end processing, fund allocation |
| `contracts/FlappyBirdPrizePool.sol` | Main smart contract (current deployment) |
| `contracts/SquarePrizePool.sol` | Enhanced contract with mutable play cost |
| `firestore.rules` | Database security rules |

---

## Project Structure

```
flappybird-pool-competition/
├── frontend/                    # Web application (Firebase Hosting)
│   ├── index.html              # Landing page - pool display, cycle timer
│   ├── game.html               # Game interface with canvas
│   ├── profile.html            # User dashboard - stats, rewards
│   ├── admin.html              # Admin panel - cycle/config management
│   ├── archive.html            # Historical leaderboards
│   ├── rules.html              # Game rules page
│   ├── css/styles.css          # Global styles, dark/light theme
│   └── js/
│       ├── config.js           # Centralized configuration
│       ├── wallet.js           # Wallet connection manager
│       ├── payments.js         # Payment processing
│       ├── game.js             # Game logic
│       └── leaderboard.js      # Leaderboard functionality
│
├── functions/                   # Firebase Cloud Functions
│   ├── index.js                # HTTP endpoints
│   ├── cycleManager.js         # Cycle processing logic
│   ├── package.json            # Node.js dependencies
│   └── .env                    # Secrets (KEYSTORE_DATA, etc.)
│
├── contracts/                   # Solidity smart contracts
│   ├── FlappyBirdPrizePool.sol # Original contract (deployed)
│   └── SquarePrizePool.sol     # Enhanced version
│
├── test/                        # Test files
│   ├── *.t.sol                 # Solidity unit tests
│   └── *.test.js               # JavaScript tests
│
├── script/Deploy.s.sol         # Foundry deployment script
├── out/                         # Compiled contract ABIs
├── firebase.json               # Firebase config
├── firestore.rules             # Security rules
└── .env                        # Root environment variables
```

---

## Frontend Files

### HTML Pages

| Page | Path | Renders |
|------|------|---------|
| **Home** | `index.html` | Prize pool amount, cycle countdown, play/donate CTAs |
| **Game** | `game.html` | Canvas game + live leaderboard sidebar |
| **Profile** | `profile.html` | User stats, donation history, rewards, rank |
| **Admin** | `admin.html` | Cycle management, config updates, force allocation |
| **Archive** | `archive.html` | Past cycle leaderboards browser |
| **Rules** | `rules.html` | Game instructions and rules |

### JavaScript Modules

| Module | Responsibility | Key Exports/Functions |
|--------|----------------|----------------------|
| **config.js** | Configuration constants | `CONFIG` object with addresses, chain ID, RPC URL |
| **wallet.js** | Wallet connection | `WalletManager.init()`, `connectToWallet()`, `disconnectWallet()` |
| **payments.js** | Blockchain transactions | `updatePrizePool()`, `payToPlay()`, `claimReward()`, `donate()` |
| **game.js** | Game mechanics | Game loop, collision detection, pipe generation, score tracking |
| **leaderboard.js** | Scores/leaderboard | `submitScore()`, `getLeaderboard()`, cycle countdown |

---

## Backend - Cloud Functions

### Endpoints (functions/index.js)

| Function | Method | Purpose |
|----------|--------|---------|
| `submitScore` | POST | Submit game score (with anti-cheat validation) |
| `recordPayment` | POST | Log payment/donation transaction |
| `getUserProfile` | GET | Fetch user statistics |
| `getUserRank` | GET | Get user's current leaderboard rank |
| `getArchivedLeaderboards` | GET | Fetch historical leaderboards |
| `updateCycleDuration` | POST | Admin: Set cycle length (1-365 days) |
| `updateNumberOfWinners` | POST | Admin: Set winner count (1-10) |
| `updateFeePercentage` | POST | Admin: Set platform fee (0-50%) |
| `getAdminConfig` | GET | Get current admin settings |

### Cycle Management (functions/cycleManager.js)

| Function | Trigger | Purpose |
|----------|---------|---------|
| `checkCycleScheduled` | Scheduled | Auto-check if cycle should end |
| `checkCycleManual` | HTTP | Manual trigger for cycle check |
| `forceAllocate` | HTTP | Force fund allocation to winners |

**Key Internal Functions:**
- `loadPrivateKey()` - Decrypt wallet from encrypted keystore
- `getCycleState()` - Load cycle timing from Firestore
- `getTopWinners()` - Query top N scorers
- `allocateFundsToWinners()` - Call smart contract to distribute rewards
- `resetDatabase()` - Archive scores and start new cycle

---

## Smart Contract

### FlappyBirdPrizePool.sol (Deployed)

**Address**: `0xDD0BbF48f85f5314C3754cd63103Be927B55986C` (Base Sepolia)

| Function | Access | Purpose |
|----------|--------|---------|
| `payToPlay()` | Public | Pay 0.02 USDC to participate |
| `donate(amount)` | Public | Contribute to prize pool |
| `allocateFunds(feePercentage, winners[], percentages[])` | Owner | Distribute funds to winners |
| `claimReward()` | Public | Winners claim allocated rewards |
| `sweepUnclaimed(winners[])` | Owner | Reclaim unclaimed rewards after 7 days |
| `withdrawETH()` | Owner | Withdraw accidentally sent ETH |

**State Variables:**
- `owner` - Contract owner address
- `usdc` - USDC token interface
- `totalPool` - Current pool balance
- `rewards[address]` - Claimable amounts per address
- `fundsAllocated` - Allocation state flag
- `PLAY_COST` - 0.02 USDC (20000 in 6 decimals)

**Events:** `PlayerPaid`, `DonationReceived`, `FundsAllocated`, `UnclaimedFundsSwept`

---

## Database Schema (Firestore)

| Collection | Document ID | Purpose |
|------------|-------------|---------|
| `scores` | `{walletAddress}` | Current cycle leaderboard entries |
| `cycleState` | `current` | Active cycle timing (startTime, endTime, status) |
| `config` | `settings` | Admin settings (cycleDuration, numberOfWinners, feePercentage) |
| `cycleMetadata` | `{cycleId}` | Historical cycle results |
| `userProfiles` | `{walletAddress}` | User statistics across all cycles |
| `payments` | Auto-generated | Payment transaction log |
| `scores_DD-MM-YYYY_to_DD-MM-YYYY` | Archived | Past cycle leaderboards |

### Document Structures

**scores/{walletAddress}:**
```json
{
  "walletAddress": "0x123...",
  "score": 250,
  "timestamp": "Timestamp",
  "playerName": "0x123...def",
  "ipAddress": "192.168.x.x"
}
```

**userProfiles/{walletAddress}:**
```json
{
  "walletAddress": "0x123...",
  "totalDonationsUSDC": 50.00,
  "totalPrizesWonUSDC": 100.00,
  "totalTries": 30,
  "totalGamesPlayed": 15,
  "cyclesParticipated": ["scores_01-01-2025_to_08-01-2025"],
  "cycleStats": { /* per-cycle breakdown */ }
}
```

---

## Common Modification Patterns

### "Change play cost"
1. Update `contracts/SquarePrizePool.sol` → `setPlayCost()` or redeploy
2. Update `frontend/js/config.js` → if displaying cost
3. Update `frontend/js/payments.js` → `payToPlay()` display logic

### "Add new wallet provider"
1. Edit `frontend/js/wallet.js` → Add provider detection and connection logic
2. Update `WalletManager.init()` → Register new provider

### "Change leaderboard display"
1. Edit `frontend/js/leaderboard.js` → Modify rendering functions
2. Edit `frontend/game.html` or `frontend/index.html` → Update HTML structure

### "Modify game mechanics"
1. Edit `frontend/js/game.js` → Update game loop, physics, or rendering

### "Add new Cloud Function endpoint"
1. Edit `functions/index.js` → Add new exported function
2. Deploy: `firebase deploy --only functions`

### "Change cycle/winner settings"
1. Use admin.html UI, OR
2. Call Cloud Functions: `updateCycleDuration`, `updateNumberOfWinners`, `updateFeePercentage`

### "Add new Firestore collection"
1. Create collection via Cloud Functions or Firebase Console
2. Update `firestore.rules` → Add security rules for new collection

### "Update smart contract"
1. Edit contract in `contracts/`
2. Test: `forge test`
3. Deploy: `forge script script/Deploy.s.sol --broadcast`
4. Update `frontend/js/config.js` → New contract address
5. Update `functions/.env` → `CONTRACT_ADDRESS`

### "Add new page"
1. Create `frontend/{page}.html`
2. Add JS file if needed: `frontend/js/{page}.js`
3. Update navigation in other HTML files

---

## Configuration Locations

| Setting | Location | Notes |
|---------|----------|-------|
| Contract address | `frontend/js/config.js`, `functions/.env` | Must match deployed contract |
| USDC address | `frontend/js/config.js` | Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Chain ID | `frontend/js/config.js` | Base Sepolia: `84532` |
| RPC URL | `frontend/js/config.js`, `functions/.env` | `https://sepolia.base.org` |
| Firebase config | `frontend/js/config.js` | API keys, project ID |
| Keystore (wallet) | `functions/.env` | `KEYSTORE_DATA` (base64), `KEYSTORE_PASSWORD` |
| Cycle duration | Firestore `config/settings` | Set via admin.html or Cloud Function |
| Number of winners | Firestore `config/settings` | Set via admin.html or Cloud Function |
| Fee percentage | Firestore `config/settings` | Set via admin.html or Cloud Function |

---

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | HTML5, CSS3, JavaScript (ES6+), Web3.js, Firebase SDK |
| **Backend** | Node.js 20+, Firebase Cloud Functions, Firestore |
| **Blockchain** | Solidity 0.8+, Base Sepolia (L2), USDC token |
| **Testing** | Foundry (Solidity), Jest (JavaScript) |
| **Deployment** | Firebase Hosting, Foundry for contracts |

---

## Key Constants

| Constant | Value | Location |
|----------|-------|----------|
| Play cost | 0.02 USDC (20000 units) | Contract, payments.js |
| USDC decimals | 6 | Contract calculations |
| Default winners | 3 | Firestore config |
| Default fee | 10% (1000 basis points) | Firestore config |
| Default cycle | 7 days | Firestore config |
| Claim window | 7 days | Smart contract |

---

## Security Model

- **Frontend**: Read-only access to Firestore (all collections publicly readable)
- **Cloud Functions**: Only writer to Firestore (prevents client manipulation)
- **Smart Contract**: Owner-only for allocation and sweeping
- **Wallets**: User-controlled, never stored server-side
- **IP Addresses**: Stored in `scores` collection but not exposed to clients

---

## Related Documentation

For detailed information, see these docs in `/docs/`:

| Document | Contents |
|----------|----------|
| `BACKEND_FUNCTIONS.md` | Comprehensive Cloud Functions reference - endpoints, helpers, cycle end flow |
| `SYSTEM_DIAGRAMS.md` | Visual architecture diagrams (Mermaid) - component, sequence, state, activity diagrams |
| `CONTRACT_ADDRESS_REFERENCES.md` | Complete list of where contract addresses are referenced |
| `DATABASE_PERMISSIONS.md` | Detailed Firestore security rules and access patterns |
| `FIREBASE_DATABASE_SCHEMA.md` | Full database schema with all field definitions |
| `FIREBASE_CYCLE_MANAGER_DEPLOYMENT.md` | Cloud Functions deployment guide |
| `SECRET_KEY_MANAGEMENT.md` | How keystore and secrets are managed |
| `FIAT_INTEGRATION_SOLUTIONS.md` | Fiat payment research: on-ramp, off-ramp, and identity solutions for non-crypto users |

---

*Last updated: January 2026*
