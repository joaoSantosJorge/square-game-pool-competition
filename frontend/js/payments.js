// Payment Integration using 402 Protocol and MetaMask
// This file will handle micropayments for game access
// Note: Requires config.js and wallet.js to be loaded first

let web3;
let userAccount;
let provider; // Current wallet provider (MetaMask, Phantom, or WalletConnect)
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
    if (walletInfo) {
        if (userAccount) {
            walletInfo.textContent = 'Wallet: ' + userAccount.slice(0, 6) + '...' + userAccount.slice(-4);
        } else {
            walletInfo.textContent = 'Wallet: Not connected';
        }
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
        // Always check network first - this is critical
        let chainId = null;
        let chainSource = 'unknown';
        
        try {
            // Try to get chain ID from the connected provider first
            provider = WalletManager.getProvider();
            if (provider && provider.request && typeof provider.request === 'function') {
                const chainIdResult = await provider.request({ method: 'eth_chainId' });
                // Handle both hex string and number formats
                if (typeof chainIdResult === 'string' && chainIdResult.startsWith('0x')) {
                    chainId = parseInt(chainIdResult, 16);
                } else {
                    chainId = Number(chainIdResult);
                }
                chainSource = 'provider';
            }
        } catch (e) {
            console.warn('Failed to get chain ID from provider:', e.message);
        }
        
        // Fallback to web3 if provider didn't work
        if (chainId === null && web3) {
            try {
                const web3ChainId = await web3.eth.getChainId();
                chainId = Number(web3ChainId); // Convert BigInt to number
                chainSource = 'web3';
            } catch (chainError) {
                console.warn('Failed to get chain ID from web3:', chainError.message);
            }
        }
        
        // Final fallback to read-only RPC verification
        if (chainId === null) {
            try {
                const readWeb3 = new Web3(BASE_SEPOLIA_RPC);
                const rpcChainId = await readWeb3.eth.getChainId();
                chainId = Number(rpcChainId);
                chainSource = 'rpc-fallback';
            } catch (rpcError) {
                console.error('Failed to get chain ID from any source:', rpcError.message);
            }
        }
        
        console.log('Chain ID check:', { chainId, chainSource, expected: 84532 });
        
        // Check if on correct network
        if (chainId !== 84532) {
            claimBtn.disabled = true;
            
            // Provide specific guidance based on detected chain
            if (chainId === 1) {
                claimBtn.textContent = 'Wrong Network (Ethereum)';
                console.warn('User is on Ethereum Mainnet but app requires Base Sepolia');
            } else if (chainId === 8453) {
                claimBtn.textContent = 'Wrong Network (Base Mainnet)';
                console.warn('User is on Base Mainnet but app requires Base Sepolia');
            } else if (chainId === 137) {
                claimBtn.textContent = 'Wrong Network (Polygon)';
            } else {
                claimBtn.textContent = `Wrong Network (${chainId})`;
            }
            return;
        }
        
        // Check if user has rewards to claim - use read-only RPC for reliability
        const readWeb3 = new Web3(BASE_SEPOLIA_RPC);
        const contractABI = [
            {
                "inputs": [{"name": "", "type": "address"}],
                "name": "rewards",
                "outputs": [{"name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            }
        ];
        
        const contract = new readWeb3.eth.Contract(contractABI, FLAPPY_BIRD_CONTRACT_ADDRESS);
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

// Delegate wallet modal to WalletManager
function openWalletModal() {
    WalletManager.openModal();
}

function closeWalletModal() {
    WalletManager.closeModal();
}

// Main connect wallet function (opens modal)
async function connectWallet() {
    WalletManager.openModal();
}

// Disconnect wallet - complete cleanup
async function disconnectWallet() {
    console.log('🔌 Disconnecting wallet...');
    await WalletManager.disconnect();
    
    // Clear game-specific state
    hasPaid = false;
    triesRemaining = 0;
    
    // Update all UI elements
    updateWalletDisplay();
    updateConnectButton();
    updateTriesDisplay();
    
    console.log('✅ Wallet fully disconnected');
}

// Update connect button
function updateConnectButton() {
    const connectBtn = document.getElementById('connect-wallet-btn');
    if (connectBtn) {
        if (WalletManager.isConnected()) {
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
    
    const payBtn = document.getElementById('pay-btn');
    const originalText = payBtn?.textContent || 'Pay to Play';
    
    try {
        if (payBtn) {
            payBtn.disabled = true;
            payBtn.textContent = 'Checking network...';
        }
        
        // Check if on Base Sepolia testnet (chain ID 84532)
        let chainId = 84532;
        try {
            chainId = Number(await web3.eth.getChainId());
        } catch (e) {
            console.warn('Could not get chain ID:', e.message);
        }
        
        if (chainId !== 84532) {
            console.log('Current chain ID:', chainId, 'Expected: 84532');
            
            // Detect wallet type
            const isPhantom = window.phantom?.ethereum?.isPhantom || window.ethereum?.isPhantom;
            const isMetaMask = window.ethereum?.isMetaMask;
            
            if (isPhantom) {
                // Phantom wallet - show manual switch instructions
                console.log('Phantom wallet detected');
                alert('Please switch to the Base Sepolia network in your Phantom wallet.\n\n1. Click the network selector in Phantom\n2. Select "Base Sepolia"\n3. Then try again');
                if (payBtn) payBtn.textContent = originalText;
                if (payBtn) payBtn.disabled = false;
                return;
            } else if (window.ethereum) {
                // Try to switch for MetaMask or compatible wallets
                try {
                    if (payBtn) payBtn.textContent = 'Switching network...';
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
                            alert('Failed to add Base Sepolia network. Please add it manually in your wallet settings.');
                            if (payBtn) payBtn.textContent = originalText;
                            if (payBtn) payBtn.disabled = false;
                            return;
                        }
                    } else if (switchError.code === 4001) {
                        // User rejected the switch
                        alert('Network switch cancelled.');
                        if (payBtn) payBtn.textContent = originalText;
                        if (payBtn) payBtn.disabled = false;
                        return;
                    } else {
                        console.error('Failed to switch to Base Sepolia network:', switchError);
                        alert('Please switch to Base Sepolia testnet manually in your wallet');
                        if (payBtn) payBtn.textContent = originalText;
                        if (payBtn) payBtn.disabled = false;
                        return;
                    }
                }
            } else {
                alert('Please switch to Base Sepolia testnet in your wallet');
                if (payBtn) payBtn.textContent = originalText;
                if (payBtn) payBtn.disabled = false;
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
            if (payBtn) payBtn.textContent = 'Approving USDC...';
            
            await usdcContract.methods.approve(flappyBirdContractAddress, amount).send({ 
                from: userAccount,
                gasPrice: '1000000000' // 1 Gwei
            });
            
            // Then call payToPlay on the FlappyBirdPrizePool contract
            console.log('Sending payment to contract...');
            if (payBtn) payBtn.textContent = 'Processing payment...';
            
            const tx = await flappyBirdContract.methods.payToPlay().send({ 
                from: userAccount,
                gasPrice: '1000000000' // 1 Gwei
            });
            
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
            
            if (payBtn) {
                payBtn.textContent = originalText;
                payBtn.disabled = false;
            }
            alert('Payment successful! You have 10 tries to play.');
        } catch (txError) {
            console.error('Transaction error:', txError);
            
            // Better error messages for WalletConnect issues
            if (txError.message?.includes('Failed to publish payload')) {
                alert('Network relay error. Please try again. If the problem persists, try using MetaMask instead.');
            } else if (txError.message?.includes('User rejected')) {
                alert('Payment cancelled.');
            } else if (txError.message?.includes('insufficient funds')) {
                alert('Insufficient funds for gas fees.');
            } else {
                alert('Payment failed: ' + (txError.message || 'Unknown error'));
            }
            
            if (payBtn) payBtn.textContent = originalText;
            if (payBtn) payBtn.disabled = false;
        }
    } catch (error) {
        console.error('Payment error:', error);
        alert('Payment error: ' + (error.message || 'Unknown error'));
        if (payBtn) payBtn.textContent = originalText;
        if (payBtn) payBtn.disabled = false;
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

// Event listeners
document.getElementById('pay-btn').addEventListener('click', payToPlay);
document.getElementById('claim-reward-btn').addEventListener('click', claimReward);
document.getElementById('donate-btn').addEventListener('click', donate);
// Connect wallet button is handled by updateConnectButton() function

// Initialize on page load
window.addEventListener('load', async () => {
    try {
        // Initialize WalletManager with game-specific callbacks
        WalletManager.init({
            onConnect: (account, web3Instance) => {
                console.log('✅ Wallet connected:', account);
                userAccount = account;
                web3 = web3Instance;
                provider = WalletManager.getProvider();
                
                // Reset game state for new connection
                hasPaid = false;
                triesRemaining = 0;
                
                updateWalletDisplay();
                updateConnectButton();
                updateTriesDisplay();
                updateClaimButton();
            },
            onDisconnect: () => {
                console.log('🔌 Wallet disconnected');
                userAccount = null;
                web3 = null;
                provider = null;
                hasPaid = false;
                triesRemaining = 0;
                
                updateWalletDisplay();
                updateConnectButton();
                updateTriesDisplay();
            },
            onAccountChange: (newAccount) => {
                console.log('🔄 Account changed to:', newAccount);
                userAccount = newAccount;
                
                // Reset game state for new account
                hasPaid = false;
                triesRemaining = 0;
                
                updateWalletDisplay();
                updateConnectButton();
                updateTriesDisplay();
                updateClaimButton();
            },
            onChainChange: (chainId) => {
                console.log('🔗 Chain changed to:', chainId);
                updateClaimButton();
            },
            onError: (error) => {
                console.error('❌ Wallet error:', error);
            }
        });
        
        updateConnectButton();
        
        // Try to auto-reconnect existing wallet
        const reconnected = await WalletManager.autoReconnect();
        
        if (reconnected) {
            userAccount = WalletManager.getAccount();
            web3 = WalletManager.getWeb3();
            provider = WalletManager.getProvider();
            console.log('✅ Auto-reconnected wallet:', userAccount);
            
            updateWalletDisplay();
            updateConnectButton();
            updateClaimButton();
        }
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