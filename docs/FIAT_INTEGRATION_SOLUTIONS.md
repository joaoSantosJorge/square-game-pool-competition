# Fiat Payment Integration for Non-Crypto Users

## Plan Summary

**Goal:** Enable non-crypto users to participate in the prize pool competition

**Status:** Research complete - Implementation decision pending

---

## Problem Statement

Allow non-crypto users to:
1. Pay via traditional bank transfer to play the game
2. Have their scores tracked (currently uses wallet addresses)
3. Receive rewards in their bank account if they win

**Constraint:** The underlying blockchain mechanism (USDC prize pool on Base) should remain the same.

---

## Part 1: User Identity Solutions (Replacing Wallet Addresses)

The current system uses wallet addresses as unique identifiers in Firestore (`scores/{walletAddress}`). For non-crypto users, we need alternative identifiers.

### Solution 1A: Email-Based Identity

**How It Works:**
- User registers with email address
- Email becomes primary key: `scores/{email}` or `scores/{hashedEmail}`
- Verification via magic link or OTP code

**Implementation:**
```javascript
// Firestore schema change
scores/{uniqueId}: {
  identifierType: "email",
  email: "user@example.com",
  walletAddress: null,  // Optional, linked later
  score: 250,
  timestamp: Timestamp
}
```

**Linking to Wallet Later:**
- Add "Link Wallet" button in profile
- User connects wallet, signs message proving ownership
- Store in `userProfiles/{email}.walletAddress`

| Pros | Cons |
|------|------|
| Familiar to all users | Requires email access |
| No crypto knowledge needed | Spam/disposable email risk |
| Firebase Auth built-in support | Extra verification step |

**Complexity:** Low-Medium
**Services:** Firebase Authentication (built-in)

---

### Solution 1B: Phone-Based Identity (SMS)

**How It Works:**
- User enters phone number
- OTP sent via Twilio Verify API
- Phone number becomes unique identifier

**Cost:** ~$0.05 per verification

| Pros | Cons |
|------|------|
| Fast verification | Privacy concerns |
| High security (possession-based) | International SMS unreliable |
| Familiar UX | Cost per verification |

**Complexity:** Medium
**Services:** Twilio Verify, Firebase Phone Auth

---

### Solution 1C: Social Login (Google, Apple, etc.)

**How It Works:**
- User clicks "Sign in with Google/Apple"
- OAuth flow provides unique `uid`
- Use Firebase `uid` as identifier: `scores/{uid}`

**Firebase Auth Supports:**
- Google Sign-In
- Apple Sign-In
- Facebook Login
- Twitter/X
- GitHub
- Discord

| Pros | Cons |
|------|------|
| 1-click onboarding | Requires existing account |
| No passwords to remember | Third-party dependency |
| Firebase native support | Privacy concerns |

**Complexity:** Low
**Services:** Firebase Authentication (already in stack)

---

### Solution 1D: Embedded Wallets (Best of Both Worlds) ⭐ RECOMMENDED

**How It Works:**
- User logs in with email/Google/social
- Non-custodial wallet created automatically (invisible to user)
- User never sees seed phrases
- Can transact on-chain immediately

**Providers:**

| Provider | Social Login | Embedded Wallet | Pricing |
|----------|--------------|-----------------|---------|
| **Privy** | Yes | Yes | Usage-based |
| **Web3Auth** | Yes | Yes | Free tier, then usage |
| **Dynamic** | Yes | Yes | Usage-based |
| **Magic Link** | Yes | Yes | Free tier, then usage |
| **Coinbase Smart Wallet** | Yes (passkeys) | Yes | Usage-based |

**Why This Is Best:**
- User experience identical to Web2 (email login)
- Wallet address available immediately for leaderboard
- No need to "link wallet later" - they already have one
- Can claim on-chain rewards without understanding crypto

**Implementation with Privy:**
```javascript
// User logs in with email
const { user, login } = usePrivy();
await login({ email: "user@example.com" });

// Embedded wallet automatically created
const wallet = user.wallet;
const address = wallet.address; // Use this for leaderboard

// User can claim rewards - Privy handles signing
await wallet.sendTransaction({...});
```

| Pros | Cons |
|------|------|
| Best UX - simple login + crypto ready | Vendor dependency |
| No "link wallet" step needed | Additional SDK integration |
| Progressive disclosure | Cost at scale |
| Used by pump.fun, Jupiter, Zora | |

**Complexity:** Medium
**Recommended Provider:** Privy (powers 75M+ accounts)

---

### Solution 1E: Traditional Username/Password

**How It Works:**
- User creates account with username/password
- Username or generated `userId` becomes identifier

| Pros | Cons |
|------|------|
| Familiar | Security concerns |
| Works offline | Password management burden |
| No third-party dependency | Poor UX by 2026 standards |

**Not recommended** for new applications.

---

## Part 2: Fiat Payment Solutions (On-Ramp)

### Critical Issue: Micropayment Fees

For $0.02 per-play payments:
- **Stripe:** $0.30 + 2.9% = $0.30058 per transaction (1502% of value!)
- **PayPal:** $0.05 + 5% = $0.051 per transaction (255% of value!)

**Solution:** Prepaid credits/balance system - users load $5-$50, spend in $0.02 increments internally.

---

### Solution 2A: Stripe with Prepaid Credits ⭐ RECOMMENDED

**How It Works:**
1. User loads balance ($5 minimum) via Stripe
2. Credits stored in Firestore: `userProfiles/{id}.credits`
3. Each play deducts $0.02 from internal balance
4. No blockchain transaction per play

**Fee Analysis:**
| Deposit Amount | Stripe Fee | Effective Cost | Plays Enabled |
|----------------|------------|----------------|---------------|
| $5.00 | $0.45 (2.9% + $0.30) | $0.09/play | 50 plays |
| $10.00 | $0.59 | $0.059/play | 100 plays |
| $20.00 | $0.88 | $0.044/play | 200 plays |

**Implementation:**
```javascript
// 1. User deposits via Stripe
const session = await stripe.checkout.sessions.create({
  line_items: [{ price: 'price_credits_5usd', quantity: 1 }],
  mode: 'payment',
  success_url: '/credits/success',
});

// 2. Webhook updates Firestore
await db.collection('userProfiles').doc(userId).update({
  credits: admin.firestore.FieldValue.increment(500) // 500 cents = $5
});

// 3. Each play deducts credits
await db.collection('userProfiles').doc(userId).update({
  credits: admin.firestore.FieldValue.increment(-2) // -$0.02
});
```

| Pros | Cons |
|------|------|
| Industry standard | Higher minimum deposit |
| Users trust Stripe | Custodial (you hold funds) |
| Simple integration | Must handle refunds |
| No gas fees per play | |

**Complexity:** Low-Medium
**Geographic Coverage:** Global

---

### Solution 2B: PayPal with Prepaid Credits

**How It Works:**
- Same as Stripe but using PayPal Checkout
- PayPal has micropayment-specific pricing: 5% + $0.05

**Fee Comparison for $5 deposit:**
- Stripe: $0.45 (9%)
- PayPal Standard: $0.45 (9%)
- PayPal Micropayment: $0.30 (6%)

| Pros | Cons |
|------|------|
| Higher user trust | Micropayment rate requires application |
| PayPal balance option | Can be slower to set up |
| Crypto payment option | |

**Complexity:** Low-Medium

---

### Solution 2C: Crypto On-Ramp (Transak/MoonPay)

**How It Works:**
1. User deposits fiat via Transak widget
2. Transak converts to USDC automatically
3. USDC sent to smart contract or user's embedded wallet
4. Existing game flow continues

**Best Provider: Transak**
- **Fee:** 1% flat (best in market)
- **Minimum:** ~$20
- **Coverage:** 100+ countries
- **Integration:** "5 minutes" with widget

**Alternative: MoonPay**
- **Fee:** 4.5% or $5 minimum
- **Coverage:** 180+ countries
- **Brand:** Most recognized

| Pros | Cons |
|------|------|
| User gets real USDC | Higher minimum ($20+) |
| Decentralized (user controls funds) | KYC required |
| Integrates with existing contract | Higher fees for small amounts |

**Complexity:** Low
**Best For:** Users who want to own their crypto

---

### Solution 2D: Bank Transfer (SEPA/ACH) Direct

**How It Works:**
- Accept direct bank transfers via Stripe ACH or SEPA
- Lower fees than card payments

**Stripe ACH Fees:** 0.8% (max $5)

| Pros | Cons |
|------|------|
| Much lower fees | Slower (2-5 days) |
| Good for larger deposits | US/EU only |
| No card required | |

**Complexity:** Medium

---

### Solution 2E: Wise Business API

**How It Works:**
- Accept international bank transfers
- Multi-currency accounts
- ~0.53% average fee

**Best For:** International users depositing larger amounts

**Complexity:** Medium-High

---

## Part 3: Fiat Payout Solutions (Off-Ramp)

### Solution 3A: PayPal Payouts ⭐ RECOMMENDED FOR SIMPLICITY

**How It Works:**
1. Winner provides PayPal email
2. Platform sends payout via PayPal Mass Pay API
3. User receives funds in PayPal balance
4. User withdraws to bank

**Fees:**
- 2% of transaction (capped at $20)
- Recipient pays nothing

**Example:**
| Prize Amount | Fee | Winner Receives |
|--------------|-----|-----------------|
| $10 | $0.20 | $9.80 |
| $50 | $1.00 | $49.00 |
| $100 | $2.00 | $98.00 |

| Pros | Cons |
|------|------|
| Most users have PayPal | Requires PayPal account |
| Email-only requirement | 2% fee |
| Instant to PayPal balance | |
| 156+ countries | |

**Implementation:**
```javascript
const paypal = require('@paypal/payouts-sdk');

const payout = {
  sender_batch_header: {
    sender_batch_id: `prize_${cycleId}_${Date.now()}`,
    email_subject: "You won a prize!"
  },
  items: [{
    recipient_type: "EMAIL",
    amount: { value: "50.00", currency: "USD" },
    receiver: "winner@example.com",
    note: "Prize from Square Game - Cycle #42"
  }]
};

await paypalClient.execute(new paypal.payouts.PayoutsPostRequest().requestBody(payout));
```

**Complexity:** Low
**KYC:** Recipients need PayPal account (PayPal handles their KYC)

---

### Solution 3B: Wise Business API

**How It Works:**
1. Winner provides bank details
2. Platform sends via Wise API
3. Direct deposit to bank account

**Fees:** ~0.53% average (very competitive)
**Minimum:** ~$5 receive amount

| Pros | Cons |
|------|------|
| Lowest fees | Requires bank details |
| 160+ countries | Slightly more complex UX |
| Mid-market exchange rate | |

**Complexity:** Medium

---

### Solution 3C: Stripe Connect Payouts

**How It Works:**
1. Winner creates Stripe "Connected Account" (KYC onboarding)
2. Platform transfers funds
3. Winner withdraws to bank

**Fees:**
- Standard payouts: FREE
- Instant payouts: 1% (min $0.50)

| Pros | Cons |
|------|------|
| Free standard payouts | Full KYC required |
| Professional experience | Complex onboarding |
| Instant option available | |

**Complexity:** Medium-High
**Best For:** Larger, recurring winners

---

### Solution 3D: Crypto Off-Ramp (Transak/MoonPay)

**How It Works:**
1. Winner has USDC in embedded wallet (from Privy)
2. Initiates off-ramp via Transak
3. USDC converted to fiat, sent to bank

**Transak Off-Ramp:**
- **Fee:** 1% flat
- **Coverage:** 64+ countries
- **Speed:** Minutes to same-day

| Pros | Cons |
|------|------|
| Seamless if using embedded wallets | KYC required |
| User controls funds | User must initiate |
| 1% fee is competitive | |

**Complexity:** Low (if already using Privy/Web3Auth)

---

### Solution 3E: Prepaid/Gift Cards (Reloadly)

**How It Works:**
1. Winner selects gift card preference
2. Platform purchases via Reloadly API
3. Digital card delivered instantly via email

**Best For:** Small prizes ($5-$25), international users without bank accounts

| Pros | Cons |
|------|------|
| Instant delivery | Not real money |
| No bank account needed | Limited flexibility |
| Works globally | Card selection varies by region |

**Complexity:** Low

---

## Part 4: Recommended Architecture

### Option A: Simplest Implementation (Firebase Auth + Stripe + PayPal)

```
┌─────────────────────────────────────────────────────────────┐
│                     USER JOURNEY                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. SIGNUP: Email/Google via Firebase Auth                  │
│     └─> Firebase UID as identifier                          │
│                                                             │
│  2. DEPOSIT: $5+ via Stripe                                 │
│     └─> Credits stored in Firestore                         │
│                                                             │
│  3. PLAY: Deduct $0.02 per game from credits                │
│     └─> No blockchain transaction                           │
│                                                             │
│  4. LEADERBOARD: Track by Firebase UID                      │
│     └─> Same Firestore structure                            │
│                                                             │
│  5. WIN: Prize allocated                                    │
│     └─> Stored as "pending payout" in Firestore             │
│                                                             │
│  6. CLAIM: Enter PayPal email                               │
│     └─> Payout via PayPal Mass Pay API                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Changes Required:**
- Add Firebase Auth (social login)
- Add Stripe checkout for credits
- Add PayPal Payouts integration
- Update leaderboard to use UID instead of wallet
- Add "pending payouts" system

**Pros:** Simple, familiar to users, low integration complexity
**Cons:** Custodial (you hold funds), separate from blockchain

---

### Option B: Best UX with Embedded Wallets (Privy + Transak) ⭐ RECOMMENDED

```
┌─────────────────────────────────────────────────────────────┐
│                     USER JOURNEY                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. SIGNUP: Email/Google via Privy                          │
│     └─> Embedded wallet created automatically               │
│     └─> Wallet address used for leaderboard                 │
│                                                             │
│  2. DEPOSIT: Fiat via Transak (1% fee)                      │
│     └─> USDC sent to embedded wallet                        │
│                                                             │
│  3. PLAY: payToPlay() via embedded wallet                   │
│     └─> Existing smart contract unchanged                   │
│     └─> Privy handles signing seamlessly                    │
│                                                             │
│  4. LEADERBOARD: Same as now (wallet address)               │
│     └─> No changes needed                                   │
│                                                             │
│  5. WIN: Prize allocated to wallet on-chain                 │
│     └─> Existing allocateFunds() unchanged                  │
│                                                             │
│  6. CLAIM: Two options                                      │
│     ├─> claimReward() to embedded wallet (existing)         │
│     └─> Off-ramp via Transak to bank (1% fee)               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Changes Required:**
- Replace wallet.js with Privy SDK
- Add Transak on-ramp widget
- Add Transak off-ramp option for claims
- Minimal backend changes (wallet address still used)

**Pros:**
- Best UX (email login + crypto capabilities)
- Existing smart contract unchanged
- User owns their funds (non-custodial)
- Progressive disclosure (crypto-curious can explore)

**Cons:**
- Privy costs at scale
- Transak minimum ~$20 for deposits
- User must complete KYC for off-ramp

---

### Option C: Hybrid (Support Both Crypto and Fiat Users)

```
┌─────────────────────────────────────────────────────────────┐
│                   TWO PARALLEL PATHS                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PATH 1: CRYPTO USERS (existing)                            │
│  ├─> Connect MetaMask/Phantom/WalletConnect                 │
│  ├─> Pay with USDC directly                                 │
│  ├─> Claim rewards on-chain                                 │
│                                                             │
│  PATH 2: FIAT USERS (new)                                   │
│  ├─> Login with email/Google (Firebase Auth)                │
│  ├─> Deposit via Stripe → Credits                           │
│  ├─> Play using credits                                     │
│  ├─> Claim via PayPal payout                                │
│                                                             │
│  SHARED:                                                    │
│  ├─> Same game                                              │
│  ├─> Same leaderboard (unified by mapping IDs)              │
│  └─> Same prize pool                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Complexity:** High (maintaining two systems)

---

## Part 5: Database Schema Changes

### Updated Firestore Schema

```javascript
// scores/{uniqueId}
{
  uniqueId: "firebase-uid" | "0x...",
  identifierType: "firebase" | "wallet" | "privy",

  // For wallet users
  walletAddress: "0x..." | null,

  // For Firebase Auth users
  firebaseUid: "abc123" | null,
  email: "user@example.com" | null,

  // For Privy users (has both)
  privyUserId: "privy-user-123" | null,
  embeddedWalletAddress: "0x..." | null,

  // Game data (unchanged)
  score: 250,
  timestamp: Timestamp,
  playerName: "0x12...ab" | "john@..." | "John D."
}

// userProfiles/{uniqueId}
{
  // Identity
  identifierType: "firebase" | "wallet" | "privy",
  walletAddress: "0x..." | null,
  email: "user@example.com" | null,

  // For fiat users
  credits: 500,  // In cents ($5.00)

  // For fiat payouts
  payoutMethod: "paypal" | "wise" | "crypto" | null,
  paypalEmail: "user@example.com" | null,

  // Pending payouts (for fiat winners)
  pendingPayout: {
    amount: 5000,  // In cents ($50.00)
    cycleId: "scores_01-01-2026_to_08-01-2026",
    status: "pending" | "processing" | "completed"
  } | null,

  // Stats (unchanged)
  totalGamesPlayed: 100,
  totalDonationsUSDC: 10.00,
  totalPrizesWonUSDC: 50.00
}
```

---

## Part 6: Cost Analysis

### Per-User Costs (Assuming $10 average deposit, $20 average prize)

| Component | Option A (Stripe+PayPal) | Option B (Privy+Transak) |
|-----------|-------------------------|--------------------------|
| Signup | Free | Free |
| Deposit $10 | $0.59 (Stripe 2.9%+$0.30) | $0.10 (Transak 1%) |
| 100 plays | Free (internal credits) | ~$0.10 gas (batched) |
| Claim $20 prize | $0.40 (PayPal 2%) | $0.20 (Transak 1%) |
| **Total** | **$0.99** | **$0.40** |

Option B is cheaper but has higher minimum deposit ($20 vs $5).

---

## Part 7: Implementation Priority

### Phase 1: Minimum Viable Fiat
1. Add Firebase Auth (Google Sign-In)
2. Add Stripe checkout for credits
3. Update leaderboard to support Firebase UID
4. Add PayPal Payouts for winners

### Phase 2: Enhanced UX
1. Integrate Privy for embedded wallets
2. Add Transak on-ramp widget
3. Add Transak off-ramp for claims

### Phase 3: Polish
1. Unified profile showing both crypto and fiat stats
2. Better onboarding flow
3. Email notifications for wins

---

## Recommendation

**For fastest implementation:** Option A (Firebase Auth + Stripe + PayPal)
- Familiar to all users
- Lower minimum deposit ($5)

**For best long-term UX:** Option B (Privy + Transak)
- Users get real crypto exposure
- Smart contract unchanged
- Non-custodial (you don't hold funds)

**My recommendation:** Start with Option B (Privy + Transak) because:
1. It doesn't require maintaining two separate systems
2. The existing smart contract works unchanged
3. Users can graduate to full crypto if interested
4. Lower total fees per user

---

*Document created: January 2026*
