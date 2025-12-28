# Firebase Setup Guide for Render Deployment

## Step 1: Get Firebase Service Account JSON

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the **gear icon** → **Project settings**
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. Download the JSON file (e.g., `serviceAccountKey.json`)
7. **KEEP THIS FILE SECURE - DO NOT COMMIT TO GIT!**

## Step 2: Local Development Setup

1. Place the downloaded JSON file in your project root as `serviceAccountKey.json`
2. Add to your `.gitignore`:
   ```
   serviceAccountKey.json
   .env
   ```

## Step 3: Render Deployment Setup

### Option A: Secret File (Recommended)

1. In Render dashboard, go to your service
2. Navigate to **Environment** tab
3. Scroll to **Secret Files** section
4. Click **Add Secret File**
5. Set:
   - **Filename**: `/etc/secrets/serviceAccountKey.json`
   - **Contents**: Paste your entire JSON file content
6. Add environment variable:
   - **Key**: `GOOGLE_APPLICATION_CREDENTIALS`
   - **Value**: `/etc/secrets/serviceAccountKey.json`

### Option B: Environment Variables (Alternative)

If Secret Files don't work, set each credential as environment variables:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKey\n-----END PRIVATE KEY-----\n"
```

Then update `cycleManager.js` to use these variables.

## Step 4: Verify Setup

Your `cycleManager.js` is already configured to:
- Use `GOOGLE_APPLICATION_CREDENTIALS` env var in production
- Fall back to local `serviceAccountKey.json` for development
- Handle errors gracefully

## Security Checklist

- [ ] `serviceAccountKey.json` is in `.gitignore`
- [ ] `.env` file is in `.gitignore`
- [ ] Service account JSON is NOT committed to git
- [ ] In Render, credentials are stored as Secret File
- [ ] Local `.env` file has the correct path

## Testing

**Local:**
```bash
# Make sure serviceAccountKey.json is in project root
node js/cycleManager.js
# Should see: "Firebase initialized with local service account"
```

**Render:**
After deployment, check logs for:
```
Firebase initialized with service account from: /etc/secrets/serviceAccountKey.json
```

## Troubleshooting

**Error: "ENOENT: no such file or directory"**
- Local: Ensure `serviceAccountKey.json` exists
- Render: Check that Secret File path matches `GOOGLE_APPLICATION_CREDENTIALS`

**Error: "credential implementation provided to initializeApp() via the 'credential' property failed"**
- Verify JSON file is valid
- Check that file has correct permissions
- Ensure private key is properly formatted

**Need help?** Check [Firebase Admin SDK docs](https://firebase.google.com/docs/admin/setup)
