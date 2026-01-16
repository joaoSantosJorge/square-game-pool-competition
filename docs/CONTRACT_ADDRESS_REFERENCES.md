# Contract Address References

This document lists all locations where the FlappyBirdPrizePool contract address is referenced in the codebase.

**Current Contract Address:** `0xdd0bbf48f85f5314c3754cd63103be927b55986c`

---

## ✅ Centralized Configuration (Implemented)

All frontend files now use a single config file. **To change the contract address, update only ONE file:**

### 📁 `frontend/js/config.js`

```javascript
const CONFIG = {
    CONTRACT_ADDRESS: '0xdd0bbf48f85f5314c3754cd63103be927b55986c',  // ← Change this
    USDC_ADDRESS: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    CHAIN_ID: 84532,
    RPC_URL: 'https://sepolia.base.org',
    // ... other config
};
```

---

## 📁 Files Using Centralized Config

These files import `config.js` and reference `CONFIG.CONTRACT_ADDRESS`:

| File | Usage |
|------|-------|
| [frontend/js/payments.js](../frontend/js/payments.js) | Payment processing |
| [frontend/index.html](../frontend/index.html) | Prize pool display |
| [frontend/admin.html](../frontend/admin.html) | Admin dashboard |
| [frontend/profile.html](../frontend/profile.html) | User profile page |
| [frontend/game.html](../frontend/game.html) | Game page (imports payments.js) |

---

## 📁 Backend Files (Environment Variables)

Backend files use environment variables (unchanged):

| File | Variable | Notes |
|------|----------|-------|
| [functions/cycleManager.js](../functions/cycleManager.js) | `process.env.CONTRACT_ADDRESS` | ✅ Uses env var |
| [functions/.env](../functions/.env) | `CONTRACT_ADDRESS` | Update this for backend |
| [functions/.env.local](../functions/.env.local) | `CONTRACT_ADDRESS` | Local config |

---

## ✅ Quick Update Checklist

When deploying a new contract:

1. **Frontend (1 file):**
   - [ ] `frontend/js/config.js` - Update `CONTRACT_ADDRESS`

2. **Backend (2 files):**
   - [ ] `functions/.env` - Update `CONTRACT_ADDRESS`
   - [ ] `functions/.env.local` - Update `CONTRACT_ADDRESS`
   - [ ] Redeploy: `firebase deploy --only functions`

3. **Documentation (optional):**
   - [ ] `README.md` - Update contract info section

---

## Documentation Files (Reference Only)

These contain the address for documentation purposes:

| File | Notes |
|------|-------|
| [README.md](../README.md) | Project documentation |
| [docs/SECRET_KEY_MANAGEMENT.md](SECRET_KEY_MANAGEMENT.md) | Setup guide |
| [docs/ADMIN_DASHBOARD_IMPLEMENTATION.md](ADMIN_DASHBOARD_IMPLEMENTATION.md) | Implementation docs |
