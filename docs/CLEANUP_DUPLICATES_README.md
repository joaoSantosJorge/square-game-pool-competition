# Duplicate Wallet Address Cleanup

## Problem
The leaderboard had duplicate entries for the same wallet address due to case sensitivity issues. For example:
- `0xa8f4...d2c8` (lowercase)
- `0xA8F4...D2C8` (uppercase)

These were stored as separate entries in Firebase because document IDs are case-sensitive.

## Solution

### 1. Code Fix (Already Applied)
Updated `functions/index.js` in the `submitScore` function to normalize all wallet addresses to lowercase before storing them:

```javascript
const normalizedAddress = walletAddress.toLowerCase();
const scoreRef = db.collection("scores").doc(normalizedAddress);
```

This prevents future duplicates from being created.

### 2. Database Cleanup (Manual Step Required)

Run the cleanup script to merge existing duplicates:

```bash
# Make sure you have the Firebase service account key
# Download it from Firebase Console > Project Settings > Service Accounts
# Save it as serviceAccountKey.json in the project root

# Install dependencies if needed
npm install firebase-admin

# Run the cleanup script
node cleanup-duplicates.js
```

### What the Cleanup Script Does:
1. Scans all entries in the `scores` collection
2. Groups them by normalized (lowercase) wallet address
3. For each group of duplicates:
   - Keeps the **highest score**
   - Creates a single entry with the normalized (lowercase) address
   - Deletes the duplicate entries
4. Logs all actions for verification

### Example Output:
```
🔍 Scanning for duplicate wallet addresses...

📋 Found duplicate for: 0xa8f4...d2c8
   Entries: 2
   - 0xa8f4...d2c8: score 5
   - 0xA8F4...D2C8: score 2
   ✅ Keeping highest score: 5 from 0xa8f4...d2c8
   🗑️  Deleted duplicate: 0xA8F4...D2C8

============================================================
📊 Cleanup Summary:
   Total unique addresses: 6
   Duplicates found: 1
   Merges performed: 1
============================================================

✅ Cleanup completed successfully!
```

## After Cleanup

1. **Deploy the updated function**:
   ```bash
   cd functions
   firebase deploy --only functions:submitScore
   ```

2. **Verify the leaderboard** - Check that duplicates are gone and highest scores are preserved

3. **Monitor** - Future submissions will automatically use lowercase addresses

## Prevention

The code fix ensures this won't happen again by:
- Normalizing all wallet addresses to lowercase on submission
- Using the normalized address as the document ID
- Storing the normalized address in the data

## Notes

- The cleanup script is **safe to run multiple times** - it will only process actual duplicates
- The script keeps a record of merged entries in the `mergedFrom` field
- A `mergedAt` timestamp is added for audit purposes
- **Backup your database** before running if you want extra safety (Firebase Console > Database > Backups)
