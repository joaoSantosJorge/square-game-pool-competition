// Centralized Configuration for Square Game Prize Pool
// Update this file when deploying to a new contract

const CONFIG = {
    // Smart Contract Addresses (Base Mainnet)
    CONTRACT_ADDRESS: '0xDD0BbF48f85f5314C3754cd63103Be927B55986C',
    USDC_ADDRESS: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',

    // Network Configuration (Base Mainnet)
    CHAIN_ID: 8453,
    CHAIN_NAME: 'Base',
    RPC_URL: 'https://mainnet.base.org',

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

// TriesPerPaymentManager - Dynamic tries per payment management with cross-tab sync
const TriesPerPaymentManager = (function() {
    const STORAGE_KEY = 'triesPerPayment';
    let _triesPerPayment = CONFIG.TRIES_PER_PAYMENT;
    let _callbacks = [];
    let _initialized = false;

    function updateValues(tries) {
        _triesPerPayment = Number(tries);
        // Notify all subscribers
        _callbacks.forEach(cb => cb(_triesPerPayment));
        // Update all .tries-per-payment-display elements on the page
        updateDisplayElements();
    }

    function updateDisplayElements() {
        const elements = document.querySelectorAll('.tries-per-payment-display');
        elements.forEach(el => {
            el.textContent = _triesPerPayment;
        });
    }

    async function fetchFromFirebase() {
        try {
            // Check if Firebase is available
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                console.log('TriesPerPaymentManager: Firebase not loaded, will retry...');
                return false;
            }
            const db = firebase.firestore();
            const configDoc = await db.collection('config').doc('settings').get();
            if (configDoc.exists && configDoc.data().triesPerPayment) {
                const tries = configDoc.data().triesPerPayment;
                console.log('TriesPerPaymentManager: Fetched tries per payment from Firebase:', tries);
                updateValues(tries);
                localStorage.setItem(STORAGE_KEY, tries.toString());
                return true;
            }
            return false;
        } catch (e) {
            console.error('TriesPerPaymentManager: Failed to fetch tries per payment from Firebase:', e);
            return false;
        }
    }

    // Listen for changes from other tabs
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
            console.log('TriesPerPaymentManager: Received tries per payment update from another tab:', e.newValue);
            updateValues(e.newValue);
        }
    });

    return {
        // Initialize the manager - loads from cache, then verifies with Firebase
        init: async function() {
            if (_initialized) return;
            _initialized = true;

            // Load from localStorage first for instant display
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
                console.log('TriesPerPaymentManager: Using cached value:', cached);
                updateValues(cached);
            }

            // Then verify with Firebase (non-blocking for UI)
            const fetchWithRetry = async (attempts = 3) => {
                for (let i = 0; i < attempts; i++) {
                    if (typeof firebase !== 'undefined' && firebase.firestore) {
                        const success = await fetchFromFirebase();
                        if (success) return;
                    }
                    // Wait 1 second before retry
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                console.warn('TriesPerPaymentManager: Could not fetch from Firebase, using fallback');
            };

            fetchWithRetry();
        },

        // Get tries per payment
        getTriesPerPayment: function() {
            return _triesPerPayment;
        },

        // Called by admin.html after successful config update - broadcasts to other tabs
        setTriesPerPayment: function(tries) {
            console.log('TriesPerPaymentManager: Setting new tries per payment:', tries);
            updateValues(tries);
            localStorage.setItem(STORAGE_KEY, tries.toString());
        },

        // Subscribe to tries per payment changes
        onUpdate: function(callback) {
            _callbacks.push(callback);
        },

        // Force refresh from Firebase
        refresh: async function() {
            return await fetchFromFirebase();
        }
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        PlayCostManager.init();
        TriesPerPaymentManager.init();
    });
} else {
    PlayCostManager.init();
    TriesPerPaymentManager.init();
}
