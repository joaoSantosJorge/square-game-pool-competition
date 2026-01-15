# Database Permissions & Security Rules

This document outlines the Firestore security rules that govern read and write access to the Flappy Bird Prize Pool Competition database.

---

## Overview

The database implements a **strict security model**:

- **READ**: Anyone can read all data EXCEPT sensitive fields
- **WRITE**: Only Cloud Functions (backend) can write; all client requests are denied

---

## Detailed Permissions

### 1. `scores` Collection (Current Cycle)

**READ Access**: ✅ **Public**
- Anyone can read all fields **EXCEPT `ipAddress`**
- This collection is public for transparency and incentivization
- IP addresses are protected for privacy

**WRITE Access**: ❌ **Cloud Functions Only**
- Direct client writes are **DENIED**
- Clients must submit scores via `submitScore` HTTP Cloud Function
- The function validates, stores IP, and writes on behalf of the user

**Query Limits**:
- Maximum 100 results per query (rate limiting)

---

### 2. `cycleState` Collection

**READ Access**: ✅ **Public**
- Anyone can read the current cycle status
- Shows cycle start/end times, allocation status
- Used by frontend to display countdown timer

**WRITE Access**: ❌ **Cloud Functions Only**
- Only `cycleManager` Cloud Function can modify
- Users cannot directly write or modify cycle state

---

### 3. `cycleMetadata` Collection (Archived Cycles)

**READ Access**: ✅ **Public**
- Anyone can read historical cycle metadata
- Shows past winners, prize pools, player counts
- Used for the leaderboard archive page

**WRITE Access**: ❌ **Cloud Functions Only**
- Only `cycleManager` can create/update when cycles end
- Prevents tampering with historical records

---

### 4. `userProfiles` Collection

**READ Access**: ✅ **Public**
- Anyone can read all user profile data
- Shows donation amounts, game stats, achievements
- Incentivizes public profiles for competitive leaderboards

**WRITE Access**: ❌ **Cloud Functions Only**
- Only `submitScore` and `recordPayment` Cloud Functions can write
- Users cannot directly modify their own profiles
- Prevents fake statistics and fraud

---

### 5. `payments` Collection (Audit Log)

**READ Access**: ✅ **Public**
- Anyone can read payment records
- Shows who donated and the amounts
- Provides transparency

**WRITE Access**: ❌ **Cloud Functions Only**
- Only `recordPayment` Cloud Function can add records
- Prevents fake payment creation

---

### 6. Archived Score Collections (`scores_DD-MM-YYYY_to_DD-MM-YYYY`)

**READ Access**: ✅ **Public**
- Anyone can read past cycle scores
- Shows historical leaderboards and archived performances

**WRITE Access**: ❌ **Cloud Functions Only**
- Only `cycleManager` creates these during cycle transitions
- Once archived, data is immutable (no updates/deletes)

---

## Security Model Summary

| Collection | Read | Write | Notes |
|---|---|---|---|
| `scores` | 🟢 Public (no IP) | 🔴 Cloud Fn Only | Current cycle scores |
| `cycleState` | 🟢 Public | 🔴 Cloud Fn Only | Cycle status |
| `cycleMetadata` | 🟢 Public | 🔴 Cloud Fn Only | Historical metadata |
| `userProfiles` | 🟢 Public | 🔴 Cloud Fn Only | User stats |
| `payments` | 🟢 Public | 🔴 Cloud Fn Only | Donation history |
| `scores_*` | 🟢 Public | 🔴 Cloud Fn Only | Archived scores |
| **All Other** | 🔴 Denied | 🔴 Denied | Default deny-all |

---

## How Writes Actually Happen

Since clients **cannot write directly**, all data modifications go through Cloud Functions:

### Score Submission
```
User (client) → HTTP POST to submitScore() → Cloud Function validates → Writes to scores collection
```

### Payment Recording
```
User (client) → HTTP POST to recordPayment() → Cloud Function validates transaction → Writes to payments collection
```

### User Profile Updates
```
Score submitted → Cloud Function updates userProfiles collection with new stats
```

### Cycle Transitions
```
Scheduled Cloud Function (checkCycleScheduled) → Allocates funds → Archives scores → Creates cycleMetadata
```

---

## Privacy & Sensitive Data

### Protected Fields
- **`ipAddress`** in `scores` collection
  - Not readable by any client
  - Used only for abuse detection by backend

### Public Fields
- **Wallet addresses** - Public by nature
- **Donation amounts** - Public for incentivization
- **Game scores** - Public for leaderboards
- **Player names** - Public for recognition

---

## Client-Side Behavior

### What Clients CAN Do
✅ Read all public collections
✅ Call Cloud Functions to submit scores
✅ Call Cloud Functions to make payments
✅ View leaderboards and archives
✅ View cycle status and countdown

### What Clients CANNOT Do
❌ Write directly to any collection
❌ Modify scores or user profiles
❌ Delete any records
❌ Read IP addresses
❌ Modify cycle state or metadata
❌ Create fake payments or donations

---

## Backend Authorization

Cloud Functions have **elevated permissions**:

- Uses Firebase Admin SDK (with service account)
- Can read and write all collections
- Performs validation before writing
- Maintains audit trail in `payments` collection
- Enforces business logic (score limits, cycle timing, winner allocation)

---

## Security Rules Enforcement

The security rules are enforced **at the database level**:

1. **Request arrives** at Firestore
2. **Rules engine evaluates** the request
3. **If denied**: Request blocked immediately (no data returned)
4. **If allowed**: Operation proceeds

**No way to bypass** - even if client code is compromised, database access is still restricted.

---

## Rate Limiting

### Query Limits
- Maximum 100 documents per query on `scores` collection
- Prevents expensive bulk reads

### Submission Rate Limiting
- Cloud Function enforces minimum 5-second interval between score submissions
- Prevents score-submission spam

---

## Auditing & Compliance

All writes are logged:
- **`payments` collection** - Full audit trail of all transactions
- **Timestamps** - Server-generated, cannot be spoofed
- **IP tracking** - For abuse detection (stored securely)

---

## Future Enhancements

Potential improvements:
- [ ] Per-user read restrictions (users can only read their own payment history)
- [ ] Custom authentication for admin functions
- [ ] Encrypted sensitive fields
- [ ] Time-based access restrictions
- [ ] Geographic IP validation

