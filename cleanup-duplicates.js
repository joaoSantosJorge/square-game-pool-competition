/**
 * Cleanup script to merge duplicate wallet addresses in the scores collection
 * This happens when wallet addresses are stored with different casing (0xa8f4... vs 0xA8F4...)
 *
 * Run this script once to fix existing duplicates:
 * node cleanup-duplicates.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupDuplicates() {
  console.log('🔍 Scanning for duplicate wallet addresses...\n');

  try {
    // Get all scores
    const scoresSnapshot = await db.collection('scores').get();

    if (scoresSnapshot.empty) {
      console.log('No scores found in database.');
      return;
    }

    // Group scores by normalized (lowercase) address
    const addressMap = new Map();

    scoresSnapshot.forEach((doc) => {
      const data = doc.data();
      const originalAddress = data.walletAddress || doc.id;
      const normalizedAddress = originalAddress.toLowerCase();

      if (!addressMap.has(normalizedAddress)) {
        addressMap.set(normalizedAddress, []);
      }

      addressMap.get(normalizedAddress).push({
        docId: doc.id,
        data: data
      });
    });

    // Find and process duplicates
    let duplicatesFound = 0;
    let mergesPerformed = 0;

    for (const [normalizedAddress, entries] of addressMap) {
      if (entries.length > 1) {
        duplicatesFound++;
        console.log(`\n📋 Found duplicate for: ${normalizedAddress}`);
        console.log(`   Entries: ${entries.length}`);

        // Find the entry with the highest score
        let bestEntry = entries[0];
        for (const entry of entries) {
          console.log(`   - ${entry.docId}: score ${entry.data.score || 0}`);
          if ((entry.data.score || 0) > (bestEntry.data.score || 0)) {
            bestEntry = entry;
          }
        }

        console.log(`   ✅ Keeping highest score: ${bestEntry.data.score} from ${bestEntry.docId}`);

        // Create/update the normalized entry
        await db.collection('scores').doc(normalizedAddress).set({
          walletAddress: normalizedAddress,
          score: bestEntry.data.score,
          timestamp: bestEntry.data.timestamp || admin.firestore.FieldValue.serverTimestamp(),
          playerName: normalizedAddress.startsWith('0x') ?
            normalizedAddress.slice(0, 6) + '...' + normalizedAddress.slice(-4) :
            normalizedAddress,
          ipAddress: bestEntry.data.ipAddress || null,
          mergedFrom: entries.map(e => e.docId),
          mergedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Delete the old duplicate entries
        for (const entry of entries) {
          if (entry.docId !== normalizedAddress) {
            await db.collection('scores').doc(entry.docId).delete();
            console.log(`   🗑️  Deleted duplicate: ${entry.docId}`);
          }
        }

        mergesPerformed++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Cleanup Summary:');
    console.log(`   Total unique addresses: ${addressMap.size}`);
    console.log(`   Duplicates found: ${duplicatesFound}`);
    console.log(`   Merges performed: ${mergesPerformed}`);
    console.log('='.repeat(60));

    if (duplicatesFound === 0) {
      console.log('\n✨ No duplicates found! Database is clean.');
    } else {
      console.log('\n✅ Cleanup completed successfully!');
      console.log('   All duplicates have been merged, keeping the highest score for each address.');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run the cleanup
cleanupDuplicates()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
