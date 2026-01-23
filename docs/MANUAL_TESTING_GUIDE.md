# End-to-End Manual Testing Guide

Complete testing checklist for the Square Game Prize Pool application.

**Contract Address:** `0x5b498d19A03E24b5187d5B71B80b02C437F9cE08`
**Network:** Base Sepolia (Chain ID: 84532)
**USDC Address:** `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

---

## Prerequisites

### Required Tools
- [ ] Browser with MetaMask extension installed
- [ ] Phantom wallet (browser extension or mobile)
- [ ] Mobile device for WalletConnect testing
- [ ] Base Sepolia ETH for gas (get from faucet)
- [ ] Base Sepolia USDC for testing

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
- [ ] Page loads without errors
- [ ] Prize pool amount displays correctly (should match contract `totalPool`)
- [ ] Cycle countdown timer shows correct time remaining
- [ ] "Play Now" button is visible and clickable
- [ ] "Donate" button is visible and clickable
- [ ] Leaderboard preview shows top players (if any)

### Verification
```
Expected: Prize pool shows "X.XX USDC"
Expected: Timer shows "Xd Xh Xm Xs" countdown
```

---

## 2. Wallet Connection

### 2.1 MetaMask Connection
- [ ] Click "Connect Wallet" button
- [ ] Wallet modal appears with options
- [ ] Select MetaMask
- [ ] MetaMask popup appears requesting connection
- [ ] Approve connection in MetaMask
- [ ] Wallet address appears in UI (truncated format: 0x1234...5678)
- [ ] Network is Base Sepolia (if wrong network, prompt to switch)

### 2.2 Phantom Connection
- [ ] Click "Connect Wallet" button
- [ ] Select Phantom option
- [ ] Phantom popup appears
- [ ] Approve connection
- [ ] Wallet address displays correctly

### 2.3 WalletConnect Connection
- [ ] Click "Connect Wallet" button
- [ ] Select WalletConnect option
- [ ] QR code appears
- [ ] Scan with mobile wallet (Trust Wallet, MetaMask Mobile, etc.)
- [ ] Approve connection on mobile
- [ ] Desktop shows connected state
- [ ] Wallet address displays correctly

### 2.4 Disconnect Tests
- [ ] Disconnect button works
- [ ] UI returns to "Connect Wallet" state
- [ ] Reconnecting works after disconnect

### 2.5 Account Switching
- [ ] Switch account in wallet
- [ ] UI updates to show new address
- [ ] Previous session data clears appropriately

---

## 3. Payment Flow (Pay to Play)

### 3.1 USDC Approval
- [ ] Navigate to game page
- [ ] Click "Pay to Play" (or similar button)
- [ ] If first time: USDC approval transaction appears
- [ ] Approve USDC spending in wallet
- [ ] Transaction confirms on chain

### 3.2 Pay to Play Transaction
- [ ] After approval, pay transaction appears
- [ ] Shows correct amount (0.02 USDC)
- [ ] Confirm transaction in wallet
- [ ] Transaction confirms on chain
- [ ] UI updates: "Tries remaining: 10"
- [ ] Prize pool increases by 0.02 USDC

### Verification
```bash
# Check contract state after payment
cast call 0x5b498d19A03E24b5187d5B71B80b02C437F9cE08 "totalPool()" --rpc-url https://sepolia.base.org
```

### Error Cases
- [ ] Insufficient USDC balance shows appropriate error
- [ ] Rejected transaction shows error message
- [ ] Network error shows retry option

---

## 4. Game Play (game.html)

### 4.1 Game Loading
- [ ] Game canvas loads correctly
- [ ] Instructions/start screen appears
- [ ] Leaderboard sidebar displays

### 4.2 Gameplay
- [ ] Press space/click to start
- [ ] Bird responds to input (flap)
- [ ] Pipes generate and move correctly
- [ ] Score increments when passing pipes
- [ ] Collision detection works (game ends on hit)
- [ ] Game over screen shows final score

### 4.3 Tries System
- [ ] Tries counter shows remaining attempts
- [ ] Each game decrements tries by 1
- [ ] When tries = 0, prompt to pay again
- [ ] Cannot play without tries

### 4.4 Score Submission
- [ ] After game over, score submits automatically
- [ ] Loading indicator during submission
- [ ] Success message after submission
- [ ] Leaderboard updates with new score (if high enough)

---

## 5. Leaderboard

### 5.1 Display
- [ ] Shows top 10 (or configured number) players
- [ ] Each entry shows: Rank, Address (truncated), Score
- [ ] Current user's entry highlighted (if on leaderboard)
- [ ] Scores sorted descending

### 5.2 Real-time Updates
- [ ] New scores appear without page refresh
- [ ] Rankings update correctly when new high score submitted

### 5.3 Edge Cases
- [ ] Empty leaderboard shows appropriate message
- [ ] Very long scores display correctly
- [ ] Duplicate scores handled correctly

---

## 6. Profile Page (profile.html)

### 6.1 Without Wallet Connected
- [ ] Shows "Connect Wallet" prompt
- [ ] No personal data displayed

### 6.2 With Wallet Connected
- [ ] Wallet address displays
- [ ] Total games played shows
- [ ] Total tries purchased shows
- [ ] Best score displays
- [ ] Current rank shows (if on leaderboard)
- [ ] Total donations made displays
- [ ] Total prizes won displays

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
- [ ] Click "Donate" button (on home or game page)
- [ ] Donation modal/form appears
- [ ] Enter custom amount
- [ ] Approval transaction (if needed)
- [ ] Donation transaction
- [ ] Confirm in wallet
- [ ] Transaction confirms
- [ ] Prize pool increases by donation amount
- [ ] Success message shown

### 7.2 Verification
- [ ] Donation appears in profile history
- [ ] Prize pool reflects new total

---

## 8. Admin Dashboard (admin.html)

### 8.1 Access Control
- [ ] Non-owner cannot access admin functions
- [ ] Owner wallet can access all functions

### 8.2 View Current Settings
- [ ] Cycle duration displays
- [ ] Number of winners displays
- [ ] Fee percentage displays
- [ ] Current cycle start/end time displays

### 8.3 Update Cycle Duration
- [ ] Change cycle duration (1-365 days)
- [ ] Submit change
- [ ] Confirm transaction
- [ ] New duration reflected in UI

### 8.4 Update Number of Winners
- [ ] Change winner count (1-10)
- [ ] Submit change
- [ ] Setting updates in database

### 8.5 Update Fee Percentage
- [ ] Change fee (0-50%)
- [ ] Submit change
- [ ] Setting updates in database

### 8.6 Force Allocation (Testing)
- [ ] Click "Force Allocate" (if available)
- [ ] Allocation transaction executes
- [ ] Winners receive rewards
- [ ] Pool resets
- [ ] New cycle starts

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
- [ ] List of past cycles appears
- [ ] Each cycle shows date range
- [ ] Click cycle to view leaderboard

### 10.2 Historical Leaderboard
- [ ] Shows final rankings for selected cycle
- [ ] Winner addresses displayed
- [ ] Scores shown
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
- [ ] RPC error shows user-friendly message
- [ ] Retry option available
- [ ] App recovers after network restored

### 12.2 Transaction Failures
- [ ] Rejected transaction shows message
- [ ] Reverted transaction shows reason
- [ ] User can retry after failure

### 12.3 Wrong Network
- [ ] Prompt to switch to Base Sepolia
- [ ] One-click network switch works
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

---

**Last Updated:** January 2026
**Tester:** _______________
**Date Tested:** _______________
