# Firebase Database Schema

This document describes the structure of the Firestore database used in the Flappy Bird Prize Pool Competition application.

## Database Overview

The application uses **Google Cloud Firestore** to manage:
- Player scores and game sessions
- User profiles and statistics
- Prize pool cycles and metadata
- Payment and donation records
- Current cycle state

---

## Collections

### 1. `scores` (Current Cycle Only)

Stores active game scores for the current cycle. This collection is cleared and archived at the end of each cycle.

**Document ID:** `walletAddress` (user's wallet address in lowercase)

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `walletAddress` | string | User's Ethereum wallet address (lowercase) |
| `playerName` | string | User's display name (shortened wallet address format) |
| `score` | number | Highest score achieved in current game session |
| `timestamp` | timestamp | Server timestamp when the score was submitted |
| `ipAddress` | string | IP address of the submitter (for abuse detection) |

**Example:**
```json
{
  "walletAddress": "0x1234567890abcdef...",
  "playerName": "0x1234...cdef",
  "score": 1250,
  "timestamp": 1705315200000,
  "ipAddress": "203.0.113.42"
}
```

---

### 2. `scores_DD-MM-YYYY_to_DD-MM-YYYY` (Archived Cycles)

Each completed cycle creates an archive collection with all scores from that period. Multiple collections exist with different date ranges.

**Document ID:** Same as original score document (walletAddress)

**Fields:** Same as `scores` collection, plus:

| Field | Type | Description |
|-------|------|-------------|
| `archivedAt` | number | Timestamp when archived (milliseconds) |
| `cycleStart` | number | Cycle start timestamp |
| `cycleEnd` | number | Cycle end timestamp |

**Example Collection Names:**
- `scores_15-01-2026_to_22-01-2026`
- `scores_08-01-2026_to_15-01-2026`

---

### 3. `cycleMetadata`

Stores metadata about completed cycles for archive and statistics. **This collection is only created after the first cycle ends.**

**Document ID:** `scores_DD-MM-YYYY_to_DD-MM-YYYY` (matches archive collection name)

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `cycleName` | string | Archive collection name |
| `startDate` | number | Cycle start timestamp (milliseconds) |
| `endDate` | number | Cycle end timestamp (milliseconds) |
| `prizePoolUSDC` | number | Total USDC in prize pool |
| `numberOfPlayers` | number | Count of unique players |
| `numberOfWinners` | number | Count of prize winners (typically 3-7) |
| `totalGamesPlayed` | number | Total game sessions in cycle |
| `winners` | array | Array of winner objects |
| `createdAt` | number | When metadata was created (milliseconds) |

**Winner Object Structure:**
```json
{
  "rank": 1,
  "address": "0x1234567890abcdef...",
  "score": 5000,
  "name": "Champion"
}
```

**Example:**
```json
{
  "cycleName": "scores_15-01-2026_to_22-01-2026",
  "startDate": 1705276800000,
  "endDate": 1705881600000,
  "prizePoolUSDC": 150.50,
  "numberOfPlayers": 42,
  "numberOfWinners": 3,
  "totalGamesPlayed": 1250,
  "winners": [
    {"rank": 1, "address": "0xaaa...", "score": 5000, "name": "TopPlayer"},
    {"rank": 2, "address": "0xbbb...", "score": 4800, "name": "Runner2"},
    {"rank": 3, "address": "0xccc...", "score": 4500, "name": "Runner3"}
  ],
  "createdAt": 1705881601000
}
```

---

### 4. `cycleState`

Stores the current state of the prize pool cycle. Single document application.

**Document ID:** `current`

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `startTime` | number | Current cycle start timestamp (milliseconds) |
| `endTime` | number | Current cycle end timestamp (milliseconds) |
| `lastUpdated` | number | When cycle state was last updated (milliseconds) |
| `allocated` | boolean | Whether prize pool has been allocated to winners |
| `nextCycleStart` | number | When the next cycle will start (milliseconds) |

**Example:**
```json
{
  "startTime": 1705881601000,
  "endTime": 1706486401000,
  "lastUpdated": 1705881601000,
  "allocated": false,
  "nextCycleStart": 1706486401000
}
```

---

### 5. `userProfiles`

Stores user account information and statistics across all cycles.

**Document ID:** `walletAddress` (user's wallet address in lowercase)

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `walletAddress` | string | User's Ethereum wallet address (lowercase) |
| `createdAt` | number | Account creation timestamp (milliseconds) |
| `totalDonationsUSDC` | number | Total USDC donated to pool |
| `totalTries` | number | Total game tries purchased |
| `totalGamesPlayed` | number | Total games played across all cycles |
| `cyclesParticipated` | array | List of cycle names user participated in |
| `cycleStats` | object | Map of cycle-specific statistics |
| `lastActiveAt` | number | Last activity timestamp (milliseconds) |

**Cycle Stats Object (within `cycleStats`):**
```json
{
  "scores_15-01-2026_to_22-01-2026": {
    "donationsUSDC": 10.00,
    "highestScore": 1250,
    "tries": 20,
    "gamesPlayed": 5,
    "firstPlayedAt": 1705276800000,
    "lastPlayedAt": 1705881600000
  }
}
```

**Example User Profile:**
```json
{
  "walletAddress": "0x1234567890abcdef...",
  "createdAt": 1704960000000,
  "totalDonationsUSDC": 50.00,
  "totalTries": 100,
  "totalGamesPlayed": 25,
  "cyclesParticipated": ["scores_15-01-2026_to_22-01-2026"],
  "cycleStats": {
    "scores_15-01-2026_to_22-01-2026": {
      "donationsUSDC": 50.00,
      "highestScore": 1250,
      "tries": 100,
      "gamesPlayed": 25,
      "firstPlayedAt": 1705276800000,
      "lastPlayedAt": 1705881600000
    }
  },
  "lastActiveAt": 1705881600000
}
```

---

### 6. `payments`

Audit log of all payment and donation transactions.

**Document ID:** Auto-generated

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `walletAddress` | string | User's wallet address (lowercase) |
| `amountUSDC` | number | Payment amount in USDC |
| `cycleName` | string | Cycle when payment was made |
| `transactionHash` | string | Blockchain transaction hash (if applicable) |
| `timestamp` | timestamp | When payment was recorded (server timestamp) |
| `triesGranted` | number | Number of game tries granted (0 for donations) |
| `isDonation` | boolean | Whether this was a donation or play payment |

**Example:**
```json
{
  "walletAddress": "0x1234567890abcdef...",
  "amountUSDC": 0.02,
  "cycleName": "scores_15-01-2026_to_22-01-2026",
  "transactionHash": "0xabc123...",
  "timestamp": 1705881600000,
  "triesGranted": 10,
  "isDonation": false
}
```

---

## Relationships

```
cycleState (current)
    ↓
    └─→ scores (current active scores)
    └─→ userProfiles (user stats across cycles)
         ↓
         └─→ cycleStats (stats per cycle)

End of Cycle:
    ↓
    scores → scores_DD-MM-YYYY_to_DD-MM-YYYY (archive)
    ↓
    metadata → cycleMetadata (add cycle record)
    ↓
    cycleState (reset with new dates)
```

---

## Data Flow

### During a Cycle
1. Users play games → scores recorded in `scores`
2. Users pay USDC → payment logged in `payments`
3. User stats updated in `userProfiles.cycleStats`
4. Prize pool grows in blockchain

### At Cycle End
1. `cycleManager` function executes
2. Allocate funds to top 3-7 winners via smart contract
3. Archive scores to `scores_DD-MM-YYYY_to_DD-MM-YYYY`
4. Save cycle metadata to `cycleMetadata`
5. Clear `scores` collection
6. Create new `cycleState` with next cycle dates

---

## Indexes Required

For optimal query performance, create these composite indexes:

### `scores` Collection
- `walletAddress` (Ascending)
- `score` (Descending)

### `cycleMetadata` Collection
- `createdAt` (Descending)

### `userProfiles` Collection
- `walletAddress` (Ascending)
- `lastActiveAt` (Descending)

### `payments` Collection
- `walletAddress` (Ascending)
- `timestamp` (Descending)

---

## Security Rules

The database should enforce these security rules:

- Users can only read their own profile
- Users can only write their own scores
- Admin functions (cycle operations) restricted to authenticated service account
- Donations can be read publicly (incentive)
- Payment history private to user

---

## Maintenance

### Cleanup
- Archive collections are preserved indefinitely for historical data
- `scores` collection automatically cleared each cycle
- Old `cycleState` documents can be archived if needed

### Backup
- Firestore automatically backs up data daily
- Manual backups should be taken before cycle transitions

