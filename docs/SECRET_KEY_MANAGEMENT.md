# Secret Key Management

## Overview

This document describes how sensitive credentials and keys are managed for the flappybird-pool-competition project. All secrets are kept secure and never committed to version control.

## Secret Files Location

All sensitive files are stored in a dedicated directory outside the project repository:

```
~/render-secrets/
├── keystore                    # Encrypted Foundry wallet keystore
└── serviceAccountKey.json      # Firebase Admin SDK credentials
```

**Important:** This directory is located at `/home/joaosantosjorge/render-secrets/` and is **NOT** part of the git repository.

## Secret Files Description

### 1. Keystore (Encrypted Wallet)

**File:** `~/render-secrets/keystore`  
**Purpose:** Encrypted private key for blockchain transactions  
**Created with:** Foundry `cast wallet import` command  

**Details:**
- Encrypted using ERC-2335 keystore format
- Contains the private key for contract owner wallet
- Requires password to decrypt (stored in environment variables)
- Wallet address: `0x87B3Fb6381EdC7B9Ae89540B5764f2a75C36A31B`

**How it works:**
- The keystore file is encrypted JSON
- Password is required to decrypt and access the private key
- Used by `cycleManager.js` for automated prize pool allocations
- Decrypted at runtime using `ethers.Wallet.fromEncryptedJson()`

**Original location:** `~/.foundry/keystores/testnet-contract-deployment`  
**Copy for deployment:** `~/render-secrets/keystore`

### 2. Firebase Service Account Key

**File:** `~/render-secrets/serviceAccountKey.json`  
**Purpose:** Authenticate with Firebase Admin SDK  

**Details:**
- Downloaded from Firebase Console
- Required for Firestore database access
- Used by `cycleManager.js` to read/write game scores and cycle state
- Contains credentials for Firebase project

**How to download:**
1. Go to Firebase Console → Project Settings
2. Navigate to "Service Accounts" tab
3. Click "Generate new private key"
4. Save as `serviceAccountKey.json`

**Original location:** Project root (gitignored)  
**Copy for deployment:** `~/render-secrets/serviceAccountKey.json`

## Local Development Setup

### Environment Variables (.env)

The `.env` file in the project root contains paths and passwords (this file is gitignored):

```bash
# Keystore configuration
KEYSTORE_PATH=/home/joaosantosjorge/.foundry/keystores/testnet-contract-deployment
KEYSTORE_PASSWORD=your_password_here

# Firebase configuration
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
```

### Files in .gitignore

The following sensitive files are excluded from version control:

```
.env
serviceAccountKey.json
render-secrets/
```

## Deployment to Render

### Upload Secret Files

In Render dashboard, secret files are uploaded as "Secret Files" which get mounted at `/etc/secrets/`:

1. **Keystore:**
   - Render filename: `keystore`
   - Mounted at: `/etc/secrets/keystore`
   - Content: Copy entire contents from `~/render-secrets/keystore`

2. **Service Account Key:**
   - Render filename: `serviceAccountKey.json`
   - Mounted at: `/etc/secrets/serviceAccountKey.json`
   - Content: Copy entire contents from `~/render-secrets/serviceAccountKey.json`

### Environment Variables in Render

Set these environment variables in Render (not as secret files):

```bash
KEYSTORE_PATH=/etc/secrets/keystore
KEYSTORE_PASSWORD=your_actual_password
GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/serviceAccountKey.json
CONTRACT_ADDRESS=0xDD0BbF48f85f5314C3754cd63103Be927B55986C
NODE_ENV=production
```

## Security Best Practices

### ✅ DO:
- Keep `~/render-secrets/` directory secure and backed up
- Store keystore password in a password manager
- Use encrypted keystore instead of plain private keys
- Verify `.env` is in `.gitignore`
- Use different wallets for testnet and mainnet
- Regularly rotate Firebase service account keys
- Keep backup copies of keystore and service account key in secure location

### ❌ DON'T:
- Never commit `.env` file to git
- Never commit `serviceAccountKey.json` to git
- Never commit keystore files to git
- Never share keystore password in plain text
- Never use production keys in development environment
- Never store private keys unencrypted

## Backup Strategy

### What to Backup:
1. **Keystore file** - `~/render-secrets/keystore`
2. **Keystore password** - Store in password manager
3. **Service Account Key** - `~/render-secrets/serviceAccountKey.json`
4. **Wallet seed phrase** - If you have it (most secure backup)

### Where to Store Backups:
- Encrypted external drive
- Password manager (1Password, Bitwarden, etc.)
- Hardware security key
- Secure cloud storage (encrypted)

### Recovery Process:
If you lose access to the keystore:
1. Restore from backup in `~/render-secrets/`
2. Or restore wallet from seed phrase
3. Or create new wallet and transfer contract ownership

If you lose Firebase service account key:
1. Restore from backup
2. Or generate new key from Firebase Console
3. Update Render secret file with new key

## File Verification

To verify your secret files are properly set up:

```bash
# Check render-secrets directory
ls -la ~/render-secrets/

# Verify keystore exists and is valid JSON
cat ~/render-secrets/keystore | jq . > /dev/null && echo "✓ Keystore is valid JSON"

# Verify service account key exists and is valid JSON
cat ~/render-secrets/serviceAccountKey.json | jq . > /dev/null && echo "✓ Service account key is valid JSON"

# Test keystore decryption (from project root)
node test-keystore.js
```

## Troubleshooting

### "Keystore file not found"
- Check that `~/render-secrets/keystore` exists
- Verify `KEYSTORE_PATH` environment variable is set correctly

### "Failed to decrypt keystore"
- Verify password is correct
- Check that keystore file is valid JSON
- Ensure file isn't corrupted

### "Firebase authentication failed"
- Verify `serviceAccountKey.json` exists
- Check `GOOGLE_APPLICATION_CREDENTIALS` path is correct
- Ensure Firebase project has Firestore enabled

## Additional Resources

- [Foundry Keystore Documentation](https://book.getfoundry.sh/reference/cast/cast-wallet-import)
- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Render Secret Files](https://render.com/docs/configure-environment-variables#secret-files)
- [ERC-2335 Keystore Standard](https://eips.ethereum.org/EIPS/eip-2335)

## Related Documentation

- [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) - Full deployment guide
- [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) - Firebase configuration
- [KEYSTORE_TEST_RESULTS.md](../KEYSTORE_TEST_RESULTS.md) - Test results

---

**Last Updated:** January 2, 2026  
**Maintained By:** Project Owner
