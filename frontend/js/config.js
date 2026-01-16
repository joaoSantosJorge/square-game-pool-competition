// Centralized Configuration for Square Game Prize Pool
// Update this file when deploying to a new contract

const CONFIG = {
    // Smart Contract Addresses
    CONTRACT_ADDRESS: '0xdd0bbf48f85f5314c3754cd63103be927b55986c',
    USDC_ADDRESS: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    
    // Network Configuration
    CHAIN_ID: 84532,
    CHAIN_NAME: 'Base Sepolia',
    RPC_URL: 'https://sepolia.base.org',
    
    // Firebase Configuration
    FIREBASE_FUNCTIONS_URL: 'https://us-central1-flappy-bird-leaderboard-463e0.cloudfunctions.net',
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyCprQvJl7-ZC-6QK4ct5tBngJzOgF33MpM",
        authDomain: "flappy-bird-leaderboard-463e0.firebaseapp.com",
        projectId: "flappy-bird-leaderboard-463e0",
        storageBucket: "flappy-bird-leaderboard-463e0.firebasestorage.app",
        messagingSenderId: "344067272312",
        appId: "1:344067272312:web:5d4fc513df1df38a87c78d"
    },
    
    // Game Configuration
    PLAY_COST: 20000,           // 0.02 USDC (6 decimals)
    PLAY_COST_DISPLAY: '0.02',  // For display purposes
    TRIES_PER_PAYMENT: 10
};

// Freeze to prevent accidental modification
Object.freeze(CONFIG);
Object.freeze(CONFIG.FIREBASE_CONFIG);
