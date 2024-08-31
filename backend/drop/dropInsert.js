const { Drop } = require('../../models');
const { Sequelize } = require('sequelize');
const { client, updateRedisCache } = require('../redis/redisClient'); // Import the Redis client and updateRedisCache
const MAX_BATCH_SIZE = process.env.MAX_DROP_BATCH_INSERT_SIZE || 100;  // Default batch size if not set in environment

let dropQueue = [];
let isProcessing = false;

const processQueue = async () => {
  if (isProcessing || dropQueue.length <= 5) return;

  isProcessing = true;

  try {
    const currentBatch = dropQueue.splice(0, MAX_BATCH_SIZE);
    const ymPartition = new Date().getFullYear() * 100 + (new Date().getMonth() + 1);

    const dropData = currentBatch.map(drop => ({
      ...drop,
      ymPartition
    }));

    await Drop.bulkCreate(dropData, {
      validate: true,
      ignoreDuplicates: true,
    });

    console.log(`Inserted ${dropData.length} drops successfully.`);
    const trackedNPCs = ['Chambers of Xeric',
      'Theatre of Blood', 'Tombs of Amascut',
      'Phantom Muspah', 'Zulrah', 'Vorkath', 'Leviathan',
      'Vardorvis', 'The Whisperer', 'Duke Sucellus',
      'Alchemical Hydra', 'General Graardor', 'Commander Zilyana',
      "K'ril Tsutsaroth", "Kree'arra", "The Gauntlet", 'The Corrupted Gauntlet',
      "Clue scroll (master)", "Clue scroll (easy)", "Clue scroll (medium)", "Clue scroll (elite)",
      'Barrows'];
    // Update Redis cache for the affected users
    for (const drop of currentBatch) {
      const { rsn, value, npcName } = drop;
      if (npcName in trackedNPCs) {
        await updateRedisCache(rsn, value, npcName); // Call the updateRedisCache function
      }
    }
  } catch (error) {
    console.error('Error inserting drops:', error);
    // Implement retry mechanism for transient errors
    if (error.name === 'SequelizeDatabaseError' || error.name === 'SequelizeConnectionError') {
      console.log('Retrying batch insertion...');
      dropQueue.unshift(...currentBatch);
      setTimeout(processQueue, 5000);  // Retry after 5 seconds
    }
  } finally {
    isProcessing = false;
    if (dropQueue.length > 0) {
      processQueue();  // Continue processing if there are more drops
    }
  }
};

const addDropToQueue = (drop) => {
  dropQueue.push(drop);
  if (!isProcessing) {
    processQueue();
  }
};

module.exports = {
  addDropToQueue
};
