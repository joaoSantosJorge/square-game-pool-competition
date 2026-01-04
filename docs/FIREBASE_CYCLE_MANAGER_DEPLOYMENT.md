# Deploying Cycle Manager to Firebase Cloud Functions

## Overview

This guide explains how to deploy the cycleManager.js service to Firebase Cloud Functions. This is a **free alternative** to Render for running your automated prize pool cycle manager. Firebase offers generous free tier limits suitable for this use case.

## Why Firebase?

- ✅ **Free tier**: 2 million invocations/month, 400,000 GB-seconds/month
- ✅ **Native Firestore integration**: Already using Firebase for your database
- ✅ **Built-in scheduling**: Cloud Scheduler included at no cost
- ✅ **Secure secret management**: Environment variables built-in
- ✅ **No billing required**: Unlike Render workers which charge for continuous running

## Prerequisites

1. Firebase project (same one you're using for Firestore)
2. Foundry encrypted keystore file
3. Node.js installed locally
4. Firebase CLI installed

## Architecture

Instead of a continuously running worker, we'll use:
- **Scheduled Function**: Triggers every hour to check if cycle has ended
- **HTTP Function**: Manual trigger option for testing/emergency allocation

## Step 1: Install Firebase CLI

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize your project (if not already done)
cd /home/joaosantosjorge/x402-flappy-bird
firebase init functions
```

When prompted:
- Choose **JavaScript** (not TypeScript)
- Choose **Yes** to use ESLint
- Choose **Yes** to install dependencies

## Step 2: Prepare Your Keystore

### Option A: Use Keystore File (Recommended for Security)

Your encrypted keystore needs to be stored securely in Firebase. We'll use Firebase environment configuration.

1. **Export your keystore as base64**:
```bash
# Navigate to your keystore location
cd ~/.foundry/keystores/

# Encode your keystore to base64 (one line)
base64 -w 0 <your-keystore-name> > keystore-base64.txt

# Display the encoded keystore
cat keystore-base64.txt
```

2. **Save this base64 string** - you'll need it in Step 4.

### Option B: Use Plain Private Key (Not Recommended)

If you prefer to use a plain private key for testing:
```bash
cast wallet private-key <your-keystore-name>
```
Enter your password when prompted. **Do NOT use this method in production.**

## Step 3: Firebase Functions Structure

The Firebase Functions have been created in the `/functions` directory:

- `functions/cycleManager.js` - Main cycle manager logic
- `functions/index.js` - Entry point that exports the functions
- `functions/package.json` - Dependencies configuration

**Key differences from standalone version**:
- Uses scheduled triggers instead of continuous loop
- Keystore decrypted from base64 environment variable
- Separated into scheduled and HTTP callable functions
- Uses Firebase Functions config instead of environment variables

## Step 4: Configure Firebase Environment Variables

Set environment variables in Firebase:

```bash
# Set keystore configuration (base64 encoded)
firebase functions:config:set \
  keystore.data="<your-base64-encoded-keystore>" \
  keystore.password="<your-keystore-password>"

# Set contract configuration
firebase functions:config:set \
  contract.address="<your-contract-address>" \
  contract.cycle_days="7" \
  contract.winners="3" \
  contract.fee="1000"

# Set network configuration
firebase functions:config:set \
  network.rpc_url="https://sepolia.base.org" \
  network.name="base-sepolia"

# Set environment
firebase functions:config:set env="production"
```

**For local testing**, a `.runtimeconfig.json` file has been created in the `functions/` directory. Update it with your actual values:

- Replace `YOUR_BASE64_ENCODED_KEYSTORE_HERE` with your keystore
- Replace `YOUR_KEYSTORE_PASSWORD_HERE` with your password
- Update contract address if needed

## Step 5: Verify Functions Setup

The Firebase Functions have already been created and configured. Verify the setup:

```bash
cd functions
npm install
npm run lint
```

All files are located in the `/functions` directory:
- `cycleManager.js` - Main implementation with all cycle logic
- `index.js` - Exports the three Cloud Functions
- `package.json` - Dependencies already configured
- `.runtimeconfig.json` - Local testing configuration

## Step 6: Deploy to Firebase

```bash
# From project root
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:checkCycleScheduled
firebase deploy --only functions:checkCycleManual
```

## Step 7: Test Your Deployment

### Test Manual Trigger

Get your function URL from the deploy output, then:

```bash
# Test the manual check function
curl https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/checkCycleManual
```

### Test Force Allocation (Emergency)

```bash
curl https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/forceAllocate
```

**⚠️ Warning**: In production, add authentication to `forceAllocate`!

## Step 8: Monitor Your Functions

View logs in real-time:

```bash
firebase functions:log --only checkCycleScheduled
```

Or view in Firebase Console:
1. Go to https://console.firebase.google.com/
2. Select your project
3. Navigate to **Functions** in the left menu
4. Click on your function to see logs and metrics

## Cost Analysis

Firebase Cloud Functions free tier:
- **2,000,000 invocations/month**
- **400,000 GB-seconds/month**
- **200,000 CPU-seconds/month**
- **5GB outbound networking**

Your usage (hourly checks):
- ~720 invocations/month (24 × 30)
- Minimal compute time per invocation
- **Well within free tier! 💰**

## Comparison: Render vs Firebase

| Feature | Render (Worker) | Firebase Functions |
|---------|----------------|-------------------|
| **Cost** | $7/month minimum | FREE (within limits) |
| **Running** | Continuous | On-demand |
| **Scaling** | Manual | Automatic |
| **Setup** | Simple | Slightly more complex |
| **Firestore** | External connection | Native integration |
| **Best for** | Always-on services | Scheduled/triggered tasks |

## Security Best Practices

✅ **DO**:
- Use base64-encoded encrypted keystore
- Store password in Firebase config (not in code)
- Add authentication to HTTP functions
- Use different wallets for testnet/mainnet
- Monitor function logs regularly

❌ **DON'T**:
- Never commit keystore files or passwords to Git
- Don't use plain private keys in production
- Don't expose HTTP functions without authentication
- Don't share Firebase config values

## Troubleshooting

### Error: "Keystore configuration missing"
- Run `firebase functions:config:get` to verify config is set
- Ensure you deployed after setting config
- Check `.runtimeconfig.json` for local testing

### Error: "Failed to decrypt keystore"
- Verify base64 encoding is correct (no line breaks)
- Check password is correct
- Test keystore decryption locally first

### Function timeout
- Default timeout is 60 seconds
- Increase if needed: `functions.runWith({ timeoutSeconds: 300 })`

### Scheduled function not running
- Check Cloud Scheduler in Google Cloud Console
- Ensure billing is enabled (required for Cloud Scheduler, but still free tier)
- View scheduler logs for errors

## Local Testing

Test functions locally before deploying:

```bash
# Start Firebase emulator
firebase emulators:start --only functions

# In another terminal, trigger function
curl http://localhost:5001/YOUR-PROJECT/us-central1/checkCycleManual
```

## Production Checklist

- [ ] Base64-encoded keystore uploaded to Firebase config
- [ ] Keystore password set in Firebase config
- [ ] Contract address configured correctly
- [ ] Cycle duration set to 7 days
- [ ] Tested on testnet first
- [ ] Scheduled function deployed successfully
- [ ] Manual trigger function tested
- [ ] Logs monitored for first few cycles
- [ ] Firestore database has proper indexes
- [ ] Backed up keystore file securely
- [ ] Documented keystore password securely

## Migrating from Render

If you're currently using Render:

1. Deploy to Firebase following this guide
2. Test Firebase deployment thoroughly
3. Monitor both for 1-2 cycles
4. Once confident, disable Render worker
5. Delete Render service to stop billing

## Support Resources

- **Firebase Functions Docs**: https://firebase.google.com/docs/functions
- **Firebase Console**: https://console.firebase.google.com/
- **Firestore Console**: View your cycleState collection
- **Cloud Scheduler**: Google Cloud Console → Cloud Scheduler

---

**You're now running your cycle manager for FREE on Firebase! 🎉**
