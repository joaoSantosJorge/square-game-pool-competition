// Cycle Manager - Handles prize pool allocation cycles
// This script runs continuously and triggers allocateFunds when a cycle ends

const { Web3 } = require('web3');
const admin = require('firebase-admin');
require('dotenv').config();

// ===== CONFIGURATION =====
const NODE_ENV = process.env.NODE_ENV || 'development';
const CYCLE_DURATION_DAYS = parseFloat(process.env.CYCLE_DURATION_DAYS) || (NODE_ENV === 'development' ? 0.00069 : 7); // 1 min for dev, 7 days for prod
const NUMBER_OF_WINNERS = parseInt(process.env.NUMBER_OF_WINNERS) || 3; // Number of winners to allocate funds to
const FEE_PERCENTAGE = parseInt(process.env.FEE_PERCENTAGE) || 1000; // 10% fee (in basis points, 10000 = 100%)

// Contract addresses
const FLAPPY_BIRD_CONTRACT_ADDRESS = process.env.FLAPPY_BIRD_CONTRACT_ADDRESS || '0xDD0BbF48f85f5314C3754cd63103Be927B55986C'; // Set via environment variable
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // USDC on Base Sepolia

// Base network RPC
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://sepolia.base.org';

// Private key of the contract owner (KEEP THIS SECURE!)
const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY;

if (!OWNER_PRIVATE_KEY) {
    console.error('ERROR: OWNER_PRIVATE_KEY environment variable is required!');
    process.exit(1);
}

// ===== INITIALIZE SERVICES =====

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccountKey.json';

try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // Production: Use service account file from Render secret file
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccountPath),
        });
        console.log('Firebase initialized with service account from:', serviceAccountPath);
    } else {
        // Local development: Try application default credentials or local file
        try {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccountPath),
            });
            console.log('Firebase initialized with local service account');
        } catch (error) {
            // Fallback to application default credentials
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
            });
            console.log('Firebase initialized with application default credentials');
        }
    }
} catch (error) {
    console.error('Failed to initialize Firebase:', error.message);
    console.error('Please ensure GOOGLE_APPLICATION_CREDENTIALS is set or serviceAccountKey.json exists');
    process.exit(1);
}

const db = admin.firestore();

// Initialize Web3
const web3 = new Web3(BASE_RPC_URL);
const account = web3.eth.accounts.privateKeyToAccount(OWNER_PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);

// FlappyBirdPrizePool contract ABI (only the functions we need)
const contractABI = [
    {
        "inputs": [
            {"name": "feePercentage", "type": "uint256"},
            {"name": "winners", "type": "address[]"},
            {"name": "percentages", "type": "uint256[]"}
        ],
        "name": "allocateFunds",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "fundsAllocated",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalPool",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

const contract = new web3.eth.Contract(contractABI, FLAPPY_BIRD_CONTRACT_ADDRESS);

// ===== CYCLE MANAGEMENT =====

let cycleStartTime = Date.now();
let cycleEndTime = cycleStartTime + (CYCLE_DURATION_DAYS * 24 * 60 * 60 * 1000);

// Load or initialize cycle state from database
async function initializeCycleState() {
    try {
        const cycleDoc = await db.collection('cycleState').doc('current').get();
        if (cycleDoc.exists) {
            const data = cycleDoc.data();
            cycleStartTime = data.startTime;
            cycleEndTime = data.endTime;
            console.log('Loaded existing cycle state');
            console.log('Cycle ends:', new Date(cycleEndTime));
        } else {
            // First time running - create new cycle
            console.log('No existing cycle found. Creating initial cycle...');
            await saveCycleState();
            console.log('Created new cycle');
            console.log('Cycle ends:', new Date(cycleEndTime));
        }
    } catch (error) {
        if (error.code === 5 || error.code === 'NOT_FOUND') {
            // Firestore database or collection doesn't exist yet - create it
            console.log('Firestore collection not found. Initializing database...');
            await saveCycleState();
            console.log('Database initialized with new cycle');
            console.log('Cycle ends:', new Date(cycleEndTime));
        } else {
            console.error('Error initializing cycle state:', error);
            throw error;
        }
    }
}

async function saveCycleState() {
    try {
        await db.collection('cycleState').doc('current').set({
            startTime: cycleStartTime,
            endTime: cycleEndTime,
            lastUpdated: Date.now()
        });
    } catch (error) {
        if (error.code === 5 || error.code === 'NOT_FOUND') {
            console.error('\n❌ FIRESTORE DATABASE NOT FOUND!');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('You need to create a Firestore database first:');
            console.error('');
            console.error('1. Go to https://console.firebase.google.com/');
            console.error('2. Select your project');
            console.error('3. Click "Firestore Database" in the left menu');
            console.error('4. Click "Create database"');
            console.error('5. Choose "Start in production mode" (or test mode)');
            console.error('6. Select a location (choose one close to you)');
            console.error('7. Click "Enable"');
            console.error('');
            console.error('After creating the database, run this script again.');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            process.exit(1);
        }
        throw error;
    }
}

// ===== WINNER RETRIEVAL =====

async function getTopWinners() {
    try {
        // Retrieve top scores from Firestore
        const scoresSnapshot = await db.collection('scores')
            .orderBy('score', 'desc')
            .limit(NUMBER_OF_WINNERS)
            .get();

        const winners = [];
        scoresSnapshot.forEach(doc => {
            const data = doc.data();
            winners.push({
                address: data.walletAddress,
                score: data.score,
                name: data.playerName || 'Anonymous'
            });
        });

        return winners;
    } catch (error) {
        console.error('Error retrieving winners:', error);
        return [];
    }
}

// ===== PRIZE ALLOCATION =====

function calculatePercentages(numWinners) {
    // Calculate percentages for winners (descending)
    // Example for 3 winners: 50%, 30%, 20% (minus fee)
    const percentages = [];
    const totalForWinners = 10000 - FEE_PERCENTAGE; // Subtract fee first
    
    if (numWinners === 1) {
        percentages.push(totalForWinners);
    } else if (numWinners === 2) {
        percentages.push(Math.floor(totalForWinners * 0.7)); // 70%
        percentages.push(Math.floor(totalForWinners * 0.3)); // 30%
    } else if (numWinners === 3) {
        percentages.push(Math.floor(totalForWinners * 0.6)); // 60%
        percentages.push(Math.floor(totalForWinners * 0.3)); // 30%
        percentages.push(Math.floor(totalForWinners * 0.1)); // 10%
    } else if (numWinners === 4) {
        percentages.push(Math.floor(totalForWinners * 0.6)); // 60%
        percentages.push(Math.floor(totalForWinners * 0.25)); // 25%
        percentages.push(Math.floor(totalForWinners * 0.1)); // 10%
        percentages.push(Math.floor(totalForWinners * 0.05)); // 5%
    } else if (numWinners === 5) {
        percentages.push(Math.floor(totalForWinners * 0.5)); // 50%
        percentages.push(Math.floor(totalForWinners * 0.25)); // 25%
        percentages.push(Math.floor(totalForWinners * 0.15)); // 15%
        percentages.push(Math.floor(totalForWinners * 0.07)); // 7%
        percentages.push(Math.floor(totalForWinners * 0.03)); // 3%
    }else if (numWinners === 6) {
        percentages.push(Math.floor(totalForWinners * 0.4)); // 40%
        percentages.push(Math.floor(totalForWinners * 0.25)); // 25%
        percentages.push(Math.floor(totalForWinners * 0.15)); // 15%
        percentages.push(Math.floor(totalForWinners * 0.1)); // 10%
        percentages.push(Math.floor(totalForWinners * 0.06)); // 6%
        percentages.push(Math.floor(totalForWinners * 0.04)); // 4%
    }else if (numWinners === 7) {
        percentages.push(Math.floor(totalForWinners * 0.35)); // 35%
        percentages.push(Math.floor(totalForWinners * 0.25)); // 25%
        percentages.push(Math.floor(totalForWinners * 0.15)); // 15%
        percentages.push(Math.floor(totalForWinners * 0.1)); // 10%
        percentages.push(Math.floor(totalForWinners * 0.08)); // 8%
        percentages.push(Math.floor(totalForWinners * 0.04)); // 4%
        percentages.push(Math.floor(totalForWinners * 0.03)); // 3%
    }else if (numWinners === 8) {
        percentages.push(Math.floor(totalForWinners * 0.3)); // 30%
        percentages.push(Math.floor(totalForWinners * 0.25)); // 25%
        percentages.push(Math.floor(totalForWinners * 0.15)); // 15%
        percentages.push(Math.floor(totalForWinners * 0.1)); // 10%
        percentages.push(Math.floor(totalForWinners * 0.1)); // 10%
        percentages.push(Math.floor(totalForWinners * 0.05)); // 5%
        percentages.push(Math.floor(totalForWinners * 0.03)); // 3%
        percentages.push(Math.floor(totalForWinners * 0.02)); // 2%
    } else if (numWinners === 9) {
        percentages.push(Math.floor(totalForWinners * 0.28)); // 28%
        percentages.push(Math.floor(totalForWinners * 0.25)); // 25%
        percentages.push(Math.floor(totalForWinners * 0.15)); // 15%
        percentages.push(Math.floor(totalForWinners * 0.1)); // 10%
        percentages.push(Math.floor(totalForWinners * 0.1)); // 10%
        percentages.push(Math.floor(totalForWinners * 0.06)); // 6%
        percentages.push(Math.floor(totalForWinners * 0.03)); // 3%
        percentages.push(Math.floor(totalForWinners * 0.02)); // 2%
        percentages.push(Math.floor(totalForWinners * 0.01)); // 1%
    } else if (numWinners === 10) {
        percentages.push(Math.floor(totalForWinners * 0.25)); // 25%
        percentages.push(Math.floor(totalForWinners * 0.2)); // 20%
        percentages.push(Math.floor(totalForWinners * 0.15)); // 15%
        percentages.push(Math.floor(totalForWinners * 0.1)); // 10%
        percentages.push(Math.floor(totalForWinners * 0.1)); // 10%
        percentages.push(Math.floor(totalForWinners * 0.07)); // 7%
        percentages.push(Math.floor(totalForWinners * 0.05)); // 5%
        percentages.push(Math.floor(totalForWinners * 0.04)); // 4%
        percentages.push(Math.floor(totalForWinners * 0.03)); // 3%
        percentages.push(Math.floor(totalForWinners * 0.01)); // 1%
    } else {
        // Throw error for unsupported number of winners
        throw new Error('Unsupported number of winners for percentage calculation');
    }
    
    // Adjust last percentage to ensure total is exactly (10000 - FEE_PERCENTAGE)
    const sum = percentages.reduce((a, b) => a + b, 0);
    percentages[percentages.length - 1] += (totalForWinners - sum);
    
    return percentages;
}

async function allocateFundsToWinners() {
    try {
        console.log('=== Starting Prize Allocation ===');
        
        // Check if funds are already allocated
        const alreadyAllocated = await contract.methods.fundsAllocated().call();
        if (alreadyAllocated) {
            console.log('Funds already allocated for this cycle. Resetting contract state first...');
            // Note: You'll need to deploy a new contract or add a reset function
            console.log('ERROR: Contract needs to be reset or redeployed');
            return false;
        }
        
        // Get total pool
        const totalPool = await contract.methods.totalPool().call();
        console.log('Total pool:', web3.utils.fromWei(totalPool, 'mwei'), 'USDC');
        
        if (totalPool === '0') {
            console.log('No funds in pool to allocate');
            return false;
        }
        
        // Get top winners
        const winners = await getTopWinners();
        if (winners.length === 0) {
            console.log('No winners found in database');
            return false;
        }
        
        console.log('Winners:');
        winners.forEach((w, i) => {
            console.log(`  ${i + 1}. ${w.name} (${w.address}) - Score: ${w.score}`);
        });
        
        // Prepare contract call parameters
        const winnerAddresses = winners.map(w => w.address);
        const percentages = calculatePercentages(winners.length);
        
        console.log('Percentages:', percentages.map(p => `${p / 100}%`));
        console.log('Fee:', FEE_PERCENTAGE / 100, '%');
        
        // Call allocateFunds on the contract
        console.log('Calling allocateFunds on contract...');
        const tx = await contract.methods.allocateFunds(
            FEE_PERCENTAGE,
            winnerAddresses,
            percentages
        ).send({
            from: account.address,
            gas: 500000
        });
        
        console.log('Transaction successful!');
        console.log('Transaction hash:', tx.transactionHash);
        
        return true;
    } catch (error) {
        console.error('Error allocating funds:', error);
        return false;
    }
}

// ===== DATABASE RESET =====

// Helper function to format date as dd-mm-yyyy
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

async function resetDatabase() {
    try {
        console.log('Resetting database...');
        
        // Format dates for archive collection name
        const startDateStr = formatDate(cycleStartTime);
        const endDateStr = formatDate(cycleEndTime);
        const archiveCollectionName = `scores_${startDateStr}_to_${endDateStr}`;
        
        console.log(`Archiving to collection: ${archiveCollectionName}`);
        
        // Get all current scores
        const scoresSnapshot = await db.collection('scores').get();
        
        if (scoresSnapshot.empty) {
            console.log('No scores to archive.');
        } else {
            // Copy all scores to the archive collection
            const batch = db.batch();
            scoresSnapshot.forEach(doc => {
                const archiveDocRef = db.collection(archiveCollectionName).doc(doc.id);
                batch.set(archiveDocRef, {
                    ...doc.data(),
                    archivedAt: Date.now(),
                    cycleStart: cycleStartTime,
                    cycleEnd: cycleEndTime
                });
            });
            await batch.commit();
            console.log(`Archived ${scoresSnapshot.size} scores to ${archiveCollectionName}`);
            
            // Delete all scores from the main collection
            const deleteBatch = db.batch();
            scoresSnapshot.forEach(doc => {
                deleteBatch.delete(doc.ref);
            });
            await deleteBatch.commit();
            console.log('Main scores collection cleared.');
        }
        
        console.log('Database reset complete. Ready for new cycle.');
    } catch (error) {
        console.error('Error resetting database:', error);
    }
}

// ===== CYCLE MANAGEMENT =====

async function resetCycle() {
    console.log('=== Resetting Cycle ===');
    cycleStartTime = Date.now();
    cycleEndTime = cycleStartTime + (CYCLE_DURATION_DAYS * 24 * 60 * 60 * 1000);
    await saveCycleState();
    console.log('New cycle started');
    console.log('Next cycle ends:', new Date(cycleEndTime));
}

async function checkAndProcessCycle() {
    const now = Date.now();
    
    if (now >= cycleEndTime) {
        console.log('\n========================================');
        console.log('CYCLE ENDED - Processing allocation...');
        console.log('========================================\n');
        
        // Allocate funds to winners
        const success = await allocateFundsToWinners();
        
        if (success) {
            // Reset database
            await resetDatabase();
            
            // Reset cycle
            await resetCycle();
            
            console.log('\n========================================');
            console.log('Cycle processing complete!');
            console.log('========================================\n');
        } else {
            console.log('Allocation failed. Will retry in next check.');
        }
    } else {
        const timeLeft = cycleEndTime - now;
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        console.log(`Time until cycle ends: ${hoursLeft}h ${minutesLeft}m`);
    }
}

// ===== MAIN EXECUTION =====

async function main() {
    console.log('=== Flappy Bird Cycle Manager Started ===');
    console.log('Cycle duration:', CYCLE_DURATION_DAYS, 'days');
    console.log('Number of winners:', NUMBER_OF_WINNERS);
    console.log('Fee percentage:', FEE_PERCENTAGE / 100, '%');
    console.log('Contract address:', FLAPPY_BIRD_CONTRACT_ADDRESS);
    console.log('Owner address:', account.address);
    console.log('==========================================\n');
    
    // Initialize cycle state
    await initializeCycleState();
    
    // Check cycle every hour
    const CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // Initial check
    await checkAndProcessCycle();
    
    // Set up recurring checks
    setInterval(async () => {
        await checkAndProcessCycle();
    }, CHECK_INTERVAL);
}

// Start the cycle manager
main().catch(console.error);
