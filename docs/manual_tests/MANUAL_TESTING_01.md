# End-to-End Manual Testing Guide

Complete testing checklist for the Square Game Prize Pool application.

**Contract Address:** `0x5b498d19A03E24b5187d5B71B80b02C437F9cE08`
**Network:** Base Sepolia (Chain ID: 84532)
**USDC Address:** `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

---

## Prerequisites

### Required Tools
- [x] Browser with MetaMask extension installed
- [x] Phantom wallet (browser extension or mobile)
- [x] Mobile device for WalletConnect testing
- [x] Base Sepolia ETH for gas (get from faucet)
- [x] Base Sepolia USDC for testing

### Get Testnet Tokens
1. **Base Sepolia ETH:**
   - Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
   - Or: https://faucet.quicknode.com/base/sepolia

2. **Base Sepolia USDC:**
   - Bridge from Sepolia: https://bridge.base.org/
   - Or use Uniswap on Base Sepolia to swap ETH for USDC

### Test Wallets
Prepare at least 2-3 different wallet addresses for testing:

| Wallet | Address | Purpose |
|--------|---------|---------|
| Wallet 1 | | Main testing (MetaMask) |
| Wallet 2 | | Secondary testing (Phantom) |
| Wallet 3 | | Mobile testing (WalletConnect) |

---

## 1. Home Page (index.html)

### Display Tests
- [x] Page loads without errors
- [x] Prize pool amount displays correctly (should match contract `totalPool`)
- [x] Cycle countdown timer shows correct time remaining
- [x] "Play Now" button is visible and clickable
- [x] "Donate" button is visible and clickable
- [x] Leaderboard preview shows top players (if any)

### Verification
```
Expected: Prize pool shows "X.XX USDC"
Expected: Timer shows "Xd Xh Xm Xs" countdown
```

---

## 2. Wallet Connection

### 2.1 MetaMask Connection
- [x] Click "Connect Wallet" button
- [x] Wallet modal appears with options
- [x] Select MetaMask
- [x] MetaMask popup appears requesting connection
- [x] Approve connection in MetaMask
- [x] Wallet address appears in UI (truncated format: 0x1234...5678)
- [x] Network is Base Sepolia (if wrong network, prompt to switch)

### 2.2 Phantom Connection
- [ ] Click "Connect Wallet" button
- [ ] Select Phantom option
- [ ] Phantom popup appears
- [ ] Approve connection
- [ ] Wallet address displays correctly

### 2.3 WalletConnect Connection
- [x] Click "Connect Wallet" button
- [x] Select WalletConnect option
- [x] QR code appears
- [x] Scan with mobile wallet (Trust Wallet, MetaMask Mobile, etc.)
- [x] Approve connection on mobile
- [x] Desktop shows connected state
- [x] Wallet address displays correctly

### 2.4 Disconnect Tests
- [x] Disconnect button works
- [x] UI returns to "Connect Wallet" state
- [x] Reconnecting works after disconnect

### 2.5 Account Switching
- [x] Switch account in wallet
- [x] UI updates to show new address
- [x] Previous session data clears appropriately

---

## 3. Payment Flow (Pay to Play)

### 3.1 USDC Approval
- [x] Navigate to game page
- [x] Click "Pay to Play" (or similar button)
- [x] If first time: USDC approval transaction appears
- [x] Approve USDC spending in wallet
- [x] Transaction confirms on chain

### 3.2 Pay to Play Transaction
- [x] After approval, pay transaction appears
- [x] Shows correct amount (0.02 USDC)
- [x] Confirm transaction in wallet
- [x] Transaction confirms on chain
- [x] UI updates: "Tries remaining: 10"
- [x] Prize pool increases by 0.02 USDC

### Verification
```bash
# Check contract state after payment
cast call 0x5b498d19A03E24b5187d5B71B80b02C437F9cE08 "totalPool()" --rpc-url https://sepolia.base.org
```

### Error Cases
- [x] Insufficient USDC balance shows appropriate error
- [x] Rejected transaction shows error message
- [x] Network error shows retry option

---

## 4. Game Play (game.html)

### 4.1 Game Loading
- [x] Game canvas loads correctly
- [x] Instructions/start screen appears
- [x] Leaderboard sidebar displays

### 4.2 Gameplay
- [x] Press space/click to start
- [x] Bird responds to input (flap)
- [x] Pipes generate and move correctly
- [x] Score increments when passing pipes
- [x] Collision detection works (game ends on hit)
- [x] Game over screen shows final score

### 4.3 Tries System
- [x] Tries counter shows remaining attempts
- [x] Each game decrements tries by 1
- [x] When tries = 0, prompt to pay again
- [x] Cannot play without tries

### 4.4 Score Submission
- [x] After game over, score submits automatically
- [x] Loading indicator during submission
- [x] Success message after submission
- [x] Leaderboard updates with new score (if high enough)

---

## 5. Leaderboard

### 5.1 Display
- [x] Shows top 10 (or configured number) players
- [x] Each entry shows: Rank, Address (truncated), Score
- [x] Current user's entry highlighted (if on leaderboard)
- [x] Scores sorted descending

### 5.2 Real-time Updates
- [x] New scores appear without page refresh
- [x] Rankings update correctly when new high score submitted

### 5.3 Edge Cases
- [x] Empty leaderboard shows appropriate message
- [ ] Very long scores display correctly
- [ ] Duplicate scores handled correctly 

---

## 6. Profile Page (profile.html)

### 6.1 Without Wallet Connected
- [x] Shows "Connect Wallet" prompt
- [x] No personal data displayed

### 6.2 With Wallet Connected
- [x] Wallet address displays
- [x] Total games played shows
- [x] Total tries purchased shows
- [x] Best score displays
- [x] Current rank shows (if on leaderboard)
- [x] Total donations made displays
- [x] Total prizes won displays

### 6.3 Claim Rewards
- [ ] If rewards available: "Claim" button appears
- [ ] Shows claimable amount
- [ ] Click claim → wallet transaction appears
- [ ] Confirm transaction
- [ ] USDC transferred to wallet
- [ ] Claimable amount resets to 0
- [ ] Success message displayed

### Verification
```bash
# Check if user has rewards
cast call 0x5b498d19A03E24b5187d5B71B80b02C437F9cE08 "rewards(address)" YOUR_ADDRESS --rpc-url https://sepolia.base.org
```

---

## 7. Donation Flow

### 7.1 Make a Donation
- [x] Click "Donate" button (on home or game page)
- [x] Donation modal/form appears
- [x] Enter custom amount
- [x] Approval transaction (if needed)
- [x] Donation transaction
- [x] Confirm in wallet
- [x] Transaction confirms
- [x] Prize pool increases by donation amount
- [x] Success message shown

### 7.2 Verification
- [x] Donation appears in profile history
- [x] Prize pool reflects new total

---

## 8. Admin Dashboard (admin.html)

### 8.1 Access Control
- [x] Non-owner cannot access admin functions
- [x] Owner wallet can access all functions

### 8.2 View Current Settings
- [x] Cycle duration displays
- [x] Number of winners displays
- [x] Fee percentage displays
- [x] Current cycle start/end time displays

### 8.3 Update Cycle Duration
- [x] Change cycle duration (1-365 days)
- [x] Submit change
- [x] Confirm transaction
- [x] New duration reflected in UI

### 8.4 Update Number of Winners
- [x] Change winner count (1-10)
- [x] Submit change
- [x] Setting updates in database

### 8.5 Update Fee Percentage
- [x] Change fee (0-50%)
- [x] Submit change
- [x] Setting updates in database

### 8.6 Force Allocation (Testing)
- [x] Click "Force Allocate" (if available)
- [x] Allocation transaction executes
- [x] Winners receive rewards
- [x] Pool resets
- [x] New cycle starts

---

## 9. Cycle End & Allocation

### 9.1 Automatic Cycle End
- [ ] Wait for cycle timer to reach 0
- [ ] Or trigger manually via Cloud Function
- [ ] Allocation transaction executes
- [ ] Top N players receive allocated rewards
- [ ] Fee transferred to owner
- [ ] Scores archived
- [ ] New cycle begins
- [ ] Timer resets

### 9.2 Winner Allocation Percentages
For 3 winners with 10% fee:
| Place | Percentage of Pool |
|-------|-------------------|
| 1st | 54% |
| 2nd | 27% |
| 3rd | 9% |
| Fee | 10% |

### 9.3 Verification
- [ ] Check `rewards[address]` for each winner
- [ ] Verify amounts match expected percentages
- [ ] Check scores archived to `scores_DD-MM-YYYY_to_DD-MM-YYYY`

---

## 10. Archive Page (archive.html)

### 10.1 Display
- [x] List of past cycles appears
- [x] Each cycle shows date range
- [x] Click cycle to view leaderboard

### 10.2 Historical Leaderboard
- [x] Shows final rankings for selected cycle
- [x] Winner addresses displayed
- [x] Scores shown
- [ ] Prize amounts shown (if available)

---

## 11. Mobile Testing

### 11.1 iOS Safari
- [ ] Home page renders correctly
- [ ] WalletConnect works
- [ ] Game playable (touch controls)
- [ ] Score submission works
- [ ] Profile page displays correctly

### 11.2 Android Chrome
- [ ] Home page renders correctly
- [ ] WalletConnect works
- [ ] MetaMask mobile browser works
- [ ] Game playable (touch controls)
- [ ] Score submission works

### 11.3 Responsive Design
- [ ] Layout adapts to screen size
- [ ] Buttons are tappable (appropriate size)
- [ ] Text readable without zooming
- [ ] No horizontal scroll

---

## 12. Error Handling

### 12.1 Network Errors
- [x] RPC error shows user-friendly message
- [x] Retry option available
- [] App recovers after network restored

### 12.2 Transaction Failures
- [x] Rejected transaction shows message
- [x] Reverted transaction shows reason
- [x] User can retry after failure

### 12.3 Wrong Network
- [x] Prompt to switch to Base Sepolia
- [x] One-click network switch works
- [ ] App state updates after switch

### 12.4 Wallet Disconnection
- [ ] Unexpected disconnect handled gracefully
- [ ] User prompted to reconnect
- [ ] Session state preserved where appropriate

---

## 13. Security Tests

### 13.1 Score Manipulation
- [ ] Cannot submit score without playing
- [ ] Cannot submit impossibly high scores
- [ ] Cannot submit scores for other addresses

### 13.2 Payment Bypass
- [ ] Cannot play without paying
- [ ] Cannot get tries without transaction
- [ ] Tries deducted server-side (not client-only)

### 13.3 Admin Protection
- [ ] Non-owners cannot call admin functions
- [ ] Admin endpoints require authentication

---

## 14. Performance Tests

### 14.1 Load Times
- [ ] Home page loads in < 3 seconds
- [ ] Game page loads in < 3 seconds
- [ ] Leaderboard loads in < 2 seconds

### 14.2 Game Performance
- [ ] Smooth 60fps gameplay
- [ ] No lag during score submission
- [ ] No memory leaks after multiple games

---

## Test Results Summary

| Section | Pass | Fail | Notes |
|---------|------|------|-------|
| Home Page | | | |
| Wallet Connection | | | |
| Payment Flow | | | |
| Game Play | | | |
| Leaderboard | | | |
| Profile Page | | | |
| Donation | | | |
| Admin Dashboard | | | |
| Cycle End | | | |
| Archive | | | |
| Mobile | | | |
| Error Handling | | | |
| Security | | | |
| Performance | | | |

---

## Issues Found

| # | Section | Description | Severity | Status |
|---|---------|-------------|----------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

**Severity Levels:** Critical, High, Medium, Low

---

## Useful Commands

### Check Contract State
```bash
# Total pool
cast call 0x5b498d19A03E24b5187d5B71B80b02C437F9cE08 "totalPool()" --rpc-url https://sepolia.base.org

# Play cost
cast call 0x5b498d19A03E24b5187d5B71B80b02C437F9cE08 "playCost()" --rpc-url https://sepolia.base.org

# Check rewards for address
cast call 0x5b498d19A03E24b5187d5B71B80b02C437F9cE08 "rewards(address)" YOUR_ADDRESS --rpc-url https://sepolia.base.org

# Funds allocated?
cast call 0x5b498d19A03E24b5187d5B71B80b02C437F9cE08 "fundsAllocated()" --rpc-url https://sepolia.base.org
```

### Check USDC Balance
```bash
cast call 0x036CbD53842c5426634e7929541eC2318f3dCF7e "balanceOf(address)" YOUR_ADDRESS --rpc-url https://sepolia.base.org
```

### View on Explorer
- Contract: https://sepolia.basescan.org/address/0x5b498d19A03E24b5187d5B71B80b02C437F9cE08
- USDC: https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e

### Check Admin Configuration (Firestore)
```bash
# Get all admin settings (cycle duration, number of winners, fee percentage)
curl -s "https://us-central1-flappy-bird-leaderboard-463e0.cloudfunctions.net/getAdminConfig" | jq

# Expected response:
# {
#   "success": true,
#   "config": {
#     "cycleDurationDays": 7,
#     "numberOfWinners": 3,
#     "feePercentage": 10
#   }
# }
```

### Check Play Cost (Contract)
```bash
# Play cost in USDC (returns value in 6 decimals, divide by 1000000 for USDC)
cast call 0x5b498d19A03E24b5187d5B71B80b02C437F9cE08 "playCost()" --rpc-url https://sepolia.base.org

# Convert hex to decimal (example: 0x4e20 = 20000 = 0.02 USDC)
cast --to-dec $(cast call 0x5b498d19A03E24b5187d5B71B80b02C437F9cE08 "playCost()" --rpc-url https://sepolia.base.org)
```

---

**Last Updated:** January 2026
**Tester:** joao
**Date Tested:** 25 January 2026
