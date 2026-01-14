// WalletConnect Session Cleanup Patch
// Add this code to the beginning of connectWalletConnect() function

// Clear localStorage to remove stale WalletConnect data
try {
    const wcKeys = Object.keys(localStorage).filter(key => 
        key.includes('walletconnect') || key.includes('wc@2')
    );
    wcKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log('Cleared localStorage key:', key);
    });
    
    // Also clear sessionStorage
    const wcSessionKeys = Object.keys(sessionStorage).filter(key => 
        key.includes('walletconnect') || key.includes('wc@2')
    );
    wcSessionKeys.forEach(key => {
        sessionStorage.removeItem(key);
        console.log('Cleared sessionStorage key:', key);
    });
    
    console.log('WalletConnect storage cleared');
} catch (error) {
    console.log('Storage cleanup error:', error.message);
}