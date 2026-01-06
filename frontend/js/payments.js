// Payment Integration using 402 Protocol and MetaMask
// This file will handle micropayments for game access

let web3;
let userAccount;
let hasPaid = false; // Track if user has paid to play
let triesRemaining = 0; // Track remaining tries (10 tries per payment)

// Update wallet display
function updateWalletDisplay() {
    const walletInfo = document.getElementById('wallet-info');
    if (userAccount) {
        walletInfo.textContent = 'Wallet: ' + userAccount.slice(0, 6) + '...' + userAccount.slice(-4);
    } else {
        walletInfo.textContent = 'Wallet: Not connected';
    }
}

// Update tries display
function updateTriesDisplay() {
    const triesInfo = document.getElementById('tries-info');
    if (triesInfo) {
        triesInfo.textContent = 'Tries Remaining: ' + triesRemaining;
    }
}

// Initialize MetaMask connection
async function initMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
        web3 = new Web3(window.ethereum);
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const accounts = await web3.eth.getAccounts();
            userAccount = accounts[0];
            updateWalletDisplay();
            console.log('Connected account:', userAccount);
        } catch (error) {
            console.error('User denied account access');
        }
    } else {
        console.error('MetaMask not detected');
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
        alert('Please switch to Base Sepolia testnet to make the payment');
        // Try to switch for MetaMask
        if (window.ethereum) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x14a34' }], // Base Sepolia chain ID
                });
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
                    } catch (addError) {
                        console.error('Failed to add Base Sepolia network:', addError);
                    }
                } else {
                    console.error('Failed to switch to Base Sepolia network:', switchError);
                }
            }
        }
        return;
    }

    // Base Sepolia testnet addresses
    const usdcAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // USDC contract on Base Sepolia
    const flappyBirdContractAddress = '0xdd0bbf48f85f5314c3754cd63103be927b55986c'; // FlappyBirdPrizePool on Base Sepolia
    const amount = 20000; // 0.02 USDC (6 decimals)

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
        await flappyBirdContract.methods.payToPlay().send({ from: userAccount });
        
        console.log('Payment successful! You can now play the game.');
        hasPaid = true;
        triesRemaining = 10; // Grant 10 tries per payment
        updateTriesDisplay();
        document.getElementById('start-btn').disabled = false;
        alert('Payment successful! You have 10 tries to play.');
    } catch (error) {
        console.error('Payment failed:', error);
        alert('Payment failed. Please try again.');
    }
}

// Initialize WalletConnect connection
async function initWalletConnect() {
    // TODO: Update chainId to 8453 (Base Mainnet) when going to production
    const provider = new WalletConnectProvider({
        infuraId: "your-infura-id", // TODO: Replace with your Infura project ID
        qrcode: true, // Show QR code for mobile wallets
        chainId: 84532, // Base Sepolia testnet
    });

    try {
        await provider.enable();
        web3 = new Web3(provider);
        userAccount = provider.accounts[0];
        updateWalletDisplay();
        console.log('Connected via WalletConnect:', userAccount);
    } catch (error) {
        console.error('WalletConnect connection failed:', error);
    }
}

// Initialize Coinbase Wallet connection
async function initCoinbase() {
    const sdk = new CoinbaseWalletSDK({
        appName: 'Flappy Bird Game',
        appLogoUrl: '', // Optional: add your logo URL
    });

    const provider = sdk.makeWeb3Provider();

    try {
        await provider.request({ method: 'eth_requestAccounts' });
        web3 = new Web3(provider);
        userAccount = provider.selectedAddress;
        updateWalletDisplay();
        console.log('Connected via Coinbase Wallet:', userAccount);
    } catch (error) {
        console.error('Coinbase Wallet connection failed:', error);
    }
}

// Event listeners
document.getElementById('pay-btn').addEventListener('click', payToPlay);
document.getElementById('connect-wallet-btn').addEventListener('click', async () => {
    // Show a prompt or modal to select wallet type
    const walletType = prompt('Select wallet: metamask, walletconnect, coinbase').toLowerCase();
    if (walletType === 'metamask') {
        await initMetaMask();
    } else if (walletType === 'walletconnect') {
        await initWalletConnect();
    } else if (walletType === 'coinbase') {
        await initCoinbase();
    } else {
        alert('Unknown wallet type. Please enter metamask, walletconnect, or coinbase.');
    }
});