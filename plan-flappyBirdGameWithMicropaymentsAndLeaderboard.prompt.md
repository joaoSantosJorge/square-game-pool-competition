## Plan: Flappy Bird Game with Micropayments and Leaderboard

Build a web-based Flappy Bird game where players pay 2 cents per play via 402 protocol integration, track monthly resetting leaderboards by wallet address, and distribute 50% of payments to the top scorer and 50% to the owner. Use HTML5 Canvas for game mechanics, MetaMask for wallet connections, Firebase for off-chain leaderboards, and Ethereum for payouts to ensure decentralized micropayments and fair distribution.

### Steps
1. Set up project structure with HTML, CSS, JS files for game, payments, and leaderboard.
2. Implement Flappy Bird game logic using Canvas API for physics, rendering, and scoring.
3. Integrate 402 protocol with MetaMask for 2-cent payments and wallet-based player identification.
4. Build monthly resetting leaderboard using Firebase Firestore for storage and automated resets.
5. Develop payout system to distribute funds at month-end via Ethereum transactions.

### Further Considerations
1. Choose payment method: Stick with 402 + MetaMask or switch to Web Monetization for streaming?
2. On-chain vs off-chain leaderboard: Use Firebase for simplicity or smart contract for decentralization?
3. Legal compliance: Add terms for payments and data handling to avoid issues.


run command:
python3 -m http.server 8000