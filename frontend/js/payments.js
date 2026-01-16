// Payment Integration using 402 Protocol and MetaMask
// This file will handle micropayments for game access
// Note: Requires config.js to be loaded first

let web3;
let userAccount;
let hasPaid = false; // Track if user has paid to play
let triesRemaining = 0; // Track remaining tries (10 tries per payment)

// Contract addresses (from centralized config)
const FLAPPY_BIRD_CONTRACT_ADDRESS = CONFIG.CONTRACT_ADDRESS;
const BASE_SEPOLIA_RPC = CONFIG.RPC_URL;

// Update prize pool display
async function updatePrizePool() {
    try {
        const poolDisplay = document.getElementById('pool-amount');
        if (!poolDisplay) {
            return;
        }

        // Check if Web3 is loaded
        if (typeof Web3 === 'undefined') {
            poolDisplay.textContent = 'Loading...';
            setTimeout(updatePrizePool, 1000); // Retry after 1 second
            return;
        }

        // Create a Web3 instance for reading (doesn't require wallet connection)
        const readWeb3 = new Web3(BASE_SEPOLIA_RPC);
        
        const contractABI = [
            {
                "inputs": [],
                "name": "totalPool",
                "outputs": [{"name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            }
        ];
        
        const contract = new readWeb3.eth.Contract(contractABI, FLAPPY_BIRD_CONTRACT_ADDRESS);
        const totalPool = await contract.methods.totalPool().call();
        
        // Convert from 6 decimals (USDC) to readable format
        const poolUSDC = (parseInt(totalPool) / 1000000).toFixed(2);
        poolDisplay.textContent = `$${poolUSDC}`;
    } catch (error) {
        console.error('Error fetching prize pool:', error);
        const poolDisplay = document.getElementById('pool-amount');
        if (poolDisplay) {
            poolDisplay.textContent = 'Error loading pool';
        }
    }
}

// Call updatePrizePool immediately when script loads, and also on page load
updatePrizePool(); // Call immediately
if (document.readyState === 'loading') {
    // Page still loading, wait for load event
    window.addEventListener('load', updatePrizePool);
}

// Update wallet display
function updateWalletDisplay() {
    const walletInfo = document.getElementById('wallet-info');
    if (userAccount) {
        walletInfo.textContent = 'Wallet: ' + userAccount.slice(0, 6) + '...' + userAccount.slice(-4);
    } else {
        walletInfo.textContent = 'Wallet: Not connected';
    }
    updateClaimButton();
}

// Update claim button state
async function updateClaimButton() {
    const claimBtn = document.getElementById('claim-reward-btn');
    if (!claimBtn) return;
    
    if (!userAccount || !web3) {
        claimBtn.disabled = true;
        claimBtn.textContent = 'Connect Wallet First';
        return;
    }
    
    try {
        // Check network first
        const chainId = await web3.eth.getChainId();
        if (chainId !== 84532) {
            claimBtn.disabled = true;
            claimBtn.textContent = 'Switch to Base Sepolia';
            return;
        }
        
        // Check if user has rewards to claim
        const contractABI = [
            {
                "inputs": [{"name": "", "type": "address"}],
                "name": "rewards",
                "outputs": [{"name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            }
        ];
        
        const contract = new web3.eth.Contract(contractABI, FLAPPY_BIRD_CONTRACT_ADDRESS);
        const reward = await contract.methods.rewards(userAccount).call();
        const rewardUSDC = (parseInt(reward) / 1000000).toFixed(2);
        
        if (parseFloat(rewardUSDC) > 0) {
            claimBtn.disabled = false;
            claimBtn.textContent = `Claim $${rewardUSDC}`;
        } else {
            claimBtn.disabled = true;
            claimBtn.textContent = 'No Reward Available';
        }
    } catch (error) {
        console.error('Error checking rewards:', error);
        claimBtn.disabled = true;
        claimBtn.textContent = 'Claim Reward';
    }
}

// Claim reward function
async function claimReward() {
    if (!web3 || !userAccount) {
        alert('Please connect a wallet first');
        return;
    }
    
    const claimBtn = document.getElementById('claim-reward-btn');
    const originalText = claimBtn.textContent;
    
    try {
        claimBtn.disabled = true;
        claimBtn.textContent = 'Claiming...';
        
        const contractABI = [
            {
                "inputs": [],
                "name": "claimReward",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ];
        
        const contract = new web3.eth.Contract(contractABI, FLAPPY_BIRD_CONTRACT_ADDRESS);
        
        console.log('Claiming reward...');
        const tx = await contract.methods.claimReward().send({ from: userAccount });
        
        console.log('Reward claimed! Transaction:', tx.transactionHash);
        alert('Reward claimed successfully!');
        
        // Update button state
        await updateClaimButton();
    } catch (error) {
        console.error('Claim failed:', error);
        alert('Failed to claim reward: ' + (error.message || 'Unknown error'));
        claimBtn.textContent = originalText;
        claimBtn.disabled = false;
    }
}

// Update tries display
function updateTriesDisplay() {
    const triesInfo = document.getElementById('tries-info');
    if (triesInfo) {
        triesInfo.textContent = 'Tries Remaining: ' + triesRemaining;
    }
    
    // Disable start button if no tries remaining
    const startBtn = document.getElementById('start-btn');
    if (triesRemaining <= 0) {
        hasPaid = false;
        if (startBtn) {
            startBtn.disabled = true;
        }
    } else if (hasPaid && startBtn) {
        startBtn.disabled = false;
    }
}

// Wallet connection system with modal and WalletConnect support
let wcProvider;
let wcUri = '';
let isConnecting = false;
let walletConnectClient = null;
let activeWalletConnectSession = null;
const WALLETCONNECT_PROJECT_ID = '9f6e9a1e6f5f0f8e7bec54e6ef95fa4d';

// Initialize wallet system
function initAppKit() {
    console.log('Multi-wallet system initialized');
    setupModalEventListeners();
}

// Setup modal event listeners
function setupModalEventListeners() {
    // Close modal
    document.getElementById('close-modal').addEventListener('click', closeWalletModal);
    
    // MetaMask
    document.getElementById('connect-metamask').addEventListener('click', async () => {
        await connectToWallet('metamask');
    });
    
    // Phantom
    document.getElementById('connect-phantom').addEventListener('click', async () => {
        await connectToWallet('phantom');
    });
    
    // WalletConnect
    document.getElementById('connect-walletconnect').addEventListener('click', async () => {
        await connectToWallet('walletconnect');
    });
    
    // Back button from QR
    document.getElementById('back-to-wallets').addEventListener('click', () => {
        document.getElementById('qr-container').style.display = 'none';
        document.getElementById('wallet-options').style.display = 'grid';
    });
    
    // Close modal on background click
    document.getElementById('wallet-modal').addEventListener('click', (e) => {
        if (e.target.id === 'wallet-modal') {
            closeWalletModal();
        }
    });
}

// Open wallet selection modal
function openWalletModal() {
    const modal = document.getElementById('wallet-modal');
    modal.style.display = 'flex';
    document.getElementById('wallet-options').style.display = 'grid';
    document.getElementById('qr-container').style.display = 'none';
}

// Close wallet modal
function closeWalletModal() {
    const modal = document.getElementById('wallet-modal');
    modal.style.display = 'none';
    
    // Clean up WalletConnect if it was being used
    if (wcProvider) {
        try {
            wcProvider.disconnect();
        } catch (e) {}
        wcProvider = null;
    }
}

// Connect to specific wallet
async function connectToWallet(walletType) {
    if (isConnecting) return;
    
    try {
        isConnecting = true;
        console.log('Connecting to:', walletType);
        
        if (walletType === 'metamask') {
            if (window.ethereum && window.ethereum.isMetaMask) {
                provider = window.ethereum;
                await provider.request({ method: 'eth_requestAccounts' });
            } else if (window.ethereum) {
                // Use any injected wallet if MetaMask not detected
                provider = window.ethereum;
                await provider.request({ method: 'eth_requestAccounts' });
            } else {
                alert('MetaMask not installed. Please install MetaMask extension.');
                window.open('https://metamask.io/download/', '_blank');
                return;
            }
        } else if (walletType === 'phantom') {
            if (window.phantom?.ethereum) {
                provider = window.phantom.ethereum;
                await provider.request({ method: 'eth_requestAccounts' });
            } else if (window.ethereum?.isPhantom) {
                provider = window.ethereum;
                await provider.request({ method: 'eth_requestAccounts' });
            } else {
                alert('Phantom not installed. Please install Phantom wallet.');
                window.open('https://phantom.app/', '_blank');
                return;
            }
        } else if (walletType === 'walletconnect') {
            await connectWalletConnect();
            return; // WalletConnect handles connection differently
        }
        
        // Complete connection
        await finalizeConnection();
        closeWalletModal();
        
    } catch (error) {
        console.error('Failed to connect:', error);
        if (!error.message.includes('User rejected')) {
            alert('Failed to connect: ' + error.message);
        }
    } finally {
        isConnecting = false;
    }
}

// QR Code fallback using online service
function showQRFallback(uri) {
    const qrContainer = document.getElementById('qr-code');
    qrContainer.innerHTML = `
        <div style="text-align: center;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(uri)}" 
                 alt="WalletConnect QR Code" 
                 style="border: none; background: white; padding: 10px;">
            <div style="margin-top: 10px; font-size: 12px; color: var(--fg); opacity: 0.8;">
                Or copy this link to your mobile wallet:
            </div>
            <input type="text" value="${uri}" readonly 
                   style="width: 100%; margin-top: 5px; padding: 8px; font-size: 10px; background: var(--bg); color: var(--fg); border: 1px solid var(--border);"
                   onclick="this.select(); document.execCommand('copy'); alert('Copied to clipboard!');">
        </div>
    `;
}

// Clear all WalletConnect storage and reset state
async function resetWalletConnectState() {
    try {
        console.log('🧹 Resetting WalletConnect state...');
        
        // Clear global variables
        walletConnectClient = null;
        activeWalletConnectSession = null;
        
        // Clear all localStorage keys related to WalletConnect
        const localKeys = Object.keys(localStorage);
        for (const key of localKeys) {
            if (key.includes('walletconnect') || 
                key.includes('wc@2') || 
                key.includes('@walletconnect') ||
                key.includes('WALLETCONNECT') ||
                key.startsWith('wc_')) {
                localStorage.removeItem(key);
                console.log('🗑️ Cleared localStorage:', key);
            }
        }
        
        // Clear all sessionStorage keys related to WalletConnect
        const sessionKeys = Object.keys(sessionStorage);
        for (const key of sessionKeys) {
            if (key.includes('walletconnect') || 
                key.includes('wc@2') || 
                key.includes('@walletconnect') ||
                key.includes('WALLETCONNECT') ||
                key.startsWith('wc_')) {
                sessionStorage.removeItem(key);
                console.log('🗑️ Cleared sessionStorage:', key);
            }
        }
        
        // Clear IndexedDB WalletConnect databases
        if ('indexedDB' in window) {
            try {
                const databases = await indexedDB.databases();
                for (const db of databases) {
                    if (db.name && (db.name.includes('walletconnect') || db.name.includes('wc'))) {
                        indexedDB.deleteDatabase(db.name);
                        console.log('🗑️ Cleared IndexedDB:', db.name);
                    }
                }
            } catch (dbError) {
                console.log('IndexedDB cleanup skipped:', dbError.message);
            }
        }
        
        console.log('✅ WalletConnect state reset complete');
        
    } catch (error) {
        console.error('❌ Error during WalletConnect reset:', error);
    }
}

// Get or create WalletConnect SignClient singleton
async function getSignClient() {
    if (walletConnectClient) return walletConnectClient;
    
    const SignClientModule = window['@walletconnect/sign-client'];
    const SignClient = SignClientModule?.SignClient || SignClientModule?.default || SignClientModule;
    
    if (!SignClient) {
        throw new Error('WalletConnect Sign Client not available');
    }
    
    walletConnectClient = await SignClient.init({
        projectId: WALLETCONNECT_PROJECT_ID,
        metadata: {
            name: 'Flappy Bird Prize Pool',
            description: 'Play and win USDC prizes',
            url: window.location.origin,
            icons: [window.location.origin + '/favicon.ico']
        }
    });
    
    // Set up event handlers only once
    walletConnectClient.on('session_delete', () => {
        console.log('WalletConnect session deleted');
        activeWalletConnectSession = null;
        provider = null;
        web3 = null;
        userAccount = null;
        updateWalletDisplay();
        updateConnectButton();
    });
    
    walletConnectClient.on('session_expire', () => {
        console.log('WalletConnect session expired');
        activeWalletConnectSession = null;
        provider = null;
        web3 = null;
        userAccount = null;
        updateWalletDisplay();
        updateConnectButton();
    });
    
    return walletConnectClient;
}

// Restore existing WalletConnect session
async function restoreWalletConnectSession() {
    try {
        const signClient = await getSignClient();
        const sessions = signClient.session.getAll();
        if (sessions.length === 0) return false;
        
        // Use the most recent session
        const session = sessions[sessions.length - 1];
        const accounts = session.namespaces?.eip155?.accounts;
        
        if (!accounts || accounts.length === 0) return false;
        
        // Extract address from account (format: eip155:84532:0x...)
        const address = accounts[0].split(':')[2];
        
        // Store session reference
        activeWalletConnectSession = session;
        
        // Create provider wrapper
        const wcProvider = {
            signClient: walletConnectClient,
            session,
            request: async ({ method, params }) => {
                return await walletConnectClient.request({
                    topic: session.topic,
                    chainId: 'eip155:84532',
                    request: { method, params }
                });
            },
            disconnect: async () => {
                await walletConnectClient.disconnect({
                    topic: session.topic,
                    reason: { code: 6000, message: 'User disconnected' }
                });
            }
        };
        
        // Set up Web3 with custom provider
        provider = {
            request: wcProvider.request,
            on: () => {},
            removeListener: () => {}
        };
        
        web3 = new Web3(BASE_SEPOLIA_RPC);
        userAccount = address;
        
        console.log('Restored WalletConnect session for:', userAccount);
        return true;
        
    } catch (error) {
        console.error('Failed to restore WalletConnect session:', error);
        return false;
    }
}

// WalletConnect connection with QR code
async function connectWalletConnect() {
    try {
        console.log('🔄 Starting fresh WalletConnect connection...');
        
        // Always reset WalletConnect state for clean connection
        await resetWalletConnectState();
        
        // Show QR container
        document.getElementById('wallet-options').style.display = 'none';
        document.getElementById('qr-container').style.display = 'block';
        document.getElementById('qr-code').innerHTML = 'Initializing fresh connection...';
        
        // Check if WalletConnect Sign Client is loaded
        const SignClientModule = window['@walletconnect/sign-client'];
        const SignClient = SignClientModule?.SignClient || SignClientModule?.default || SignClientModule;
        
        if (!SignClient) {
            console.log('WalletConnect Sign Client not found');
            alert('WalletConnect is loading... Please try again in a moment, or use MetaMask/Phantom wallet.');
            return;
        }
        
        // Initialize Sign Client
        const signClient = await SignClient.init({
            projectId: WALLETCONNECT_PROJECT_ID,
            metadata: {
                name: 'Flappy Bird Prize Pool',
                description: 'Play and win USDC prizes',
                url: window.location.origin,
                icons: [window.location.origin + '/favicon.ico']
            }
        });
        
        // Store client reference
        walletConnectClient = signClient;
        
        // Set up minimal event handlers\n        signClient.on('session_delete', () => {\n            console.log('\ud83d\uddd1\ufe0f WalletConnect session deleted');\n            resetWalletConnectState();\n            updateWalletDisplay();\n            updateConnectButton();\n        });\n        \n        console.log('\u2705 Fresh SignClient ready');
        
        // Set up event handlers for session management
        signClient.on('session_delete', () => {
            console.log('WalletConnect session deleted');
            activeWalletConnectSession = null;
            // Reset connection state
            provider = null;
            web3 = null;
            userAccount = null;
            updateWalletDisplay();
            updateConnectButton();
        });
        
        signClient.on('session_expire', () => {
            console.log('WalletConnect session expired');
            activeWalletConnectSession = null;
            // Reset connection state  
            provider = null;
            web3 = null;
            userAccount = null;
            updateWalletDisplay();
            updateConnectButton();
        });
        
        // Check for existing sessions first
        const existingSessions = signClient.session.getAll();
        if (existingSessions.length > 0) {
            console.log('Found existing WalletConnect sessions');
            const restored = await restoreWalletConnectSession();
            if (restored) {
                updateWalletDisplay();
                updateConnectButton();
                closeWalletModal();
                return;
            }
        }
        
        // Create session
        const { uri, approval } = await signClient.connect({
            requiredNamespaces: {
                eip155: {
                    methods: ['eth_sendTransaction', 'personal_sign', 'eth_sign'],
                    chains: ['eip155:84532'],
                    events: ['chainChanged', 'accountsChanged']
                }
            }
        });
        
        if (uri) {
            console.log('WalletConnect URI:', uri);
            
            // Generate QR code
            document.getElementById('qr-code').innerHTML = '';
            
            // Check if QRCode is available
            if (typeof QRCode !== 'undefined') {
                QRCode.toCanvas(uri, {
                    width: 280,
                    margin: 2,
                    color: { dark: '#000000', light: '#FFFFFF' }
                }, (error, canvas) => {
                    if (error) {
                        console.error('QR code error:', error);
                        showQRFallback(uri);
                    } else {
                        document.getElementById('qr-code').appendChild(canvas);
                    }
                });
            } else {
                console.log('QRCode library not available, using fallback');
                showQRFallback(uri);
            }
        }
        
        // Wait for approval
        const session = await approval();
        console.log('WalletConnect session approved:', session);
        
        // Store session reference
        activeWalletConnectSession = session;
        
        // Get accounts from session
        const accounts = session.namespaces.eip155.accounts;
        const address = accounts[0].split(':')[2]; // Format is "eip155:chainId:address"
        
        // Create a provider wrapper with error handling
        wcProvider = {
            signClient,
            session,
            request: async ({ method, params }) => {
                // Validate session before making requests
                const currentSessions = signClient.session.getAll();
                const validSession = currentSessions.find(s => s.topic === session.topic);
                
                if (!validSession) {
                    throw new Error('Session no longer valid');
                }
                
                return await signClient.request({
                    topic: session.topic,
                    chainId: 'eip155:84532',
                    request: { method, params }
                });
            },
            disconnect: async () => {
                try {
                    await signClient.disconnect({
                        topic: session.topic,
                        reason: { code: 6000, message: 'User disconnected' }
                    });
                } catch (error) {
                    console.log('Disconnect error (session may already be invalid):', error.message);
                }
            }
        };
        
        // Set up Web3 with WalletConnect provider for transactions
        const wcProviderForWeb3 = {
            request: wcProvider.request,
            on: () => {},
            removeListener: () => {},
            isMetaMask: false,
            isWalletConnect: true,
            // Add methods that Web3 might call
            send: (payload, callback) => {
                wcProvider.request(payload)
                    .then(result => callback(null, { result }))
                    .catch(error => callback(error, null));
            },
            sendAsync: (payload, callback) => {
                wcProvider.request(payload)
                    .then(result => callback(null, { result }))
                    .catch(error => callback(error, null));
            }
        };
        
        // Set up provider
        provider = wcProviderForWeb3;
        
        // Use WalletConnect provider for Web3 to handle transactions
        web3 = new Web3(provider);
        userAccount = address;
        
        console.log('Connected via WalletConnect to:', userAccount);
        
        updateWalletDisplay();
        updateConnectButton();
        closeWalletModal();
        
    } catch (error) {
        console.error('WalletConnect error:', error);
        document.getElementById('qr-code').innerHTML = 'Connection failed. Try again.';
        
        if (!error.message?.includes('User rejected')) {
            // Don't show alert for user rejection
            if (error.message) {
                console.log('Error details:', error.message);
            }
        }
    }
}

// Finalize wallet connection
async function finalizeConnection() {
    if (!provider) {
        throw new Error('No provider available');
    }
    
    web3 = new Web3(provider);
    const accounts = await web3.eth.getAccounts();
    
    if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
    }
    
    userAccount = accounts[0];
    console.log('Connected to account:', userAccount);
    
    // Setup event listeners for non-WalletConnect providers
    if (provider.on && !wcProvider) {
        provider.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                disconnectWallet();
            } else {
                userAccount = accounts[0];
                updateWalletDisplay();
            }
        });
        
        provider.on('chainChanged', () => {
            console.log('Chain changed');
        });
        
        provider.on('disconnect', () => {
            disconnectWallet();
        });
    }
    
    updateWalletDisplay();
    updateConnectButton();
}

// Main connect wallet function (opens modal)
async function connectWallet() {
    openWalletModal();
}

// Disconnect wallet
async function disconnectWallet() {
    try {
        if (wcProvider) {
            await wcProvider.disconnect();
            wcProvider = null;
        }
        
        if (provider && provider.disconnect && typeof provider.disconnect === 'function') {
            await provider.disconnect();
        }
    } catch (error) {
        console.error('Error during disconnection:', error);
    }
    
    provider = null;
    web3 = null;
    userAccount = null;
    
    updateWalletDisplay();
    updateConnectButton();
    console.log('Wallet disconnected');
}

// Update connect button
function updateConnectButton() {
    const connectBtn = document.getElementById('connect-wallet-btn');
    if (connectBtn) {
        if (userAccount) {
            connectBtn.textContent = '🔓 Disconnect Wallet';
            connectBtn.onclick = disconnectWallet;
        } else {
            connectBtn.textContent = '🔗 Connect Wallet';
            connectBtn.onclick = connectWallet;
        }
    }
}

// Pay 0.02 USDC to play
async function payToPlay() {
    if (!web3 || !userAccount) {
        alert('Please connect a wallet first');
        return;
    }

    // TODO: Switch to Base Mainnet when going to production
    // Base Mainnet: chainId 8453 (0x2105), USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    
    // Check if on Base Sepolia testnet (chain ID 84532)
    const chainId = await web3.eth.getChainId();
    if (chainId !== 84532) {
        console.log('Current chain ID:', chainId, 'Expected: 84532');
        // Try to switch for MetaMask
        if (window.ethereum) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x14a34' }], // Base Sepolia chain ID
                });
                // Network switched successfully, continue with payment
                console.log('Successfully switched to Base Sepolia');
            } catch (switchError) {
                // If network not added, add it
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x14a34',
                                chainName: 'Base Sepolia',
                                nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                                rpcUrls: ['https://sepolia.base.org'],
                                blockExplorerUrls: ['https://sepolia.basescan.org'],
                            }],
                        });
                        console.log('Successfully added and switched to Base Sepolia');
                    } catch (addError) {
                        console.error('Failed to add Base Sepolia network:', addError);
                        alert('Failed to add Base Sepolia network. Please add it manually.');
                        return;
                    }
                } else {
                    console.error('Failed to switch to Base Sepolia network:', switchError);
                    alert('Please switch to Base Sepolia testnet manually in your wallet');
                    return;
                }
            }
        } else {
            alert('Please switch to Base Sepolia testnet in your wallet');
            return;
        }
    }

    // Base Sepolia testnet addresses (from centralized config)
    const usdcAddress = CONFIG.USDC_ADDRESS;
    const flappyBirdContractAddress = CONFIG.CONTRACT_ADDRESS;
    const amount = CONFIG.PLAY_COST;

    const usdcAbi = [
        {
            "constant": false,
            "inputs": [
                {"name": "_spender", "type": "address"},
                {"name": "_value", "type": "uint256"}
            ],
            "name": "approve",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        }
    ];

    const flappyBirdAbi = [
        {
            "inputs": [],
            "name": "payToPlay",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ];

    const usdcContract = new web3.eth.Contract(usdcAbi, usdcAddress);
    const flappyBirdContract = new web3.eth.Contract(flappyBirdAbi, flappyBirdContractAddress);

    try {
        // First, approve the FlappyBirdPrizePool contract to spend USDC
        console.log('Approving USDC spend...');
        await usdcContract.methods.approve(flappyBirdContractAddress, amount).send({ from: userAccount });
        
        // Then call payToPlay on the FlappyBirdPrizePool contract
        console.log('Sending payment to contract...');
        const tx = await flappyBirdContract.methods.payToPlay().send({ from: userAccount });
        
        console.log('Payment successful! You can now play the game.');
        hasPaid = true;
        triesRemaining = 10; // Grant 10 tries per payment
        updateTriesDisplay();
        
        // Record payment in user profile database
        try {
            await fetch('https://us-central1-flappy-bird-leaderboard-463e0.cloudfunctions.net/recordPayment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddress: userAccount,
                    amountUSDC: 0.02,
                    transactionHash: tx.transactionHash
                })
            });
            console.log('Payment recorded in user profile');
        } catch (recordError) {
            console.error('Failed to record payment in profile:', recordError);
            // Don't fail the payment if recording fails
        }
        
        // Update prize pool display after payment
        await updatePrizePool();
        
        alert('Payment successful! You have 10 tries to play.');
    } catch (error) {
        console.error('Payment failed:', error);
        alert('Payment failed. Please try again.');
    }
}

// Donate to prize pool
async function donate() {
    if (!web3 || !userAccount) {
        alert('Please connect a wallet first');
        return;
    }

    const donateAmountInput = document.getElementById('donate-amount');
    const donateAmount = parseFloat(donateAmountInput.value);

    if (!donateAmount || donateAmount <= 0) {
        alert('Please enter a valid donation amount');
        return;
    }

    // Convert USDC amount to token units (6 decimals)
    const donateAmountInTokenUnits = Math.floor(donateAmount * 1000000);

    // Check if on Base Sepolia testnet (chain ID 84532)
    const chainId = await web3.eth.getChainId();
    if (chainId !== 84532) {
        console.log('Current chain ID:', chainId, 'Expected: 84532');
        if (window.ethereum) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x14a34' }],
                });
                console.log('Successfully switched to Base Sepolia');
            } catch (switchError) {
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x14a34',
                                chainName: 'Base Sepolia',
                                nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                                rpcUrls: ['https://sepolia.base.org'],
                                blockExplorerUrls: ['https://sepolia.basescan.org'],
                            }],
                        });
                        console.log('Successfully added and switched to Base Sepolia');
                    } catch (addError) {
                        console.error('Failed to add Base Sepolia network:', addError);
                        alert('Failed to add Base Sepolia network. Please add it manually.');
                        return;
                    }
                } else {
                    console.error('Failed to switch to Base Sepolia network:', switchError);
                    alert('Please switch to Base Sepolia testnet manually in your wallet');
                    return;
                }
            }
        } else {
            alert('Please switch to Base Sepolia testnet in your wallet');
            return;
        }
    }

    const usdcAddress = CONFIG.USDC_ADDRESS;
    const flappyBirdContractAddress = CONFIG.CONTRACT_ADDRESS;

    const usdcAbi = [
        {
            "constant": false,
            "inputs": [
                {"name": "_spender", "type": "address"},
                {"name": "_value", "type": "uint256"}
            ],
            "name": "approve",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        }
    ];

    const flappyBirdAbi = [
        {
            "inputs": [{"name": "amount", "type": "uint256"}],
            "name": "donate",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ];

    const usdcContract = new web3.eth.Contract(usdcAbi, usdcAddress);
    const flappyBirdContract = new web3.eth.Contract(flappyBirdAbi, flappyBirdContractAddress);

    const donateBtn = document.getElementById('donate-btn');
    const originalText = donateBtn.textContent;

    try {
        donateBtn.disabled = true;
        donateBtn.textContent = 'Processing...';

        console.log('Approving USDC spend for donation...');
        await usdcContract.methods.approve(flappyBirdContractAddress, donateAmountInTokenUnits).send({ from: userAccount });

        console.log('Sending donation to contract...');
        const tx = await flappyBirdContract.methods.donate(donateAmountInTokenUnits).send({ from: userAccount });

        console.log('Donation successful! Transaction:', tx.transactionHash);

        // Record donation in user profile database
        try {
            await fetch('https://us-central1-flappy-bird-leaderboard-463e0.cloudfunctions.net/recordPayment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddress: userAccount,
                    amountUSDC: donateAmount,
                    transactionHash: tx.transactionHash,
                    isDonation: true
                })
            });
            console.log('Donation recorded in user profile');
        } catch (recordError) {
            console.error('Failed to record donation in profile:', recordError);
            // Don't fail the donation if recording fails
        }

        // Update prize pool display
        await updatePrizePool();

        alert(`Thank you for donating $${donateAmount.toFixed(2)} USDC!`);
        donateAmountInput.value = '';
        donateBtn.textContent = originalText;
        donateBtn.disabled = false;
    } catch (error) {
        console.error('Donation failed:', error);
        alert('Donation failed. Please try again.');
        donateBtn.textContent = originalText;
        donateBtn.disabled = false;
    }
}

// Auto-reconnect on page load
async function autoReconnect() {
    // Check if user previously connected
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ 
                method: 'eth_accounts' 
            });
            
            if (accounts && accounts.length > 0) {
                console.log('Auto-reconnecting to previous wallet...');
                await connectWallet();
            }
        } catch (error) {
            console.log('Auto-reconnect not available:', error.message);
        }
    }
}

// Event listeners
document.getElementById('pay-btn').addEventListener('click', payToPlay);
document.getElementById('claim-reward-btn').addEventListener('click', claimReward);
document.getElementById('donate-btn').addEventListener('click', donate);
// Connect wallet button is handled by updateConnectButton() function

// Initialize on page load
window.addEventListener('load', async () => {
    try {
        initAppKit();
        updateConnectButton();
        
        try {
            await autoReconnect();
        } catch (error) {
            console.log('Auto-reconnect failed (non-blocking):', error.message);
        }
        
        // Try to restore WalletConnect session after a brief delay
        setTimeout(async () => {
            try {
                const restored = await restoreWalletConnectSession();
                if (restored) {
                    updateWalletDisplay();
                    updateConnectButton();
                    console.log('WalletConnect session restored on page load');
                }
            } catch (error) {
                console.log('Could not restore WalletConnect session:', error.message);
            }
        }, 1000);
    } catch (error) {
        console.error('Wallet initialization error:', error);
    }
    
    // Update prize pool - this should always run regardless of wallet errors
    updatePrizePool();
    updateClaimButton();
    
    // Refresh prize pool and claim button every 30 seconds
    setInterval(() => {
        updatePrizePool();
        updateClaimButton();
    }, 30000);
});