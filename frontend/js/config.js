// Centralized Configuration for Square Game Prize Pool
// Update this file when deploying to a new contract

const CONFIG = {
    // Smart Contract Addresses (Base Mainnet)
    CONTRACT_ADDRESS: '0xDD0BbF48f85f5314C3754cd63103Be927B55986C',
    USDC_ADDRESS: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',

    // Network Configuration (Base Mainnet)
    CHAIN_ID: 8453,
    CHAIN_NAME: 'Base',
    // Primary RPC: Infura (higher rate limits), fallbacks: public endpoints
    RPC_URL: 'https://base-mainnet.infura.io/v3/ff9e59d594ea4715adcfb87750d57a80',
    RPC_URLS: [
        'https://base-mainnet.infura.io/v3/ff9e59d594ea4715adcfb87750d57a80',
        'https://mainnet.base.org',
        'https://base.llamarpc.com'
    ],

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

// WinnerAllocationManager - Dynamic winner allocation management with cross-tab sync
const WinnerAllocationManager = (function() {
    const STORAGE_KEY_WINNERS = 'squarePrize_numberOfWinners';
    const STORAGE_KEY_FEE = 'squarePrize_feePercentage';
    let _numberOfWinners = 3;  // default
    let _feePercentage = 1000; // default (10% in basis points)
    let _callbacks = [];
    let _initialized = false;

    // Calculate percentages based on number of winners and fee
    // Copied from cycleManager.js to ensure consistency
    function calculatePercentages(numWinners, feePercentage) {
        const percentages = [];
        const totalForWinners = 10000 - feePercentage;

        if (numWinners === 1) {
            percentages.push(totalForWinners);
        } else if (numWinners === 2) {
            percentages.push(Math.floor(totalForWinners * 0.7));
            percentages.push(Math.floor(totalForWinners * 0.3));
        } else if (numWinners === 3) {
            percentages.push(Math.floor(totalForWinners * 0.6));
            percentages.push(Math.floor(totalForWinners * 0.3));
            percentages.push(Math.floor(totalForWinners * 0.1));
        } else if (numWinners === 4) {
            percentages.push(Math.floor(totalForWinners * 0.6));
            percentages.push(Math.floor(totalForWinners * 0.25));
            percentages.push(Math.floor(totalForWinners * 0.1));
            percentages.push(Math.floor(totalForWinners * 0.05));
        } else if (numWinners === 5) {
            percentages.push(Math.floor(totalForWinners * 0.5));
            percentages.push(Math.floor(totalForWinners * 0.25));
            percentages.push(Math.floor(totalForWinners * 0.15));
            percentages.push(Math.floor(totalForWinners * 0.07));
            percentages.push(Math.floor(totalForWinners * 0.03));
        } else if (numWinners === 6) {
            percentages.push(Math.floor(totalForWinners * 0.4));
            percentages.push(Math.floor(totalForWinners * 0.25));
            percentages.push(Math.floor(totalForWinners * 0.15));
            percentages.push(Math.floor(totalForWinners * 0.1));
            percentages.push(Math.floor(totalForWinners * 0.06));
            percentages.push(Math.floor(totalForWinners * 0.04));
        } else if (numWinners === 7) {
            percentages.push(Math.floor(totalForWinners * 0.35));
            percentages.push(Math.floor(totalForWinners * 0.25));
            percentages.push(Math.floor(totalForWinners * 0.15));
            percentages.push(Math.floor(totalForWinners * 0.1));
            percentages.push(Math.floor(totalForWinners * 0.08));
            percentages.push(Math.floor(totalForWinners * 0.04));
            percentages.push(Math.floor(totalForWinners * 0.03));
        } else if (numWinners === 8) {
            percentages.push(Math.floor(totalForWinners * 0.3));
            percentages.push(Math.floor(totalForWinners * 0.25));
            percentages.push(Math.floor(totalForWinners * 0.15));
            percentages.push(Math.floor(totalForWinners * 0.1));
            percentages.push(Math.floor(totalForWinners * 0.1));
            percentages.push(Math.floor(totalForWinners * 0.05));
            percentages.push(Math.floor(totalForWinners * 0.03));
            percentages.push(Math.floor(totalForWinners * 0.02));
        } else if (numWinners === 9) {
            percentages.push(Math.floor(totalForWinners * 0.28));
            percentages.push(Math.floor(totalForWinners * 0.25));
            percentages.push(Math.floor(totalForWinners * 0.15));
            percentages.push(Math.floor(totalForWinners * 0.1));
            percentages.push(Math.floor(totalForWinners * 0.1));
            percentages.push(Math.floor(totalForWinners * 0.06));
            percentages.push(Math.floor(totalForWinners * 0.03));
            percentages.push(Math.floor(totalForWinners * 0.02));
            percentages.push(Math.floor(totalForWinners * 0.01));
        } else if (numWinners === 10) {
            percentages.push(Math.floor(totalForWinners * 0.25));
            percentages.push(Math.floor(totalForWinners * 0.2));
            percentages.push(Math.floor(totalForWinners * 0.15));
            percentages.push(Math.floor(totalForWinners * 0.1));
            percentages.push(Math.floor(totalForWinners * 0.1));
            percentages.push(Math.floor(totalForWinners * 0.07));
            percentages.push(Math.floor(totalForWinners * 0.05));
            percentages.push(Math.floor(totalForWinners * 0.04));
            percentages.push(Math.floor(totalForWinners * 0.03));
            percentages.push(Math.floor(totalForWinners * 0.01));
        } else {
            // Fallback for unexpected values
            const share = Math.floor(totalForWinners / numWinners);
            for (let i = 0; i < numWinners; i++) {
                percentages.push(share);
            }
        }

        // Adjust last percentage to ensure total is exactly (10000 - feePercentage)
        const sum = percentages.reduce((a, b) => a + b, 0);
        percentages[percentages.length - 1] += (totalForWinners - sum);

        return percentages;
    }

    function getOrdinalSuffix(n) {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    function updateDisplayElements() {
        const percentages = calculatePercentages(_numberOfWinners, _feePercentage);
        const feePercent = (_feePercentage / 100).toFixed(1).replace(/\.0$/, '');
        const examplePool = 100; // Example with 100 USDC pool

        // Update allocation table if container exists
        const tableContainer = document.getElementById('allocation-table-container');
        if (tableContainer) {
            let tableHTML = `
                <table class="allocation-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Allocation %</th>
                            <th>Example (${examplePool} USDC Pool)</th>
                        </tr>
                    </thead>
                    <tbody>`;

            for (let i = 0; i < percentages.length; i++) {
                const percent = (percentages[i] / 100).toFixed(1).replace(/\.0$/, '');
                const exampleAmount = (percentages[i] / 10000 * examplePool).toFixed(2);
                tableHTML += `
                        <tr>
                            <td>${getOrdinalSuffix(i + 1)} Place</td>
                            <td>${percent}%</td>
                            <td>${exampleAmount} USDC</td>
                        </tr>`;
            }

            // Add admin fee row
            const feeAmount = (_feePercentage / 10000 * examplePool).toFixed(2);
            tableHTML += `
                        <tr>
                            <td><strong>Admin Fee</strong></td>
                            <td><strong>${feePercent}%</strong></td>
                            <td><strong>${feeAmount} USDC</strong></td>
                        </tr>
                    </tbody>
                </table>`;

            tableContainer.innerHTML = tableHTML;
        }

        // Update example box if container exists
        const exampleContainer = document.getElementById('example-calculation-container');
        if (exampleContainer) {
            const playCost = PlayCostManager.getPlayCostUSDC();
            const players = 500;
            const totalPool = players * playCost;

            let exampleHTML = `<ul>
                <li>Total Pool: ${players} × ${playCost.toFixed(2)} = <span class="highlight">${totalPool.toFixed(2)} USDC</span></li>`;

            for (let i = 0; i < percentages.length; i++) {
                const percent = (percentages[i] / 100).toFixed(1).replace(/\.0$/, '');
                const amount = (percentages[i] / 10000 * totalPool).toFixed(2);
                exampleHTML += `
                <li>${getOrdinalSuffix(i + 1)} Place: ${amount} USDC (${percent}%)</li>`;
            }

            const feeAmount = (_feePercentage / 10000 * totalPool).toFixed(2);
            exampleHTML += `
                <li>Admin Fee: ${feeAmount} USDC (${feePercent}%)</li>
            </ul>`;

            exampleContainer.innerHTML = exampleHTML;
        }
    }

    async function fetchFromFirebase() {
        try {
            // Check if Firebase is available
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                console.log('WinnerAllocationManager: Firebase not loaded, will retry...');
                return false;
            }
            const db = firebase.firestore();
            const configDoc = await db.collection('config').doc('settings').get();
            if (configDoc.exists) {
                const data = configDoc.data();
                let updated = false;

                if (data.numberOfWinners !== undefined) {
                    _numberOfWinners = Number(data.numberOfWinners);
                    localStorage.setItem(STORAGE_KEY_WINNERS, _numberOfWinners.toString());
                    updated = true;
                }
                if (data.feePercentage !== undefined) {
                    _feePercentage = Number(data.feePercentage);
                    localStorage.setItem(STORAGE_KEY_FEE, _feePercentage.toString());
                    updated = true;
                }

                if (updated) {
                    console.log('WinnerAllocationManager: Fetched config from Firebase:', {
                        numberOfWinners: _numberOfWinners,
                        feePercentage: _feePercentage
                    });
                    _callbacks.forEach(cb => cb(_numberOfWinners, _feePercentage));
                    updateDisplayElements();
                    return true;
                }
            }
            return false;
        } catch (e) {
            console.error('WinnerAllocationManager: Failed to fetch config from Firebase:', e);
            return false;
        }
    }

    // Listen for changes from other tabs
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY_WINNERS && e.newValue) {
            console.log('WinnerAllocationManager: Received numberOfWinners update from another tab:', e.newValue);
            _numberOfWinners = Number(e.newValue);
            _callbacks.forEach(cb => cb(_numberOfWinners, _feePercentage));
            updateDisplayElements();
        }
        if (e.key === STORAGE_KEY_FEE && e.newValue) {
            console.log('WinnerAllocationManager: Received feePercentage update from another tab:', e.newValue);
            _feePercentage = Number(e.newValue);
            _callbacks.forEach(cb => cb(_numberOfWinners, _feePercentage));
            updateDisplayElements();
        }
    });

    return {
        // Initialize the manager - loads from cache, then verifies with Firebase
        init: async function() {
            if (_initialized) return;
            _initialized = true;

            // Load from localStorage first for instant display
            const cachedWinners = localStorage.getItem(STORAGE_KEY_WINNERS);
            const cachedFee = localStorage.getItem(STORAGE_KEY_FEE);

            if (cachedWinners) {
                console.log('WinnerAllocationManager: Using cached numberOfWinners:', cachedWinners);
                _numberOfWinners = Number(cachedWinners);
            }
            if (cachedFee) {
                console.log('WinnerAllocationManager: Using cached feePercentage:', cachedFee);
                _feePercentage = Number(cachedFee);
            }

            // Update display with cached values
            updateDisplayElements();

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
                console.warn('WinnerAllocationManager: Could not fetch from Firebase, using fallback/cached values');
            };

            fetchWithRetry();
        },

        // Get number of winners
        getNumberOfWinners: function() {
            return _numberOfWinners;
        },

        // Get fee percentage in basis points (e.g., 1000 = 10%)
        getFeePercentage: function() {
            return _feePercentage;
        },

        // Get fee percentage as display string (e.g., "10")
        getFeePercentageDisplay: function() {
            return (_feePercentage / 100).toFixed(1).replace(/\.0$/, '');
        },

        // Get allocation percentages array in basis points
        getAllocationPercentages: function() {
            return calculatePercentages(_numberOfWinners, _feePercentage);
        },

        // Called by admin.html after successful config update - broadcasts to other tabs
        setNumberOfWinners: function(winners) {
            console.log('WinnerAllocationManager: Setting numberOfWinners:', winners);
            _numberOfWinners = Number(winners);
            localStorage.setItem(STORAGE_KEY_WINNERS, _numberOfWinners.toString());
            _callbacks.forEach(cb => cb(_numberOfWinners, _feePercentage));
            updateDisplayElements();
        },

        // Called by admin.html after successful config update - broadcasts to other tabs
        setFeePercentage: function(fee) {
            console.log('WinnerAllocationManager: Setting feePercentage:', fee);
            _feePercentage = Number(fee);
            localStorage.setItem(STORAGE_KEY_FEE, _feePercentage.toString());
            _callbacks.forEach(cb => cb(_numberOfWinners, _feePercentage));
            updateDisplayElements();
        },

        // Subscribe to config changes
        onUpdate: function(callback) {
            _callbacks.push(callback);
        },

        // Force refresh from Firebase
        refresh: async function() {
            return await fetchFromFirebase();
        },

        // Force update display elements (useful after DOM is ready)
        updateDisplay: function() {
            updateDisplayElements();
        }
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        PlayCostManager.init();
        TriesPerPaymentManager.init();
        WinnerAllocationManager.init();
    });
} else {
    PlayCostManager.init();
    TriesPerPaymentManager.init();
    WinnerAllocationManager.init();
}
