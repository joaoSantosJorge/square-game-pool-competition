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
const FLAPPY_BIRD_CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";

// Default values (used as fallback if Firestore config not found)
const DEFAULT_CYCLE_DURATION_DAYS = 7;
const DEFAULT_NUMBER_OF_WINNERS = 3;
const DEFAULT_FEE_PERCENTAGE = 1000;

// Get admin config from Firestore (reads cycleDurationDays, numberOfWinners, feePercentage)
async function getAdminConfig() {
  try {
    const configDoc = await db.collection("config").doc("settings").get();
    if (configDoc.exists) {
      const data = configDoc.data();
      return {
        cycleDurationDays: parseFloat(data.cycleDurationDays) || DEFAULT_CYCLE_DURATION_DAYS,
        numberOfWinners: parseInt(data.numberOfWinners) || DEFAULT_NUMBER_OF_WINNERS,
        feePercentage: parseInt(data.feePercentage) || DEFAULT_FEE_PERCENTAGE,
      };
    }
  } catch (error) {
    console.error("Error reading admin config from Firestore:", error);
  }
  // Return defaults if config not found
  return {
    cycleDurationDays: DEFAULT_CYCLE_DURATION_DAYS,
    numberOfWinners: DEFAULT_NUMBER_OF_WINNERS,
    feePercentage: DEFAULT_FEE_PERCENTAGE,
  };
}

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
  {
    "inputs": [{"name": "winners", "type": "address[]"}],
    "name": "sweepUnclaimed",
    "outputs": [],
    "stateMutability": "nonpayable",
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
  // Create initial cycle - read duration from Firestore config
  const config = await getAdminConfig();
  const now = Date.now();
  const state = {
    startTime: now,
    endTime: now + (config.cycleDurationDays * 24 * 60 * 60 * 1000),
    lastUpdated: now,
  };
  await db.collection("cycleState").doc("current").set(state);
  return state;
}

// Get top winners
async function getTopWinners(numberOfWinners) {
  const scoresSnapshot = await db.collection("scores")
      .orderBy("score", "desc")
      .limit(numberOfWinners)
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

// Get previous cycle winners from metadata
async function getPreviousCycleWinners() {
  const metadataSnapshot = await db.collection("cycleMetadata")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

  if (metadataSnapshot.empty) {
    return [];
  }

  const metadata = metadataSnapshot.docs[0].data();
  return metadata.winners || [];
}

// Calculate percentages
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

  // Get admin config from Firestore
  const config = await getAdminConfig();
  console.log("Config:", config);

  const privateKey = await loadPrivateKey();
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  web3.eth.accounts.wallet.add(account);

  const contract = new web3.eth.Contract(contractABI, FLAPPY_BIRD_CONTRACT_ADDRESS);

  // Check if already allocated - if so, sweep unclaimed rewards first
  const alreadyAllocated = await contract.methods.fundsAllocated().call();
  if (alreadyAllocated) {
    console.log("Funds already allocated - sweeping unclaimed rewards first");

    const previousWinners = await getPreviousCycleWinners();
    const winnerAddresses = previousWinners.map((w) => w.address);
    console.log("Sweeping", winnerAddresses.length, "previous winners");

    try {
      const sweepTx = await contract.methods.sweepUnclaimed(winnerAddresses).send({
        from: account.address,
        gas: 300000,
      });
      console.log("Sweep transaction hash:", sweepTx.transactionHash);
    } catch (error) {
      console.error("Sweep failed:", error.message);
      return false;
    }
  }

  // Get total pool
  const totalPool = await contract.methods.totalPool().call();
  console.log("Total pool:", web3.utils.fromWei(totalPool, "mwei"), "USDC");

  if (totalPool === "0") {
    console.log("No funds to allocate");
    return false;
  }

  // Get winners using config from Firestore
  const winners = await getTopWinners(config.numberOfWinners);
  if (winners.length === 0) {
    console.log("No winners found");
    return false;
  }

  console.log("Winners:", winners.map((w, i) => `${i + 1}. ${w.name} - ${w.score}`));

  const winnerAddresses = winners.map((w) => w.address);
  const percentages = calculatePercentages(winners.length, config.feePercentage);

  console.log("Calling allocateFunds...");
  const tx = await contract.methods.allocateFunds(
      config.feePercentage,
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

      // Start new cycle - read duration from Firestore config
      const config = await getAdminConfig();
      const newCycleStart = Date.now();
      await db.collection("cycleState").doc("current").set({
        startTime: newCycleStart,
        endTime: newCycleStart + (config.cycleDurationDays * 24 * 60 * 60 * 1000),
        lastUpdated: newCycleStart,
      });

      console.log(`Cycle reset complete (new duration: ${config.cycleDurationDays} days)`);
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
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

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
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

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

      // Start new cycle - read duration from Firestore config
      const config = await getAdminConfig();
      const newCycleStart = Date.now();
      await db.collection("cycleState").doc("current").set({
        startTime: newCycleStart,
        endTime: newCycleStart + (config.cycleDurationDays * 24 * 60 * 60 * 1000),
        lastUpdated: newCycleStart,
      });

      res.json({
        success: true,
        message: `Force allocation complete. New cycle: ${config.cycleDurationDays} days`,
      });
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
  getPreviousCycleWinners,
};
