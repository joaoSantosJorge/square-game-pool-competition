// Leaderboard using Firebase Firestore
// This file will handle monthly resetting leaderboards

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCprQvJl7-ZC-6QK4ct5tBngJzOgF33MpM",
    authDomain: "flappy-bird-leaderboard-463e0.firebaseapp.com",
    projectId: "flappy-bird-leaderboard-463e0",
    storageBucket: "flappy-bird-leaderboard-463e0.firebasestorage.app",
    messagingSenderId: "344067272312",
    appId: "1:344067272312:web:5d4fc513df1df38a87c78d",
    measurementId: "G-YM6Z2TPHG8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Connect to Firestore emulator if running locally
if (location.hostname === "localhost") {
    db.useEmulator("localhost", 8080);
    console.log("Using Firestore emulator at localhost:8080");
}

// Get current month key
function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}`;
}

// Submit score
// If walletAddress is not provided, use a random guest ID for local testing
async function submitScore(walletAddress, score) {
    const monthKey = getCurrentMonthKey();
    let userId = walletAddress;
    if (!userId) {
        // Use a random guest ID for local testing
        userId = 'guest-' + Math.random().toString(36).substring(2, 10);
    }
    const docRef = db.collection('leaderboards').doc(monthKey).collection('scores').doc(userId);

    try {
        await docRef.set({
            score: score,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('Score submitted');
    } catch (error) {
        console.error('Error submitting score:', error);
    }
}

// Get leaderboard
async function getLeaderboard() {
    const monthKey = getCurrentMonthKey();
    const querySnapshot = await db.collection('leaderboards').doc(monthKey).collection('scores')
        .orderBy('score', 'desc')
        .limit(10)
        .get();

    const leaderboardList = document.getElementById('leaderboard-list');
    leaderboardList.innerHTML = '';

    querySnapshot.forEach((doc) => {
        const li = document.createElement('li');
        li.textContent = `${doc.id}: ${doc.data().score}`;
        leaderboardList.appendChild(li);
    });
}

// Load leaderboard on page load
window.addEventListener('load', getLeaderboard);