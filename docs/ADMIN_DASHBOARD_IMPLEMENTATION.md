# Admin Dashboard Implementation Guide

This document provides detailed step-by-step instructions for creating an admin dashboard at `/admin?wallet=${address_of_contract_owner}` for the Square Game Prize Pool application.

## Table of Contents
1. [Overview](#overview)
2. [Security Requirements](#security-requirements)
3. [Smart Contract Modifications](#smart-contract-modifications)
4. [Firebase Cloud Function Endpoints](#firebase-cloud-function-endpoints)
5. [Frontend Implementation](#frontend-implementation)
6. [Step-by-Step Implementation](#step-by-step-implementation)
7. [Testing](#testing)

---

## Overview

The admin dashboard allows the contract owner to manage the Square Game Prize Pool with the following capabilities:

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Change Contract Owner | Transfer ownership to another wallet | Smart Contract |
| Change Play Cost | Modify the cost to play (requires contract redeployment) | New Contract |
| Change Cycle Duration | Modify how long each competition cycle lasts | Firebase Config |
| Change Number of Winners | Adjust how many winners receive prizes | Firebase Config |
| Change Fee Percentage | Modify the owner's fee percentage | Firebase Config |
| Allocate Funds | Manually trigger fund allocation to winners | Smart Contract + Firebase |
| Force Allocate | Emergency allocation override | Firebase Function |

---

## Security Requirements

### Access Control
The admin page must verify:
1. User has connected their wallet
2. Connected wallet address matches the `owner` address stored in the smart contract
3. URL parameter `wallet` matches the connected wallet

### Verification Flow
```
User navigates to /admin?wallet=0x... 
    → Check if wallet param exists
    → Prompt wallet connection
    → Verify connected wallet === URL wallet param
    → Query contract.owner()
    → Verify connected wallet === contract owner
    → Grant access OR show "Unauthorized" message
```

---

## Smart Contract Modifications

Assume the smart contrac alredy is changed with a variable play_cost.

## Firebase Cloud Function Endpoints

### Update `functions/index.js` to add admin endpoints:

```javascript
const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ===== ADMIN CONFIG ENDPOINTS =====

// Update cycle duration
exports.updateCycleDuration = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { days, adminWallet, signature } = req.body;
    
    // TODO: Verify signature matches admin wallet
    // This is critical for security!
    
    if (!days || days < 1 || days > 365) {
      return res.status(400).json({ error: 'Invalid cycle duration (1-365 days)' });
    }

    await db.collection('config').doc('settings').set({
      cycleDurationDays: parseFloat(days),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: adminWallet
    }, { merge: true });

    res.json({ success: true, cycleDurationDays: days });
  } catch (error) {
    console.error('Error updating cycle duration:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update number of winners
exports.updateNumberOfWinners = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { winners, adminWallet } = req.body;
    
    if (!winners || winners < 1 || winners > 10) {
      return res.status(400).json({ error: 'Invalid number of winners (1-10)' });
    }

    await db.collection('config').doc('settings').set({
      numberOfWinners: parseInt(winners),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: adminWallet
    }, { merge: true });

    res.json({ success: true, numberOfWinners: winners });
  } catch (error) {
    console.error('Error updating winners:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update fee percentage
exports.updateFeePercentage = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { percentage, adminWallet } = req.body;
    
    // percentage is in basis points (100 = 1%, 1000 = 10%)
    if (!percentage || percentage < 0 || percentage > 5000) {
      return res.status(400).json({ error: 'Invalid fee percentage (0-50%)' });
    }

    await db.collection('config').doc('settings').set({
      feePercentage: parseInt(percentage),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: adminWallet
    }, { merge: true });

    res.json({ success: true, feePercentage: percentage });
  } catch (error) {
    console.error('Error updating fee:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current config
exports.getAdminConfig = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const configDoc = await db.collection('config').doc('settings').get();
    const cycleDoc = await db.collection('cycleState').doc('current').get();
    
    res.json({
      config: configDoc.exists ? configDoc.data() : {},
      cycleState: cycleDoc.exists ? cycleDoc.data() : {}
    });
  } catch (error) {
    console.error('Error getting config:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## Frontend Implementation

### File: `frontend/admin.html`

Create this file at `/home/joaosantosjorge/flappybird-pool-competition/frontend/admin.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Square Game Prize Pool</title>
    <link rel="stylesheet" href="css/styles.css">
    <style>
        .admin-container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .nav-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            flex-wrap: wrap;
            gap: 10px;
        }
        .nav-links {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .nav-links a {
            color: var(--button-fg);
            text-decoration: none;
            padding: 8px 16px;
            border: 2px solid var(--button-border);
            background: var(--button-bg);
            font-family: 'Courier New', Courier, 'Lucida Console', monospace;
            text-transform: uppercase;
            font-size: 14px;
            letter-spacing: 1px;
            box-shadow: 2px 2px 0 var(--button-shadow1), 4px 4px 0 var(--button-shadow2);
            transition: all 0.2s;
        }
        .nav-links a:hover {
            background: var(--button-fg);
            color: var(--button-bg);
            box-shadow: 2px 2px 0 var(--button-shadow2), 4px 4px 0 var(--button-shadow1);
        }
        .page-title {
            font-family: 'Courier New', Courier, 'Lucida Console', monospace;
            color: var(--fg);
            text-shadow: var(--score-shadow);
            letter-spacing: 2px;
            font-size: 32px;
            margin: 0;
        }
        .auth-section {
            background: var(--leaderboard-bg);
            border: 2px solid var(--leaderboard-border);
            padding: 40px;
            text-align: center;
            margin-bottom: 30px;
            box-shadow: 0 0 8px var(--shadow);
        }
        .auth-message {
            font-family: 'Courier New', Courier, 'Lucida Console', monospace;
            font-size: 18px;
            color: var(--fg);
            margin-bottom: 20px;
        }
        .error-message {
            color: #ff4444;
            font-family: 'Courier New', Courier, 'Lucida Console', monospace;
            font-size: 16px;
            padding: 20px;
            border: 2px solid #ff4444;
            background: rgba(255, 68, 68, 0.1);
            margin-bottom: 20px;
        }
        .admin-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 25px;
            margin-top: 30px;
        }
        .admin-card {
            background: var(--leaderboard-bg);
            border: 2px solid var(--leaderboard-border);
            padding: 25px;
            box-shadow: 0 0 8px var(--shadow);
            transition: all 0.3s;
        }
        .admin-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 16px var(--shadow);
        }
        .card-title {
            font-family: 'Courier New', Courier, 'Lucida Console', monospace;
            font-size: 18px;
            font-weight: bold;
            color: var(--fg);
            margin-bottom: 15px;
            letter-spacing: 1px;
            text-transform: uppercase;
            border-bottom: 2px solid var(--border);
            padding-bottom: 10px;
        }
        .card-description {
            font-family: 'Courier New', Courier, 'Lucida Console', monospace;
            font-size: 13px;
            color: var(--fg);
            opacity: 0.8;
            margin-bottom: 15px;
            line-height: 1.5;
        }
        .input-group {
            margin-bottom: 15px;
        }
        .input-label {
            font-family: 'Courier New', Courier, 'Lucida Console', monospace;
            font-size: 12px;
            color: var(--fg);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 5px;
            display: block;
        }
        .input-field {
            width: 100%;
            padding: 12px;
            font-family: 'Courier New', Courier, 'Lucida Console', monospace;
            font-size: 16px;
            background: var(--bg);
            color: var(--fg);
            border: 2px solid var(--border);
            box-sizing: border-box;
        }
        .input-field:focus {
            outline: none;
            border-color: var(--pool-bg);
        }
        .current-value {
            font-family: 'Courier New', Courier, 'Lucida Console', monospace;
            font-size: 14px;
            color: var(--fg);
            background: var(--bg);
            padding: 10px;
            border: 1px dashed var(--border);
            margin-bottom: 15px;
        }
        .current-value strong {
            color: var(--pool-bg);
        }
        .admin-btn {
            width: 100%;
            margin: 0;
            padding: 12px 20px;
            font-size: 14px;
        }
        .admin-btn-danger {
            background: #ff4444;
            color: #fff;
            border-color: #ff4444;
        }
        .admin-btn-danger:hover {
            background: #cc0000;
        }
        .admin-btn-warning {
            background: #ffaa00;
            color: #000;
            border-color: #ffaa00;
        }
        .admin-btn-warning:hover {
            background: #cc8800;
        }
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .status-connected {
            background: #00ff00;
            box-shadow: 0 0 8px #00ff00;
        }
        .status-disconnected {
            background: #ff0000;
            box-shadow: 0 0 8px #ff0000;
        }
        .wallet-display {
            font-family: 'Courier New', Courier, 'Lucida Console', monospace;
            font-size: 14px;
            color: var(--fg);
            padding: 15px;
            background: var(--bg);
            border: 2px solid var(--border);
            margin-bottom: 20px;
            word-break: break-all;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: var(--bg);
            border: 2px solid var(--border);
            padding: 15px;
            text-align: center;
        }
        .stat-value {
            font-family: 'Courier New', Courier, 'Lucida Console', monospace;
            font-size: 24px;
            font-weight: bold;
            color: var(--fg);
            text-shadow: var(--score-shadow);
        }
        .stat-label {
            font-family: 'Courier New', Courier, 'Lucida Console', monospace;
            font-size: 11px;
            color: var(--fg);
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.8;
            margin-top: 5px;
        }
        .hidden {
            display: none;
        }
        .loading {
            opacity: 0.5;
            pointer-events: none;
        }
        .success-toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #00aa00;
            color: #fff;
            padding: 15px 25px;
            font-family: 'Courier New', Courier, 'Lucida Console', monospace;
            font-size: 14px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .error-toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #ff4444;
            color: #fff;
            padding: 15px 25px;
            font-family: 'Courier New', Courier, 'Lucida Console', monospace;
            font-size: 14px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
    </style>
</head>
<body>
    <div class="admin-container">
        <div class="nav-header">
            <h1 class="page-title">🔐 ADMIN DASHBOARD</h1>
            <div class="nav-links">
                <button id="toggle-mode-btn" style="margin: 0;">Toggle Light/Dark</button>
                <a href="index.html">Home</a>
                <a href="game.html">Game</a>
            </div>
        </div>

        <!-- Authentication Section (shown when not authenticated) -->
        <div id="auth-section" class="auth-section">
            <div class="auth-message">
                <span class="status-indicator status-disconnected" id="status-indicator"></span>
                Connect your wallet to access the admin dashboard
            </div>
            <button id="connect-admin-btn" class="admin-btn">🔗 Connect Wallet</button>
            <div id="auth-error" class="error-message hidden"></div>
        </div>

        <!-- Admin Content (shown when authenticated) -->
        <div id="admin-content" class="hidden">
            <!-- Wallet Info -->
            <div class="wallet-display">
                <span class="status-indicator status-connected"></span>
                <strong>Connected as Owner:</strong> <span id="owner-address"></span>
            </div>

            <!-- Stats Overview -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value" id="stat-pool">$0.00</div>
                    <div class="stat-label">Prize Pool</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="stat-cycle">-</div>
                    <div class="stat-label">Cycle Ends</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="stat-players">0</div>
                    <div class="stat-label">Players</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="stat-allocated">No</div>
                    <div class="stat-label">Funds Allocated</div>
                </div>
            </div>

            <!-- Admin Cards Grid -->
            <div class="admin-grid">
                <!-- 1. Change Contract Owner -->
                <div class="admin-card">
                    <div class="card-title">👤 Change Owner</div>
                    <div class="card-description">
                        Transfer contract ownership to a new wallet address. This action is irreversible!
                    </div>
                    <div class="input-group">
                        <label class="input-label">New Owner Address</label>
                        <input type="text" id="new-owner-address" class="input-field" placeholder="0x...">
                    </div>
                    <button id="change-owner-btn" class="admin-btn admin-btn-danger">⚠️ Transfer Ownership</button>
                </div>

                <!-- 2. Change Play Cost (requires new contract) -->
                <div class="admin-card">
                    <div class="card-title">💰 Play Cost</div>
                    <div class="card-description">
                        Current play cost. Changing requires deploying a new contract (V2).
                    </div>
                    <div class="current-value">
                        Current: <strong id="current-play-cost">0.02 USDC</strong>
                    </div>
                    <div class="input-group">
                        <label class="input-label">New Cost (USDC)</label>
                        <input type="number" id="new-play-cost" class="input-field" step="0.01" min="0.01" placeholder="0.02">
                    </div>
                    <button id="change-cost-btn" class="admin-btn" disabled title="Requires contract V2">
                        📋 Copy Deploy Command
                    </button>
                </div>

                <!-- 3. Change Cycle Duration -->
                <div class="admin-card">
                    <div class="card-title">⏱️ Cycle Duration</div>
                    <div class="card-description">
                        How long each competition cycle lasts before funds are allocated.
                    </div>
                    <div class="current-value">
                        Current: <strong id="current-cycle-duration">7 days</strong>
                    </div>
                    <div class="input-group">
                        <label class="input-label">Duration (days)</label>
                        <input type="number" id="new-cycle-duration" class="input-field" min="1" max="365" placeholder="7">
                    </div>
                    <button id="change-duration-btn" class="admin-btn">💾 Update Duration</button>
                </div>

                <!-- 4. Change Number of Winners -->
                <div class="admin-card">
                    <div class="card-title">🏆 Number of Winners</div>
                    <div class="card-description">
                        How many top players receive prizes each cycle (1-10 winners supported).
                    </div>
                    <div class="current-value">
                        Current: <strong id="current-winners">3 winners</strong>
                    </div>
                    <div class="input-group">
                        <label class="input-label">Winners (1-10)</label>
                        <input type="number" id="new-winners" class="input-field" min="1" max="10" placeholder="3">
                    </div>
                    <button id="change-winners-btn" class="admin-btn">💾 Update Winners</button>
                </div>

                <!-- 5. Change Fee Percentage -->
                <div class="admin-card">
                    <div class="card-title">📊 Fee Percentage</div>
                    <div class="card-description">
                        Owner's fee percentage taken from each prize pool (in basis points: 1000 = 10%).
                    </div>
                    <div class="current-value">
                        Current: <strong id="current-fee">10%</strong> (1000 basis points)
                    </div>
                    <div class="input-group">
                        <label class="input-label">Fee (basis points, max 5000)</label>
                        <input type="number" id="new-fee" class="input-field" min="0" max="5000" placeholder="1000">
                    </div>
                    <button id="change-fee-btn" class="admin-btn">💾 Update Fee</button>
                </div>

                <!-- 6. Allocate Funds -->
                <div class="admin-card">
                    <div class="card-title">💸 Allocate Funds</div>
                    <div class="card-description">
                        Manually trigger fund allocation when cycle ends. Distributes prizes to top players.
                    </div>
                    <div class="current-value">
                        Status: <strong id="allocation-status">Not Allocated</strong>
                    </div>
                    <button id="allocate-btn" class="admin-btn admin-btn-warning">🎯 Allocate Funds</button>
                </div>

                <!-- 7. Force Allocate -->
                <div class="admin-card">
                    <div class="card-title">⚡ Force Allocate</div>
                    <div class="card-description">
                        Emergency function to force allocation regardless of cycle state. Use with caution!
                    </div>
                    <div class="current-value">
                        ⚠️ This will immediately end the current cycle
                    </div>
                    <button id="force-allocate-btn" class="admin-btn admin-btn-danger">🚨 Force Allocate Now</button>
                </div>

                <!-- Additional: Reset Cycle -->
                <div class="admin-card">
                    <div class="card-title">🔄 Reset Cycle</div>
                    <div class="card-description">
                        Start a new cycle without allocating funds. Only use if allocation has already occurred.
                    </div>
                    <button id="reset-cycle-btn" class="admin-btn admin-btn-warning">🔄 Reset Cycle State</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/web3@latest/dist/web3.min.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js"></script>
    
    <script>
        // Configuration
        const CONTRACT_ADDRESS = '0x5b498d19A03E24b5187d5B71B80b02C437F9cE08';
        const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';
        const FIREBASE_FUNCTIONS_URL = 'https://us-central1-flappy-bird-leaderboard-463e0.cloudfunctions.net';
        
        // Firebase config
        const firebaseConfig = {
            apiKey: "AIzaSyCprQvJl7-ZC-6QK4ct5tBngJzOgF33MpM",
            authDomain: "flappy-bird-leaderboard-463e0.firebaseapp.com",
            projectId: "flappy-bird-leaderboard-463e0",
            storageBucket: "flappy-bird-leaderboard-463e0.firebasestorage.app",
            messagingSenderId: "344067272312",
            appId: "1:344067272312:web:5d4fc513df1df38a87c78d"
        };
        
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();

        // Contract ABI (minimal for admin functions)
        const CONTRACT_ABI = [
            {
                "inputs": [],
                "name": "owner",
                "outputs": [{"name": "", "type": "address"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "totalPool",
                "outputs": [{"name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "fundsAllocated",
                "outputs": [{"name": "", "type": "bool"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "PLAY_COST",
                "outputs": [{"name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [
                    {"name": "feePercentage", "type": "uint256"},
                    {"name": "winners", "type": "address[]"},
                    {"name": "percentages", "type": "uint256[]"}
                ],
                "name": "allocateFunds",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ];

        let web3;
        let userAccount;
        let contract;
        let isOwner = false;

        // Theme toggle
        const toggleBtn = document.getElementById('toggle-mode-btn');
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
        }
        toggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
        });

        // Check URL parameter
        function getWalletFromURL() {
            const params = new URLSearchParams(window.location.search);
            return params.get('wallet');
        }

        // Connect wallet and verify ownership
        async function connectWallet() {
            const authError = document.getElementById('auth-error');
            authError.classList.add('hidden');

            try {
                if (typeof window.ethereum === 'undefined') {
                    throw new Error('MetaMask not installed. Please install MetaMask to continue.');
                }

                // Request account access
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                userAccount = accounts[0];

                // Initialize Web3
                web3 = new Web3(window.ethereum);
                
                // Check network
                const chainId = await web3.eth.getChainId();
                if (chainId !== 84532n) {
                    throw new Error('Please switch to Base Sepolia network (Chain ID: 84532)');
                }

                // Get contract owner
                contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
                const contractOwner = await contract.methods.owner().call();

                console.log('Connected wallet:', userAccount);
                console.log('Contract owner:', contractOwner);

                // Verify ownership
                if (userAccount.toLowerCase() !== contractOwner.toLowerCase()) {
                    throw new Error(`Access denied. Only the contract owner (${contractOwner.slice(0,6)}...${contractOwner.slice(-4)}) can access this dashboard.`);
                }

                // Check URL wallet param
                const urlWallet = getWalletFromURL();
                if (urlWallet && urlWallet.toLowerCase() !== userAccount.toLowerCase()) {
                    throw new Error('Connected wallet does not match URL parameter.');
                }

                // Success - show admin content
                isOwner = true;
                document.getElementById('auth-section').classList.add('hidden');
                document.getElementById('admin-content').classList.remove('hidden');
                document.getElementById('owner-address').textContent = userAccount;
                document.getElementById('status-indicator').classList.remove('status-disconnected');
                document.getElementById('status-indicator').classList.add('status-connected');

                // Load current values
                await loadCurrentValues();

                // Listen for account changes
                window.ethereum.on('accountsChanged', (accounts) => {
                    window.location.reload();
                });

            } catch (error) {
                console.error('Connection error:', error);
                authError.textContent = error.message;
                authError.classList.remove('hidden');
            }
        }

        // Load current values from contract and Firebase
        async function loadCurrentValues() {
            try {
                // Contract values
                const totalPool = await contract.methods.totalPool().call();
                const fundsAllocated = await contract.methods.fundsAllocated().call();
                
                let playCost;
                try {
                    playCost = await contract.methods.PLAY_COST().call();
                } catch (e) {
                    playCost = 20000n; // Default
                }

                document.getElementById('stat-pool').textContent = `$${(Number(totalPool) / 1000000).toFixed(2)}`;
                document.getElementById('stat-allocated').textContent = fundsAllocated ? 'Yes' : 'No';
                document.getElementById('allocation-status').textContent = fundsAllocated ? 'Allocated' : 'Not Allocated';
                document.getElementById('current-play-cost').textContent = `${(Number(playCost) / 1000000).toFixed(2)} USDC`;

                // Firebase config
                const configDoc = await db.collection('config').doc('settings').get();
                if (configDoc.exists) {
                    const config = configDoc.data();
                    if (config.cycleDurationDays) {
                        document.getElementById('current-cycle-duration').textContent = `${config.cycleDurationDays} days`;
                    }
                    if (config.numberOfWinners) {
                        document.getElementById('current-winners').textContent = `${config.numberOfWinners} winners`;
                    }
                    if (config.feePercentage !== undefined) {
                        document.getElementById('current-fee').textContent = `${(config.feePercentage / 100).toFixed(1)}%`;
                    }
                }

                // Cycle state
                const cycleDoc = await db.collection('cycleState').doc('current').get();
                if (cycleDoc.exists) {
                    const cycle = cycleDoc.data();
                    if (cycle.endTime) {
                        const endDate = new Date(cycle.endTime);
                        const now = new Date();
                        const diff = endDate - now;
                        if (diff > 0) {
                            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                            document.getElementById('stat-cycle').textContent = `${days}d`;
                        } else {
                            document.getElementById('stat-cycle').textContent = 'Ended';
                        }
                    }
                }

                // Player count
                const scoresSnapshot = await db.collection('scores').get();
                document.getElementById('stat-players').textContent = scoresSnapshot.size;

            } catch (error) {
                console.error('Error loading values:', error);
            }
        }

        // Show toast notification
        function showToast(message, isError = false) {
            const toast = document.createElement('div');
            toast.className = isError ? 'error-toast' : 'success-toast';
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }

        // ===== ADMIN ACTIONS =====

        // 1. Change Owner (on-chain)
        document.getElementById('change-owner-btn').addEventListener('click', async () => {
            const newOwner = document.getElementById('new-owner-address').value.trim();
            
            if (!newOwner || !web3.utils.isAddress(newOwner)) {
                showToast('Invalid Ethereum address', true);
                return;
            }

            if (!confirm(`⚠️ WARNING: You are about to transfer ownership to ${newOwner}. This action is IRREVERSIBLE. Are you sure?`)) {
                return;
            }

            try {
                // Note: Current contract doesn't have transferOwnership
                // This would work with V2 contract
                showToast('Transfer ownership requires contract V2. Please redeploy with new owner.', true);
            } catch (error) {
                showToast(`Error: ${error.message}`, true);
            }
        });

        // 2. Copy deploy command for new play cost
        document.getElementById('change-cost-btn').addEventListener('click', () => {
            const newCost = document.getElementById('new-play-cost').value;
            const costInWei = Math.floor(parseFloat(newCost) * 1000000);
            const command = `forge create contracts/FlappyBirdPrizePoolV2.sol:FlappyBirdPrizePoolV2 --constructor-args <USDC_ADDRESS> ${costInWei} --private-key <PRIVATE_KEY> --rpc-url https://sepolia.base.org`;
            
            navigator.clipboard.writeText(command);
            showToast('Deploy command copied to clipboard!');
        });

        // 3. Change Cycle Duration
        document.getElementById('change-duration-btn').addEventListener('click', async () => {
            const days = document.getElementById('new-cycle-duration').value;
            
            if (!days || days < 1 || days > 365) {
                showToast('Invalid duration (1-365 days)', true);
                return;
            }

            try {
                const response = await fetch(`${FIREBASE_FUNCTIONS_URL}/updateCycleDuration`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ days: parseFloat(days), adminWallet: userAccount })
                });

                const result = await response.json();
                if (result.success) {
                    showToast(`Cycle duration updated to ${days} days`);
                    document.getElementById('current-cycle-duration').textContent = `${days} days`;
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                showToast(`Error: ${error.message}`, true);
            }
        });

        // 4. Change Number of Winners
        document.getElementById('change-winners-btn').addEventListener('click', async () => {
            const winners = document.getElementById('new-winners').value;
            
            if (!winners || winners < 1 || winners > 10) {
                showToast('Invalid number (1-10 winners)', true);
                return;
            }

            try {
                const response = await fetch(`${FIREBASE_FUNCTIONS_URL}/updateNumberOfWinners`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ winners: parseInt(winners), adminWallet: userAccount })
                });

                const result = await response.json();
                if (result.success) {
                    showToast(`Number of winners updated to ${winners}`);
                    document.getElementById('current-winners').textContent = `${winners} winners`;
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                showToast(`Error: ${error.message}`, true);
            }
        });

        // 5. Change Fee Percentage
        document.getElementById('change-fee-btn').addEventListener('click', async () => {
            const fee = document.getElementById('new-fee').value;
            
            if (!fee || fee < 0 || fee > 5000) {
                showToast('Invalid fee (0-5000 basis points)', true);
                return;
            }

            try {
                const response = await fetch(`${FIREBASE_FUNCTIONS_URL}/updateFeePercentage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ percentage: parseInt(fee), adminWallet: userAccount })
                });

                const result = await response.json();
                if (result.success) {
                    showToast(`Fee updated to ${(fee / 100).toFixed(1)}%`);
                    document.getElementById('current-fee').textContent = `${(fee / 100).toFixed(1)}%`;
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                showToast(`Error: ${error.message}`, true);
            }
        });

        // 6. Allocate Funds
        document.getElementById('allocate-btn').addEventListener('click', async () => {
            if (!confirm('This will allocate funds to winners based on current leaderboard. Continue?')) {
                return;
            }

            try {
                const response = await fetch(`${FIREBASE_FUNCTIONS_URL}/checkCycleManual`);
                const result = await response.json();
                
                showToast(result.message || 'Allocation triggered');
                await loadCurrentValues();
            } catch (error) {
                showToast(`Error: ${error.message}`, true);
            }
        });

        // 7. Force Allocate
        document.getElementById('force-allocate-btn').addEventListener('click', async () => {
            if (!confirm('⚠️ WARNING: This will FORCE allocation immediately, ending the current cycle. Are you sure?')) {
                return;
            }

            try {
                const response = await fetch(`${FIREBASE_FUNCTIONS_URL}/forceAllocate`);
                const result = await response.json();
                
                if (result.success) {
                    showToast('Force allocation complete');
                    await loadCurrentValues();
                } else {
                    throw new Error(result.message || 'Allocation failed');
                }
            } catch (error) {
                showToast(`Error: ${error.message}`, true);
            }
        });

        // Reset Cycle
        document.getElementById('reset-cycle-btn').addEventListener('click', async () => {
            if (!confirm('This will reset the cycle state. Only use after allocation has occurred. Continue?')) {
                return;
            }

            try {
                const now = Date.now();
                const configDoc = await db.collection('config').doc('settings').get();
                const durationDays = configDoc.exists && configDoc.data().cycleDurationDays 
                    ? configDoc.data().cycleDurationDays 
                    : 7;

                await db.collection('cycleState').doc('current').set({
                    startTime: now,
                    endTime: now + (durationDays * 24 * 60 * 60 * 1000),
                    lastUpdated: now
                });

                showToast('Cycle state reset');
                await loadCurrentValues();
            } catch (error) {
                showToast(`Error: ${error.message}`, true);
            }
        });

        // Initialize
        document.getElementById('connect-admin-btn').addEventListener('click', connectWallet);
        
        // Auto-connect if wallet param matches
        window.addEventListener('load', () => {
            const urlWallet = getWalletFromURL();
            if (urlWallet) {
                document.querySelector('.auth-message').innerHTML = 
                    `<span class="status-indicator status-disconnected" id="status-indicator"></span>
                     Verify ownership for wallet: <strong>${urlWallet.slice(0,6)}...${urlWallet.slice(-4)}</strong>`;
            }
        });
    </script>
</body>
</html>
```

---

## Step-by-Step Implementation

### Step 1: Create the Admin Page

```bash
# Create the admin.html file
cd /home/joaosantosjorge/flappybird-pool-competition/frontend
# Copy the HTML content from above into admin.html
```

### Step 2: Add Firebase Functions

```bash
cd /home/joaosantosjorge/flappybird-pool-competition/functions

# Edit index.js to add the admin endpoints (copy from above)
# Then deploy:
firebase deploy --only functions
```

### Step 3: Update Firestore Security Rules

Add to `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Existing rules...
    
    // Config collection - read by anyone, write restricted
    match /config/{document} {
      allow read: if true;
      allow write: if false; // Only via Cloud Functions
    }
  }
}
```

### Step 4: (Optional) Deploy New Contract

If you want configurable play cost:

```bash
cd /home/joaosantosjorge/flappybird-pool-competition

# Create the new contract file
# contracts/FlappyBirdPrizePoolV2.sol (copy from above)

# Deploy
forge create contracts/FlappyBirdPrizePoolV2.sol:FlappyBirdPrizePoolV2 \
  --constructor-args <USDC_ADDRESS> 20000 \
  --private-key <PRIVATE_KEY> \
  --rpc-url https://sepolia.base.org
```

### Step 5: Test the Admin Dashboard

1. Open browser to: `http://localhost:8000/admin.html?wallet=YOUR_OWNER_ADDRESS`
2. Connect with MetaMask using the owner wallet
3. Verify all functions work correctly

---

## Testing

### Test Checklist

- [ ] Page loads correctly with theme toggle
- [ ] Non-owner wallet shows "Access denied" error
- [ ] Owner wallet successfully authenticates
- [ ] Prize pool displays correct value
- [ ] Cycle timer shows remaining time
- [ ] Change cycle duration works
- [ ] Change number of winners works
- [ ] Change fee percentage works
- [ ] Allocate funds triggers correctly
- [ ] Force allocate works (emergency only)
- [ ] Reset cycle resets timestamps

### Test Commands

```bash
# Start local server
cd /home/joaosantosjorge/flappybird-pool-competition/frontend
python3 -m http.server 8000

# Open admin page
open http://localhost:8000/admin.html?wallet=0xYOUR_OWNER_ADDRESS

# Check Firebase functions logs
firebase functions:log --only checkCycleManual
firebase functions:log --only forceAllocate
```

---

## Security Considerations

1. **Never expose private keys** in frontend code
2. **Verify wallet ownership** on every admin action
3. **Rate limit** Firebase function calls
4. **Add signature verification** for sensitive operations
5. **Log all admin actions** to Firestore for audit trail
6. **Consider adding 2FA** for critical functions like ownership transfer

---

## Future Enhancements

1. **Multi-sig support** - Require multiple admins to approve critical changes
2. **Timelock** - Add delays to critical operations
3. **Audit log** - Store all admin actions with timestamps
4. **Role-based access** - Support multiple admin roles (viewer, operator, owner)
5. **Notifications** - Send alerts when admin actions are performed

---

## File Structure

After implementation, your project should have:

```
frontend/
├── admin.html          # New admin dashboard
├── index.html          # Home page
├── game.html           # Game page
├── rules.html          # Rules page
├── archive.html        # Archive page
├── css/
│   └── styles.css
└── js/
    ├── game.js
    ├── leaderboard.js
    └── payments.js

functions/
├── index.js            # Updated with admin endpoints
├── cycleManager.js     # Existing cycle manager
└── package.json

contracts/
├── FlappyBirdPrizePool.sol     # Current contract
└── FlappyBirdPrizePoolV2.sol   # New contract with configurable play cost
```
