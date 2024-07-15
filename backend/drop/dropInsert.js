const { Drop } = require('../../models');
const { Sequelize } = require('sequelize');
const { Op } = Sequelize;

const MAX_BATCH_SIZE = process.env.MAX_DROP_BATCH_INSERT_SIZE;  // Set a batch size limit to prevent memory overflow

let dropQueue = [];
let isProcessing = false;

const processQueue = async () => {
  if (isProcessing || dropQueue.length === 0) return;

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

  } catch (error) {
    console.error('Error inserting drops:', error);
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
// Example usage:
//const exampleDrop = { itemName: 'Item C', itemId: 3, rsn: 'Player3', quantity: 20, value: 3000, time: new Date(), notified: false, imageUrl: 'http://example.com/itemC.jpg', npcName: 'NPC C' };
// addDropToQueue(exampleDrop);
