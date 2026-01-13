const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {Web3} = require("web3");
const {ethers} = require("ethers");

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Get configuration from environment variables (new Firebase approach)
// These are set using Firebase Functions secrets or environment config
const KEYSTORE_BASE64 = process.env.KEYSTORE_DATA;
const KEYSTORE_PASSWORD = process.env.KEYSTORE_PASSWORD;
const CYCLE_DURATION_DAYS = parseFloat(process.env.CYCLE_DURATION_DAYS || "7");
const NUMBER_OF_WINNERS = parseInt(process.env.NUMBER_OF_WINNERS || "3");
const FEE_PERCENTAGE = parseInt(process.env.FEE_PERCENTAGE || "1000");
const FLAPPY_BIRD_CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://sepolia.base.org";

// Initialize Web3
const web3 = new Web3(BASE_RPC_URL);

// Contract ABI
const contractABI = [
  {
    "inputs": [
      {"name": "feePercentage", "type": "uint256"},
      {"name": "winners", "type": "address[]"},
      {"name": "percentages", "type": "uint256[]"},
    ],
    "name": "allocateFunds",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function",
  },
  {
    "inputs": [],
    "name": "fundsAllocated",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [],
    "name": "totalPool",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function",
  },
];

// Decrypt keystore from base64
async function loadPrivateKey() {
  try {
    if (!KEYSTORE_BASE64 || !KEYSTORE_PASSWORD) {
      throw new Error("Keystore configuration missing");
    }

    // Decode base64 to JSON
    const keystoreJson = Buffer.from(KEYSTORE_BASE64, "base64").toString("utf8");

    // Decrypt using ethers
    const wallet = await ethers.Wallet.fromEncryptedJson(keystoreJson, KEYSTORE_PASSWORD);

    console.log("✓ Keystore decrypted successfully");
    console.log("✓ Wallet address:", wallet.address);

    return wallet.privateKey;
  } catch (error) {
    console.error("ERROR: Failed to decrypt keystore:", error.message);
    throw error;
  }
}

// Load cycle state
async function getCycleState() {
  const cycleDoc = await db.collection("cycleState").doc("current").get();
  if (cycleDoc.exists) {
    return cycleDoc.data();
  }
  // Create initial cycle
  const now = Date.now();
  const state = {
    startTime: now,
    endTime: now + (CYCLE_DURATION_DAYS * 24 * 60 * 60 * 1000),
    lastUpdated: now,
  };
  await db.collection("cycleState").doc("current").set(state);
  return state;
}

// Get top winners
async function getTopWinners() {
  const scoresSnapshot = await db.collection("scores")
      .orderBy("score", "desc")
      .limit(NUMBER_OF_WINNERS)
      .get();

  const winners = [];
  scoresSnapshot.forEach((doc) => {
    const data = doc.data();
    winners.push({
      address: data.walletAddress,
      score: data.score,
      name: data.playerName || "Anonymous",
    });
  });

  return winners;
}

// Calculate percentages
function calculatePercentages(numWinners) {
  const percentages = [];
  const totalForWinners = 10000 - FEE_PERCENTAGE;

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
    throw new Error("Unsupported number of winners for percentage calculation");
  }

  // Adjust last percentage to ensure total is exactly (10000 - FEE_PERCENTAGE)
  const sum = percentages.reduce((a, b) => a + b, 0);
  percentages[percentages.length - 1] += (totalForWinners - sum);

  return percentages;
}

// Format date helper
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Archive and reset database
async function resetDatabase(cycleStartTime, cycleEndTime) {
  const startDateStr = formatDate(cycleStartTime);
  const endDateStr = formatDate(cycleEndTime);
  const archiveCollectionName = `scores_${startDateStr}_to_${endDateStr}`;

  console.log(`Archiving to: ${archiveCollectionName}`);

  const scoresSnapshot = await db.collection("scores").get();

  if (!scoresSnapshot.empty) {
    const batch = db.batch();
    scoresSnapshot.forEach((doc) => {
      const archiveDocRef = db.collection(archiveCollectionName).doc(doc.id);
      batch.set(archiveDocRef, {
        ...doc.data(),
        archivedAt: Date.now(),
        cycleStart: cycleStartTime,
        cycleEnd: cycleEndTime,
      });
    });
    await batch.commit();
    console.log(`Archived ${scoresSnapshot.size} scores`);

    const deleteBatch = db.batch();
    scoresSnapshot.forEach((doc) => deleteBatch.delete(doc.ref));
    await deleteBatch.commit();
    console.log("Scores collection cleared");
  }
}

// Save cycle metadata to database
async function saveCycleMetadata(cycleStartTime, cycleEndTime, prizePool, winners) {
  const startDateStr = formatDate(cycleStartTime);
  const endDateStr = formatDate(cycleEndTime);
  const cycleName = `scores_${startDateStr}_to_${endDateStr}`;

  console.log(`Saving cycle metadata: ${cycleName}`);

  // Count unique players from scores
  const scoresSnapshot = await db.collection("scores").get();
  const uniquePlayers = new Set();
  scoresSnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.walletAddress) {
      uniquePlayers.add(data.walletAddress);
    }
  });

  const metadata = {
    cycleName: cycleName,
    startDate: cycleStartTime,
    endDate: cycleEndTime,
    prizePoolUSDC: parseFloat(web3.utils.fromWei(prizePool, "mwei")),
    numberOfPlayers: uniquePlayers.size,
    numberOfWinners: winners.length,
    totalGamesPlayed: scoresSnapshot.size,
    winners: winners.map((w, index) => ({
      rank: index + 1,
      address: w.address,
      score: w.score,
      name: w.name,
    })),
    createdAt: Date.now(),
  };

  await db.collection("cycleMetadata").doc(cycleName).set(metadata);
  console.log(`Cycle metadata saved: ${uniquePlayers.size} players, ` +
    `${web3.utils.fromWei(prizePool, "mwei")} USDC`);

  return metadata;
}

// Allocate funds
async function allocateFundsToWinners() {
  console.log("=== Starting Prize Allocation ===");

  const privateKey = await loadPrivateKey();
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(account);

  const contract = new web3.eth.Contract(contractABI, FLAPPY_BIRD_CONTRACT_ADDRESS);

  // Check if already allocated
  const alreadyAllocated = await contract.methods.fundsAllocated().call();
  if (alreadyAllocated) {
    console.log("Funds already allocated for this cycle");
    return false;
  }

  // Get total pool
  const totalPool = await contract.methods.totalPool().call();
  console.log("Total pool:", web3.utils.fromWei(totalPool, "mwei"), "USDC");

  if (totalPool === "0") {
    console.log("No funds to allocate");
    return false;
  }

  // Get winners
  const winners = await getTopWinners();
  if (winners.length === 0) {
    console.log("No winners found");
    return false;
  }

  console.log("Winners:", winners.map((w, i) => `${i + 1}. ${w.name} - ${w.score}`));

  const winnerAddresses = winners.map((w) => w.address);
  const percentages = calculatePercentages(winners.length);

  console.log("Calling allocateFunds...");
  const tx = await contract.methods.allocateFunds(
      FEE_PERCENTAGE,
      winnerAddresses,
      percentages,
  ).send({
    from: account.address,
    gas: 500000,
  });

  console.log("Transaction hash:", tx.transactionHash);
  return {success: true, totalPool: totalPool, winners: winners};
}

// Main cycle check function
async function checkCycle() {
  const cycleState = await getCycleState();
  const now = Date.now();

  console.log("Checking cycle...");
  console.log("Cycle end time:", new Date(cycleState.endTime));

  if (now >= cycleState.endTime) {
    console.log("CYCLE ENDED - Processing...");

    const result = await allocateFundsToWinners();

    if (result && result.success) {
      // Save cycle metadata before resetting database
      await saveCycleMetadata(
          cycleState.startTime,
          cycleState.endTime,
          result.totalPool,
          result.winners,
      );

      await resetDatabase(cycleState.startTime, cycleState.endTime);

      // Start new cycle
      const newCycleStart = Date.now();
      await db.collection("cycleState").doc("current").set({
        startTime: newCycleStart,
        endTime: newCycleStart + (CYCLE_DURATION_DAYS * 24 * 60 * 60 * 1000),
        lastUpdated: newCycleStart,
      });

      console.log("Cycle reset complete");
      return {success: true, message: "Cycle completed and reset"};
    } else {
      return {success: false, message: "Allocation failed"};
    }
  } else {
    const timeLeft = cycleState.endTime - now;
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    console.log(`Time remaining: ${hours}h ${minutes}m`);
    return {success: true, message: `Cycle active. ${hours}h ${minutes}m remaining`};
  }
}

// ===== FIREBASE FUNCTIONS =====

// Scheduled function - runs every hour
exports.checkCycleScheduled = functions.pubsub
    .schedule("every 1 hours")
    .timeZone("UTC")
    .onRun(async (context) => {
      try {
        const result = await checkCycle();
        console.log("Scheduled check result:", result);
        return result;
      } catch (error) {
        console.error("Error in scheduled check:", error);
        throw error;
      }
    });

// HTTP function - for manual triggers
exports.checkCycleManual = functions.https.onRequest(async (req, res) => {
  try {
    const result = await checkCycle();
    res.json(result);
  } catch (error) {
    console.error("Error in manual check:", error);
    res.status(500).json({error: error.message});
  }
});

// HTTP function - force allocation (emergency use)
exports.forceAllocate = functions.https.onRequest(async (req, res) => {
  try {
    // Add authentication check here in production!
    const cycleState = await getCycleState();
    const result = await allocateFundsToWinners();

    if (result && result.success) {
      await saveCycleMetadata(
          cycleState.startTime,
          cycleState.endTime,
          result.totalPool,
          result.winners,
      );
      await resetDatabase(cycleState.startTime, cycleState.endTime);
      const newCycleStart = Date.now();
      await db.collection("cycleState").doc("current").set({
        startTime: newCycleStart,
        endTime: newCycleStart + (CYCLE_DURATION_DAYS * 24 * 60 * 60 * 1000),
        lastUpdated: newCycleStart,
      });

      res.json({success: true, message: "Force allocation complete"});
    } else {
      res.status(500).json({success: false, message: "Allocation failed"});
    }
  } catch (error) {
    console.error("Error in force allocate:", error);
    res.status(500).json({error: error.message});
  }
});

// Export helper functions for testing
exports._testExports = {
  calculatePercentages,
  formatDate,
  getCycleState,
  getTopWinners,
};
