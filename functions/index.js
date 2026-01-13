const cycleManager = require("./cycleManager");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Export all Firebase Cloud Functions
exports.checkCycleScheduled = cycleManager.checkCycleScheduled;
exports.checkCycleManual = cycleManager.checkCycleManual;
exports.forceAllocate = cycleManager.forceAllocate;

// ===== USER PROFILE MANAGEMENT =====

/**
 * Get or create user profile
 * @param {string} walletAddress - The user's wallet address
 * @return {Object} User profile data
 */
async function getOrCreateUserProfile(walletAddress) {
  const userRef = db.collection("userProfiles").doc(walletAddress.toLowerCase());
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    return {ref: userRef, data: userDoc.data(), isNew: false};
  }

  // Create new user profile
  const newProfile = {
    walletAddress: walletAddress.toLowerCase(),
    createdAt: Date.now(),
    totalDonationsUSDC: 0,
    totalTries: 0,
    totalGamesPlayed: 0,
    cyclesParticipated: [],
    cycleStats: {}, // Map of cycleName -> {donationsUSDC, highestScore, tries, gamesPlayed}
    lastActiveAt: Date.now(),
  };

  await userRef.set(newProfile);
  return {ref: userRef, data: newProfile, isNew: true};
}

/**
 * Get current cycle name from cycleState
 * @return {string} Current cycle name in format scores_DD-MM-YYYY_to_DD-MM-YYYY
 */
async function getCurrentCycleName() {
  const cycleDoc = await db.collection("cycleState").doc("current").get();
  if (!cycleDoc.exists) {
    return null;
  }
  const cycleState = cycleDoc.data();
  const startDate = formatDate(cycleState.startTime);
  const endDate = formatDate(cycleState.endTime);
  return `scores_${startDate}_to_${endDate}`;
}

/**
 * Format timestamp to DD-MM-YYYY
 * @param {number} timestamp - The timestamp to format
 * @return {string} Formatted date string
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Update user stats when they play a game
 * @param {string} walletAddress - User's wallet address
 * @param {number} score - Score achieved
 * @param {string} cycleName - Current cycle name
 */
async function updateUserGameStats(walletAddress, score, cycleName) {
  const {ref, data} = await getOrCreateUserProfile(walletAddress);

  // Initialize cycle stats if not exists
  const cycleStats = data.cycleStats || {};
  if (!cycleStats[cycleName]) {
    cycleStats[cycleName] = {
      donationsUSDC: 0,
      highestScore: 0,
      tries: 0,
      gamesPlayed: 0,
      firstPlayedAt: Date.now(),
      lastPlayedAt: Date.now(),
    };
  }

  // Update cycle-specific stats
  cycleStats[cycleName].gamesPlayed++;
  cycleStats[cycleName].lastPlayedAt = Date.now();

  // Update highest score if this is better
  if (score > cycleStats[cycleName].highestScore) {
    cycleStats[cycleName].highestScore = score;
  }

  // Add to cycles participated if not already there
  const cyclesParticipated = data.cyclesParticipated || [];
  if (!cyclesParticipated.includes(cycleName)) {
    cyclesParticipated.push(cycleName);
  }

  // Update user profile
  await ref.update({
    cycleStats: cycleStats,
    cyclesParticipated: cyclesParticipated,
    totalGamesPlayed: admin.firestore.FieldValue.increment(1),
    lastActiveAt: Date.now(),
  });

  return cycleStats[cycleName];
}

/**
 * Update user stats when they make a payment/donation
 * @param {string} walletAddress - User's wallet address
 * @param {number} amountUSDC - Amount donated in USDC
 * @param {string} cycleName - Current cycle name
 * @param {number} triesGranted - Number of tries granted (default 10)
 */
async function updateUserPaymentStats(walletAddress, amountUSDC, cycleName, triesGranted = 10) {
  const {ref, data} = await getOrCreateUserProfile(walletAddress);

  // Initialize cycle stats if not exists
  const cycleStats = data.cycleStats || {};
  if (!cycleStats[cycleName]) {
    cycleStats[cycleName] = {
      donationsUSDC: 0,
      highestScore: 0,
      tries: 0,
      gamesPlayed: 0,
      firstPlayedAt: Date.now(),
      lastPlayedAt: Date.now(),
    };
  }

  // Update cycle-specific stats
  cycleStats[cycleName].donationsUSDC += amountUSDC;
  cycleStats[cycleName].tries += triesGranted;

  // Add to cycles participated if not already there
  const cyclesParticipated = data.cyclesParticipated || [];
  if (!cyclesParticipated.includes(cycleName)) {
    cyclesParticipated.push(cycleName);
  }

  // Update user profile
  await ref.update({
    cycleStats: cycleStats,
    cyclesParticipated: cyclesParticipated,
    totalDonationsUSDC: admin.firestore.FieldValue.increment(amountUSDC),
    totalTries: admin.firestore.FieldValue.increment(triesGranted),
    lastActiveAt: Date.now(),
  });

  return {
    totalDonations: (data.totalDonationsUSDC || 0) + amountUSDC,
    cycleDonations: cycleStats[cycleName].donationsUSDC,
    totalTries: (data.totalTries || 0) + triesGranted,
    cycleTries: cycleStats[cycleName].tries,
  };
}

// Get archived leaderboards
exports.getArchivedLeaderboards = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  try {
    // Get all collections
    const collections = await db.listCollections();
    const archiveData = [];

    // Filter for archived score collections
    const archiveCollections = collections.filter((col) =>
      col.id.startsWith("scores_") && col.id.includes("_to_"),
    );

    // Process each archive collection
    for (const collection of archiveCollections) {
      const collectionName = collection.id;

      // Get top 10 scores from this archive
      const scoresSnapshot = await db.collection(collectionName)
          .orderBy("score", "desc")
          .limit(10)
          .get();

      const topScores = [];
      const uniquePlayers = new Set();
      let totalScores = 0;

      // Get all scores to count total and unique players
      const allScoresSnapshot = await db.collection(collectionName).get();
      allScoresSnapshot.forEach((doc) => {
        const data = doc.data();
        uniquePlayers.add(data.walletAddress || doc.id);
        totalScores++;
      });

      // Get top 10 winners
      scoresSnapshot.forEach((doc) => {
        const data = doc.data();
        topScores.push({
          wallet: data.walletAddress || doc.id,
          score: data.score || 0,
          playerName: data.playerName || null,
        });
      });

      // Extract dates from collection name (format: scores_DD-MM-YYYY_to_DD-MM-YYYY)
      const parts = collectionName.replace("scores_", "").split("_to_");

      archiveData.push({
        id: collectionName,
        startDate: parts[0] || "Unknown",
        endDate: parts[1] || "Unknown",
        totalPlayers: uniquePlayers.size,
        totalScores: totalScores,
        topScores: topScores,
      });
    }

    // Sort by collection name (newest first)
    archiveData.sort((a, b) => b.id.localeCompare(a.id));

    res.status(200).json({
      success: true,
      archives: archiveData,
      totalArchives: archiveData.length,
    });
  } catch (error) {
    console.error("Error fetching archived leaderboards:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

// Secure score submission endpoint
exports.submitScore = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  try {
    const {walletAddress, score} = req.body;
    // Note: signature validation will be added in future for wallet verification

    // Validation
    if (!walletAddress || typeof walletAddress !== "string") {
      res.status(400).json({error: "Invalid wallet address"});
      return;
    }

    if (typeof score !== "number" || score < 0 || score > 10000 || !Number.isInteger(score)) {
      res.status(400).json({error: "Invalid score"});
      return;
    }

    // Rate limiting: check last submission time
    const scoreRef = db.collection("scores").doc(walletAddress);
    const scoreDoc = await scoreRef.get();

    if (scoreDoc.exists) {
      const lastTimestamp = scoreDoc.data().timestamp;
      if (lastTimestamp) {
        const timeSinceLastSubmit = Date.now() - lastTimestamp.toMillis();
        const MIN_SUBMIT_INTERVAL = 5000; // 5 seconds minimum between submissions

        if (timeSinceLastSubmit < MIN_SUBMIT_INTERVAL) {
          res.status(429).json({error: "Too many submissions. Please wait."});
          return;
        }
      }

      // Only update if new score is higher
      const currentScore = scoreDoc.data().score || 0;
      if (score <= currentScore) {
        res.status(200).json({
          success: false,
          message: "Score not updated (current score is higher)",
          currentScore: currentScore,
        });
        return;
      }
    }

    // TODO: Add signature verification here to ensure the score came from the actual wallet owner
    // For now, we'll trust the score but add basic anti-cheat heuristics

    // Anti-cheat: Basic score validation
    // You can add more sophisticated checks here like:
    // - Score shouldn't increase too quickly
    // - Pattern detection for impossible scores
    // - Machine learning models to detect cheating

    // Save score
    await scoreRef.set({
      walletAddress: walletAddress,
      score: score,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      playerName: walletAddress.startsWith("0x") ?
        walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4) :
        walletAddress,
      ipAddress: req.ip, // Track IP for abuse detection
    });

    // Update user profile stats
    const cycleName = await getCurrentCycleName();
    if (cycleName) {
      await updateUserGameStats(walletAddress, score, cycleName);
    }

    console.log(`Score submitted: ${walletAddress} - ${score}`);

    res.status(200).json({
      success: true,
      message: "Score submitted successfully",
      score: score,
    });
  } catch (error) {
    console.error("Error submitting score:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

// Record payment/donation endpoint
exports.recordPayment = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  try {
    const {walletAddress, amountUSDC, transactionHash, isDonation} = req.body;

    // Validation
    if (!walletAddress || typeof walletAddress !== "string") {
      res.status(400).json({error: "Invalid wallet address"});
      return;
    }

    if (typeof amountUSDC !== "number" || amountUSDC <= 0) {
      res.status(400).json({error: "Invalid amount"});
      return;
    }

    // Get current cycle name
    const cycleName = await getCurrentCycleName();
    if (!cycleName) {
      res.status(500).json({error: "Could not determine current cycle"});
      return;
    }

    let stats;
    let triesGranted = 0;

    if (isDonation) {
      // For donations: add to donationsUSDC but don't grant tries
      stats = await updateUserPaymentStats(walletAddress, amountUSDC, cycleName, 0);
    } else {
      // For regular payments: grant 10 tries
      stats = await updateUserPaymentStats(walletAddress, amountUSDC, cycleName, 10);
      triesGranted = 10;
    }

    // Also store individual payment record for audit
    await db.collection("payments").add({
      walletAddress: walletAddress.toLowerCase(),
      amountUSDC: amountUSDC,
      cycleName: cycleName,
      transactionHash: transactionHash || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      triesGranted: triesGranted,
      isDonation: isDonation || false,
    });

    console.log(`Payment recorded: ${walletAddress} - ${amountUSDC} USDC (Donation: ${isDonation})`);

    res.status(200).json({
      success: true,
      message: "Payment recorded successfully",
      stats: stats,
    });
  } catch (error) {
    console.error("Error recording payment:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

// Get user profile endpoint
exports.getUserProfile = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  try {
    const walletAddress = req.query.wallet;

    // Validation
    if (!walletAddress || typeof walletAddress !== "string") {
      res.status(400).json({error: "Invalid wallet address"});
      return;
    }

    const normalizedAddress = walletAddress.toLowerCase();
    const userRef = db.collection("userProfiles").doc(normalizedAddress);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      res.status(404).json({
        success: false,
        error: "User profile not found",
        message: "No game history found for this wallet",
      });
      return;
    }

    const userData = userDoc.data();

    // Get current cycle info
    const currentCycle = await getCurrentCycleName();

    // Calculate summary stats
    const cycleStats = userData.cycleStats || {};
    const cycleList = Object.keys(cycleStats).map((cycleName) => {
      const stats = cycleStats[cycleName];
      return {
        cycleName: cycleName,
        donationsUSDC: stats.donationsUSDC || 0,
        highestScore: stats.highestScore || 0,
        tries: stats.tries || 0,
        gamesPlayed: stats.gamesPlayed || 0,
        firstPlayedAt: stats.firstPlayedAt || null,
        lastPlayedAt: stats.lastPlayedAt || null,
      };
    });

    // Sort cycles by first played date (newest first)
    cycleList.sort((a, b) => (b.firstPlayedAt || 0) - (a.firstPlayedAt || 0));

    // Calculate all-time best score
    let allTimeBestScore = 0;
    let bestScoreCycle = null;
    for (const cycle of cycleList) {
      if (cycle.highestScore > allTimeBestScore) {
        allTimeBestScore = cycle.highestScore;
        bestScoreCycle = cycle.cycleName;
      }
    }

    res.status(200).json({
      success: true,
      profile: {
        walletAddress: userData.walletAddress,
        createdAt: userData.createdAt,
        lastActiveAt: userData.lastActiveAt,
        summary: {
          totalDonationsUSDC: userData.totalDonationsUSDC || 0,
          totalTries: userData.totalTries || 0,
          totalGamesPlayed: userData.totalGamesPlayed || 0,
          cyclesParticipated: userData.cyclesParticipated?.length || 0,
          allTimeBestScore: allTimeBestScore,
          bestScoreCycle: bestScoreCycle,
        },
        currentCycle: currentCycle,
        currentCycleStats: cycleStats[currentCycle] || null,
        cycleHistory: cycleList,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

// Get leaderboard for user profile page (shows user's rank)
exports.getUserRank = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  try {
    const walletAddress = req.query.wallet;

    if (!walletAddress) {
      res.status(400).json({error: "Wallet address required"});
      return;
    }

    // Get all scores ordered by score descending
    const scoresSnapshot = await db.collection("scores")
        .orderBy("score", "desc")
        .get();

    let rank = 0;
    let userScore = null;
    let found = false;

    scoresSnapshot.forEach((doc) => {
      rank++;
      if (doc.id.toLowerCase() === walletAddress.toLowerCase()) {
        userScore = doc.data().score || 0;
        found = true;
      }
    });

    if (!found) {
      res.status(200).json({
        success: true,
        rank: null,
        score: null,
        totalPlayers: scoresSnapshot.size,
        message: "User has not submitted a score this cycle",
      });
      return;
    }

    // Re-find the actual rank
    rank = 0;
    scoresSnapshot.forEach((doc) => {
      rank++;
      if (doc.id.toLowerCase() === walletAddress.toLowerCase()) {
        res.status(200).json({
          success: true,
          rank: rank,
          score: userScore,
          totalPlayers: scoresSnapshot.size,
        });
      }
    });
  } catch (error) {
    console.error("Error fetching user rank:", error);
    res.status(500).json({error: "Internal server error"});
  }
});
