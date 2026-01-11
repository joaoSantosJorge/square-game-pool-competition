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
// Calls Cloud Function for server-side validation
async function submitScore(walletAddress, score) {
    // Basic validation - prevent obviously fake scores
    if (typeof score !== 'number' || score < 0 || score > 10000 || !Number.isInteger(score)) {
        console.error('Invalid score:', score);
        return;
    }
    
    let userId = walletAddress;
    if (!userId) {
        // Use a random guest ID for local testing
        userId = 'guest-' + Math.random().toString(36).substring(2, 10);
    }
    
    try {
        // Call Cloud Function to submit score (server-side validation)
        const response = await fetch('https://us-central1-flappy-bird-leaderboard-463e0.cloudfunctions.net/submitScore', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                walletAddress: userId,
                score: score,
                // TODO: Add signature from wallet to prove ownership
                signature: null
            })
        });

        const result = await response.json();
        
        if (result.success) {
            console.log('Score submitted:', result.score);
        } else {
            console.log(result.message || 'Score submission failed');
        }
    } catch (error) {
        console.error('Error submitting score:', error);
    }
}

// Get leaderboard
async function getLeaderboard() {
    const querySnapshot = await db.collection('scores')
        .orderBy('score', 'desc')
        .limit(10)
        .get();

    const leaderboardList = document.getElementById('leaderboard-list');
    leaderboardList.innerHTML = '';

    if (querySnapshot.empty) {
        leaderboardList.innerHTML = '<li>No scores yet</li>';
        return;
    }

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const li = document.createElement('li');
        const displayName = data.playerName || doc.id;
        li.textContent = `${displayName}: ${data.score}`;
        leaderboardList.appendChild(li);
    });
}

// Load leaderboard on page load
window.addEventListener('load', getLeaderboard);

// Cycle countdown timer
// Fetch cycle end time from Firebase
let cycleEndTime = new Date();
cycleEndTime.setDate(cycleEndTime.getDate() + 30); // Default: 30 days from now (fallback)

// Fetch the cycle end time from Firebase
async function fetchCycleEndTime() {
    try {
        const cycleDoc = await db.collection('cycleState').doc('current').get();
        
        if (cycleDoc.exists) {
            const data = cycleDoc.data();
            if (data['end-time']) {
                // Convert Firestore timestamp to JavaScript Date
                if (data['end-time'].toDate) {
                    cycleEndTime = data['end-time'].toDate();
                } else if (data['end-time'] instanceof Date) {
                    cycleEndTime = data['end-time'];
                } else {
                    cycleEndTime = new Date(data['end-time']);
                }
                console.log('Cycle end time loaded from Firebase:', cycleEndTime);
            }
        } else {
            console.warn('No cycle state found in Firebase, using default (30 days)');
        }
    } catch (error) {
        console.error('Error fetching cycle end time:', error);
    }
}

function updateCycleCountdown() {
    const now = new Date().getTime();
    const distance = cycleEndTime - now;
    
    const cycleTimeElement = document.getElementById('cycle-time');
    
    if (!cycleTimeElement) return;
    
    if (distance < 0) {
        cycleTimeElement.textContent = 'Ended';
        return;
    }
    
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
    // Format the countdown
    if (days > 0) {
        cycleTimeElement.textContent = `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        cycleTimeElement.textContent = `${hours}h ${minutes}m ${seconds}s`;
    } else {
        cycleTimeElement.textContent = `${minutes}m ${seconds}s`;
    }
}

// Initialize cycle countdown
fetchCycleEndTime().then(() => {
    updateCycleCountdown(); // Initial call after fetching
    setInterval(updateCycleCountdown, 1000); // Update every second
});