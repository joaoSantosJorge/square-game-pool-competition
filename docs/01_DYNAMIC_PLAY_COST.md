# Dynamic Play Cost Implementation

## Status: Implemented

## Overview

The play cost is now dynamic - fetched from the SquarePrizePool smart contract instead of using hardcoded values. When the admin changes the play cost via the admin panel, the change propagates instantly to all open tabs via LocalStorage broadcast.

## Architecture

```
PlayCostManager (module in config.js)
├── init()               - Load from localStorage or fetch from contract
├── getPlayCost()        - Returns raw value (e.g., 20000)
├── getPlayCostDisplay() - Returns formatted string (e.g., "0.02")
├── getPlayCostUSDC()    - Returns float (e.g., 0.02)
├── setPlayCost(value)   - Admin calls this after contract update (broadcasts to other tabs)
├── onUpdate(callback)   - Subscribe to changes for UI updates
└── refresh()            - Force refresh from contract
```

## Update Mechanism (no polling)

1. **On page load**: Check localStorage first, fallback to contract read
2. **When admin updates cost**: Write to localStorage → triggers `storage` event
3. **Other open tabs**: Listen for `storage` event → update UI instantly
4. **New page loads**: Read cached value from localStorage

## Files Modified

| File | Changes |
|------|---------|
| `frontend/js/config.js` | Added PlayCostManager module |
| `frontend/js/payments.js` | Uses PlayCostManager for payment amounts |
| `frontend/js/game.js` | Replaced hardcoded alert messages with dynamic values |
| `frontend/game.html` | Added `.play-cost-display` span class to button |
| `frontend/index.html` | Added `.play-cost-display` span classes |
| `frontend/rules.html` | Added Web3/config.js scripts + span classes |
| `frontend/admin.html` | Added PlayCostManager.setPlayCost() call after contract update |

## Usage

### In JavaScript

```javascript
// Get the current play cost
const rawCost = PlayCostManager.getPlayCost();        // e.g., 20000
const displayCost = PlayCostManager.getPlayCostDisplay(); // e.g., "0.02"
const usdcCost = PlayCostManager.getPlayCostUSDC();   // e.g., 0.02

// Subscribe to changes
PlayCostManager.onUpdate((rawCost, displayCost) => {
    console.log('Play cost changed to:', displayCost);
});
```

### In HTML

Any element with class `play-cost-display` will be automatically updated:

```html
<span class="play-cost-display">0.02</span> USDC
```

## Error Handling

- If Web3 not loaded: Retry up to 3 times with 1-second delays
- If contract read fails: Use fallback CONFIG values
- Display fallback values immediately, update when fetched

## Verification Steps

1. Load each page and verify play cost displays correctly
2. Open game.html in a second tab
3. Use admin panel to change play cost on contract
4. Verify second tab updates instantly (no refresh needed)
5. Refresh pages and verify new value persists
6. Complete a payment flow and verify correct amount is used
7. Check Firestore payment record has correct `amountUSDC`
8. Clear localStorage and reload - verify it fetches from contract

## Notes

- No contract changes needed - SquarePrizePool already supports `playCost()` and `setPlayCost()`
- No backend changes needed - frontend reads directly from contract
- Fallback values ensure app works even if contract read fails
- Cross-tab sync uses the browser's `storage` event (no polling)
