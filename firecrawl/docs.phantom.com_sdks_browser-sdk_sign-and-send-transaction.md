---
url: "https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction"
title: "Sign and send transactions - Phantom developer documentation"
---

[Skip to main content](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction#content-area)

[Phantom developer documentation home page![light logo](https://mintcdn.com/phantom-e50e2e68/fkWrmnMWhjoXSGZ9/logo/phantom-light.svg?fit=max&auto=format&n=fkWrmnMWhjoXSGZ9&q=85&s=c21a66db70347ca7a31053b98a0b5b0a)![dark logo](https://mintcdn.com/phantom-e50e2e68/fkWrmnMWhjoXSGZ9/logo/phantom-dark.svg?fit=max&auto=format&n=fkWrmnMWhjoXSGZ9&q=85&s=af17fb78921412073a894ea97523898c)](https://docs.phantom.com/)

Search...

Ctrl KAsk AI

- [Support](https://docs.google.com/forms/d/e/1FAIpQLSeHWETFkEJbHQCF-lnl1AHmVQPuyfC0HbnxjDjIp6VYV1sBZQ/viewform)
- [Download Phantom](https://phantom.app/download)
- [Download Phantom](https://phantom.app/download)

Search...

Navigation

Browser SDK

Sign and send transactions

[Get started](https://docs.phantom.com/introduction) [Phantom Portal](https://docs.phantom.com/phantom-portal/portal) [Phantom Connect SDKs](https://docs.phantom.com/wallet-sdks-overview) [Extension and mobile app](https://docs.phantom.com/solana/integrating-phantom) [Developer tools and resources](https://docs.phantom.com/developer-powertools/overview)

- [Announcements](https://t.me/+R0vUw_QWSO9lNjlh)
- [Support](https://docs.google.com/forms/d/e/1FAIpQLSeHWETFkEJbHQCF-lnl1AHmVQPuyfC0HbnxjDjIp6VYV1sBZQ/viewform)
- [GitHub](https://github.com/phantom)

##### Overview

- [Phantom Connect SDK overview](https://docs.phantom.com/wallet-sdks-overview)

##### React SDK

- [Phantom React SDK](https://docs.phantom.com/sdks/react-sdk)
- [Connect](https://docs.phantom.com/sdks/react-sdk/connect)
- [Sign messages](https://docs.phantom.com/sdks/react-sdk/sign-messages)
- [Sign and send transactions](https://docs.phantom.com/sdks/react-sdk/sign-and-send-transaction)

##### React Native SDK

- [Phantom React Native SDK](https://docs.phantom.com/sdks/react-native-sdk)
- [Connect](https://docs.phantom.com/sdks/react-native-sdk/connect)
- [Sign messages](https://docs.phantom.com/sdks/react-native-sdk/sign-messages)
- [Sign and send transactions](https://docs.phantom.com/sdks/react-native-sdk/sign-and-send-transaction)

##### Browser SDK

- [Browser SDK](https://docs.phantom.com/sdks/browser-sdk)
- [Connect](https://docs.phantom.com/sdks/browser-sdk/connect)
- [Sign messages](https://docs.phantom.com/sdks/browser-sdk/sign-messages)
- [Sign and send transactions](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction)

##### Guides

- [Wallet authentication with JWTs](https://docs.phantom.com/sdks/guides/wallet-authentication-with-jwts)

On this page

- [Chain-specific transaction methods](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction#chain-specific-transaction-methods)
- [Solana transactions (sdk.solana)](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction#solana-transactions-sdk-solana)
- [Ethereum transactions (sdk.ethereum)](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction#ethereum-transactions-sdk-ethereum)
- [Transaction examples](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction#transaction-examples)
- [Solana transaction examples](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction#solana-transaction-examples)
- [Solana with @solana/web3.js](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction#solana-with-%40solana%2Fweb3-js)
- [Solana with @solana/kit](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction#solana-with-%40solana%2Fkit)
- [Ethereum transaction examples](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction#ethereum-transaction-examples)
- [Ethereum with viem](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction#ethereum-with-viem)

Browser SDK

# Sign and send transactions

OpenAIOpen in ChatGPT

Transaction signing and sending with Browser SDK

OpenAIOpen in ChatGPT

The Phantom Connect Browser SDK provides chain-specific transaction methods through dedicated interfaces (`sdk.solana` and `sdk.ethereum`) for optimal transaction handling.

**Embedded wallet limitations**: The `signTransaction` and `signAllTransactions` methods **aren’t supported** for embedded wallets. For embedded wallets, use only `signAndSendTransaction` that signs and broadcasts the transaction in a single step.

**Transaction security for embedded wallets**: All transactions signed for embedded wallets pass through Phantom’s advanced simulation system before execution. This security layer automatically blocks malicious transactions and transactions from origins that have been reported as malicious, providing an additional layer of protection for your users’ assets.

## [​](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction\#chain-specific-transaction-methods)  Chain-specific transaction methods

### [​](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction\#solana-transactions-sdk-solana)  Solana transactions (sdk.solana)

Report incorrect code

Copy

Ask AI

```
// Sign and send transaction
const result = await sdk.solana.signAndSendTransaction(transaction);

// Just sign (without sending) - Note: Not supported for embedded wallets
const signedTx = await sdk.solana.signTransaction(transaction);
```

### [​](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction\#ethereum-transactions-sdk-ethereum)  Ethereum transactions (sdk.ethereum)

Report incorrect code

Copy

Ask AI

```
// Send transaction
const result = await sdk.ethereum.sendTransaction({
  to: "0x...",
  value: "1000000000000000000",
  gas: "21000",
});
```

## [​](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction\#transaction-examples)  Transaction examples

### [​](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction\#solana-transaction-examples)  Solana transaction examples

The SDK supports multiple Solana transaction libraries. Here are examples using both `@solana/web3.js` and `@solana/kit`:

#### [​](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction\#solana-with-@solana/web3-js)  Solana with @solana/web3.js

Report incorrect code

Copy

Ask AI

```
import {
  VersionedTransaction,
  TransactionMessage,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
  Connection,
} from "@solana/web3.js";
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

const sdk = new BrowserSDK({
  providers: ["injected"],
  addressTypes: [AddressType.solana],
});

await sdk.connect({ provider: "injected" });

// Get recent blockhash
const connection = new Connection("https://api.mainnet-beta.solana.com");
const { blockhash } = await connection.getLatestBlockhash();

// Create transfer instruction
const fromAddress = await sdk.solana.getPublicKey();
const transferInstruction = SystemProgram.transfer({
  fromPubkey: new PublicKey(fromAddress),
  toPubkey: new PublicKey(toAddress),
  lamports: 0.001 * LAMPORTS_PER_SOL,
});

// Create VersionedTransaction
const messageV0 = new TransactionMessage({
  payerKey: new PublicKey(fromAddress),
  recentBlockhash: blockhash,
  instructions: [transferInstruction],
}).compileToV0Message();

const transaction = new VersionedTransaction(messageV0);

// Send transaction using chain-specific API
const result = await sdk.solana.signAndSendTransaction(transaction);
console.log("Transaction signature:", result.hash);
```

#### [​](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction\#solana-with-@solana/kit)  Solana with @solana/kit

Report incorrect code

Copy

Ask AI

```
import {
  createSolanaRpc,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  address,
  compileTransaction,
} from "@solana/kit";
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

const sdk = new BrowserSDK({
  providers: ["injected"],
  addressTypes: [AddressType.solana],
});

await sdk.connect({ provider: "injected" });

// Create transaction with @solana/kit
const rpc = createSolanaRpc("https://api.mainnet-beta.solana.com");
const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

const userPublicKey = await sdk.solana.getPublicKey();
const transactionMessage = pipe(
  createTransactionMessage({ version: 0 }),
  tx => setTransactionMessageFeePayer(address(userPublicKey), tx),
  tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
);

const transaction = compileTransaction(transactionMessage);

// Send using chain-specific API
const result = await sdk.solana.signAndSendTransaction(transaction);
console.log("Transaction signature:", result.hash);
```

### [​](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction\#ethereum-transaction-examples)  Ethereum transaction examples

Report incorrect code

Copy

Ask AI

```
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

const sdk = new BrowserSDK({
  providers: ["injected"],
  addressTypes: [AddressType.ethereum],
});

await sdk.connect({ provider: "injected" });

// Simple ETH transfer
const result = await sdk.ethereum.sendTransaction({
  to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
  value: "1000000000000000000", // 1 ETH in wei
  gas: "21000",
  gasPrice: "20000000000", // 20 gwei
});

// EIP-1559 transaction with maxFeePerGas
const result2 = await sdk.ethereum.sendTransaction({
  to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
  value: "1000000000000000000", // 1 ETH in wei
  data: "0x...", // contract call data
  gas: "50000",
  maxFeePerGas: "30000000000", // 30 gwei
  maxPriorityFeePerGas: "2000000000", // 2 gwei
});

console.log("Transaction hash:", result.hash);
```

#### [​](https://docs.phantom.com/sdks/browser-sdk/sign-and-send-transaction\#ethereum-with-viem)  Ethereum with viem

Report incorrect code

Copy

Ask AI

```
import { parseEther, parseGwei, encodeFunctionData } from "viem";
import { BrowserSDK, AddressType } from "@phantom/browser-sdk";

const sdk = new BrowserSDK({
  providers: ["injected"],
  addressTypes: [AddressType.ethereum],
});

// Simple transfer with viem utilities
const result = await sdk.ethereum.sendTransaction({
  to: "0x742d35Cc6634C0532925a3b8D4C8db86fB5C4A7E",
  value: parseEther("1").toString(), // 1 ETH
  gas: "21000",
  gasPrice: parseGwei("20").toString(), // 20 gwei
});

// Contract interaction
const result2 = await sdk.ethereum.sendTransaction({
  to: tokenContractAddress,
  data: encodeFunctionData({
    abi: tokenAbi,
    functionName: "transfer",
    args: [recipientAddress, parseEther("100")],
  }),
  gas: "50000",
  maxFeePerGas: parseGwei("30").toString(),
  maxPriorityFeePerGas: parseGwei("2").toString(),
});
```

Was this page helpful?

YesNo

[Sign messages](https://docs.phantom.com/sdks/browser-sdk/sign-messages) [Wallet authentication with JWTs](https://docs.phantom.com/sdks/guides/wallet-authentication-with-jwts)

Ctrl+I

[website](https://phantom.com/) [github](https://github.com/phantom)

Assistant

Responses are generated using AI and may contain mistakes.