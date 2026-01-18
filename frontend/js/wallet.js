/**
 * Wallet Connection Module
 * Shared wallet connection functionality for MetaMask, Phantom, and WalletConnect
 * 
 * Usage:
 * 1. Include this script after config.js and Web3.js
 * 2. Call WalletManager.init(callbacks) to initialize
 * 3. Use WalletManager.openModal() to show wallet selection
 */

const WalletManager = (function() {
    // Private state
    let web3 = null;
    let userAccount = null;
    let provider = null;
    let isConnecting = false;
    let walletConnectClient = null;
    let activeWalletConnectSession = null;
    let wcProvider = null;
    
    // Configuration
    const WALLETCONNECT_PROJECT_ID = '9f6e9a1e6f5f0f8e7bec54e6ef95fa4d';
    const SUPPORTED_CHAINS = ['eip155:84532'];
    const SUPPORTED_METHODS = ['eth_sendTransaction', 'personal_sign', 'eth_sign', 'eth_signTypedData_v4'];
    const SUPPORTED_EVENTS = ['chainChanged', 'accountsChanged'];
    
    // Callbacks for page-specific behavior
    let callbacks = {
        onConnect: null,        // Called when wallet connects: (account, web3) => {}
        onDisconnect: null,     // Called when wallet disconnects: () => {}
        onAccountChange: null,  // Called when account changes: (newAccount) => {}
        onChainChange: null,    // Called when chain changes: (chainId) => {}
        onError: null           // Called on errors: (error) => {}
    };

    // Helper function to add timeout to promises
    function withTimeout(promise, ms, errorMessage = 'Operation timed out') {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error(errorMessage)), ms)
            )
        ]);
    }

    // Truncate wallet address for display
    function truncateAddress(address) {
        if (!address) return 'Unknown';
        if (address.length < 12) return address;
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    // Get the best available wallet provider
    function getWalletProvider() {
        if (window.phantom?.ethereum) {
            return window.phantom.ethereum;
        } else if (window.ethereum?.isPhantom) {
            return window.ethereum;
        } else if (window.ethereum) {
            return window.ethereum;
        }
        return null;
    }

    // Open wallet selection modal
    function openModal() {
        const modal = document.getElementById('wallet-modal');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('wallet-options').style.display = 'grid';
            document.getElementById('qr-container').style.display = 'none';
        }
    }

    // Close wallet modal
    function closeModal() {
        const modal = document.getElementById('wallet-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Setup modal event listeners
    function setupModalEventListeners() {
        const closeModalBtn = document.getElementById('close-modal');
        const metamaskBtn = document.getElementById('connect-metamask');
        const phantomBtn = document.getElementById('connect-phantom');
        const walletconnectBtn = document.getElementById('connect-walletconnect');
        const backBtn = document.getElementById('back-to-wallets');
        const modal = document.getElementById('wallet-modal');

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeModal);
        }
        
        if (metamaskBtn) {
            metamaskBtn.addEventListener('click', () => connectToWallet('metamask'));
        }
        
        if (phantomBtn) {
            phantomBtn.addEventListener('click', () => connectToWallet('phantom'));
        }
        
        if (walletconnectBtn) {
            walletconnectBtn.addEventListener('click', () => connectToWallet('walletconnect'));
        }
        
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                document.getElementById('wallet-options').style.display = 'grid';
                document.getElementById('qr-container').style.display = 'none';
            });
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'wallet-modal') {
                    closeModal();
                }
            });
        }
    }

    // Setup wallet provider event listeners for injected wallets
    function setupWalletEventListeners() {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);
            window.ethereum.on('disconnect', handleDisconnect);
        }
        
        if (window.phantom?.ethereum) {
            window.phantom.ethereum.on('accountsChanged', handleAccountsChanged);
            window.phantom.ethereum.on('chainChanged', handleChainChanged);
            window.phantom.ethereum.on('disconnect', handleDisconnect);
        }
    }

    // Setup provider-specific listeners after connection
    function setupProviderListeners() {
        if (!provider) return;
        
        console.log('📡 Setting up provider listeners...');
        
        // Remove any existing listeners to avoid duplicates
        if (provider.removeAllListeners) {
            provider.removeAllListeners();
        }
        
        provider.on('accountsChanged', (accounts) => {
            console.log('🔄 Account changed in provider:', accounts);
            handleAccountsChanged(accounts);
        });
        
        provider.on('chainChanged', (chainId) => {
            console.log('🔗 Chain changed to:', chainId);
            handleChainChanged(chainId);
        });
        
        provider.on('connect', (info) => {
            console.log('✅ Provider connected:', info);
        });
        
        provider.on('disconnect', (error) => {
            console.log('❌ Provider disconnected:', error);
            handleDisconnect(error);
        });
        
        console.log('✅ Provider listeners set up');
    }

    // Handle account changes
    async function handleAccountsChanged(accounts) {
        console.log('🔄 Accounts changed event:', accounts);
        
        if (!accounts || accounts.length === 0) {
            console.log('No accounts available, disconnecting');
            await disconnect();
            return;
        }
        
        const newAccount = accounts[0];
        
        if (userAccount && newAccount.toLowerCase() !== userAccount.toLowerCase()) {
            console.log('Account switched from', truncateAddress(userAccount), 'to', truncateAddress(newAccount));
            userAccount = newAccount;
            
            if (callbacks.onAccountChange) {
                callbacks.onAccountChange(newAccount);
            }
        } else if (!userAccount) {
            userAccount = newAccount;
            if (callbacks.onConnect) {
                callbacks.onConnect(newAccount, web3);
            }
        }
    }

    // Handle chain changes
    function handleChainChanged(chainId) {
        console.log('🔗 Chain changed:', chainId);
        if (callbacks.onChainChange) {
            callbacks.onChainChange(chainId);
        }
    }

    // Handle disconnect
    async function handleDisconnect(error) {
        console.log('🔌 Provider disconnect event:', error);
        await disconnect();
    }

    // Connect to specific wallet
    async function connectToWallet(walletType) {
        if (isConnecting) return;
        
        try {
            isConnecting = true;
            console.log('Connecting to wallet:', walletType);
            
            // If already connected, disconnect first
            if (userAccount) {
                console.log('Already connected, disconnecting first...');
                await disconnect();
            }
            
            if (walletType === 'metamask') {
                if (window.ethereum && window.ethereum.isMetaMask) {
                    provider = window.ethereum;
                } else if (window.ethereum) {
                    provider = window.ethereum;
                } else {
                    alert('MetaMask not installed. Please install MetaMask extension.');
                    window.open('https://metamask.io/download/', '_blank');
                    return;
                }
                await provider.request({ method: 'eth_requestAccounts' });
            } else if (walletType === 'phantom') {
                if (window.phantom?.ethereum) {
                    provider = window.phantom.ethereum;
                } else if (window.ethereum?.isPhantom) {
                    provider = window.ethereum;
                } else {
                    alert('Phantom not installed. Please install Phantom wallet.');
                    window.open('https://phantom.app/', '_blank');
                    return;
                }
                await provider.request({ method: 'eth_requestAccounts' });
            } else if (walletType === 'walletconnect') {
                await connectWalletConnect();
                return;
            }
            
            await finalizeConnection();
            closeModal();
            
        } catch (error) {
            console.error('Wallet connection error:', error);
            if (!error.message?.includes('User rejected')) {
                alert('Failed to connect wallet: ' + (error.message || 'Unknown error'));
            }
            if (callbacks.onError) {
                callbacks.onError(error);
            }
        } finally {
            isConnecting = false;
        }
    }

    // Finalize wallet connection
    async function finalizeConnection() {
        if (!provider) {
            throw new Error('No provider selected');
        }
        
        web3 = new Web3(provider);
        const accounts = await web3.eth.getAccounts();
        
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found');
        }
        
        userAccount = accounts[0];
        console.log('✅ Connected to account:', userAccount);
        
        setupProviderListeners();
        
        if (callbacks.onConnect) {
            callbacks.onConnect(userAccount, web3);
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
        
        setupWalletConnectEventHandlers(walletConnectClient);
        return walletConnectClient;
    }

    // Setup WalletConnect event handlers
    function setupWalletConnectEventHandlers(signClient) {
        signClient.on('session_delete', ({ topic }) => {
            console.log('🗑️ WalletConnect session deleted');
            if (activeWalletConnectSession?.topic === topic) {
                cleanupWalletConnectState();
            }
        });
        
        signClient.on('session_expire', ({ topic }) => {
            console.log('⏰ WalletConnect session expired');
            if (activeWalletConnectSession?.topic === topic) {
                cleanupWalletConnectState();
            }
        });
        
        signClient.on('session_update', ({ topic, params }) => {
            console.log('🔄 WalletConnect session_update event');
            if (activeWalletConnectSession?.topic !== topic) return;
            
            const { namespaces } = params;
            if (namespaces?.eip155?.accounts) {
                const accounts = namespaces.eip155.accounts;
                const addresses = accounts.map(acc => acc.split(':')[2]);
                if (addresses.length > 0) {
                    handleAccountsChanged(addresses);
                }
                activeWalletConnectSession = { ...activeWalletConnectSession, namespaces };
            }
        });
        
        signClient.on('session_event', ({ topic, params }) => {
            console.log('📡 WalletConnect session_event');
            if (activeWalletConnectSession?.topic !== topic) return;
            
            const { event } = params;
            if (event.name === 'accountsChanged') {
                handleAccountsChanged(event.data);
            } else if (event.name === 'chainChanged') {
                handleChainChanged(event.data);
            }
        });
        
        console.log('✅ WalletConnect event handlers set up');
    }

    // Clean up WalletConnect state
    function cleanupWalletConnectState() {
        console.log('🧹 Cleaning up WalletConnect state...');
        activeWalletConnectSession = null;
        wcProvider = null;
        provider = null;
        web3 = null;
        userAccount = null;
        
        if (callbacks.onDisconnect) {
            callbacks.onDisconnect();
        }
    }

    // Create WalletConnect provider wrapper
    function createWalletConnectProvider(signClient, session) {
        const rpcUrl = typeof CONFIG !== 'undefined' ? CONFIG.RPC_URL : 'https://sepolia.base.org';
        
        const wcProviderObj = {
            signClient,
            session,
            isWalletConnect: true,
            isMetaMask: false,
            
            request: async ({ method, params }) => {
                try {
                    const currentSessions = signClient.session.getAll();
                    const validSession = currentSessions.find(s => s.topic === session.topic);
                    
                    if (!validSession) {
                        throw new Error('WalletConnect session no longer valid');
                    }
                    
                    if (method === 'eth_accounts') {
                        const accounts = validSession.namespaces?.eip155?.accounts || [];
                        return accounts.map(acc => acc.split(':')[2]);
                    }
                    
                    if (method === 'eth_chainId') {
                        return '0x14a34'; // Base Sepolia
                    }
                    
                    if (method === 'eth_getTransactionReceipt' || method === 'eth_blockNumber' || method === 'eth_getBalance') {
                        const response = await fetch(rpcUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                jsonrpc: '2.0',
                                id: 1,
                                method,
                                params: params || []
                            })
                        });
                        const json = await response.json();
                        if (json.error) throw new Error(json.error.message);
                        return json.result;
                    }
                    
                    return await withTimeout(
                        signClient.request({
                            topic: session.topic,
                            chainId: 'eip155:84532',
                            request: { method, params: params || [] }
                        }),
                        30000,
                        `WalletConnect request timeout for ${method}`
                    );
                } catch (error) {
                    console.error(`Provider request error for ${method}:`, error);
                    throw error;
                }
            },
            
            disconnect: async () => {
                try {
                    await signClient.disconnect({
                        topic: session.topic,
                        reason: { code: 6000, message: 'User disconnected' }
                    });
                } catch (error) {
                    console.log('Disconnect error:', error.message);
                }
            },
            
            on: (event, callback) => {},
            removeListener: (event, callback) => {},
            removeAllListeners: () => {},
            
            send: (payload, callback) => {
                wcProviderObj.request(payload)
                    .then(result => callback(null, { id: payload.id, jsonrpc: '2.0', result }))
                    .catch(error => callback(error));
            },
            
            sendAsync: (payload, callback) => {
                wcProviderObj.request(payload)
                    .then(result => callback(null, { id: payload.id, jsonrpc: '2.0', result }))
                    .catch(error => callback(error));
            }
        };
        
        return wcProviderObj;
    }

    // Show QR code fallback
    function showQRFallback(uri) {
        const qrContainer = document.getElementById('qr-code');
        if (!qrContainer) return;
        
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

    // Connect WalletConnect
    async function connectWalletConnect() {
        try {
            console.log('🔄 Starting WalletConnect connection...');
            document.getElementById('wallet-options').style.display = 'none';
            document.getElementById('qr-container').style.display = 'block';
            document.getElementById('qr-code').innerHTML = 'Initializing connection...';
            
            const signClient = await getSignClient();
            
            // Check for existing valid sessions
            const existingSessions = signClient.session.getAll();
            if (existingSessions.length > 0) {
                console.log('Found existing WalletConnect sessions, attempting restore...');
                document.getElementById('qr-code').innerHTML = 'Checking existing session...';
                
                if (await restoreWalletConnectSession(signClient)) {
                    console.log('✅ Restored existing session');
                    closeModal();
                    return;
                }
                
                console.log('Cleaning up stale sessions...');
                document.getElementById('qr-code').innerHTML = 'Cleaning up old sessions...';
                
                for (const session of existingSessions) {
                    try {
                        await withTimeout(
                            signClient.disconnect({
                                topic: session.topic,
                                reason: { code: 6000, message: 'Stale session cleanup' }
                            }),
                            2000
                        );
                    } catch (e) {
                        console.log('Could not disconnect stale session:', e.message);
                    }
                }
            }
            
            console.log('Creating new WalletConnect session...');
            document.getElementById('qr-code').innerHTML = 'Generating QR code...';
            
            const { uri, approval } = await signClient.connect({
                requiredNamespaces: {
                    eip155: {
                        methods: SUPPORTED_METHODS,
                        chains: SUPPORTED_CHAINS,
                        events: SUPPORTED_EVENTS
                    }
                }
            });
            
            if (uri) {
                console.log('📱 WalletConnect URI generated');
                document.getElementById('qr-code').innerHTML = '';
                
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
                    showQRFallback(uri);
                }
            }
            
            console.log('⏳ Waiting for wallet approval...');
            const session = await approval();
            console.log('✅ WalletConnect session approved');
            
            activeWalletConnectSession = session;
            const accounts = session.namespaces.eip155.accounts;
            
            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts returned from wallet');
            }
            
            const address = accounts[0].split(':')[2];
            console.log('Connected account:', address);
            
            wcProvider = createWalletConnectProvider(signClient, session);
            provider = wcProvider;
            web3 = new Web3(provider);
            userAccount = address;
            
            console.log('✅ Connected via WalletConnect');
            
            closeModal();
            
            if (callbacks.onConnect) {
                callbacks.onConnect(userAccount, web3);
            }
            
        } catch (error) {
            console.error('❌ WalletConnect error:', error);
            
            const qrCode = document.getElementById('qr-code');
            if (qrCode) {
                if (error.message?.includes('rejected')) {
                    qrCode.innerHTML = 'Connection cancelled. <br><button onclick="WalletManager.connectWalletConnect()" style="margin-top: 10px; padding: 8px 16px; cursor: pointer;">Try Again</button>';
                } else {
                    qrCode.innerHTML = `Connection failed: ${error.message || 'Unknown error'}. <br><button onclick="WalletManager.connectWalletConnect()" style="margin-top: 10px; padding: 8px 16px; cursor: pointer;">Try Again</button>`;
                }
            }
            
            if (callbacks.onError) {
                callbacks.onError(error);
            }
        }
    }

    // Restore existing WalletConnect session
    async function restoreWalletConnectSession(signClient) {
        try {
            const sessions = signClient.session.getAll();
            if (sessions.length === 0) return false;
            
            const session = sessions[sessions.length - 1];
            const accounts = session.namespaces?.eip155?.accounts;
            
            if (!accounts || accounts.length === 0) {
                try {
                    await withTimeout(
                        signClient.disconnect({
                            topic: session.topic,
                            reason: { code: 6000, message: 'Invalid session' }
                        }),
                        3000
                    );
                } catch (e) {}
                return false;
            }
            
            const address = accounts[0].split(':')[2];
            
            try {
                await withTimeout(
                    signClient.ping({ topic: session.topic }),
                    5000
                );
                console.log('✅ Session ping successful');
            } catch (pingError) {
                console.log('Session ping failed:', pingError.message);
                try {
                    await withTimeout(
                        signClient.disconnect({
                            topic: session.topic,
                            reason: { code: 6000, message: 'Stale session' }
                        }),
                        2000
                    );
                } catch (e) {}
                return false;
            }
            
            activeWalletConnectSession = session;
            wcProvider = createWalletConnectProvider(signClient, session);
            provider = wcProvider;
            web3 = new Web3(provider);
            userAccount = address;
            
            console.log('✅ Restored WalletConnect session for:', userAccount);
            
            if (callbacks.onConnect) {
                callbacks.onConnect(userAccount, web3);
            }
            
            return true;
            
        } catch (error) {
            console.error('Failed to restore WalletConnect session:', error);
            return false;
        }
    }

    // Disconnect wallet
    async function disconnect() {
        console.log('🔌 Starting wallet disconnection...');
        
        try {
            if (wcProvider && activeWalletConnectSession) {
                try {
                    await wcProvider.disconnect();
                } catch (e) {
                    console.log('WalletConnect disconnect error:', e.message);
                }
            }
        } catch (error) {
            console.error('Disconnect error:', error);
        }
        
        // Clear all state
        provider = null;
        web3 = null;
        userAccount = null;
        activeWalletConnectSession = null;
        wcProvider = null;
        
        console.log('✅ Wallet fully disconnected');
        
        if (callbacks.onDisconnect) {
            callbacks.onDisconnect();
        }
    }

    // Auto-reconnect on page load
    async function autoReconnect() {
        const detectedProvider = getWalletProvider();
        
        if (detectedProvider) {
            provider = detectedProvider;
            setupProviderListeners();
            
            try {
                const accounts = await detectedProvider.request({ method: 'eth_accounts' });
                console.log('Checking for connected accounts...', accounts);
                
                if (accounts && accounts.length > 0) {
                    userAccount = accounts[0];
                    web3 = new Web3(detectedProvider);
                    console.log('Auto-detected wallet:', userAccount);
                    
                    if (callbacks.onConnect) {
                        callbacks.onConnect(userAccount, web3);
                    }
                    return true;
                }
            } catch (error) {
                console.error('Error checking accounts:', error);
            }
        }
        
        // Try to restore WalletConnect session
        try {
            const signClient = await getSignClient();
            const sessions = signClient.session.getAll();
            
            if (sessions.length > 0) {
                console.log('Found WalletConnect sessions, attempting restore...');
                return await restoreWalletConnectSession(signClient);
            }
        } catch (error) {
            console.log('WalletConnect auto-restore skipped:', error.message);
        }
        
        return false;
    }

    // Initialize the wallet manager
    function init(pageCallbacks = {}) {
        console.log('🔧 Initializing WalletManager...');
        
        // Set callbacks
        callbacks = {
            onConnect: pageCallbacks.onConnect || null,
            onDisconnect: pageCallbacks.onDisconnect || null,
            onAccountChange: pageCallbacks.onAccountChange || null,
            onChainChange: pageCallbacks.onChainChange || null,
            onError: pageCallbacks.onError || null
        };
        
        // Setup event listeners
        setupModalEventListeners();
        setupWalletEventListeners();
        
        console.log('✅ WalletManager initialized');
    }

    // Public API
    return {
        init,
        openModal,
        closeModal,
        connect: connectToWallet,
        disconnect,
        autoReconnect,
        connectWalletConnect,
        
        // Getters
        getAccount: () => userAccount,
        getWeb3: () => web3,
        getProvider: () => provider,
        isConnected: () => !!userAccount,
        
        // Utility
        truncateAddress
    };
})();

// Export for module systems (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WalletManager;
}
