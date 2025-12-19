// Payment Integration using 402 Protocol and MetaMask
// This file will handle micropayments for game access

let web3;
let userAccount;

// Initialize MetaMask connection
async function initMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
        web3 = new Web3(window.ethereum);
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const accounts = await web3.eth.getAccounts();
            userAccount = accounts[0];
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

    // Check if on Base network (chain ID 8453)
    const chainId = await web3.eth.getChainId();
    if (chainId !== 8453) {
        alert('Please switch to Base network to make the payment');
        // Try to switch for MetaMask
        if (window.ethereum) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x2105' }],
                });
            } catch (switchError) {
                // If network not added, add it
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x2105',
                                chainName: 'Base',
                                nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                                rpcUrls: ['https://mainnet.base.org'],
                                blockExplorerUrls: ['https://basescan.org'],
                            }],
                        });
                    } catch (addError) {
                        console.error('Failed to add Base network:', addError);
                    }
                } else {
                    console.error('Failed to switch to Base network:', switchError);
                }
            }
        }
        return;
    }

    const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC contract on Base network
    const recipient = '0xaF6AA830D01011811f1fBCCD94440a9CA724A722'; // Game developer's address
    const amount = 20000; // 0.02 USDC (6 decimals)

    const usdcAbi = [
        {
            "constant": false,
            "inputs": [
                {"name": "_to", "type": "address"},
                {"name": "_value", "type": "uint256"}
            ],
            "name": "transfer",
            "outputs": [{"name": "", "type": "bool"}],
            "type": "function"
        }
    ];

    const usdcContract = new web3.eth.Contract(usdcAbi, usdcAddress);

    try {
        await usdcContract.methods.transfer(recipient, amount).send({ from: userAccount });
        console.log('Payment successful');
        // TODO: Enable game after payment
    } catch (error) {
        console.error('Payment failed:', error);
    }
}

// Initialize WalletConnect connection
async function initWalletConnect() {
    const provider = new WalletConnectProvider({
        infuraId: "your-infura-id", // TODO: Replace with your Infura project ID
        qrcode: true, // Show QR code for mobile wallets
        chainId: 8453, // Base network
    });

    try {
        await provider.enable();
        web3 = new Web3(provider);
        userAccount = provider.accounts[0];
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
        console.log('Connected via Coinbase Wallet:', userAccount);
    } catch (error) {
        console.error('Coinbase Wallet connection failed:', error);
    }
}

// Event listeners
document.getElementById('pay-btn').addEventListener('click', payToPlay);
document.getElementById('walletconnect-btn').addEventListener('click', initWalletConnect);
document.getElementById('coinbase-btn').addEventListener('click', initCoinbase);