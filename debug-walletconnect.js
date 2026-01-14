// Debug WalletConnect Connection
// Run this in browser console after connecting with WalletConnect

console.log('=== WalletConnect Debug Info ===');
console.log('userAccount:', userAccount);
console.log('web3:', web3);
console.log('provider:', provider);

if (web3) {
    web3.eth.getAccounts()
        .then(accounts => {
            console.log('Accounts from web3.eth.getAccounts():', accounts);
        })
        .catch(error => {
            console.error('Error getting accounts:', error);
        });
    
    web3.eth.getChainId()
        .then(chainId => {
            console.log('Current chain ID:', chainId);
        })
        .catch(error => {
            console.error('Error getting chain ID:', error);
        });
}

// Test a simple provider call
if (provider && provider.request) {
    console.log('Testing provider.request...');
    provider.request({ method: 'eth_accounts' })
        .then(accounts => {
            console.log('Accounts from provider.request:', accounts);
        })
        .catch(error => {
            console.error('Provider request error:', error);
        });
}