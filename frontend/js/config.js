// Centralized Configuration for Square Game Prize Pool
// Update this file when deploying to a new contract

const CONFIG = {
    // Smart Contract Addresses
    CONTRACT_ADDRESS: '0x5b498d19A03E24b5187d5B71B80b02C437F9cE08',
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

    // Game Configuration (fallback values)
    PLAY_COST: 20000,           // 0.02 USDC (6 decimals)
    PLAY_COST_DISPLAY: '0.02',  // For display purposes
    TRIES_PER_PAYMENT: 10
};

// Freeze to prevent accidental modification
Object.freeze(CONFIG);
Object.freeze(CONFIG.FIREBASE_CONFIG);

// PlayCostManager - Dynamic play cost management with cross-tab sync
const PlayCostManager = (function() {
    const STORAGE_KEY = 'playCost';
    let _playCost = CONFIG.PLAY_COST;
    let _playCostDisplay = CONFIG.PLAY_COST_DISPLAY;
    let _callbacks = [];
    let _initialized = false;

    const PLAY_COST_ABI = [{
        "inputs": [],
        "name": "playCost",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }];

    function updateValues(rawCost) {
        _playCost = Number(rawCost);
        _playCostDisplay = (_playCost / 1000000).toFixed(2);
        // Notify all subscribers
        _callbacks.forEach(cb => cb(_playCost, _playCostDisplay));
        // Update all .play-cost-display elements on the page
        updateDisplayElements();
    }

    function updateDisplayElements() {
        const elements = document.querySelectorAll('.play-cost-display');
        elements.forEach(el => {
            el.textContent = _playCostDisplay;
        });
    }

    async function fetchFromContract() {
        if (typeof Web3 === 'undefined') {
            console.log('PlayCostManager: Web3 not loaded, will retry...');
            return false;
        }
        try {
            const readWeb3 = new Web3(CONFIG.RPC_URL);
            const contract = new readWeb3.eth.Contract(PLAY_COST_ABI, CONFIG.CONTRACT_ADDRESS);
            const rawCost = await contract.methods.playCost().call();
            console.log('PlayCostManager: Fetched play cost from contract:', rawCost);
            updateValues(rawCost);
            localStorage.setItem(STORAGE_KEY, rawCost.toString());
            return true;
        } catch (e) {
            console.error('PlayCostManager: Failed to fetch play cost from contract:', e);
            return false;
        }
    }

    // Listen for changes from other tabs
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
            console.log('PlayCostManager: Received play cost update from another tab:', e.newValue);
            updateValues(e.newValue);
        }
    });

    return {
        // Initialize the manager - loads from cache, then verifies with contract
        init: async function() {
            if (_initialized) return;
            _initialized = true;

            // Load from localStorage first for instant display
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
                console.log('PlayCostManager: Using cached value:', cached);
                updateValues(cached);
            }

            // Then verify with contract (non-blocking for UI)
            const fetchWithRetry = async (attempts = 3) => {
                for (let i = 0; i < attempts; i++) {
                    if (typeof Web3 !== 'undefined') {
                        const success = await fetchFromContract();
                        if (success) return;
                    }
                    // Wait 1 second before retry
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                console.warn('PlayCostManager: Could not fetch from contract, using fallback');
            };

            fetchWithRetry();
        },

        // Get raw play cost in token units (e.g., 20000)
        getPlayCost: function() {
            return _playCost;
        },

        // Get formatted display string (e.g., "0.02")
        getPlayCostDisplay: function() {
            return _playCostDisplay;
        },

        // Get play cost as USDC float (e.g., 0.02)
        getPlayCostUSDC: function() {
            return _playCost / 1000000;
        },

        // Called by admin.html after successful contract update - broadcasts to other tabs
        setPlayCost: function(rawCost) {
            console.log('PlayCostManager: Setting new play cost:', rawCost);
            updateValues(rawCost);
            localStorage.setItem(STORAGE_KEY, rawCost.toString());
        },

        // Subscribe to play cost changes
        onUpdate: function(callback) {
            _callbacks.push(callback);
        },

        // Force refresh from contract
        refresh: async function() {
            return await fetchFromContract();
        }
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PlayCostManager.init());
} else {
    PlayCostManager.init();
}
