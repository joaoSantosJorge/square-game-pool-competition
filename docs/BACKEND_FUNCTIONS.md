# Backend Functions Documentation

> **Comprehensive reference** for all Firebase Cloud Functions in the Flappy Bird Prize Pool Competition backend.

---

## Overview

The backend consists of two main files:

| File | Purpose |
|------|---------|
| `functions/index.js` | HTTP endpoints for user/admin operations |
| `functions/cycleManager.js` | Cycle processing, fund allocation, blockchain interaction |

**Stack:** Node.js 20+, Firebase Cloud Functions, Firestore, Web3.js, ethers.js

---

## Table of Contents

1. [Exported HTTP Endpoints](#exported-http-endpoints)
2. [Internal Helper Functions](#internal-helper-functions)
3. [Cycle End Flow](#cycle-end-flow)
4. [Environment Variables](#environment-variables)
5. [Firestore Collections](#firestore-collections)

---

## Exported HTTP Endpoints

### Admin Configuration Endpoints

#### `updateCycleDuration`
| Property | Value |
|----------|-------|
| **Method** | POST |
| **Source** | `index.js` |
| **Purpose** | Update the duration of prize cycles |

**Input Parameters:**
```json
{
  "days": 7,           // Required: 1-365 days
  "adminWallet": "0x..." // Optional: admin identifier
}
```

**Response:**
```json
{
  "success": true,
  "cycleDurationDays": 7,
  "newEndTime": 1737849600000,
  "message": "Cycle duration updated. Cycle now ends at 2025-01-26T00:00:00.000Z"
}
```

**Logic:**
1. Validates days (1-365)
2. Updates `config/settings` document with new `cycleDurationDays`
3. Recalculates `endTime` in `cycleState/current` based on existing `startTime`

---

#### `updateNumberOfWinners`
| Property | Value |
|----------|-------|
| **Method** | POST |
| **Source** | `index.js` |
| **Purpose** | Set how many top players receive prizes |

**Input Parameters:**
```json
{
  "winners": 3,        // Required: 1-10 winners
  "adminWallet": "0x..." // Optional: admin identifier
}
```

**Response:**
```json
{
  "success": true,
  "numberOfWinners": 3
}
```

---

#### `updateFeePercentage`
| Property | Value |
|----------|-------|
| **Method** | POST |
| **Source** | `index.js` |
| **Purpose** | Set platform fee percentage |

**Input Parameters:**
```json
{
  "percentage": 1000,  // Required: 0-5000 basis points (0-50%)
  "adminWallet": "0x..." // Optional: admin identifier
}
```

**Note:** `percentage` is in basis points: 100 = 1%, 1000 = 10%, 5000 = 50%

**Response:**
```json
{
  "success": true,
  "feePercentage": 1000
}
```

---

#### `resetContractCycle`
| Property | Value |
|----------|-------|
| **Method** | POST |
| **Source** | `index.js` |
| **Purpose** | Reset the smart contract's `fundsAllocated` flag by calling `sweepUnclaimed()` |

**Input Parameters:** None

**Response:**
```json
{
  "success": true,
  "message": "Contract cycle reset successfully",
  "transactionHash": "0x...",
  "sweptAddresses": ["0x...", "0x..."]
}
```

**Logic:**
1. Decrypts admin wallet keystore
2. Checks if `fundsAllocated` is true
3. Retrieves previous winners from `cycleMetadata`
4. Calls `sweepUnclaimed(winners[])` on the smart contract
5. Resets `fundsAllocated` to false, enabling new allocations

---

#### `resetCycleState`
| Property | Value |
|----------|-------|
| **Method** | POST |
| **Source** | `index.js` |
| **Purpose** | Start a new cycle from the current time |

**Input Parameters:** None

**Response:**
```json
{
  "success": true,
  "message": "Cycle reset. New cycle ends at 2025-01-26T00:00:00.000Z",
  "startTime": 1737763200000,
  "endTime": 1738368000000,
  "durationDays": 7
}
```

**Logic:**
1. Reads `cycleDurationDays` from `config/settings` (default: 7)
2. Sets `startTime` to now
3. Calculates `endTime` based on duration
4. Overwrites `cycleState/current` document

---

#### `getAdminConfig`
| Property | Value |
|----------|-------|
| **Method** | GET |
| **Source** | `index.js` |
| **Purpose** | Retrieve current admin settings and cycle state |

**Input Parameters:** None

**Response:**
```json
{
  "config": {
    "cycleDurationDays": 7,
    "numberOfWinners": 3,
    "feePercentage": 1000,
    "updatedAt": "Timestamp",
    "updatedBy": "0x..."
  },
  "cycleState": {
    "startTime": 1737763200000,
    "endTime": 1738368000000,
    "lastUpdated": 1737763200000
  }
}
```

---

### User Endpoints

#### `submitScore`
| Property | Value |
|----------|-------|
| **Method** | POST |
| **Source** | `index.js` |
| **Purpose** | Submit a game score to the leaderboard |

**Input Parameters:**
```json
{
  "walletAddress": "0x...",  // Required: player's wallet
  "score": 42                // Required: 0-10000, integer
}
```

**Response (success):**
```json
{
  "success": true,
  "message": "Score submitted successfully",
  "score": 42
}
```

**Response (lower score):**
```json
{
  "success": false,
  "message": "Score not updated (current score is higher)",
  "currentScore": 50
}
```

**Validation:**
- Wallet address must be a string
- Score must be integer 0-10000
- Rate limiting: 5 seconds minimum between submissions
- Only updates if new score is higher than existing

**Side Effects:**
- Updates `scores/{walletAddress}` document
- Calls `updateUserGameStats()` to update user profile

---

#### `recordPayment`
| Property | Value |
|----------|-------|
| **Method** | POST |
| **Source** | `index.js` |
| **Purpose** | Record a payment or donation transaction |

**Input Parameters:**
```json
{
  "walletAddress": "0x...",    // Required: player's wallet
  "amountUSDC": 0.02,          // Required: positive number
  "transactionHash": "0x...",  // Optional: blockchain tx hash
  "isDonation": false          // Optional: true for donations
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment recorded successfully",
  "stats": {
    "totalDonations": 5.00,
    "cycleDonations": 0.02,
    "totalTries": 100,
    "cycleTries": 10
  }
}
```

**Logic:**
- Regular payments (`isDonation: false`): Grant 10 tries
- Donations (`isDonation: true`): Add to donations, no tries granted

**Side Effects:**
- Calls `updateUserPaymentStats()` to update user profile
- Creates record in `payments` collection for audit trail

---

#### `getUserProfile`
| Property | Value |
|----------|-------|
| **Method** | GET |
| **Source** | `index.js` |
| **Purpose** | Retrieve user statistics and history |

**Input Parameters:**
```
?wallet=0x... (query parameter)
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "walletAddress": "0x...",
    "createdAt": 1737763200000,
    "lastActiveAt": 1737850000000,
    "summary": {
      "totalDonationsUSDC": 5.00,
      "totalPrizesWonUSDC": 10.00,
      "totalTries": 100,
      "totalGamesPlayed": 50,
      "cyclesParticipated": 3,
      "allTimeBestScore": 150,
      "bestScoreCycle": "scores_01-01-2025_to_08-01-2025"
    },
    "currentCycle": "scores_15-01-2025_to_22-01-2025",
    "currentCycleStats": {
      "donationsUSDC": 0.02,
      "highestScore": 42,
      "tries": 10,
      "gamesPlayed": 5
    },
    "cycleHistory": [...]
  }
}
```

---

#### `getUserRank`
| Property | Value |
|----------|-------|
| **Method** | GET |
| **Source** | `index.js` |
| **Purpose** | Get user's current leaderboard rank |

**Input Parameters:**
```
?wallet=0x... (query parameter)
```

**Response (ranked):**
```json
{
  "success": true,
  "rank": 5,
  "score": 42,
  "totalPlayers": 100
}
```

**Response (no score):**
```json
{
  "success": true,
  "rank": null,
  "score": null,
  "totalPlayers": 100,
  "message": "User has not submitted a score this cycle"
}
```

---

#### `getArchivedLeaderboards`
| Property | Value |
|----------|-------|
| **Method** | GET |
| **Source** | `index.js` |
| **Purpose** | Retrieve historical leaderboards from past cycles |

**Input Parameters:** None

**Response:**
```json
{
  "success": true,
  "archives": [
    {
      "id": "scores_08-01-2025_to_15-01-2025",
      "startDate": "08-01-2025",
      "endDate": "15-01-2025",
      "totalPlayers": 50,
      "totalScores": 50,
      "topScores": [
        {"wallet": "0x...", "score": 200, "playerName": "0x12...ab"},
        {"wallet": "0x...", "score": 180, "playerName": "0x34...cd"}
      ]
    }
  ],
  "totalArchives": 5
}
```

---

### Cycle Management Endpoints

#### `checkCycleScheduled`
| Property | Value |
|----------|-------|
| **Trigger** | Pub/Sub Schedule |
| **Schedule** | Every 1 hour |
| **Source** | `cycleManager.js` |
| **Purpose** | Automatically check if cycle has ended and process allocation |

**Behavior:**
- Runs automatically every hour via Firebase Pub/Sub
- Calls `checkCycle()` internal function
- Processes fund allocation if cycle has ended

---

#### `checkCycleManual`
| Property | Value |
|----------|-------|
| **Method** | GET |
| **Source** | `cycleManager.js` |
| **Purpose** | Manually trigger cycle check |

**Response (cycle active):**
```json
{
  "success": true,
  "message": "Cycle active. 23h 45m remaining"
}
```

**Response (cycle ended):**
```json
{
  "success": true,
  "message": "Cycle completed and reset"
}
```

---

#### `forceAllocate`
| Property | Value |
|----------|-------|
| **Method** | GET |
| **Source** | `cycleManager.js` |
| **Purpose** | Force fund allocation regardless of cycle timing |

**Response:**
```json
{
  "success": true,
  "message": "Force allocation complete. New cycle: 7 days"
}
```

**Warning:** Use with caution - allocates funds even if cycle hasn't ended.

---

## Internal Helper Functions

### From `cycleManager.js`

#### `getAdminConfig()`
```javascript
async function getAdminConfig()
```
| Property | Description |
|----------|-------------|
| **Returns** | `{cycleDurationDays, numberOfWinners, feePercentage}` |
| **Purpose** | Load admin settings from Firestore with defaults |

**Default Values:**
- `cycleDurationDays`: 7
- `numberOfWinners`: 3
- `feePercentage`: 1000 (10%)

---

#### `loadPrivateKey()`
```javascript
async function loadPrivateKey()
```
| Property | Description |
|----------|-------------|
| **Returns** | Private key string |
| **Purpose** | Decrypt admin wallet from base64-encoded keystore |

**Process:**
1. Reads `KEYSTORE_DATA` (base64) from environment
2. Reads `KEYSTORE_PASSWORD` from environment
3. Decodes base64 to JSON
4. Uses ethers.js to decrypt wallet
5. Returns private key for transaction signing

---

#### `getCycleState()`
```javascript
async function getCycleState()
```
| Property | Description |
|----------|-------------|
| **Returns** | `{startTime, endTime, lastUpdated}` |
| **Purpose** | Load current cycle timing from Firestore |

**Behavior:**
- Returns existing `cycleState/current` document if exists
- Creates new cycle with default duration if document doesn't exist

---

#### `getTopWinners(numberOfWinners)`
```javascript
async function getTopWinners(numberOfWinners)
```
| Property | Description |
|----------|-------------|
| **Parameters** | `numberOfWinners` - How many top scorers to return |
| **Returns** | `[{address, score, name}, ...]` |
| **Purpose** | Query top N scorers from current leaderboard |

---

#### `calculatePercentages(numWinners, feePercentage)`
```javascript
function calculatePercentages(numWinners, feePercentage)
```
| Property | Description |
|----------|-------------|
| **Parameters** | `numWinners` (1-10), `feePercentage` (basis points) |
| **Returns** | Array of percentages in basis points |
| **Purpose** | Calculate prize distribution percentages |

**Distribution Examples (after 10% fee):**

| Winners | Distribution |
|---------|--------------|
| 1 | 100% |
| 2 | 70%, 30% |
| 3 | 60%, 30%, 10% |
| 4 | 60%, 25%, 10%, 5% |
| 5 | 50%, 25%, 15%, 7%, 3% |

---

#### `formatDate(timestamp)`
```javascript
function formatDate(timestamp)
```
| Property | Description |
|----------|-------------|
| **Parameters** | Unix timestamp in milliseconds |
| **Returns** | String in `DD-MM-YYYY` format |
| **Purpose** | Format dates for archive collection names |

---

#### `resetDatabase(cycleStartTime, cycleEndTime)`
```javascript
async function resetDatabase(cycleStartTime, cycleEndTime)
```
| Property | Description |
|----------|-------------|
| **Parameters** | Cycle start/end timestamps |
| **Purpose** | Archive scores and clear current leaderboard |

**Process:**
1. Creates archive collection name: `scores_DD-MM-YYYY_to_DD-MM-YYYY`
2. Copies all documents from `scores` to archive collection
3. Adds `archivedAt`, `cycleStart`, `cycleEnd` fields
4. Deletes all documents from `scores` collection

---

#### `saveCycleMetadata(cycleStartTime, cycleEndTime, prizePool, winners)`
```javascript
async function saveCycleMetadata(cycleStartTime, cycleEndTime, prizePool, winners)
```
| Property | Description |
|----------|-------------|
| **Parameters** | Cycle timing, total prize pool, winner array |
| **Purpose** | Save cycle history to `cycleMetadata` collection |

**Saved Data:**
```json
{
  "cycleName": "scores_01-01-2025_to_08-01-2025",
  "startDate": 1704067200000,
  "endDate": 1704672000000,
  "prizePoolUSDC": 100.50,
  "numberOfPlayers": 50,
  "numberOfWinners": 3,
  "totalGamesPlayed": 150,
  "winners": [...],
  "createdAt": 1704672000000
}
```

---

#### `allocateFundsToWinners()`
```javascript
async function allocateFundsToWinners()
```
| Property | Description |
|----------|-------------|
| **Returns** | `{success, totalPool, winners}` or `false` |
| **Purpose** | Main prize allocation logic - calls smart contract |

**Process:**
1. Loads admin config from Firestore
2. Decrypts admin wallet
3. Checks `fundsAllocated` flag on contract
4. Gets `totalPool` from contract
5. Retrieves top winners from database
6. Calculates prize percentages
7. Calls `allocateFunds()` on smart contract

---

#### `checkCycle()`
```javascript
async function checkCycle()
```
| Property | Description |
|----------|-------------|
| **Returns** | `{success, message}` |
| **Purpose** | Main cycle check - processes allocation if cycle ended |

**Logic:**
1. Gets current cycle state
2. Compares current time to `endTime`
3. If cycle ended: runs full allocation flow
4. If cycle active: returns remaining time

---

### From `index.js`

#### `getOrCreateUserProfile(walletAddress)`
```javascript
async function getOrCreateUserProfile(walletAddress)
```
| Property | Description |
|----------|-------------|
| **Parameters** | Wallet address string |
| **Returns** | `{ref, data, isNew}` |
| **Purpose** | Get existing user profile or create new one |

**New Profile Structure:**
```json
{
  "walletAddress": "0x...",
  "createdAt": 1737763200000,
  "totalDonationsUSDC": 0,
  "totalPrizesWonUSDC": 0,
  "totalTries": 0,
  "totalGamesPlayed": 0,
  "cyclesParticipated": [],
  "cycleStats": {},
  "lastActiveAt": 1737763200000
}
```

---

#### `getCurrentCycleName()`
```javascript
async function getCurrentCycleName()
```
| Property | Description |
|----------|-------------|
| **Returns** | String like `scores_DD-MM-YYYY_to_DD-MM-YYYY` or `null` |
| **Purpose** | Get current cycle's archive name format |

---

#### `updateUserGameStats(walletAddress, score, cycleName)`
```javascript
async function updateUserGameStats(walletAddress, score, cycleName)
```
| Property | Description |
|----------|-------------|
| **Parameters** | Wallet, score achieved, cycle name |
| **Purpose** | Update user profile when they play a game |

**Updates:**
- `gamesPlayed++` (cycle and total)
- `highestScore` (if new score is higher)
- `lastPlayedAt` timestamp
- `cyclesParticipated` array

---

#### `updateUserPaymentStats(walletAddress, amountUSDC, cycleName, triesGranted)`
```javascript
async function updateUserPaymentStats(walletAddress, amountUSDC, cycleName, triesGranted = 10)
```
| Property | Description |
|----------|-------------|
| **Parameters** | Wallet, amount, cycle name, tries to grant |
| **Purpose** | Update user profile when they pay/donate |

**Updates:**
- `donationsUSDC` (cycle and total)
- `tries` (cycle and total)
- `cyclesParticipated` array

---

## Cycle End Flow

The following diagram shows the complete flow when a cycle naturally ends:

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRIGGER: checkCycleScheduled                 │
│                      (runs every 1 hour)                        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        checkCycle()                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. getCycleState() → Load {startTime, endTime}          │   │
│  │ 2. Compare: now >= endTime?                             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
     ┌────────────────┐             ┌────────────────────┐
     │  NO: Active    │             │  YES: Cycle Ended  │
     │                │             │                    │
     │ Return:        │             │ Continue to        │
     │ "Xh Ym left"   │             │ allocation...      │
     └────────────────┘             └─────────┬──────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   allocateFundsToWinners()                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. getAdminConfig()                                     │   │
│  │    → {cycleDurationDays, numberOfWinners, feePercentage}│   │
│  │                                                         │   │
│  │ 2. loadPrivateKey()                                     │   │
│  │    → Decrypt wallet from KEYSTORE_DATA                  │   │
│  │                                                         │   │
│  │ 3. contract.fundsAllocated()                            │   │
│  │    → Check if already allocated (abort if true)         │   │
│  │                                                         │   │
│  │ 4. contract.totalPool()                                 │   │
│  │    → Get current prize pool amount                      │   │
│  │                                                         │   │
│  │ 5. getTopWinners(numberOfWinners)                       │   │
│  │    → Query top N scorers from Firestore                 │   │
│  │                                                         │   │
│  │ 6. calculatePercentages(numWinners, feePercentage)      │   │
│  │    → Determine prize distribution                       │   │
│  │                                                         │   │
│  │ 7. contract.allocateFunds(fee, winners[], percentages[])│   │
│  │    → BLOCKCHAIN TRANSACTION                             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│        saveCycleMetadata(startTime, endTime, pool, winners)     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Save to: cycleMetadata/{cycleName}                      │   │
│  │ - Prize pool amount                                     │   │
│  │ - Number of players                                     │   │
│  │ - Winner list with ranks and scores                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               resetDatabase(startTime, endTime)                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. Create archive: scores_DD-MM-YYYY_to_DD-MM-YYYY      │   │
│  │ 2. Copy all scores to archive collection                │   │
│  │ 3. Delete all documents from scores collection          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Create New Cycle                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 1. getAdminConfig() → Get duration                      │   │
│  │ 2. Set cycleState/current:                              │   │
│  │    - startTime: now                                     │   │
│  │    - endTime: now + (duration * 24h)                    │   │
│  │    - lastUpdated: now                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Sequence Diagram

```
    Scheduler       checkCycle      Contract        Firestore
        │               │               │               │
        │───trigger────▶│               │               │
        │               │               │               │
        │               │──getCycleState───────────────▶│
        │               │◀──────────────────────────────│
        │               │               │               │
        │               │ [if ended]    │               │
        │               │               │               │
        │               │──getAdminConfig──────────────▶│
        │               │◀──────────────────────────────│
        │               │               │               │
        │               │──fundsAllocated()────────────▶│
        │               │◀──────────────────────────────│
        │               │               │               │
        │               │──totalPool()─▶│               │
        │               │◀──────────────│               │
        │               │               │               │
        │               │──getTopWinners───────────────▶│
        │               │◀──────────────────────────────│
        │               │               │               │
        │               │──allocateFunds()─────────────▶│
        │               │◀──────────────────────────────│
        │               │               │               │
        │               │──saveCycleMetadata───────────▶│
        │               │◀──────────────────────────────│
        │               │               │               │
        │               │──resetDatabase───────────────▶│
        │               │◀──────────────────────────────│
        │               │               │               │
        │               │──create new cycle────────────▶│
        │               │◀──────────────────────────────│
        │               │               │               │
        │◀──result──────│               │               │
```

---

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `KEYSTORE_DATA` | Base64-encoded encrypted wallet keystore | `eyJ2ZXJzaW9...` |
| `KEYSTORE_PASSWORD` | Password to decrypt the keystore | `mySecurePassword` |
| `CONTRACT_ADDRESS` | Deployed smart contract address | `0xDD0BbF48f85f5314C3754cd63103Be927B55986C` |
| `BASE_RPC_URL` | Blockchain RPC endpoint | `https://sepolia.base.org` |

**Setting Environment Variables:**
```bash
# Using Firebase CLI
firebase functions:secrets:set KEYSTORE_PASSWORD
firebase functions:config:set contract.address="0x..."
```

---

## Firestore Collections

| Collection | Document ID | Purpose |
|------------|-------------|---------|
| `config` | `settings` | Admin configuration (duration, winners, fee) |
| `cycleState` | `current` | Current cycle timing (startTime, endTime) |
| `scores` | `{walletAddress}` | Current cycle leaderboard |
| `userProfiles` | `{walletAddress}` | User statistics across all cycles |
| `payments` | Auto-generated | Payment/donation transaction log |
| `cycleMetadata` | `{cycleName}` | Historical cycle results |
| `scores_*_to_*` | `{walletAddress}` | Archived leaderboards |

---

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `204` - Success (OPTIONS preflight)
- `400` - Invalid input parameters
- `404` - Resource not found
- `405` - Method not allowed
- `429` - Rate limit exceeded
- `500` - Internal server error

---

*Last updated: January 2025*
